/**
 * Backstop to the prompt instruction in lib/prompt.ts that forbids the model
 * from stating statutory interest WILL be charged. This is a belt-and-braces
 * check, not a replacement for the prompt rule — it scans the drafted body
 * for phrasing that asserts interest as a certainty rather than a possibility.
 */
const FORBIDDEN_PATTERNS: RegExp[] = [
  /interest\s+will\s+be\s+charged/i,
  /you\s+will\s+(?:be\s+charged|pay)\s+interest/i,
  /we\s+will\s+charge\s+(?:you\s+)?interest/i,
  /interest\s+has\s+been\s+(?:added|applied|charged)/i,
  /interest\s+is\s+now\s+(?:due|payable|owed)/i,
];

export type SafetyCheckResult =
  | { safe: true }
  | { safe: false; matchedPattern: string };

export function checkChaseEmailSafety(body: string): SafetyCheckResult {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(body)) {
      return { safe: false, matchedPattern: pattern.source };
    }
  }
  return { safe: true };
}
