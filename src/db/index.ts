import "dotenv/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "./schema.js";
import { poolConfig, resolveConnectionString } from "./connection.js";

const { Pool } = pkg;

type Db = NodePgDatabase<typeof schema>;

let poolInstance: pkg.Pool | null = null;
let dbInstance: Db | null = null;

export function getPool(): pkg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool(poolConfig(resolveConnectionString()));
  }
  return poolInstance;
}

export function getDb(): Db {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

function lazy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = resolve() as Record<string | symbol, unknown>;
      const value = instance[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

export const pool = lazy(getPool);
export const db = lazy<Db>(getDb);

export { schema };
