import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import type { Organisation } from "@/lib/types";

export async function getOrganisation(organisationId: string): Promise<Organisation> {
  const [row] = await db.select().from(organisations).where(eq(organisations.id, organisationId));
  if (!row) throw new Error(`Organisation ${organisationId} not found`);
  return row;
}

export async function updateOrganisation(
  organisationId: string,
  fields: Partial<
    Pick<
      Organisation,
      "businessName" | "senderName" | "replyToEmail" | "standardPaymentTermsDays" | "emailSignOff"
    >
  >,
): Promise<Organisation> {
  const [row] = await db
    .update(organisations)
    .set(fields)
    .where(eq(organisations.id, organisationId))
    .returning();
  if (!row) throw new Error(`Organisation ${organisationId} not found`);
  return row;
}
