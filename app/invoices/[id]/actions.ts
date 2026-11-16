"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import {
  getInvoiceView,
  updateInvoiceContactFirstName,
  updateInvoiceStatus,
} from "@/lib/repositories/invoiceRepository";
import { createChaseLog } from "@/lib/repositories/chaseLogRepository";
import { getOrganisation } from "@/lib/repositories/organisationRepository";
import { renderChaseEmail } from "@/lib/email/render";
import { normalizeChaseEmailBody } from "@/lib/email/normalize";
import { sendChaseEmail } from "@/lib/email/resend";
import { generateChaseDraft, type ChaseDraft } from "@/lib/llm/draft";
import { buildVerifiedFacts } from "@/lib/verifiedFacts";

export type GenerateDraftResult =
  | { success: true; draft: ChaseDraft }
  | { success: false; error: string };

export async function generateDraftAction(invoiceId: string): Promise<GenerateDraftResult> {
  const factsResult = await buildVerifiedFacts(invoiceId);
  if (!factsResult.success) return factsResult;

  try {
    const draft = await generateChaseDraft(factsResult.facts);
    return { success: true, draft };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate draft.",
    };
  }
}

export async function updateContactFirstNameAction(
  invoiceId: string,
  contactFirstName: string,
): Promise<void> {
  await updateInvoiceContactFirstName(env.DEFAULT_ORG_ID, invoiceId, contactFirstName.trim() || null);
  revalidatePath(`/invoices/${invoiceId}`);
}

const invoiceStatusSchema = z.enum(["outstanding", "paid", "disputed", "written_off"]);

export type UpdateInvoiceStatusResult = { success: true } | { success: false; error: string };

export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: string,
): Promise<UpdateInvoiceStatusResult> {
  const parsed = invoiceStatusSchema.safeParse(status);
  if (!parsed.success) return { success: false, error: "Unknown invoice status." };

  const invoiceView = await getInvoiceView(env.DEFAULT_ORG_ID, invoiceId);
  if (!invoiceView) return { success: false, error: "Invoice not found." };

  await updateInvoiceStatus(env.DEFAULT_ORG_ID, invoiceId, parsed.data);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  return { success: true };
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
  if (invoiceView.status !== "outstanding") {
    return { success: false, error: "Only outstanding invoices can be chased." };
  }
  if (!invoiceView.clientEmail) {
    return { success: false, error: "This invoice has no client email on file." };
  }

  const organisation = await getOrganisation(env.DEFAULT_ORG_ID);
  // Re-normalise here too, not just at generation time — the user may have
  // hand-edited the body in the preview textarea before approving it.
  const normalisedBody = normalizeChaseEmailBody(draft.body, organisation.senderName);
  const { bodyHtml, bodyText } = renderChaseEmail(normalisedBody);

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
    body: normalisedBody,
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
