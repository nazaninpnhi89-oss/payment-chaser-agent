import { describe, expect, it } from "vitest";
import { assembleChasePrompt, checkBannedPhrases, greetingFor, type VerifiedFacts } from "@/lib/prompt";

function facts(overrides: Partial<VerifiedFacts> = {}): VerifiedFacts {
  return {
    clientName: "Acme Builders",
    contactFirstName: null,
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
    expect(system).toMatch(/never state that (?:statutory )?interest will be charged/i);
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

  it("never addresses the client by company name, using the contact first name when known", () => {
    const { system, user } = assembleChasePrompt(facts({ contactFirstName: "Sam" }));
    expect(greetingFor({ contactFirstName: "Sam" })).toBe("Hi Sam,");
    expect(system).toContain('Open with exactly this greeting: "Hi Sam,"');
    expect(user).toContain("Greeting to use: Hi Sam,");
    expect(system).not.toContain(facts().clientName);
  });

  it("falls back to a bare 'Hi,' when no contact first name is known", () => {
    const { system, user } = assembleChasePrompt(facts({ contactFirstName: null }));
    expect(greetingFor({ contactFirstName: null })).toBe("Hi,");
    expect(system).toContain('Open with exactly this greeting: "Hi,"');
    expect(user).toContain("Greeting to use: Hi,");
  });

  it("lists every banned phrase in the system prompt", () => {
    const { system } = assembleChasePrompt(facts());
    expect(system).toContain('"I hope this email finds you well"');
    expect(system).toContain('"at your earliest convenience"');
    expect(system).toContain("Never use an exclamation mark.");
  });
});

describe("checkBannedPhrases", () => {
  it("flags a banned phrase regardless of case", () => {
    const result = checkBannedPhrases("I HOPE THIS EMAIL FINDS YOU WELL, please pay.");
    expect(result).toEqual({ ok: false, violation: 'the banned phrase "I hope this email finds you well"' });
  });

  it("flags an exclamation mark", () => {
    const result = checkBannedPhrases("Please pay this invoice today!");
    expect(result).toEqual({ ok: false, violation: "an exclamation mark" });
  });

  it("passes clean text", () => {
    const result = checkBannedPhrases("Hi Sam. Invoice INV-042 is now overdue. Could you confirm a date?");
    expect(result).toEqual({ ok: true });
  });
});
