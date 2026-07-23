import { describe, expect, it } from "vitest";
import { buildReminderSummary } from "@/lib/reminder";
import type { InvoiceView } from "@/lib/types";

function invoiceView(tier: InvoiceView["tier"]): InvoiceView {
  return {
    id: "id",
    organisationId: "org",
    invoiceNumber: "INV-1",
    clientName: "Client",
    clientEmail: null,
    amount: 1000,
    issueDate: new Date(),
    dueDate: new Date(),
    status: "outstanding",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    daysOverdue: 10,
    tier,
    statutoryInterestPence: 0,
    statutoryCompensationPence: 0,
    statutoryTotalPence: 0,
    lastChasedAt: null,
    chaseCount: 0,
  };
}

describe("buildReminderSummary", () => {
  it("returns zero counts for an empty list", () => {
    expect(buildReminderSummary([])).toEqual({
      totalCount: 0,
      byTier: { gentle: 0, firm: 0, formal: 0, final: 0 },
    });
  });

  it("counts invoices per tier", () => {
    const summary = buildReminderSummary([
      invoiceView("gentle"),
      invoiceView("gentle"),
      invoiceView("firm"),
      invoiceView("final"),
    ]);
    expect(summary).toEqual({
      totalCount: 4,
      byTier: { gentle: 2, firm: 1, formal: 0, final: 1 },
    });
  });

  it("ignores invoices with a null tier (not yet due)", () => {
    const summary = buildReminderSummary([invoiceView(null)]);
    expect(summary.totalCount).toBe(1);
    expect(summary.byTier).toEqual({ gentle: 0, firm: 0, formal: 0, final: 0 });
  });
});
