import type { InvoiceView, Tier } from "@/lib/types";

export type ReminderSummary = {
  totalCount: number;
  byTier: Record<Tier, number>;
};

/**
 * Pure summary of what needs chasing — feeds the weekly reminder email. This
 * never drafts or sends a chase itself; it only tells the business owner how
 * many invoices are waiting for their (human) review.
 */
export function buildReminderSummary(invoices: InvoiceView[]): ReminderSummary {
  const byTier: Record<Tier, number> = { gentle: 0, firm: 0, formal: 0, final: 0 };
  for (const invoice of invoices) {
    if (invoice.tier) byTier[invoice.tier] += 1;
  }
  return { totalCount: invoices.length, byTier };
}
