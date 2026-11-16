"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateInvoiceStatusAction } from "@/app/invoices/[id]/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceStatus } from "@/lib/types";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  outstanding: "Outstanding",
  paid: "Paid",
  disputed: "Disputed",
  written_off: "Written off",
};

export function InvoiceStatusSelect({
  invoiceId,
  initialStatus,
}: {
  invoiceId: string;
  initialStatus: InvoiceStatus;
}) {
  const [status, setStatus] = useState<InvoiceStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: InvoiceStatus) {
    if (next === status) return;
    const previous = status;
    setStatus(next);
    setIsSaving(true);
    try {
      const result = await updateInvoiceStatusAction(invoiceId, next);
      if (!result.success) {
        setStatus(previous);
        toast.error(result.error);
        return;
      }
      toast.success(`Marked as ${STATUS_LABELS[next].toLowerCase()}.`);
    } catch {
      setStatus(previous);
      toast.error("Could not update the invoice status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Select
      value={status}
      onValueChange={(value) => handleChange(value as InvoiceStatus)}
      disabled={isSaving}
    >
      <SelectTrigger className="h-8 w-full" aria-label="Invoice status">
        <SelectValue>{STATUS_LABELS[status]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((value) => (
          <SelectItem key={value} value={value}>
            {STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
