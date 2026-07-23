import type { Tier } from "@/lib/tier";

/**
 * The only channel of numeric/date information into the LLM prompt. Every
 * field here is pre-computed or pre-formatted in TypeScript before this
 * module is called — assembleChasePrompt never does arithmetic or date math
 * itself, only string formatting of values it's handed. This is what makes
 * "the LLM never invents numbers" enforceable rather than a house rule.
 */
export type VerifiedFacts = {
  clientName: string;
  invoiceNumber: string;
  amountFormatted: string; // pre-formatted via lib/money, e.g. "£1,234.56"
  daysOverdue: number;
  dueDateFormatted: string; // pre-formatted, e.g. "14 June 2026"
  tier: Tier;
  standardPaymentTermsDays: number;
  statutoryInterestMayApply: boolean; // boolean flag only, never a figure
  businessName: string;
  senderName: string;
  emailSignOff: string | null;
  chaseCount: number;
  notes: string | null;
};

export type AssembledPrompt = {
  system: string;
  user: string;
};

const TIER_TONE_GUIDANCE: Record<Tier, string> = {
  gentle:
    "Friendly nudge. Assume oversight on their part, not bad faith. No pressure. Warm, brief.",
  firm: "Polite but direct. Reference the agreed payment terms explicitly. No apology for chasing.",
  formal:
    "Businesslike and plain. State the amount and days outstanding factually. No warmth, no hostility.",
  final:
    "Firm. You may note that statutory interest may apply to overdue commercial debts, but you must NEVER state that interest will be charged or has been calculated. No threats of legal action.",
};

export function assembleChasePrompt(facts: VerifiedFacts): AssembledPrompt {
  const system = [
    `You are drafting a payment-chasing email on behalf of ${facts.businessName}, a UK construction subcontractor. Write in British English.`,
    `Rules you must follow exactly:`,
    `- Use ONLY the facts provided below. Do not invent, estimate, or infer any amount, date, day count, or figure not explicitly given to you.`,
    `- If a fact is not provided (e.g. no additional context given), do not reference it or make one up.`,
    `- Never state that statutory interest WILL be charged. You may note that it MAY apply, only if instructed to below.`,
    `- Do not give legal advice.`,
    `- Output only the email subject and body text (no markdown, no placeholders like [Name]).`,
    `- Sign off using exactly the sign-off text provided.`,
    `Tone for this email: ${TIER_TONE_GUIDANCE[facts.tier]}`,
  ].join("\n");

  const user = [
    `Client name: ${facts.clientName}`,
    `Invoice number: ${facts.invoiceNumber}`,
    `Amount owed: ${facts.amountFormatted}`,
    `Due date: ${facts.dueDateFormatted}`,
    `Days overdue: ${facts.daysOverdue}`,
    `Standard payment terms: ${facts.standardPaymentTermsDays} days`,
    `Number of times chased before: ${facts.chaseCount}`,
    facts.notes
      ? `Additional context: ${facts.notes}`
      : `Additional context: none provided`,
    facts.statutoryInterestMayApply
      ? `You may note in the email that statutory interest may apply to this overdue debt under UK law. Do not state a figure, and do not say it will be charged.`
      : `Do not mention statutory interest in this email.`,
    `Sign off with: ${facts.emailSignOff ?? facts.senderName}`,
    ``,
    `Write the email subject and body now.`,
  ].join("\n");

  return { system, user };
}
