import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { organisations } from "@/lib/db/schema";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const orgId = process.env.DEFAULT_ORG_ID;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  if (!orgId) throw new Error("DEFAULT_ORG_ID is not set");

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  const [existing] = await db.select().from(organisations).where(eq(organisations.id, orgId));
  if (existing) {
    console.info(`Organisation ${orgId} already exists, skipping seed.`);
  } else {
    await db.insert(organisations).values({
      id: orgId,
      businessName: "Example Electrical Ltd",
      senderName: "Alex Example",
      replyToEmail: "accounts@example-electrical.co.uk",
      standardPaymentTermsDays: 30,
      emailSignOff: "Kind regards,\nAlex",
    });
    console.info(`Seeded organisation ${orgId}.`);
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
