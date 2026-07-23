import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { listInvoicesWithView } from "@/lib/repositories/invoiceRepository";
import { getOrganisation } from "@/lib/repositories/organisationRepository";
import { buildReminderSummary } from "@/lib/reminder";
import { renderReminderEmail } from "@/lib/email/render";
import { sendReminderEmail } from "@/lib/email/resend";

/**
 * Weekly notification to the business owner listing how many overdue
 * invoices are waiting for review. This NEVER drafts or sends a chase email
 * itself — it only nudges a human to log in and go through the normal
 * generate/preview/approve flow. Satisfies the "no auto-send" safety rule:
 * the only thing this cron dispatches is a summary addressed to the
 * organisation's own reply-to email, never a client.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await listInvoicesWithView(env.DEFAULT_ORG_ID, { statuses: ["outstanding"] });
  if (invoices.length === 0) {
    return NextResponse.json({ sent: false, reason: "no_overdue_invoices" });
  }

  const organisation = await getOrganisation(env.DEFAULT_ORG_ID);
  const summary = buildReminderSummary(invoices);
  const { subject, bodyHtml, bodyText } = renderReminderEmail(summary, env.NEXT_PUBLIC_APP_URL);

  const result = await sendReminderEmail({
    to: organisation.replyToEmail,
    subject,
    bodyHtml,
    bodyText,
    replyTo: organisation.replyToEmail,
  });

  return NextResponse.json({ sent: result.dispatched, summary, result });
}
