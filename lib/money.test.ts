import { describe, expect, it } from "vitest";
import { formatPence, penceToPounds, poundsToPence } from "@/lib/money";

describe("money", () => {
  it("formatPence renders GBP currency with two decimal places", () => {
    expect(formatPence(123_456)).toBe("£1,234.56");
  });

  it("formatPence renders zero correctly", () => {
    expect(formatPence(0)).toBe("£0.00");
  });

  it("poundsToPence and penceToPounds round-trip", () => {
    const pence = poundsToPence(1234.56);
    expect(pence).toBe(123_456);
    expect(penceToPounds(pence)).toBe(1234.56);
  });

  it("poundsToPence avoids floating-point drift on known-tricky values", () => {
    expect(poundsToPence(19.99)).toBe(1_999);
    expect(poundsToPence(0.1)).toBe(10);
    expect(poundsToPence(0.29)).toBe(29);
  });
});
