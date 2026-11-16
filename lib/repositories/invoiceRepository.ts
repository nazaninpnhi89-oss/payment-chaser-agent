import "server-only";
import { and, count, desc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chaseLogs, invoices } from "@/lib/db/schema";
import { calculateDaysOverdue } from "@/lib/dates";
import { getTier } from "@/lib/tier";
import { calculateStatutoryInterest } from "@/lib/interest";
import { BASE_RATE_PERCENT } from "@/lib/constants";
import type { Invoice, InvoiceStatus, InvoiceView } from "@/lib/types";
import type { NormalisedInvoiceInput } from "@/lib/csv";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ChaseStats = { lastChasedAt: Date | null; chaseCount: number };

async function getChaseStatsForInvoices(
  organisationId: string,
  invoiceIds: string[],
): Promise<Map<string, ChaseStats>> {
  if (invoiceIds.length === 0) return new Map();

  const rows = await db
    .select({
      invoiceId: chaseLogs.invoiceId,
      lastChasedAt: max(chaseLogs.sentAt),
      chaseCount: count(chaseLogs.id),
    })
    .from(chaseLogs)
    .where(
      and(
        eq(chaseLogs.organisationId, organisationId),
        inArray(chaseLogs.invoiceId, invoiceIds),
        // Only emails actually dispatched count as a chase — previews (sending
        // disabled) and failed sends never reached the client, so counting them
        // would make the next draft wrongly claim earlier reminders were sent.
        eq(chaseLogs.status, "sent"),
      ),
    )
    .groupBy(chaseLogs.invoiceId);

  const map = new Map<string, ChaseStats>();
  for (const row of rows) {
    map.set(row.invoiceId, {
      lastChasedAt: row.lastChasedAt ? new Date(row.lastChasedAt) : null,
      chaseCount: row.chaseCount,
    });
  }
  return map;
}

function deriveInvoiceView(invoice: Invoice, chaseStats: ChaseStats, asOf: Date): InvoiceView {
  const daysOverdue = calculateDaysOverdue(invoice.dueDate, asOf);
  const tier = getTier(daysOverdue);
  const interest = calculateStatutoryInterest(invoice.amount, daysOverdue, BASE_RATE_PERCENT);

  return {
    ...invoice,
    daysOverdue,
    tier,
    statutoryInterestPence: interest.interestPence,
    statutoryCompensationPence: interest.compensationPence,
    statutoryTotalPence: interest.totalPence,
    lastChasedAt: chaseStats.lastChasedAt,
    chaseCount: chaseStats.chaseCount,
  };
}

export type ListInvoicesOptions = {
  statuses?: InvoiceStatus[];
  includeNotYetDue?: boolean; // default false — only overdue invoices are shown by default
};

export async function listInvoicesWithView(
  organisationId: string,
  options: ListInvoicesOptions = {},
): Promise<InvoiceView[]> {
  const conditions = [eq(invoices.organisationId, organisationId)];
  if (options.statuses && options.statuses.length > 0) {
    conditions.push(inArray(invoices.status, options.statuses));
  }

  const rows = await db
    .select()
    .from(invoices)
    .where(and(...conditions))
    .orderBy(desc(invoices.dueDate));

  const chaseStatsByInvoice = await getChaseStatsForInvoices(
    organisationId,
    rows.map((row) => row.id),
  );

  const asOf = new Date();
  const views = rows.map((row) =>
    deriveInvoiceView(row, chaseStatsByInvoice.get(row.id) ?? { lastChasedAt: null, chaseCount: 0 }, asOf),
  );

  if (options.includeNotYetDue) return views;
  return views.filter((view) => view.tier !== null);
}

export async function getInvoiceView(
  organisationId: string,
  invoiceId: string,
): Promise<InvoiceView | null> {
  // A malformed id (e.g. a hand-edited URL) is simply "not found", rather than
  // a Postgres "invalid input syntax for type uuid" error and a 500 page.
  if (!UUID_PATTERN.test(invoiceId)) return null;

  const [row] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.organisationId, organisationId), eq(invoices.id, invoiceId)));
  if (!row) return null;

  const chaseStatsByInvoice = await getChaseStatsForInvoices(organisationId, [row.id]);
  return deriveInvoiceView(
    row,
    chaseStatsByInvoice.get(row.id) ?? { lastChasedAt: null, chaseCount: 0 },
    new Date(),
  );
}

export async function listExistingInvoiceNumbers(
  organisationId: string,
  invoiceNumbers: string[],
): Promise<Set<string>> {
  if (invoiceNumbers.length === 0) return new Set();
  const rows = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(
      and(eq(invoices.organisationId, organisationId), inArray(invoices.invoiceNumber, invoiceNumbers)),
    );
  return new Set(rows.map((row) => row.invoiceNumber));
}

export async function createInvoicesFromImport(
  organisationId: string,
  inputs: NormalisedInvoiceInput[],
): Promise<Invoice[]> {
  if (inputs.length === 0) return [];

  return db
    .insert(invoices)
    .values(
      inputs.map((input) => ({
        organisationId,
        invoiceNumber: input.invoiceNumber,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        contactFirstName: input.contactFirstName,
        amount: input.amount,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        notes: input.notes,
      })),
    )
    .returning();
}

export async function updateInvoiceContactFirstName(
  organisationId: string,
  invoiceId: string,
  contactFirstName: string | null,
): Promise<Invoice> {
  const [row] = await db
    .update(invoices)
    .set({ contactFirstName, updatedAt: new Date() })
    .where(and(eq(invoices.organisationId, organisationId), eq(invoices.id, invoiceId)))
    .returning();
  if (!row) throw new Error(`Invoice ${invoiceId} not found`);
  return row;
}

export async function updateInvoiceStatus(
  organisationId: string,
  invoiceId: string,
  status: InvoiceStatus,
): Promise<Invoice> {
  const [row] = await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(invoices.organisationId, organisationId), eq(invoices.id, invoiceId)))
    .returning();
  if (!row) throw new Error(`Invoice ${invoiceId} not found`);
  return row;
}
