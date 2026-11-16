import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

/**
 * Plain postgres-js driver against DATABASE_URL, used both locally and in
 * production — this works against any standard Postgres connection string
 * (local Postgres, Supabase, Neon, Vercel Postgres, etc.), not just a
 * Vercel-specific product. `prepare: false` is required when DATABASE_URL
 * points at a connection pooler (e.g. Supabase's "Transaction" pooler on
 * port 6543, or PgBouncer generally), which doesn't support prepared
 * statements — harmless against a direct connection too.
 */
const client = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
