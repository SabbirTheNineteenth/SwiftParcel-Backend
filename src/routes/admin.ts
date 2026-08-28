import { Hono } from "hono";
import { desc, eq, sql, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { parcels, parcelStatusHistory, users } from "../db/schema.js";
import { assignRiderSchema } from "../lib/validators.js";
import { authenticate, requireRole, type AuthVariables } from "../middleware/auth.js";

const admin = new Hono<{ Variables: AuthVariables }>();

admin.use("*", authenticate, requireRole("admin"));

admin.get("/parcels", async (c) => {
  const status = c.req.query("status");
  const rows = await db.query.parcels.findMany({
    where: status ? eq(parcels.status, status as any) : undefined,
    orderBy: [desc(parcels.createdAt)],
    with: {
      sender: { columns: { id: true, name: true, email: true } },
      rider: { columns: { id: true, name: true } },
    },
  });
  return c.json({ parcels: rows });
});

admin.get("/stats", async (c) => {
  const [totals] = await db
    .select({ total: count() })
    .from(parcels);

  const byStatus = await db
    .select({ status: parcels.status, count: count() })
    .from(parcels)
    .groupBy(parcels.status);

  const [userCount] = await db.select({ total: count() }).from(users);

  const [revenue] = await db
    .select({ sum: sql<string>`coalesce(sum(${parcels.cost}), 0)` })
    .from(parcels)
    .where(eq(parcels.status, "delivered"));

  return c.json({
    totalParcels: totals.total,
    totalUsers: userCount.total,
    deliveredRevenue: Number(revenue.sum),
    byStatus: byStatus.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = r.count;
      return acc;
    }, {}),
  });
});

admin.get("/users", async (c) => {
  const rows = await db.query.users.findMany({
    columns: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    orderBy: [desc(users.createdAt)],
  });
  return c.json({ users: rows });
});

admin.get("/riders", async (c) => {
  const rows = await db.query.users.findMany({
    where: eq(users.role, "rider"),
    columns: { id: true, name: true, email: true, phone: true },
  });
  return c.json({ riders: rows });
});

admin.patch("/parcels/:id/assign", async (c) => {
  const id = c.req.param("id")!;
  const admin_user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = assignRiderSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Validation failed" }, 400);

  const rider = await db.query.users.findFirst({
    where: eq(users.id, parsed.data.riderId),
  });
  if (!rider || rider.role !== "rider") {
    return c.json({ error: "Invalid rider" }, 400);
  }

  const parcel = await db.query.parcels.findFirst({ where: eq(parcels.id, id) });
  if (!parcel) return c.json({ error: "Parcel not found" }, 404);

  await db
    .update(parcels)
    .set({ riderId: rider.id, updatedAt: new Date() })
    .where(eq(parcels.id, id));

  await db.insert(parcelStatusHistory).values({
    parcelId: id,
    status: parcel.status,
    note: `Assigned to rider ${rider.name}`,
    updatedById: admin_user.sub,
  });

  return c.json({ ok: true });
});

export default admin;
