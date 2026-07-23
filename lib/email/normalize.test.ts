import { describe, expect, it } from "vitest";
import { normalizeChaseEmailBody } from "@/lib/email/normalize";

describe("normalizeChaseEmailBody", () => {
  it("fixes a deliberately badly formatted draft", () => {
    const badlyFormatted =
      "Hi Sarah,   \n" +
      "Just a quick one — invoice 2041 for £4,850 was due last Friday and I don't think it's come through yet.   \n" +
      "\n\n\n\n" +
      "Could you let me know when it's likely to go out? If it's already in this week's run, ignore me.\n" +
      "Thanks,\n" +
      "Alex";

    const result = normalizeChaseEmailBody(badlyFormatted, "Alex");

    expect(result).toBe(
      [
        "Hi Sarah,",
        "",
        "Just a quick one — invoice 2041 for £4,850 was due last Friday and I don't think it's come through yet.",
        "",
        "Could you let me know when it's likely to go out? If it's already in this week's run, ignore me.",
        "",
        "Thanks,",
        "Alex",
        "",
      ].join("\n"),
    );
  });

  it("collapses three or more consecutive newlines to exactly two", () => {
    const result = normalizeChaseEmailBody("Hi\n\n\n\n\nBody text\n\nThanks,\nAlex", "Alex");
    expect(result).not.toMatch(/\n{3,}/);
  });

  it("ensures a blank line after the salutation line", () => {
    const result = normalizeChaseEmailBody("Hi Sarah,\nBody text here.\n\nThanks,\nAlex", "Alex");
    expect(result.split("\n").slice(0, 3)).toEqual(["Hi Sarah,", "", "Body text here."]);
  });

  it("ensures a blank line before the sign-off line", () => {
    const result = normalizeChaseEmailBody("Hi,\n\nBody text here.\nThanks,\nAlex", "Alex");
    expect(result).toContain("Body text here.\n\nThanks,\nAlex");
  });

  it("trims trailing whitespace on every line", () => {
    const result = normalizeChaseEmailBody("Hi,   \n\nBody text.  \n\nThanks,\nAlex", "Alex");
    expect(result.split("\n").some((line) => /\s$/.test(line))).toBe(false);
  });

  it("guarantees the body ends with the sender name and a single trailing newline", () => {
    const result = normalizeChaseEmailBody("Hi,\n\nBody text.\n\nThanks,\nAlex", "Alex");
    expect(result.endsWith("Alex\n")).toBe(true);
    expect(result.endsWith("Alex\n\n")).toBe(false);
  });

  it("appends the sender name as a sign-off when the model omits it entirely", () => {
    const result = normalizeChaseEmailBody("Hi,\n\nBody text with no sign-off at all.", "Alex");
    expect(result).toBe("Hi,\n\nBody text with no sign-off at all.\n\nAlex\n");
  });
});
