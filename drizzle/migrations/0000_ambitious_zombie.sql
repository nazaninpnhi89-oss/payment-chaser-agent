CREATE TYPE "public"."invoice_status" AS ENUM('outstanding', 'paid', 'disputed', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."chase_status" AS ENUM('sent', 'previewed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."chase_tier" AS ENUM('gentle', 'firm', 'formal', 'final');--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"sender_name" varchar(255) NOT NULL,
	"reply_to_email" varchar(255) NOT NULL,
	"standard_payment_terms_days" integer DEFAULT 30 NOT NULL,
	"email_sign_off" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"client_name" varchar(255) NOT NULL,
	"client_email" varchar(255),
	"amount" bigint NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "invoice_status" DEFAULT 'outstanding' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chase_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"tier" "chase_tier" NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "chase_status" NOT NULL,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chase_logs" ADD CONSTRAINT "chase_logs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chase_logs" ADD CONSTRAINT "chase_logs_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_org_status_idx" ON "invoices" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "invoices_org_due_date_idx" ON "invoices" USING btree ("organisation_id","due_date");--> statement-breakpoint
CREATE INDEX "invoices_org_invoice_number_idx" ON "invoices" USING btree ("organisation_id","invoice_number");--> statement-breakpoint
CREATE INDEX "chase_logs_org_invoice_idx" ON "chase_logs" USING btree ("organisation_id","invoice_id");--> statement-breakpoint
CREATE INDEX "chase_logs_org_sent_at_idx" ON "chase_logs" USING btree ("organisation_id","sent_at");