import { describe, expect, it } from "vitest";
import { calculateDaysOverdue } from "@/lib/dates";

// Constructed with local-time components (not ISO strings with a "Z" suffix)
// so these assertions hold regardless of the machine's timezone.

describe("calculateDaysOverdue", () => {
  it("returns 0 when asOf is the same calendar day as dueDate", () => {
    const dueDate = new Date(2026, 5, 14, 23, 0);
    const asOf = new Date(2026, 5, 14, 1, 0);
    expect(calculateDaysOverdue(dueDate, asOf)).toBe(0);
  });

  it("returns 1 when asOf is one calendar day after dueDate", () => {
    const dueDate = new Date(2026, 5, 14, 23, 0);
    const asOf = new Date(2026, 5, 15, 1, 0);
    expect(calculateDaysOverdue(dueDate, asOf)).toBe(1);
  });

  it("returns a negative number when asOf is before dueDate (not clamped)", () => {
    const dueDate = new Date(2026, 5, 14, 0, 0);
    const asOf = new Date(2026, 5, 10, 0, 0);
    expect(calculateDaysOverdue(dueDate, asOf)).toBe(-4);
  });

  it("uses calendar-day semantics, not a 24-hour period, across a midnight boundary", () => {
    // Due 23:59, "asOf" only two minutes later but past midnight -> still 1 calendar day.
    const dueDate = new Date(2026, 5, 14, 23, 59);
    const asOf = new Date(2026, 5, 15, 0, 1);
    expect(calculateDaysOverdue(dueDate, asOf)).toBe(1);
  });
});
