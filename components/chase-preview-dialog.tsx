"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterestDisclaimer } from "@/components/interest-disclaimer";
import { generateDraftAction, sendChaseAction } from "@/app/invoices/[id]/actions";
import type { ChaseDraft } from "@/lib/llm/draft";
import { renderChaseEmail } from "@/lib/email/render";

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
    try {
      const result = await generateDraftAction(invoiceId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDraft(result.draft);
      setOpen(true);
    } catch {
      toast.error("Could not generate a draft — please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSend() {
    if (!draft) return;
    setIsSending(true);
    try {
      const result = await sendChaseAction(invoiceId, draft);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
    } catch {
      toast.error("Something went wrong — the email may not have been sent. Check the chase history.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <Button onClick={handleGenerate} disabled={isGenerating || !hasClientEmail} size="lg" className="w-full">
        <Sparkles />
        {isGenerating ? "Drafting with AI..." : "Generate chase email"}
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
              <Tabs defaultValue="text">
                <TabsList>
                  <TabsTrigger value="text">Plain text</TabsTrigger>
                  <TabsTrigger value="html">HTML preview</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="space-y-2">
                  <Label htmlFor="chase-body">Body</Label>
                  <Textarea
                    id="chase-body"
                    rows={10}
                    className="whitespace-pre-wrap"
                    value={draft.body}
                    onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                  />
                </TabsContent>
                <TabsContent value="html">
                  <div
                    className="rounded-lg border border-input p-3 text-sm"
                    dangerouslySetInnerHTML={{ __html: renderChaseEmail(draft.body).bodyHtml }}
                  />
                </TabsContent>
              </Tabs>
              <InterestDisclaimer {...interest} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleGenerate} disabled={isGenerating || isSending}>
              <Sparkles />
              {isGenerating ? "Redrafting..." : "Redraft"}
            </Button>
            <Button onClick={handleSend} disabled={isSending || !draft}>
              <Send />
              {isSending ? "Sending..." : "Approve & send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
