import "dotenv/config";

export function resolveConnectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    "";

  if (!url) {
    throw new Error(
      "No database connection string found. Set DATABASE_URL (locally: copy .env.example to .env)."
    );
  }
  return url;
}

export function isLocalConnection(url: string): boolean {
  return /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
}

export function poolConfig(url: string) {
  const local = isLocalConnection(url);
  const serverless = Boolean(process.env.VERCEL);

  return {
    connectionString: url,
    ssl: local ? undefined : { rejectUnauthorized: false },
    max: serverless ? 1 : 10,
    idleTimeoutMillis: serverless ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  };
}
