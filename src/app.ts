import "dotenv/config";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import authRoutes from "./routes/auth.js";
import parcelRoutes from "./routes/parcels.js";
import adminRoutes from "./routes/admin.js";
import riderRoutes from "./routes/rider.js";

const app = new Hono();

const isProd = process.env.NODE_ENV === "production";
const strictOrigin = process.env.STRICT_ORIGIN === "true";

const allowedOrigins =
  process.env.CLIENT_ORIGIN
    ?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

function resolveOrigin(origin: string): string | null {
  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  if (
    !isProd &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return origin;
  }

  if (
    !strictOrigin &&
    /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(origin)
  ) {
    return origin;
  }

  return null;
}

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: (origin) => resolveOrigin(origin),
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

app.get("/", (c) =>
  c.json({
    name: "SwiftParcel API",
    status: "ok",
  })
);

app.get("/health", (c) =>
  c.json({
    status: "healthy",
  })
);

app.get("/health/env", (c) =>
  c.json({
    hasDatabaseUrl: Boolean(
      process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.POSTGRES_URL_NON_POOLING
    ),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    allowedOrigins,
    vercelAppOriginsAllowed: !strictOrigin,
    nodeEnv: process.env.NODE_ENV ?? null,
  })
);

app.get("/health/db", async (c) => {
  try {
    const { getPool } = await import("./db/index.js");

    const result = await getPool().query("select 1 as ok");

    return c.json({
      database: "connected",
      ok: result.rows[0]?.ok === 1,
    });
  } catch (err) {
    return c.json(
      {
        database: "error",
        message: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
});

/*
 * IMPORTANT:
 * Vercel handles /api.
 * Therefore Hono routes must NOT start with /api.
 */
app.route("/api/auth", authRoutes);
app.route("/api/parcels", parcelRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/rider", riderRoutes);

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      path: c.req.path,
    },
    404
  )
);

app.onError((err, c) => {
  console.error("Server error:", err);

  const body: Record<string, unknown> = {
    error: "Internal server error",
  };

  if (process.env.DEBUG_ERRORS === "true") {
    body.message = err instanceof Error ? err.message : String(err);
  }

  return c.json(body, 500);
});

export default app;