import Link from "next/link";
import { FileUp } from "lucide-react";
import { env } from "@/lib/env";
import { listInvoicesWithView } from "@/lib/repositories/invoiceRepository";
import { InvoiceTable } from "@/components/invoice-table";
import { DashboardStats } from "@/components/dashboard-stats";
import { HowItWorks } from "@/components/how-it-works";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ showAll?: string }>;
}) {
  const { showAll } = await searchParams;
  const includeNotYetDue = showAll === "1";

  const invoices = await listInvoicesWithView(env.DEFAULT_ORG_ID, {
    statuses: ["outstanding"],
    includeNotYetDue: true,
  });
  const overdue = invoices.filter((invoice) => invoice.tier !== null);
  const shown = includeNotYetDue ? invoices : overdue;

  return (
    <div className="space-y-8">
      <section className="bg-hero overflow-hidden rounded-2xl border p-6 shadow-xs sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-brand uppercase">Welcome to Payment Chaser</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Chase overdue invoices without the awkward emails.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              AI drafts a reminder in exactly the right tone for how late each invoice is. You stay in
              control — every email is reviewed and approved by you before it goes anywhere.
            </p>
          </div>
          <Link href="/import" className={cn(buttonVariants({ size: "lg" }), "self-start lg:self-auto")}>
            <FileUp /> Import invoices
          </Link>
        </div>
        <div className="mt-6">
          <HowItWorks />
        </div>
      </section>

      <DashboardStats overdue={overdue} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {includeNotYetDue ? "All outstanding invoices" : "Overdue invoices"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {shown.length === 0
                ? "Nothing to chase right now."
                : "Open an invoice to draft, preview and approve a reminder."}
            </p>
          </div>
          <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm shadow-xs">
            <Link
              href="/"
              className={cn(
                "rounded-md px-3 py-1 font-medium transition-colors",
                !includeNotYetDue ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Overdue <span className="tabular text-muted-foreground">{overdue.length}</span>
            </Link>
            <Link
              href="/?showAll=1"
              className={cn(
                "rounded-md px-3 py-1 font-medium transition-colors",
                includeNotYetDue ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              All outstanding <span className="tabular text-muted-foreground">{invoices.length}</span>
            </Link>
          </div>
        </div>
        <InvoiceTable invoices={shown} />
      </section>
    </div>
  );
}
