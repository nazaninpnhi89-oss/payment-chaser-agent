import { describe, expect, it } from "vitest";
import { renderReminderEmail } from "@/lib/email/render";

describe("renderReminderEmail", () => {
  it("uses singular phrasing for exactly one invoice", () => {
    const { subject } = renderReminderEmail(
      { totalCount: 1, byTier: { gentle: 1, firm: 0, formal: 0, final: 0 } },
      "https://example.com",
    );
    expect(subject).toBe("1 invoice needs chasing this week");
  });

  it("uses plural phrasing and lists non-zero tiers", () => {
    const { subject, bodyText } = renderReminderEmail(
      { totalCount: 3, byTier: { gentle: 1, firm: 0, formal: 2, final: 0 } },
      "https://example.com/dashboard",
    );
    expect(subject).toBe("3 invoices need chasing this week");
    expect(bodyText).toContain("Gentle: 1");
    expect(bodyText).toContain("Formal: 2");
    expect(bodyText).not.toContain("Firm:");
    expect(bodyText).toContain("https://example.com/dashboard");
  });

  it("states plainly that nothing is sent automatically", () => {
    const { bodyText } = renderReminderEmail(
      { totalCount: 2, byTier: { gentle: 0, firm: 2, formal: 0, final: 0 } },
      "https://example.com",
    );
    expect(bodyText).toMatch(/nothing is sent automatically/i);
  });
});
