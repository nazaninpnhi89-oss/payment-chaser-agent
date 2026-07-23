export type Tier = "gentle" | "firm" | "formal" | "final";

/**
 * Invoices not yet due (daysOverdue <= 0) are excluded from chasing entirely,
 * represented here as `null` rather than throwing, so callers can filter
 * without a try/catch at every call site.
 */
export function getTier(daysOverdue: number): Tier | null {
  if (daysOverdue <= 0) return null;
  if (daysOverdue <= 14) return "gentle";
  if (daysOverdue <= 30) return "firm";
  if (daysOverdue <= 60) return "formal";
  return "final";
}
