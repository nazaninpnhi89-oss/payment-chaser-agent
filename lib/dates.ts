import { differenceInCalendarDays } from "date-fns";

/**
 * Calendar-day difference (midnight-to-midnight), not a strict 24-hour count —
 * an invoice due yesterday is "1 day overdue" today regardless of time of day.
 * `asOf` is always supplied explicitly by the caller (never `new Date()` here)
 * so this stays pure and testable; the repository layer is the one place that
 * passes in the real current time.
 */
export function calculateDaysOverdue(dueDate: Date, asOf: Date): number {
  return differenceInCalendarDays(asOf, dueDate);
}
