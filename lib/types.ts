import type { Tier } from "@/lib/tier";

export type InvoiceStatus = "outstanding" | "paid" | "disputed" | "written_off";

export type Invoice = {
  id: string;
  organisationId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  amount: number; // GBP, stored in pence as integer
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Derived at read time, never stored.
export type InvoiceView = Invoice & {
  daysOverdue: number;
  tier: Tier | null;
  statutoryInterestPence: number;
  statutoryCompensationPence: number;
  statutoryTotalPence: number;
  lastChasedAt: Date | null;
  chaseCount: number;
};

export type { Tier };

export type ChaseStatus = "sent" | "previewed" | "failed";

export type ChaseLog = {
  id: string;
  organisationId: string;
  invoiceId: string;
  tier: Tier;
  subject: string;
  body: string;
  recipientEmail: string;
  sentAt: Date;
  status: ChaseStatus;
  errorMessage: string | null;
};

export type Organisation = {
  id: string;
  businessName: string;
  senderName: string;
  replyToEmail: string;
  standardPaymentTermsDays: number;
  emailSignOff: string | null;
  createdAt: Date;
};
