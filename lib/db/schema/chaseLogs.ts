import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organisations } from "@/lib/db/schema/organisations";
import { invoices } from "@/lib/db/schema/invoices";

export const chaseTierEnum = pgEnum("chase_tier", ["gentle", "firm", "formal", "final"]);
export const chaseStatusEnum = pgEnum("chase_status", ["sent", "previewed", "failed"]);

export const chaseLogs = pgTable(
  "chase_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id),
    tier: chaseTierEnum("tier").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    // Always the *intended* recipient (invoice.clientEmail), never the
    // TEST_REDIRECT_EMAIL address — the redirect is a transport concern, the
    // log records who the system believes it addressed.
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    status: chaseStatusEnum("status").notNull(),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("chase_logs_org_invoice_idx").on(table.organisationId, table.invoiceId),
    index("chase_logs_org_sent_at_idx").on(table.organisationId, table.sentAt),
  ],
);
