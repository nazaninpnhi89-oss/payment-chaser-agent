import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TierBadge } from "@/components/tier-badge";
import { formatPence } from "@/lib/money";
import type { InvoiceView } from "@/lib/types";

export function InvoiceTable({ invoices }: { invoices: InvoiceView[] }) {
  if (invoices.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No invoices to show.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Days overdue</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead>Chased</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell>
              <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                {invoice.invoiceNumber}
              </Link>
            </TableCell>
            <TableCell>{invoice.clientName}</TableCell>
            <TableCell>{formatPence(invoice.amount)}</TableCell>
            <TableCell>{invoice.daysOverdue > 0 ? invoice.daysOverdue : "—"}</TableCell>
            <TableCell>
              <TierBadge tier={invoice.tier} />
            </TableCell>
            <TableCell>
              {invoice.chaseCount > 0
                ? `${invoice.chaseCount}× (last ${invoice.lastChasedAt?.toLocaleDateString("en-GB")})`
                : "Never"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
