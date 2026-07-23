"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Organisation } from "@/lib/types";

export function SettingsForm({ organisation }: { organisation: Organisation }) {
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    const result = await updateSettingsAction(formData);
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved.");
  }

  return (
    <form action={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" defaultValue={organisation.businessName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senderName">Sender name</Label>
        <Input id="senderName" name="senderName" defaultValue={organisation.senderName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="replyToEmail">Reply-to email</Label>
        <Input
          id="replyToEmail"
          name="replyToEmail"
          type="email"
          defaultValue={organisation.replyToEmail}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="standardPaymentTermsDays">Standard payment terms (days)</Label>
        <Input
          id="standardPaymentTermsDays"
          name="standardPaymentTermsDays"
          type="number"
          min={0}
          defaultValue={organisation.standardPaymentTermsDays}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="emailSignOff">Email sign-off</Label>
        <Textarea
          id="emailSignOff"
          name="emailSignOff"
          rows={3}
          defaultValue={organisation.emailSignOff ?? ""}
          placeholder="Kind regards,&#10;Jamie"
        />
      </div>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save settings"}
      </Button>
    </form>
  );
}
