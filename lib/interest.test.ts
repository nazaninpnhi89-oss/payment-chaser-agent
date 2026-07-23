import { describe, expect, it } from "vitest";
import { calculateStatutoryInterest } from "@/lib/interest";

describe("calculateStatutoryInterest", () => {
  it("returns all zeros when the invoice is not yet overdue", () => {
    expect(calculateStatutoryInterest(100_000, 0)).toEqual({
      interestPence: 0,
      compensationPence: 0,
      totalPence: 0,
    });
  });

  it("bands compensation at exactly £999 -> £40", () => {
    const result = calculateStatutoryInterest(99_900, 10, 8);
    expect(result.compensationPence).toBe(4_000);
  });

  it("bands compensation at exactly £1000 -> £70", () => {
    const result = calculateStatutoryInterest(100_000, 10, 8);
    expect(result.compensationPence).toBe(7_000);
  });

  it("bands compensation at exactly £9999 -> £70", () => {
    const result = calculateStatutoryInterest(999_900, 10, 8);
    expect(result.compensationPence).toBe(7_000);
  });

  it("bands compensation at exactly £10000 -> £100", () => {
    const result = calculateStatutoryInterest(1_000_000, 10, 8);
    expect(result.compensationPence).toBe(10_000);
  });

  it("calculates interest against a hand-worked example", () => {
    // £1,000 invoice, base rate 8% (so annual rate 16%), 30 days overdue.
    // dailyRate = 0.16 / 365; interest = round(100000 * dailyRate * 30)
    const amountPence = 100_000;
    const daysOverdue = 30;
    const baseRatePercent = 8;
    const expectedInterest = Math.round(
      amountPence * ((baseRatePercent + 8) / 100 / 365) * daysOverdue,
    );

    const result = calculateStatutoryInterest(amountPence, daysOverdue, baseRatePercent);
    expect(result.interestPence).toBe(expectedInterest);
    expect(result.totalPence).toBe(result.interestPence + result.compensationPence);
  });

  it("rounds interest to whole pence", () => {
    const result = calculateStatutoryInterest(33_333, 7, 5);
    expect(Number.isInteger(result.interestPence)).toBe(true);
  });

  it("accepts a custom baseRatePercent independent of the BASE_RATE_PERCENT constant", () => {
    const low = calculateStatutoryInterest(100_000, 30, 0);
    const high = calculateStatutoryInterest(100_000, 30, 20);
    expect(high.interestPence).toBeGreaterThan(low.interestPence);
  });
});
