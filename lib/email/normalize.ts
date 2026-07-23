/**
 * Belt-and-braces whitespace cleanup for LLM-drafted (or user-edited) chase
 * email bodies. The prompt instructs the model to separate blocks with a
 * blank line and end on the sender's name, but models (and manual textarea
 * edits) don't always comply — this is what actually guarantees the shape
 * before the body is displayed, stored, or sent.
 */
export function normalizeChaseEmailBody(rawBody: string, senderName: string): string {
  const trimmedSenderName = senderName.trim();

  let body = rawBody
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();

  // Collapse three-or-more consecutive newlines down to exactly one blank line.
  body = body.replace(/\n{3,}/g, "\n\n");

  const lines = body.split("\n");

  // Ensure a blank line after the salutation (the first line).
  if (lines.length > 1 && (lines[1] ?? "").trim() !== "") {
    lines.splice(1, 0, "");
  }

  // Locate the sign-off block: the line matching the sender's name, plus an
  // optional closing word directly above it (e.g. "Kind regards,").
  const senderLineIndex = lines.findIndex((line) => line.trim() === trimmedSenderName);
  if (senderLineIndex > 0) {
    let signOffStart = senderLineIndex;
    if (signOffStart - 1 >= 0 && (lines[signOffStart - 1] ?? "").trim() !== "") {
      signOffStart -= 1;
    }
    if (signOffStart > 0 && (lines[signOffStart - 1] ?? "").trim() !== "") {
      lines.splice(signOffStart, 0, "");
    }
  } else if (trimmedSenderName !== "") {
    lines.push("", trimmedSenderName);
  }

  body = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return `${body}\n`;
}
