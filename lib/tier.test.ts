import { describe, expect, it } from "vitest";
import { getTier } from "@/lib/tier";

describe("getTier", () => {
  it("excludes invoices that are not yet due", () => {
    expect(getTier(0)).toBeNull();
    expect(getTier(-5)).toBeNull();
  });

  it("returns gentle for 1-14 days overdue", () => {
    expect(getTier(1)).toBe("gentle");
    expect(getTier(14)).toBe("gentle");
  });

  it("returns firm for 15-30 days overdue", () => {
    expect(getTier(15)).toBe("firm");
    expect(getTier(30)).toBe("firm");
  });

  it("returns formal for 31-60 days overdue", () => {
    expect(getTier(31)).toBe("formal");
    expect(getTier(60)).toBe("formal");
  });

  it("returns final for 61+ days overdue", () => {
    expect(getTier(61)).toBe("final");
    expect(getTier(1000)).toBe("final");
  });
});
