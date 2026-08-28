import type { Context, Next } from "hono";
import { decodeToken, type JwtPayload } from "../lib/auth.js";
import type { Role } from "../db/schema.js";

export type AuthVariables = {
  user: JwtPayload;
};

export async function authenticate(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: missing token" }, 401);
  }
  const token = header.slice(7);
  try {
    const payload = await decodeToken(token);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Unauthorized: invalid or expired token" }, 401);
  }
}

export function requireRole(...roles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JwtPayload | undefined;
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }
    await next();
  };
}
