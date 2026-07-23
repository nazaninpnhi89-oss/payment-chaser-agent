import "server-only";
import { drizzle as drizzleVercel } from "drizzle-orm/vercel-postgres";
import { drizzle as drizzlePostgresJs } from "drizzle-orm/postgres-js";
import { sql as vercelSql } from "@vercel/postgres";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

/**
 * Local dev uses plain Postgres via the postgres-js driver against
 * DATABASE_URL; Vercel deployments use @vercel/postgres. Selected by the
 * VERCEL env var Vercel sets automatically, so no manual switch is needed per
 * environment.
 */
function createDb() {
  if (process.env.VERCEL) {
    return drizzleVercel(vercelSql, { schema });
  }
  const client = postgres(process.env.DATABASE_URL as string);
  return drizzlePostgresJs(client, { schema });
}

export const db = createDb();
