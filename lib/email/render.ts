export type RenderedEmail = { bodyHtml: string; bodyText: string };

/**
 * Turns the LLM-drafted plain-text body into simple paragraph-per-newline
 * HTML. No templating of disclaimers here — the disclaimer text lives only
 * in the UI (InterestDisclaimer component), never injected into the sent
 * email body itself, since the product rule is that the email may only note
 * interest MAY apply, not carry a legal-advice disclaimer aimed at the sender.
 */
export function renderChaseEmail(body: string): RenderedEmail {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");

  return { bodyHtml, bodyText: body };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
