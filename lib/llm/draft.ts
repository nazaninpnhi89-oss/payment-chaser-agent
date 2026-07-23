import "server-only";
import { groqClient } from "@/lib/llm/groq";
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

  const response = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: DRAFT_TOOL_NAME,
          description: "Submit the drafted payment chase email.",
          parameters: {
            type: "object",
            properties: {
              subject: { type: "string", description: "The email subject line." },
              body: { type: "string", description: "The email body text." },
            },
            required: ["subject", "body"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: DRAFT_TOOL_NAME } },
  });

  const toolCall = response.choices[0]?.message.tool_calls?.[0];
  if (!toolCall || toolCall.function.name !== DRAFT_TOOL_NAME) {
    throw new Error("LLM did not return the expected tool call");
  }

  let parsed: Partial<ChaseDraft>;
  try {
    parsed = JSON.parse(toolCall.function.arguments) as Partial<ChaseDraft>;
  } catch {
    throw new Error("LLM tool call arguments were not valid JSON");
  }

  if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") {
    throw new Error("LLM tool call input did not match the expected {subject, body} shape");
  }

  return { subject: parsed.subject, body: parsed.body };
}
