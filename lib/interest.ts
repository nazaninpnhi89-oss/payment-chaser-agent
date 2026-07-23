import {
  BASE_RATE_PERCENT,
  STATUTORY_COMPENSATION_BANDS,
  STATUTORY_INTEREST_MARGIN_PERCENT,
} from "@/lib/constants";

export type StatutoryInterestResult = {
  interestPence: number;
  compensationPence: number;
  totalPence: number;
};

/**
 * Indicative UK statutory interest calculation (Late Payment of Commercial
 * Debts (Interest) Act 1998): daily interest at (base rate + 8%) applied to
 * the outstanding amount for daysOverdue, plus a fixed compensation fee
 * banded by invoice amount. This is a calculation, never a recommendation —
 * every surface displaying this figure must carry the "Indicative calculation
 * only. Not legal advice." disclaimer.
 */
export function calculateStatutoryInterest(
  amountPence: number,
  daysOverdue: number,
  baseRatePercent: number = BASE_RATE_PERCENT,
): StatutoryInterestResult {
  if (daysOverdue <= 0) {
    return { interestPence: 0, compensationPence: 0, totalPence: 0 };
  }

  const annualRatePercent = baseRatePercent + STATUTORY_INTEREST_MARGIN_PERCENT;
  const dailyRate = annualRatePercent / 100 / 365;
  const interestPence = Math.round(amountPence * dailyRate * daysOverdue);

  const band = STATUTORY_COMPENSATION_BANDS.find(
    (candidate) => amountPence < candidate.lessThanPence,
  );
  const compensationPence = band ? band.compensationPence : 0;

  return {
    interestPence,
    compensationPence,
    totalPence: interestPence + compensationPence,
  };
}
