import "server-only";
import { anthropicClient } from "@/lib/llm/anthropic";
import { assembleChasePrompt, type VerifiedFacts } from "@/lib/prompt";
import { env } from "@/lib/env";

export type ChaseDraft = { subject: string; body: string };

const DRAFT_TOOL_NAME = "draft_chase_email";

/**
 * Uses forced tool-use (not free-text parsing) to get a structured
 * {subject, body} result — the model MUST call this tool, so there is no
 * delimiter-parsing ambiguity between the drafted prose and control text.
 */
export async function generateChaseDraft(facts: VerifiedFacts): Promise<ChaseDraft> {
  const { system, user } = assembleChasePrompt(facts);

  const response = await anthropicClient.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 1024,
    system,
    tools: [
      {
        name: DRAFT_TOOL_NAME,
        description: "Submit the drafted payment chase email.",
        input_schema: {
          type: "object",
          properties: {
            subject: { type: "string", description: "The email subject line." },
            body: { type: "string", description: "The email body text." },
          },
          required: ["subject", "body"],
        },
      },
    ],
    tool_choice: { type: "tool", name: DRAFT_TOOL_NAME },
    messages: [{ role: "user", content: user }],
  });

  const toolUse = response.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use",
  );
  if (!toolUse) throw new Error("LLM did not return a tool_use block");

  const input = toolUse.input as Partial<ChaseDraft>;
  if (typeof input.subject !== "string" || typeof input.body !== "string") {
    throw new Error("LLM tool_use input did not match the expected {subject, body} shape");
  }

  return { subject: input.subject, body: input.body };
}
