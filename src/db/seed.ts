import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, pool } from "./index.js";
import { users } from "./schema.js";
import { eq } from "drizzle-orm";

async function upsertUser(u: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "customer" | "admin" | "rider";
}) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, u.email),
  });
  if (existing) {
    console.log(`- ${u.role} ${u.email} already exists, skipping`);
    return;
  }
  const passwordHash = await bcrypt.hash(u.password, 10);
  await db.insert(users).values({
    name: u.name,
    email: u.email,
    phone: u.phone,
    passwordHash,
    role: u.role,
  });
  console.log(`+ created ${u.role}: ${u.email} (password: ${u.password})`);
}

async function main() {
  console.log("Seeding demo users...");
  await upsertUser({
    name: "Admin",
    email: "admin@swiftparcel.com",
    phone: "+8801000000001",
    password: "admin123",
    role: "admin",
  });
  await upsertUser({
    name: "Rider Karim",
    email: "rider@swiftparcel.com",
    phone: "+8801000000002",
    password: "rider123",
    role: "rider",
  });
  await upsertUser({
    name: "Sabbir Customer",
    email: "customer@swiftparcel.com",
    phone: "+8801000000003",
    password: "customer123",
    role: "customer",
  });
  console.log("Seed complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
