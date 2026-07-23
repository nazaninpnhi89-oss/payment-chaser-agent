import { describe, expect, it } from "vitest";
import { assembleChasePrompt, type VerifiedFacts } from "@/lib/prompt";

function facts(overrides: Partial<VerifiedFacts> = {}): VerifiedFacts {
  return {
    clientName: "Acme Builders",
    invoiceNumber: "INV-042",
    amountFormatted: "£1,234.56",
    daysOverdue: 20,
    dueDateFormatted: "14 June 2026",
    tier: "firm",
    standardPaymentTermsDays: 30,
    statutoryInterestMayApply: false,
    businessName: "Sparkwell Electrical",
    senderName: "Jamie Sparkwell",
    emailSignOff: null,
    chaseCount: 1,
    notes: null,
    ...overrides,
  };
}

describe("assembleChasePrompt", () => {
  it("includes every fact's formatted value verbatim in the user prompt", () => {
    const f = facts();
    const { user } = assembleChasePrompt(f);
    expect(user).toContain(f.clientName);
    expect(user).toContain(f.invoiceNumber);
    expect(user).toContain(f.amountFormatted);
    expect(user).toContain(f.dueDateFormatted);
    expect(user).toContain(String(f.daysOverdue));
    expect(user).toContain(String(f.standardPaymentTermsDays));
  });

  it("final tier instructs that interest may apply but must never be stated as will be charged", () => {
    const { system, user } = assembleChasePrompt(
      facts({ tier: "final", statutoryInterestMayApply: true }),
    );
    expect(system).toMatch(/never state that interest will be charged/i);
    expect(user).toMatch(/may apply/i);
    // The instruction legitimately mentions the forbidden phrase while telling
    // the model not to use it ("do not say it will be charged") — what matters
    // is that nowhere does the prompt assert interest WILL be charged as fact.
    expect(user).not.toMatch(/interest will be charged\./i);
  });

  it("non-final tiers instruct the model not to mention statutory interest at all", () => {
    const { user } = assembleChasePrompt(facts({ tier: "gentle", statutoryInterestMayApply: false }));
    expect(user).toContain("Do not mention statutory interest in this email.");
  });

  it("renders 'none provided' rather than silently omitting the notes line when absent", () => {
    const { user } = assembleChasePrompt(facts({ notes: null }));
    expect(user).toContain("Additional context: none provided");
  });

  it("includes provided notes verbatim when present", () => {
    const { user } = assembleChasePrompt(facts({ notes: "Client disputed delivery date" }));
    expect(user).toContain("Client disputed delivery date");
  });

  it("falls back to senderName when emailSignOff is null", () => {
    const { user } = assembleChasePrompt(facts({ emailSignOff: null, senderName: "Jamie Sparkwell" }));
    expect(user).toContain("Sign off with: Jamie Sparkwell");
  });

  it("uses emailSignOff verbatim when provided", () => {
    const { user } = assembleChasePrompt(facts({ emailSignOff: "Kind regards,\nJamie" }));
    expect(user).toContain("Sign off with: Kind regards,\nJamie");
  });

  it("matches a snapshot for a canonical fixture, to catch wording drift in the safety instructions", () => {
    const result = assembleChasePrompt(
      facts({ tier: "final", statutoryInterestMayApply: true, notes: "Second reminder sent by post" }),
    );
    expect(result).toMatchSnapshot();
  });
});
