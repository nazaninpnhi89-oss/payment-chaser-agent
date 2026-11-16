import Link from "next/link";
import { ChevronRight, Download, FileUp, Inbox } from "lucide-react";
import { TierBadge } from "@/components/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPence } from "@/lib/money";
import type { InvoiceView } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

function daysClass(days: number) {
  if (days > 60) return "text-rose-700";
  if (days > 30) return "text-orange-700";
  if (days > 14) return "text-amber-700";
  return "text-foreground";
}

export function EmptyInvoices() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Inbox className="size-5" />
      </span>
      <p className="mt-4 text-base font-semibold">No overdue invoices — nice.</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Import a CSV of your invoices to get started, or try it out with our sample file.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/import" className={buttonVariants()}>
          <FileUp /> Import invoices
        </Link>
        <a href="/sample-invoices.csv" download className={buttonVariants({ variant: "outline" })}>
          <Download /> Download sample CSV
        </a>
      </div>
    </div>
  );
}

export function InvoiceTable({ invoices }: { invoices: InvoiceView[] }) {
  if (invoices.length === 0) return <EmptyInvoices />;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Overdue</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Last chased</th>
              <th className="px-4 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="group relative transition-colors hover:bg-accent/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                      {initials(invoice.clientName)}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {invoice.clientName}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {invoice.contactFirstName ? `${invoice.contactFirstName} · ` : ""}
                        {invoice.clientEmail ?? "No email on file"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{invoice.invoiceNumber}</td>
                <td className="tabular px-4 py-3 text-right font-medium">{formatPence(invoice.amount)}</td>
                <td className={cn("tabular px-4 py-3 text-right font-medium", daysClass(invoice.daysOverdue))}>
                  {invoice.daysOverdue > 0 ? `${invoice.daysOverdue}d` : "—"}
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier={invoice.tier} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {invoice.chaseCount > 0
                    ? `${invoice.lastChasedAt?.toLocaleDateString("en-GB")} · ${invoice.chaseCount}×`
                    : "Never"}
                </td>
                <td className="px-4 py-3 text-right">
                  <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
