"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InterestDisclaimer } from "@/components/interest-disclaimer";
import { generateDraftAction, sendChaseAction } from "@/app/invoices/[id]/actions";
import type { ChaseDraft } from "@/lib/llm/draft";

export function ChasePreviewDialog({
  invoiceId,
  hasClientEmail,
  interest,
}: {
  invoiceId: string;
  hasClientEmail: boolean;
  interest: { interestPence: number; compensationPence: number; totalPence: number };
}) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState<ChaseDraft | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    const result = await generateDraftAction(invoiceId);
    setIsGenerating(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setDraft(result.draft);
    setOpen(true);
  }

  async function handleSend() {
    if (!draft) return;
    setIsSending(true);
    const result = await sendChaseAction(invoiceId, draft);
    setIsSending(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    setOpen(false);
  }

  return (
    <>
      <Button onClick={handleGenerate} disabled={isGenerating || !hasClientEmail}>
        {isGenerating ? "Drafting..." : "Generate chase email"}
      </Button>
      {!hasClientEmail && (
        <p className="mt-2 text-xs text-muted-foreground">
          No client email on file — add one before a chase email can be sent.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview chase email</DialogTitle>
            <DialogDescription>
              Review before sending. Nothing is sent until you click Approve &amp; send.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chase-subject">Subject</Label>
                <Input
                  id="chase-subject"
                  value={draft.subject}
                  onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chase-body">Body</Label>
                <Textarea
                  id="chase-body"
                  rows={10}
                  value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                />
              </div>
              <InterestDisclaimer {...interest} />
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleSend} disabled={isSending || !draft}>
              {isSending ? "Sending..." : "Approve & send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
