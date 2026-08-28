import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { parcels, parcelStatusHistory } from "../db/schema.js";
import {
  createParcelSchema,
  updateStatusSchema,
} from "../lib/validators.js";
import { generateTrackingNumber } from "../lib/tracking.js";
import { calculateCost } from "../lib/pricing.js";
import { authenticate, requireRole, type AuthVariables } from "../middleware/auth.js";

const route = new Hono<{ Variables: AuthVariables }>();

route.post("/", authenticate, requireRole("customer", "admin"), async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = createParcelSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  const d = parsed.data;
  const cost = calculateCost(d.deliveryType, d.weightKg);

  let trackingNumber = generateTrackingNumber();
  for (let i = 0; i < 5; i++) {
    const clash = await db.query.parcels.findFirst({
      where: eq(parcels.trackingNumber, trackingNumber),
    });
    if (!clash) break;
    trackingNumber = generateTrackingNumber();
  }

  const [parcel] = await db
    .insert(parcels)
    .values({
      trackingNumber,
      senderId: user.sub,
      senderName: d.senderName,
      senderPhone: d.senderPhone,
      senderAddress: d.senderAddress,
      receiverName: d.receiverName,
      receiverPhone: d.receiverPhone,
      receiverAddress: d.receiverAddress,
      parcelType: d.parcelType,
      weightKg: String(d.weightKg),
      deliveryType: d.deliveryType,
      cost: String(cost),
      status: "booked",
    })
    .returning();

  await db.insert(parcelStatusHistory).values({
    parcelId: parcel.id,
    status: "booked",
    note: "Parcel booked",
    updatedById: user.sub,
  });

  return c.json({ parcel }, 201);
});

route.get("/mine", authenticate, async (c) => {
  const user = c.get("user");
  const rows = await db.query.parcels.findMany({
    where: eq(parcels.senderId, user.sub),
    orderBy: [desc(parcels.createdAt)],
  });
  return c.json({ parcels: rows });
});

route.get("/track/:trackingNumber", async (c) => {
  const trackingNumber = c.req.param("trackingNumber")!.toUpperCase();
  const parcel = await db.query.parcels.findFirst({
    where: eq(parcels.trackingNumber, trackingNumber),
    with: {
      history: { orderBy: [desc(parcelStatusHistory.createdAt)] },
    },
  });
  if (!parcel) return c.json({ error: "Tracking number not found" }, 404);

  return c.json({
    parcel: {
      trackingNumber: parcel.trackingNumber,
      status: parcel.status,
      deliveryType: parcel.deliveryType,
      parcelType: parcel.parcelType,
      receiverName: parcel.receiverName,
      receiverAddressArea: parcel.receiverAddress.split(",").slice(-2).join(",").trim(),
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
      history: parcel.history.map((h) => ({
        status: h.status,
        note: h.note,
        location: h.location,
        createdAt: h.createdAt,
      })),
    },
  });
});

route.get("/:id", authenticate, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id")!;
  const parcel = await db.query.parcels.findFirst({
    where: eq(parcels.id, id),
    with: {
      history: { orderBy: [desc(parcelStatusHistory.createdAt)] },
      rider: { columns: { id: true, name: true, phone: true } },
    },
  });
  if (!parcel) return c.json({ error: "Parcel not found" }, 404);

  const allowed =
    user.role === "admin" ||
    parcel.senderId === user.sub ||
    parcel.riderId === user.sub;
  if (!allowed) return c.json({ error: "Forbidden" }, 403);

  return c.json({ parcel });
});

route.patch("/:id/status", authenticate, requireRole("admin", "rider"), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id")!;
  const body = await c.req.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed" }, 400);
  }

  const parcel = await db.query.parcels.findFirst({ where: eq(parcels.id, id) });
  if (!parcel) return c.json({ error: "Parcel not found" }, 404);

  if (user.role === "rider" && parcel.riderId !== user.sub) {
    return c.json({ error: "Forbidden: parcel not assigned to you" }, 403);
  }

  const { status, note, location } = parsed.data;

  await db
    .update(parcels)
    .set({ status, updatedAt: new Date() })
    .where(eq(parcels.id, id));

  await db.insert(parcelStatusHistory).values({
    parcelId: id,
    status,
    note,
    location,
    updatedById: user.sub,
  });

  const updated = await db.query.parcels.findFirst({
    where: eq(parcels.id, id),
    with: { history: { orderBy: [desc(parcelStatusHistory.createdAt)] } },
  });

  return c.json({ parcel: updated });
});

export default route;
