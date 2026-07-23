"use server";

import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { getInvoiceView } from "@/lib/repositories/invoiceRepository";
import { getOrganisation } from "@/lib/repositories/organisationRepository";
import { createChaseLog } from "@/lib/repositories/chaseLogRepository";
import { formatPence } from "@/lib/money";
import type { VerifiedFacts } from "@/lib/prompt";
import { generateChaseDraft, type ChaseDraft } from "@/lib/llm/draft";
import { renderChaseEmail } from "@/lib/email/render";
import { sendChaseEmail } from "@/lib/email/resend";

export type GenerateDraftResult =
  | { success: true; draft: ChaseDraft }
  | { success: false; error: string };

export async function generateDraftAction(invoiceId: string): Promise<GenerateDraftResult> {
  const invoiceView = await getInvoiceView(env.DEFAULT_ORG_ID, invoiceId);
  if (!invoiceView || invoiceView.tier === null) {
    return { success: false, error: "This invoice is not overdue and cannot be chased." };
  }

  const organisation = await getOrganisation(env.DEFAULT_ORG_ID);

  const facts: VerifiedFacts = {
    clientName: invoiceView.clientName,
    invoiceNumber: invoiceView.invoiceNumber,
    amountFormatted: formatPence(invoiceView.amount),
    daysOverdue: invoiceView.daysOverdue,
    dueDateFormatted: format(invoiceView.dueDate, "d MMMM yyyy"),
    tier: invoiceView.tier,
    standardPaymentTermsDays: organisation.standardPaymentTermsDays,
    statutoryInterestMayApply: invoiceView.tier === "final",
    businessName: organisation.businessName,
    senderName: organisation.senderName,
    emailSignOff: organisation.emailSignOff,
    chaseCount: invoiceView.chaseCount,
    notes: invoiceView.notes,
  };

  try {
    const draft = await generateChaseDraft(facts);
    return { success: true, draft };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate draft.",
    };
  }
}

export type SendChaseResult =
  | { success: true; dispatched: boolean; message: string }
  | { success: false; error: string };

export async function sendChaseAction(
  invoiceId: string,
  draft: ChaseDraft,
): Promise<SendChaseResult> {
  const invoiceView = await getInvoiceView(env.DEFAULT_ORG_ID, invoiceId);
  if (!invoiceView || invoiceView.tier === null) {
    return { success: false, error: "This invoice is not overdue and cannot be chased." };
  }
  if (!invoiceView.clientEmail) {
    return { success: false, error: "This invoice has no client email on file." };
  }

  const organisation = await getOrganisation(env.DEFAULT_ORG_ID);
  const { bodyHtml, bodyText } = renderChaseEmail(draft.body);

  const result = await sendChaseEmail({
    to: invoiceView.clientEmail,
    subject: draft.subject,
    bodyHtml,
    bodyText,
    replyTo: organisation.replyToEmail,
  });

  await createChaseLog(env.DEFAULT_ORG_ID, {
    invoiceId,
    tier: invoiceView.tier,
    subject: draft.subject,
    body: draft.body,
    recipientEmail: invoiceView.clientEmail,
    status: result.dispatched ? "sent" : result.reason === "sending_disabled" ? "previewed" : "failed",
    errorMessage: result.dispatched
      ? null
      : result.reason === "error"
        ? result.error
        : result.reason === "blocked_by_safety_check"
          ? `Blocked by safety check: matched pattern ${result.matchedPattern}`
          : null,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");

  if (result.dispatched) {
    return { success: true, dispatched: true, message: `Email sent to ${result.actualRecipient}.` };
  }
  if (result.reason === "sending_disabled") {
    return {
      success: true,
      dispatched: false,
      message: "Sending is disabled — the email was previewed and logged, nothing was sent.",
    };
  }
  if (result.reason === "blocked_by_safety_check") {
    return {
      success: false,
      error: "The draft was blocked by the safety check (it implied interest will be charged). Regenerate or edit the draft.",
    };
  }
  return { success: false, error: result.error };
}
