import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  await client.end();

  console.info("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
