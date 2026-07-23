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
  contactFirstName: string | null;
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

/**
 * Checked programmatically in lib/llm/draft.ts after generation, so this is
 * the single source of truth for what's banned — the system prompt list
 * below is generated from it rather than kept in sync by hand.
 */
export const BANNED_PHRASES: string[] = [
  "I hope this email finds you well",
  "at your earliest convenience",
  "bring to your attention",
  "look into this matter",
  "please be advised",
  "kindly",
  "final demand",
  "final notice",
];

/**
 * Never address a company name — "Hi [First]," if we know a contact's first
 * name, otherwise a bare "Hi,", never "Dear Acme Builders Ltd".
 */
export function greetingFor(facts: Pick<VerifiedFacts, "contactFirstName">): string {
  return facts.contactFirstName ? `Hi ${facts.contactFirstName},` : "Hi,";
}

export type BannedPhraseCheckResult = { ok: true } | { ok: false; violation: string };

/**
 * Belt-and-braces check on the drafted output, mirroring the prompt-level
 * ban — models follow instructions most but not all of the time, so this is
 * what lib/llm/draft.ts uses to decide whether to regenerate once.
 */
export function checkBannedPhrases(text: string): BannedPhraseCheckResult {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      return { ok: false, violation: `the banned phrase "${phrase}"` };
    }
  }
  if (text.includes("!")) {
    return { ok: false, violation: "an exclamation mark" };
  }
  return { ok: true };
}

type TierInstruction = {
  register: string;
  wordCount: string;
  openingPattern: string;
  ask: string;
  example: string;
};

const TIER_INSTRUCTIONS: Record<Tier, TierInstruction> = {
  gentle: {
    register:
      "Casual, warm register, like a quick note to someone you get on with. Assume it's an oversight, not bad faith.",
    wordCount: "40-70 words total, excluding subject and sign-off.",
    openingPattern:
      "Open casually with the greeting, then go straight to the invoice — no throat-clearing.",
    ask:
      "Ask when the invoice is likely to go out, and offer an out (e.g. \"if it's already in this week's run, ignore me\").",
    example: [
      "Subject: Invoice 2041 — quick check",
      "",
      "Hi Sarah,",
      "",
      "Just a quick one — invoice 2041 for £4,850 was due last Friday and I don't think it's come through yet.",
      "",
      "Could you let me know when it's likely to go out? If it's already in this week's run, ignore me.",
      "",
      "Thanks,",
      "Alex",
    ].join("\n"),
  },
  firm: {
    register: "Polite but direct. No apology for chasing, no warmth padding.",
    wordCount: "60-90 words total, excluding subject and sign-off.",
    openingPattern: "Open with the greeting, then state the invoice is now overdue.",
    ask:
      "Reference the agreed payment terms once, and ask for a specific date the payment will be made.",
    example: [
      "Subject: Invoice INV-102 now overdue",
      "",
      "Hi Priya,",
      "",
      "Invoice INV-102 for £1,150.00 was due on 3 June, which is now 18 days past our agreed 30-day terms. This is the second time I've chased it, and I haven't had a reply to the first note.",
      "",
      "Could you confirm a specific date this week you'll get it paid? If there's something holding it up on your end, let me know and we can sort it.",
      "",
      "Thanks,",
      "Jamie",
    ].join("\n"),
  },
  formal: {
    register: "Businesslike and plain. No warmth, no hostility, no adjectives doing extra work.",
    wordCount: "80-110 words total, excluding subject and sign-off.",
    openingPattern: "Open with the greeting, then state the amount and days outstanding plainly.",
    ask: "Request a payment date in writing, not just a verbal assurance.",
    example: [
      "Subject: Invoice INV-103 — 45 days overdue",
      "",
      "Hi,",
      "",
      "Invoice INV-103 for £3,200.00 is now 45 days overdue, against agreed 30-day terms. This has been chased twice previously by email, on 10 May and 24 May, with no payment received and no response to either message.",
      "",
      "Please reply in writing with a firm date this invoice will be paid. If there's a reason for the delay I'm not aware of — a dispute, a missing document, anything — let me know that too, so we can resolve it.",
      "",
      "Kind regards,",
      "Jamie",
    ].join("\n"),
  },
  final: {
    register: "Direct. No warmth padding, no threats of legal action.",
    wordCount: "90-130 words total, excluding subject and sign-off.",
    openingPattern: "Open with the greeting, then state plainly that this remains unpaid despite prior chases.",
    ask: "Ask for a payment date this week. If instructed below, note that statutory interest may apply — never that it will be charged.",
    example: [
      "Subject: Invoice INV-104 — 75 days overdue",
      "",
      "Hi,",
      "",
      "Invoice INV-104 for £6,400.00 is now 75 days overdue, well past our agreed 30-day terms. It has been chased three times by email and once by phone, and remains unpaid with no date given for when it will be settled.",
      "",
      "Statutory interest may apply to commercial debts overdue by this long, under the Late Payment of Commercial Debts Act.",
      "",
      "I need a firm payment date this week. Please reply in writing to confirm, or let me know if there's a reason this hasn't been settled that I should be aware of.",
      "",
      "Kind regards,",
      "Jamie",
    ].join("\n"),
  },
};

export function assembleChasePrompt(facts: VerifiedFacts): AssembledPrompt {
  const tierInstruction = TIER_INSTRUCTIONS[facts.tier];
  const greeting = greetingFor(facts);

  const system = [
    `You are drafting a payment-chasing email on behalf of ${facts.businessName}, a UK construction subcontractor. Write in British English.`,
    ``,
    `Rules you must follow exactly:`,
    `- Use ONLY the facts provided below. Do not invent, estimate, or infer any amount, date, day count, or figure not explicitly given to you.`,
    `- If a fact is not provided (e.g. no additional context given), do not reference it or make one up.`,
    `- Never state that statutory interest WILL be charged. You may note that it MAY apply, only if instructed to below.`,
    `- Do not give legal advice.`,
    `- Output only the email subject and body text (no markdown, no placeholders like [Name]).`,
    `- Sign off using exactly the sign-off text provided.`,
    `- Never address the client by their company name. Open with exactly this greeting: "${greeting}"`,
    `- Never use any of these banned phrases, in any form, anywhere in the email:`,
    ...BANNED_PHRASES.map((phrase) => `  - "${phrase}"`),
    `- Never use an exclamation mark.`,
    `- Separate every block of the email (salutation, each paragraph, sign-off) with a blank line between them — that's two "\\n\\n" newline escapes in the JSON string argument, never a single "\\n" between blocks and never everything crammed into one run-on paragraph.`,
    ``,
    `Tone for this email (tier: ${facts.tier}):`,
    `- Register: ${tierInstruction.register}`,
    `- Length: ${tierInstruction.wordCount}`,
    `- Opening: ${tierInstruction.openingPattern}`,
    `- Ask: ${tierInstruction.ask}`,
    ``,
    `Worked example of the desired output for this tier (facts differ from the real ones below — match the register, length, and structure, not the specific numbers):`,
    tierInstruction.example,
  ].join("\n");

  const user = [
    `Greeting to use: ${greeting}`,
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
