"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { updateContactFirstNameAction } from "@/app/invoices/[id]/actions";

export function ContactFirstNameField({
  invoiceId,
  initialValue,
}: {
  invoiceId: string;
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleBlur() {
    if (value.trim() === (initialValue ?? "")) return;
    setIsSaving(true);
    try {
      await updateContactFirstNameAction(invoiceId, value);
    } catch {
      toast.error("Failed to save contact first name.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Input
      id="contact-first-name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={handleBlur}
      disabled={isSaving}
      placeholder="e.g. Sarah"
      title='Used in the greeting. If empty, emails open with a plain "Hi"'
      className="h-8"
    />
  );
}
