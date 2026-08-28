import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import {
  hashPassword,
  verifyPassword,
  createToken,
} from "../lib/auth.js";
import { registerSchema, loginSchema, updateProfileSchema } from "../lib/validators.js";
import { authenticate, type AuthVariables } from "../middleware/auth.js";

const auth = new Hono<{ Variables: AuthVariables }>();

auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }
  const { name, email, phone, password } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ name, email, phone, passwordHash, role: "customer" })
    .returning();

  const token = await createToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed" }, 400);
  }
  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = await createToken({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
  });
});

auth.get("/me", authenticate, async (c) => {
  const payload = c.get("user");
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
    columns: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({ user });
});

auth.patch("/profile", authenticate, async (c) => {
  const payload = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const current = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  if (!current) return c.json({ error: "User not found" }, 404);

  const { name, phone, currentPassword, newPassword } = parsed.data;
  const updates: Partial<typeof users.$inferInsert> = {};

  if (name) updates.name = name;
  if (phone) updates.phone = phone;

  if (newPassword) {
    const ok = await verifyPassword(currentPassword!, current.passwordHash);
    if (!ok) return c.json({ error: "Current password is incorrect" }, 400);
    updates.passwordHash = await hashPassword(newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, payload.sub))
    .returning();

  return c.json({
    user: { id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, role: updated.role },
  });
});

export default auth;
