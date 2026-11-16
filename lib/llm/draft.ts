import "server-only";
import type { ChatCompletion } from "groq-sdk/resources/chat/completions";
import { groqClient } from "@/lib/llm/groq";
import { assembleChasePrompt, checkBannedPhrases, type VerifiedFacts } from "@/lib/prompt";
import { normalizeChaseEmailBody } from "@/lib/email/normalize";
import { env } from "@/lib/env";

export type ChaseDraft = { subject: string; body: string };

const DRAFT_TOOL_NAME = "draft_chase_email";
const TEMPERATURE = 0.7;
// Generous ceiling: reasoning models (e.g. openai/gpt-oss-*) spend part of the
// completion budget thinking before they call the tool. The email itself is
// kept short by the prompt's length instructions, not by this cap.
const MAX_TOKENS = 2048;

/** Reasoning models need a low effort hint so they reliably emit the tool call. */
function reasoningOptions(model: string): { reasoning_effort?: "low" } {
  return model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {};
}

const DRAFT_TOOL = {
  type: "function" as const,
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
};

function parseToolCall(response: ChatCompletion): ChaseDraft {
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

/**
 * Uses forced tool-use (not free-text parsing) to get a structured
 * {subject, body} result — the model MUST call this tool, so there is no
 * delimiter-parsing ambiguity between the drafted prose and control text.
 *
 * If the draft trips the banned-phrase/exclamation-mark check, we regenerate
 * exactly once, naming the specific violation to the model, then accept
 * whatever comes back — this is a nudge, not an enforcement loop.
 */
export async function generateChaseDraft(facts: VerifiedFacts): Promise<ChaseDraft> {
  const { system, user } = assembleChasePrompt(facts);

  const response = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    ...reasoningOptions(env.GROQ_MODEL),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [DRAFT_TOOL],
    tool_choice: { type: "function", function: { name: DRAFT_TOOL_NAME } },
  });

  const draft = parseToolCall(response);
  const check = checkBannedPhrases(`${draft.subject}\n${draft.body}`);
  if (check.ok) {
    return { ...draft, body: normalizeChaseEmailBody(draft.body, facts.emailSignOff ?? facts.senderName) };
  }

  const retryResponse = await groqClient.chat.completions.create({
    model: env.GROQ_MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    ...reasoningOptions(env.GROQ_MODEL),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
      {
        role: "user",
        content: `Your previous draft used ${check.violation}, which is banned. Rewrite the email from scratch without it, keeping the same tier, register, and length instructions.`,
      },
    ],
    tools: [DRAFT_TOOL],
    tool_choice: { type: "function", function: { name: DRAFT_TOOL_NAME } },
  });

  const retryDraft = parseToolCall(retryResponse);
  return { ...retryDraft, body: normalizeChaseEmailBody(retryDraft.body, facts.emailSignOff ?? facts.senderName) };
}
