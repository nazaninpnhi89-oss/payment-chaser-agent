import {
  bigint,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organisations } from "@/lib/db/schema/organisations";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "outstanding",
  "paid",
  "disputed",
  "written_off",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
    clientName: varchar("client_name", { length: 255 }).notNull(),
    clientEmail: varchar("client_email", { length: 255 }),
    amount: bigint("amount", { mode: "number" }).notNull(), // pence
    issueDate: date("issue_date", { mode: "date" }).notNull(),
    dueDate: date("due_date", { mode: "date" }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("outstanding"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("invoices_org_status_idx").on(table.organisationId, table.status),
    index("invoices_org_due_date_idx").on(table.organisationId, table.dueDate),
    index("invoices_org_invoice_number_idx").on(table.organisationId, table.invoiceNumber),
  ],
);
