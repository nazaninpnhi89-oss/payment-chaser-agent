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
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-4-6"),
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
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DEFAULT_ORG_ID: process.env.DEFAULT_ORG_ID,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  SENDING_ENABLED: process.env.SENDING_ENABLED,
  TEST_REDIRECT_EMAIL: process.env.TEST_REDIRECT_EMAIL,
});
