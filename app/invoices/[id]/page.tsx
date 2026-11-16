import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Sparkles } from "lucide-react";
import { env } from "@/lib/env";
import { getInvoiceView } from "@/lib/repositories/invoiceRepository";
import { listChaseLogsForInvoice } from "@/lib/repositories/chaseLogRepository";
import { formatPence } from "@/lib/money";
import { TierBadge } from "@/components/tier-badge";
import { TIER_META } from "@/components/tier-meta";
import { InterestDisclaimer } from "@/components/interest-disclaimer";
import { ChasePreviewDialog } from "@/components/chase-preview-dialog";
import { ContactFirstNameField } from "@/components/contact-first-name-field";
import { InvoiceStatusSelect } from "@/components/invoice-status-select";
import { Label } from "@/components/ui/label";

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  previewed: "bg-slate-50 text-slate-700 ring-slate-200",
  failed: "bg-rose-50 text-rose-800 ring-rose-200",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 min-w-0 text-sm font-medium">{children}</div>
    </div>
  );
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceView(env.DEFAULT_ORG_ID, id);
  if (!invoice) notFound();

  const chaseLogs = await listChaseLogsForInvoice(env.DEFAULT_ORG_ID, id);
  const canChase = invoice.tier !== null && invoice.status === "outstanding";
  const tierMeta = invoice.tier ? TIER_META[invoice.tier] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <section className="bg-hero rounded-2xl border p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{invoice.invoiceNumber}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{invoice.clientName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <TierBadge tier={invoice.tier} />
              <span>
                {invoice.daysOverdue > 0
                  ? `${invoice.daysOverdue} days overdue`
                  : `Due ${invoice.dueDate.toLocaleDateString("en-GB")}`}
              </span>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-medium text-muted-foreground">Amount outstanding</p>
            <p className="tabular text-3xl font-semibold tracking-tight">{formatPence(invoice.amount)}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-6 shadow-xs">
            <h2 className="text-sm font-semibold">Invoice details</h2>
            <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3">
              <Field label="Issue date">{invoice.issueDate.toLocaleDateString("en-GB")}</Field>
              <Field label="Due date">{invoice.dueDate.toLocaleDateString("en-GB")}</Field>
              <Field label="Times chased">{invoice.chaseCount}</Field>
              <Field label="Client email">
                <span className="block truncate" title={invoice.clientEmail ?? undefined}>
                  {invoice.clientEmail ?? "Not on file"}
                </span>
              </Field>
              <div>
                <Label htmlFor="contact-first-name" className="text-xs font-medium text-muted-foreground">
                  Contact first name
                </Label>
                <div className="mt-1">
                  <ContactFirstNameField invoiceId={invoice.id} initialValue={invoice.contactFirstName} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  <InvoiceStatusSelect invoiceId={invoice.id} initialStatus={invoice.status} />
                </div>
              </div>
            </div>
            {invoice.notes && (
              <p className="mt-5 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{invoice.notes}</p>
            )}
          </section>

          <InterestDisclaimer
            interestPence={invoice.statutoryInterestPence}
            compensationPence={invoice.statutoryCompensationPence}
            totalPence={invoice.statutoryTotalPence}
          />

          <section className="rounded-2xl border bg-card p-6 shadow-xs">
            <h2 className="text-sm font-semibold">Chase history</h2>
            {chaseLogs.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No reminders yet for this invoice.</p>
            ) : (
              <ol className="mt-4 space-y-4 border-l pl-5">
                {chaseLogs.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-brand" />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{log.subject}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[log.status] ?? ""}`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {log.sentAt.toLocaleDateString("en-GB")} · <TierBadge tier={log.tier} className="scale-90" />
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl border bg-card p-6 shadow-xs">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              {canChase ? <Sparkles className="size-5" /> : <Mail className="size-5" />}
            </span>
            {canChase && tierMeta ? (
              <>
                <h2 className="mt-4 text-base font-semibold">Draft a {tierMeta.label.toLowerCase()} reminder</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tierMeta.tone}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  You&apos;ll see a full preview and can edit it before anything is sent.
                </p>
                <div className="mt-5">
                  <ChasePreviewDialog
                    invoiceId={invoice.id}
                    hasClientEmail={Boolean(invoice.clientEmail)}
                    interest={{
                      interestPence: invoice.statutoryInterestPence,
                      compensationPence: invoice.statutoryCompensationPence,
                      totalPence: invoice.statutoryTotalPence,
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-base font-semibold">No reminder needed</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {invoice.status !== "outstanding"
                    ? "This invoice is no longer outstanding, so it won't be chased."
                    : "This invoice isn't overdue yet. It will appear on the dashboard once it passes its due date."}
                </p>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
