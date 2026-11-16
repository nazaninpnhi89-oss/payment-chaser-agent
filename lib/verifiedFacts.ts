import "server-only";
import { format } from "date-fns";
import { env } from "@/lib/env";
import { getInvoiceView } from "@/lib/repositories/invoiceRepository";
import { getOrganisation } from "@/lib/repositories/organisationRepository";
import { formatPence } from "@/lib/money";
import type { VerifiedFacts } from "@/lib/prompt";

export type BuildVerifiedFactsResult =
  | { success: true; facts: VerifiedFacts }
  | { success: false; error: string };

/**
 * Shared between the "Generate draft" server action and the dev-only
 * /api/draft/inspect route, so both see exactly the same facts the LLM
 * would be given — no risk of the debug view drifting from the real path.
 */
export async function buildVerifiedFacts(invoiceId: string): Promise<BuildVerifiedFactsResult> {
  const invoiceView = await getInvoiceView(env.DEFAULT_ORG_ID, invoiceId);
  if (!invoiceView || invoiceView.tier === null) {
    return { success: false, error: "This invoice is not overdue and cannot be chased." };
  }
  if (invoiceView.status !== "outstanding") {
    return { success: false, error: "Only outstanding invoices can be chased." };
  }

  const organisation = await getOrganisation(env.DEFAULT_ORG_ID);

  const facts: VerifiedFacts = {
    clientName: invoiceView.clientName,
    contactFirstName: invoiceView.contactFirstName,
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

  return { success: true, facts };
}
