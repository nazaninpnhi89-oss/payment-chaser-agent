import { describe, expect, it } from "vitest";
import {
  applyColumnMapping,
  guessColumnMapping,
  normaliseCsvRows,
  parseCsvRaw,
  type ColumnMapping,
  type CsvImportRow,
} from "@/lib/csv";

function row(overrides: Partial<CsvImportRow> = {}): CsvImportRow {
  return {
    invoiceNumber: "INV-001",
    clientName: "Acme Builders",
    clientEmail: "billing@acme.example",
    amount: "1234.56",
    issueDate: "2026-01-01",
    dueDate: "2026-01-31",
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
    ["invoiceNumber", "invoiceNumber is required"],
    ["clientName", "clientName is required"],
    ["amount", "amount is required"],
    ["issueDate", "issueDate is required"],
    ["dueDate", "dueDate is required"],
  ] as const)("rejects a row missing %s", (field, expectedMessage) => {
    const { validRows, errors } = normaliseCsvRows([row({ [field]: undefined })]);
    expect(validRows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.errors).toContain(expectedMessage);
  });

  it("valid rows still import alongside invalid rows in the same batch", () => {
    const { validRows, errors } = normaliseCsvRows([
      row({ invoiceNumber: undefined }),
      row({ invoiceNumber: "INV-002" }),
    ]);
    expect(errors).toHaveLength(1);
    expect(validRows).toHaveLength(1);
    expect(validRows[0]?.invoiceNumber).toBe("INV-002");
  });

  it("normalises an absent clientEmail to null, not empty string", () => {
    const { validRows } = normaliseCsvRows([row({ clientEmail: undefined })]);
    expect(validRows[0]?.clientEmail).toBeNull();
  });

  it("normalises an absent notes to null", () => {
    const { validRows } = normaliseCsvRows([row({ notes: undefined })]);
    expect(validRows[0]?.notes).toBeNull();
  });

  it("rejects a malformed clientEmail at import time", () => {
    const { validRows, errors } = normaliseCsvRows([row({ clientEmail: "not-an-email" })]);
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
    const { errors } = normaliseCsvRows([row({ issueDate: "not-a-date" })]);
    expect(errors[0]?.errors).toContain("issueDate is not a valid date");
  });

  it("rejects an unparseable dueDate", () => {
    const { errors } = normaliseCsvRows([row({ dueDate: "not-a-date" })]);
    expect(errors[0]?.errors).toContain("dueDate is not a valid date");
  });

  it("rejects a dueDate before issueDate", () => {
    const { errors } = normaliseCsvRows([
      row({ issueDate: "2026-02-01", dueDate: "2026-01-01" }),
    ]);
    expect(errors[0]?.errors).toContain("dueDate cannot be before issueDate");
  });

  it("parses DD/MM/YYYY as UK-format dates, not US MM/DD/YYYY", () => {
    // 5th June 2026 written the UK way — would be misread as May 6th under
    // US conventions, or rejected outright once the day exceeds 12.
    const { validRows, errors } = normaliseCsvRows([
      row({ issueDate: "01/06/2026", dueDate: "05/07/2026" }),
    ]);
    expect(errors).toEqual([]);
    expect(validRows[0]?.issueDate).toEqual(new Date(2026, 5, 1));
    expect(validRows[0]?.dueDate).toEqual(new Date(2026, 6, 5));
  });

  it("rejects an impossible DD/MM/YYYY date", () => {
    const { errors } = normaliseCsvRows([row({ issueDate: "31/02/2026" })]);
    expect(errors[0]?.errors).toContain("issueDate is not a valid date");
  });

  it("handles an empty batch without crashing", () => {
    expect(normaliseCsvRows([])).toEqual({ validRows: [], errors: [] });
  });

  it("reports rowNumber accounting for the header row (1-indexed, header = row 1)", () => {
    const { errors } = normaliseCsvRows([
      row(),
      row(),
      row({ invoiceNumber: undefined }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.rowNumber).toBe(4);
  });
});

describe("parseCsvRaw", () => {
  it("returns raw headers exactly as they appear in the file", () => {
    const csv = "Invoice Number,Contact,Contact Email,Total,Invoice Date,Due Date,Status\nINV-1,Acme,a@b.com,100,2026-01-01,2026-01-31,Open\n";
    const { headers, rows } = parseCsvRaw(csv);
    expect(headers).toEqual([
      "Invoice Number",
      "Contact",
      "Contact Email",
      "Total",
      "Invoice Date",
      "Due Date",
      "Status",
    ]);
    expect(rows[0]).toMatchObject({ "Invoice Number": "INV-1", Contact: "Acme", Total: "100" });
  });

  it("returns no rows for a headers-only CSV", () => {
    const csv = "invoiceNumber,clientName,amount,issueDate,dueDate\n";
    const { rows } = parseCsvRaw(csv);
    expect(rows).toEqual([]);
  });
});

describe("guessColumnMapping", () => {
  it("maps our own canonical header names to themselves", () => {
    const headers = ["invoiceNumber", "clientName", "clientEmail", "amount", "issueDate", "dueDate", "notes"];
    expect(guessColumnMapping(headers)).toEqual({
      invoiceNumber: "invoiceNumber",
      clientName: "clientName",
      clientEmail: "clientEmail",
      amount: "amount",
      issueDate: "issueDate",
      dueDate: "dueDate",
      notes: "notes",
    });
  });

  it("guesses a real-world alternate naming convention", () => {
    const headers = ["Invoice Number", "Contact", "Contact Email", "Total", "Invoice Date", "Due Date", "Status"];
    const mapping = guessColumnMapping(headers);
    expect(mapping).toMatchObject({
      invoiceNumber: "Invoice Number",
      clientName: "Contact",
      clientEmail: "Contact Email",
      amount: "Total",
      issueDate: "Invoice Date",
      dueDate: "Due Date",
    });
    expect(mapping.notes).toBeUndefined();
  });

  it("leaves a field unmapped when no header resembles it", () => {
    const headers = ["Invoice Number", "Total"];
    const mapping = guessColumnMapping(headers);
    expect(mapping.clientName).toBeUndefined();
    expect(mapping.notes).toBeUndefined();
  });
});

describe("applyColumnMapping", () => {
  it("maps raw rows to canonical field names using the given mapping", () => {
    const rawRows = [{ "Invoice Number": "INV-1", Contact: "Acme", Total: "250" }];
    const mapping: ColumnMapping = {
      invoiceNumber: "Invoice Number",
      clientName: "Contact",
      amount: "Total",
    };
    const [canonical] = applyColumnMapping(rawRows, mapping);
    expect(canonical).toMatchObject({
      invoiceNumber: "INV-1",
      clientName: "Acme",
      amount: "250",
      issueDate: undefined,
      dueDate: undefined,
    });
  });

  it("leaves a canonical field undefined when unmapped, ready for normaliseCsvRows to flag as missing", () => {
    const rawRows = [{ Total: "100" }];
    const [canonical] = applyColumnMapping(rawRows, {});
    expect(canonical?.invoiceNumber).toBeUndefined();
  });
});
