import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { parcels, parcelStatusHistory } from "../db/schema.js";
import { authenticate, requireRole, type AuthVariables } from "../middleware/auth.js";

const rider = new Hono<{ Variables: AuthVariables }>();

rider.use("*", authenticate, requireRole("rider"));

rider.get("/parcels", async (c) => {
  const user = c.get("user");
  const rows = await db.query.parcels.findMany({
    where: eq(parcels.riderId, user.sub),
    orderBy: [desc(parcels.createdAt)],
    with: {
      history: { orderBy: [desc(parcelStatusHistory.createdAt)], limit: 1 },
    },
  });
  return c.json({ parcels: rows });
});

export default rider;
