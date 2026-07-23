import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { assembleChasePrompt } from "@/lib/prompt";
import { buildVerifiedFacts } from "@/lib/verifiedFacts";

const TEMPERATURE = 0.7;
const MAX_TOKENS = 500;

/**
 * Dev-only diagnostic: returns the exact system/user payload that would be
 * sent to Groq for a given invoice, without calling the LLM. Lets us confirm
 * the tier and its instructions actually reach the model before debugging
 * further downstream. Disabled outside development so it never ships to prod.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invoiceId = new URL(request.url).searchParams.get("invoiceId");
  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoiceId query param" }, { status: 400 });
  }

  const factsResult = await buildVerifiedFacts(invoiceId);
  if (!factsResult.success) {
    return NextResponse.json({ error: factsResult.error }, { status: 400 });
  }

  const { system, user } = assembleChasePrompt(factsResult.facts);

  return NextResponse.json({
    model: env.GROQ_MODEL,
    temperature: TEMPERATURE,
    maxTokens: MAX_TOKENS,
    tier: factsResult.facts.tier,
    system,
    user,
  });
}
