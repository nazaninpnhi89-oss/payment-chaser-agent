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
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={handleBlur}
      disabled={isSaving}
      placeholder='Not set — emails will open with a plain "Hi"'
      className="h-8"
    />
  );
}
