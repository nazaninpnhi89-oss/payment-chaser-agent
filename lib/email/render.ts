import type { Tier } from "@/lib/types";
import type { ReminderSummary } from "@/lib/reminder";

export type RenderedEmail = { bodyHtml: string; bodyText: string };

/**
 * Turns the LLM-drafted plain-text body into simple paragraph-per-newline
 * HTML. No templating of disclaimers here — the disclaimer text lives only
 * in the UI (InterestDisclaimer component), never injected into the sent
 * email body itself, since the product rule is that the email may only note
 * interest MAY apply, not carry a legal-advice disclaimer aimed at the sender.
 */
export function renderChaseEmail(body: string): RenderedEmail {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");

  return { bodyHtml, bodyText: body };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const TIER_LABEL: Record<Tier, string> = {
  gentle: "Gentle",
  firm: "Firm",
  formal: "Formal",
  final: "Final",
};

/**
 * Static, non-LLM template for the weekly "invoices need review" reminder
 * sent to the business owner — never to a client, and never a chase itself.
 */
export function renderReminderEmail(
  summary: ReminderSummary,
  dashboardUrl: string,
): { subject: string; bodyHtml: string; bodyText: string } {
  const subject =
    summary.totalCount === 1
      ? "1 invoice needs chasing this week"
      : `${summary.totalCount} invoices need chasing this week`;

  const tierLines = (Object.entries(summary.byTier) as [keyof typeof TIER_LABEL, number][])
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => `${TIER_LABEL[tier]}: ${count}`);

  const bodyText = [
    `You have ${summary.totalCount} overdue invoice${summary.totalCount === 1 ? "" : "s"} waiting for review.`,
    tierLines.length > 0 ? tierLines.join(", ") : null,
    ``,
    `Review and send chase emails: ${dashboardUrl}`,
    ``,
    `Nothing is sent automatically — this is just a reminder to log in and review.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const bodyHtml = bodyText
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");

  return { subject, bodyHtml, bodyText };
}
