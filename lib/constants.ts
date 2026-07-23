/**
 * Bank of England base rate, as a percentage (e.g. 5.0 for 5%).
 * Manually updated — this is NOT fetched live.
 *
 * Check for updates at:
 * https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate
 *
 * Last verified: 2026-07-23
 *
 * The Late Payment of Commercial Debts (Interest) Act 1998 technically uses
 * the base rate in effect on the date the debt fell overdue (or the 30 June /
 * 31 December reference rate). This implementation uses a single current rate
 * for simplicity, which introduces a small inaccuracy for invoices overdue
 * across a rate change — acceptable given every interest figure is already
 * labelled "Indicative calculation only. Not legal advice."
 */
export const BASE_RATE_PERCENT = 5.0; // <-- UPDATE MANUALLY, see comment above

export const STATUTORY_INTEREST_MARGIN_PERCENT = 8.0;

/**
 * Fixed statutory compensation under the Late Payment of Commercial Debts
 * (Interest) Act 1998, banded by invoice amount:
 *   < £1,000.00            -> £40
 *   £1,000.00 - £9,999.99  -> £70
 *   >= £10,000.00          -> £100
 * Boundaries are expressed in pence as "amount is strictly less than the band
 * ceiling", so £1,000.00 exactly (100,000p) falls into the second band, and
 * £10,000.00 exactly (1,000,000p) falls into the third.
 */
export const STATUTORY_COMPENSATION_BANDS = [
  { lessThanPence: 100_000, compensationPence: 4_000 }, // < £1,000.00
  { lessThanPence: 1_000_000, compensationPence: 7_000 }, // £1,000.00 - £9,999.99
  { lessThanPence: Infinity, compensationPence: 10_000 }, // >= £10,000.00
] as const;
