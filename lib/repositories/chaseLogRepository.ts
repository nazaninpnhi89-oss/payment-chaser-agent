import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chaseLogs } from "@/lib/db/schema";
import type { ChaseLog, ChaseStatus, Tier } from "@/lib/types";

export async function createChaseLog(
  organisationId: string,
  entry: {
    invoiceId: string;
    tier: Tier;
    subject: string;
    body: string;
    recipientEmail: string;
    status: ChaseStatus;
    errorMessage?: string | null;
  },
): Promise<ChaseLog> {
  const [row] = await db
    .insert(chaseLogs)
    .values({
      organisationId,
      invoiceId: entry.invoiceId,
      tier: entry.tier,
      subject: entry.subject,
      body: entry.body,
      recipientEmail: entry.recipientEmail,
      status: entry.status,
      errorMessage: entry.errorMessage ?? null,
    })
    .returning();
  if (!row) throw new Error("Failed to create chase log");
  return row;
}

export async function listChaseLogsForInvoice(
  organisationId: string,
  invoiceId: string,
): Promise<ChaseLog[]> {
  return db
    .select()
    .from(chaseLogs)
    .where(and(eq(chaseLogs.organisationId, organisationId), eq(chaseLogs.invoiceId, invoiceId)))
    .orderBy(desc(chaseLogs.sentAt));
}
