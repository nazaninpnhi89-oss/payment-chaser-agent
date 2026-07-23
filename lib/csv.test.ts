import { describe, expect, it } from "vitest";
import { normaliseCsvRows, parseCsvText, type CsvImportRow } from "@/lib/csv";

function row(overrides: Partial<CsvImportRow> = {}): CsvImportRow {
  return {
    invoicenumber: "INV-001",
    clientname: "Acme Builders",
    clientemail: "billing@acme.example",
    amount: "1234.56",
    issuedate: "2026-01-01",
    duedate: "2026-01-31",
    notes: "Some notes",
    ...overrides,
  };
}

describe("normaliseCsvRows", () => {
  it("accepts a fully valid row", () => {
    const { validRows, errors } = normaliseCsvRows([row()]);
    expect(errors).toEqual([]);
    expect(validRows).toHaveLength(1);
    expect(validRows[0]).toMatchObject({
      invoiceNumber: "INV-001",
      clientName: "Acme Builders",
      clientEmail: "billing@acme.example",
      amount: 123_456,
      notes: "Some notes",
    });
  });

  it.each([
    ["invoicenumber", "invoiceNumber is required"],
    ["clientname", "clientName is required"],
    ["amount", "amount is required"],
    ["issuedate", "issueDate is required"],
    ["duedate", "dueDate is required"],
  ] as const)("rejects a row missing %s", (field, expectedMessage) => {
    const { validRows, errors } = normaliseCsvRows([row({ [field]: undefined })]);
    expect(validRows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.errors).toContain(expectedMessage);
  });

  it("valid rows still import alongside invalid rows in the same batch", () => {
    const { validRows, errors } = normaliseCsvRows([
      row({ invoicenumber: undefined }),
      row({ invoicenumber: "INV-002" }),
    ]);
    expect(errors).toHaveLength(1);
    expect(validRows).toHaveLength(1);
    expect(validRows[0]?.invoiceNumber).toBe("INV-002");
  });

  it("normalises an absent clientEmail to null, not empty string", () => {
    const { validRows } = normaliseCsvRows([row({ clientemail: undefined })]);
    expect(validRows[0]?.clientEmail).toBeNull();
  });

  it("normalises an absent notes to null", () => {
    const { validRows } = normaliseCsvRows([row({ notes: undefined })]);
    expect(validRows[0]?.notes).toBeNull();
  });

  it("rejects a malformed clientEmail at import time", () => {
    const { validRows, errors } = normaliseCsvRows([row({ clientemail: "not-an-email" })]);
    expect(validRows).toEqual([]);
    expect(errors[0]?.errors).toContain("clientEmail is not a valid email address");
  });

  it("rejects a non-numeric amount", () => {
    const { errors } = normaliseCsvRows([row({ amount: "abc" })]);
    expect(errors[0]?.errors).toContain("amount must be a positive number");
  });

  it("rejects a negative amount", () => {
    const { errors } = normaliseCsvRows([row({ amount: "-50" })]);
    expect(errors[0]?.errors).toContain("amount must be a positive number");
  });

  it("leniently accepts a currency-symbol and comma-formatted amount", () => {
    const { validRows, errors } = normaliseCsvRows([row({ amount: "£1,234.56" })]);
    expect(errors).toEqual([]);
    expect(validRows[0]?.amount).toBe(123_456);
  });

  it("rejects an unparseable issueDate", () => {
    const { errors } = normaliseCsvRows([row({ issuedate: "not-a-date" })]);
    expect(errors[0]?.errors).toContain("issueDate is not a valid date");
  });

  it("rejects an unparseable dueDate", () => {
    const { errors } = normaliseCsvRows([row({ duedate: "not-a-date" })]);
    expect(errors[0]?.errors).toContain("dueDate is not a valid date");
  });

  it("rejects a dueDate before issueDate", () => {
    const { errors } = normaliseCsvRows([
      row({ issuedate: "2026-02-01", duedate: "2026-01-01" }),
    ]);
    expect(errors[0]?.errors).toContain("dueDate cannot be before issueDate");
  });

  it("handles an empty batch without crashing", () => {
    expect(normaliseCsvRows([])).toEqual({ validRows: [], errors: [] });
  });

  it("reports rowNumber accounting for the header row (1-indexed, header = row 1)", () => {
    const { errors } = normaliseCsvRows([
      row(),
      row(),
      row({ invoicenumber: undefined }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.rowNumber).toBe(4);
  });
});

describe("parseCsvText", () => {
  it("maps header variants case-insensitively", () => {
    const csv = "Invoice Number,CLIENT_NAME,amount,Issue Date,Due Date\nINV-1,Acme,100,2026-01-01,2026-01-31\n";
    const { rows } = parseCsvText(csv);
    expect(rows[0]).toMatchObject({
      invoicenumber: "INV-1",
      clientname: "Acme",
      amount: "100",
      issuedate: "2026-01-01",
      duedate: "2026-01-31",
    });
  });

  it("ignores unrecognised extra columns rather than erroring", () => {
    const csv = "invoiceNumber,clientName,amount,issueDate,dueDate,rogueColumn\nINV-1,Acme,100,2026-01-01,2026-01-31,whatever\n";
    const { rows, parseErrors } = parseCsvText(csv);
    expect(parseErrors).toEqual([]);
    expect(rows[0]?.invoicenumber).toBe("INV-1");
  });

  it("returns no rows for a headers-only CSV", () => {
    const csv = "invoiceNumber,clientName,amount,issueDate,dueDate\n";
    const { rows } = parseCsvText(csv);
    expect(rows).toEqual([]);
  });
});
