import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }).notNull(),
  replyToEmail: varchar("reply_to_email", { length: 255 }).notNull(),
  standardPaymentTermsDays: integer("standard_payment_terms_days").notNull().default(30),
  emailSignOff: text("email_sign_off"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
