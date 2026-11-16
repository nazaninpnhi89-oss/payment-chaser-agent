import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { getInvoiceView } from "@/lib/repositories/invoiceRepository";
import { listChaseLogsForInvoice } from "@/lib/repositories/chaseLogRepository";
import { formatPence } from "@/lib/money";
import { TierBadge } from "@/components/tier-badge";
import { InterestDisclaimer } from "@/components/interest-disclaimer";
import { ChasePreviewDialog } from "@/components/chase-preview-dialog";
import { ContactFirstNameField } from "@/components/contact-first-name-field";
import { InvoiceStatusSelect } from "@/components/invoice-status-select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceView(env.DEFAULT_ORG_ID, id);
  if (!invoice) notFound();

  const chaseLogs = await listChaseLogsForInvoice(env.DEFAULT_ORG_ID, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoice {invoice.invoiceNumber}</h1>
        <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-medium">{formatPence(invoice.amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due date</p>
            <p className="font-medium">{invoice.dueDate.toLocaleDateString("en-GB")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Days overdue</p>
            <p className="font-medium">{invoice.daysOverdue > 0 ? invoice.daysOverdue : "Not yet due"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tier</p>
            <TierBadge tier={invoice.tier} />
          </div>
          <div>
            <p className="text-muted-foreground">Client email</p>
            <p className="font-medium">{invoice.clientEmail ?? "Not on file"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Times chased</p>
            <p className="font-medium">{invoice.chaseCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <InvoiceStatusSelect invoiceId={invoice.id} initialStatus={invoice.status} />
          </div>
          <div>
            <Label htmlFor="contact-first-name" className="text-muted-foreground">
              Contact first name
            </Label>
            <ContactFirstNameField invoiceId={invoice.id} initialValue={invoice.contactFirstName} />
          </div>
        </CardContent>
      </Card>

      <InterestDisclaimer
        interestPence={invoice.statutoryInterestPence}
        compensationPence={invoice.statutoryCompensationPence}
        totalPence={invoice.statutoryTotalPence}
      />

      {invoice.tier !== null && invoice.status === "outstanding" && (
        <ChasePreviewDialog
          invoiceId={invoice.id}
          hasClientEmail={Boolean(invoice.clientEmail)}
          interest={{
            interestPence: invoice.statutoryInterestPence,
            compensationPence: invoice.statutoryCompensationPence,
            totalPence: invoice.statutoryTotalPence,
          }}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Chase history</CardTitle>
        </CardHeader>
        <CardContent>
          {chaseLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chases yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chaseLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.sentAt.toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>
                      <TierBadge tier={log.tier} />
                    </TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell className="capitalize">{log.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
