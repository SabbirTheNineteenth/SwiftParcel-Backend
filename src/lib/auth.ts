import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import type { Role } from "../db/schema.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
  exp: number;
  [key: string]: unknown;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: {
  sub: string;
  role: Role;
  email: string;
}): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  return sign({ ...payload, exp }, JWT_SECRET, "HS256");
}

export async function decodeToken(token: string): Promise<JwtPayload> {
  return (await verify(token, JWT_SECRET, "HS256")) as JwtPayload;
}
