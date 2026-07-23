import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { checkChaseEmailSafety } from "@/lib/email/safety";

export type SendEmailInput = {
  to: string; // intended recipient
  subject: string;
  bodyText: string;
  bodyHtml: string;
  replyTo: string;
};

export type SendEmailResult =
  | { dispatched: true; providerId: string; actualRecipient: string; subjectSent: string }
  | { dispatched: false; reason: "sending_disabled"; renderedPreview: { subject: string; html: string } }
  | { dispatched: false; reason: "blocked_by_safety_check"; matchedPattern: string }
  | { dispatched: false; reason: "error"; error: string };

const resendClient = new Resend(env.RESEND_API_KEY);

/**
 * Shared transport: kill switch, then test redirect, then the actual Resend
 * call. Used by both sendChaseEmail and sendReminderEmail so the safety
 * behaviour lives in exactly one place.
 */
async function dispatchEmail(input: SendEmailInput): Promise<SendEmailResult> {
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

export type SendChaseEmailInput = SendEmailInput; // to = invoice.clientEmail
export type SendChaseEmailResult = SendEmailResult;

export async function sendChaseEmail(input: SendChaseEmailInput): Promise<SendChaseEmailResult> {
  // Belt-and-braces safety net, specific to LLM-drafted chase content: block
  // dispatch if the drafted body slipped past the prompt instruction and
  // asserts interest WILL be charged. Only relevant once sending is enabled
  // — dispatchEmail's own kill-switch check already blocks everything
  // otherwise.
  if (env.SENDING_ENABLED) {
    const safetyCheck = checkChaseEmailSafety(input.bodyText);
    if (!safetyCheck.safe) {
      console.error("[safety] Blocked send: drafted email failed the keyword guard", {
        to: input.to,
        matchedPattern: safetyCheck.matchedPattern,
      });
      return {
        dispatched: false,
        reason: "blocked_by_safety_check",
        matchedPattern: safetyCheck.matchedPattern,
      };
    }
  }

  return dispatchEmail(input);
}

export type SendReminderEmailInput = SendEmailInput; // to = organisation.replyToEmail
export type SendReminderEmailResult = SendEmailResult;

/**
 * Sends the weekly "you have N invoices to review" notification to the
 * business owner themselves — never a client. This is a static, non-LLM
 * template, so it doesn't run the chase-specific keyword guard, and it is
 * never logged to chase_logs (that table is for actual client-facing
 * chases only).
 */
export async function sendReminderEmail(
  input: SendReminderEmailInput,
): Promise<SendReminderEmailResult> {
  return dispatchEmail(input);
}
