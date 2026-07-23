import Link from "next/link";
import { env } from "@/lib/env";
import { listInvoicesWithView } from "@/lib/repositories/invoiceRepository";
import { InvoiceTable } from "@/components/invoice-table";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ showAll?: string }>;
}) {
  const { showAll } = await searchParams;
  const includeNotYetDue = showAll === "1";

  const invoices = await listInvoicesWithView(env.DEFAULT_ORG_ID, {
    statuses: ["outstanding"],
    includeNotYetDue,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overdue invoices</h1>
          <p className="text-sm text-muted-foreground">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"} shown
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={includeNotYetDue ? "/" : "/?showAll=1"}
            className={buttonVariants({ variant: "outline" })}
          >
            {includeNotYetDue ? "Only overdue" : "Show all outstanding"}
          </Link>
          <Link href="/import" className={buttonVariants()}>
            Import CSV
          </Link>
        </div>
      </div>

      <InvoiceTable invoices={invoices} />
    </div>
  );
}
