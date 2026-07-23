import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { checkChaseEmailSafety } from "@/lib/email/safety";

export type SendChaseEmailInput = {
  to: string; // intended recipient, from invoice.clientEmail
  subject: string;
  bodyText: string;
  bodyHtml: string;
  replyTo: string;
};

export type SendChaseEmailResult =
  | { dispatched: true; providerId: string; actualRecipient: string; subjectSent: string }
  | { dispatched: false; reason: "sending_disabled"; renderedPreview: { subject: string; html: string } }
  | { dispatched: false; reason: "blocked_by_safety_check"; matchedPattern: string }
  | { dispatched: false; reason: "error"; error: string };

const resendClient = new Resend(env.RESEND_API_KEY);

export async function sendChaseEmail(input: SendChaseEmailInput): Promise<SendChaseEmailResult> {
  // Kill switch first, before any other logic — SENDING_ENABLED=false means
  // "log and return the full rendered preview, dispatch nothing," full stop.
  if (!env.SENDING_ENABLED) {
    console.info("[SENDING_ENABLED=false] Would have sent email", {
      to: input.to,
      subject: input.subject,
    });
    return {
      dispatched: false,
      reason: "sending_disabled",
      renderedPreview: { subject: input.subject, html: input.bodyHtml },
    };
  }

  // Belt-and-braces safety net: block dispatch if the drafted body slipped
  // past the prompt instruction and asserts interest WILL be charged.
  const safetyCheck = checkChaseEmailSafety(input.bodyText);
  if (!safetyCheck.safe) {
    console.error("[safety] Blocked send: drafted email failed the keyword guard", {
      to: input.to,
      matchedPattern: safetyCheck.matchedPattern,
    });
    return { dispatched: false, reason: "blocked_by_safety_check", matchedPattern: safetyCheck.matchedPattern };
  }

  // Test redirect: applies to ALL outbound mail once sending is enabled.
  const actualRecipient = env.TEST_REDIRECT_EMAIL ?? input.to;
  const subjectSent = env.TEST_REDIRECT_EMAIL
    ? `[would send to: ${input.to}] ${input.subject}`
    : input.subject;

  try {
    const result = await resendClient.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: actualRecipient,
      replyTo: input.replyTo,
      subject: subjectSent,
      html: input.bodyHtml,
      text: input.bodyText,
    });
    if (result.error) {
      return { dispatched: false, reason: "error", error: result.error.message };
    }
    return {
      dispatched: true,
      providerId: result.data?.id ?? "unknown",
      actualRecipient,
      subjectSent,
    };
  } catch (error) {
    return {
      dispatched: false,
      reason: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
