import "server-only";
import { z } from "zod";

/**
 * The sole sanctioned place process.env is read in this codebase. Every other
 * module — including lib/email and lib/llm — imports from here rather than
 * reading process.env directly, so `grep -r process.env` outside this file
 * returning nothing is a reliable check that the boundary is being honoured.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DEFAULT_ORG_ID: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(1),
  SENDING_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  TEST_REDIRECT_EMAIL: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() !== "" ? value.trim() : null)),
  NEXT_PUBLIC_APP_URL: z.string().min(1).default("http://localhost:3000"),
  // Authenticates the weekly-reminder cron endpoint (app/api/cron/weekly-reminder).
  // Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when
  // invoking Cron Jobs if this env var is set on the project.
  CRON_SECRET: z.string().min(1),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DEFAULT_ORG_ID: process.env.DEFAULT_ORG_ID,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  SENDING_ENABLED: process.env.SENDING_ENABLED,
  TEST_REDIRECT_EMAIL: process.env.TEST_REDIRECT_EMAIL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  CRON_SECRET: process.env.CRON_SECRET,
});
