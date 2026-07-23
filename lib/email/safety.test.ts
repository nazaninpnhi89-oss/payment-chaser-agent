import { describe, expect, it } from "vitest";
import { checkChaseEmailSafety } from "@/lib/email/safety";

describe("checkChaseEmailSafety", () => {
  it("passes a clean draft that only notes interest may apply", () => {
    const body =
      "Please note that statutory interest may apply to overdue commercial debts under UK law.";
    expect(checkChaseEmailSafety(body)).toEqual({ safe: true });
  });

  it("blocks a draft that states interest will be charged", () => {
    const body = "Please be aware that interest will be charged on this overdue amount.";
    const result = checkChaseEmailSafety(body);
    expect(result.safe).toBe(false);
  });

  it("blocks a draft that tells the client they will pay interest", () => {
    const result = checkChaseEmailSafety("You will pay interest on the outstanding balance.");
    expect(result.safe).toBe(false);
  });

  it("blocks a draft that states interest has already been applied", () => {
    const result = checkChaseEmailSafety("Interest has been applied to your account.");
    expect(result.safe).toBe(false);
  });

  it("passes a draft with no mention of interest at all", () => {
    const result = checkChaseEmailSafety("Please settle invoice INV-001 at your earliest convenience.");
    expect(result.safe).toBe(true);
  });
});
