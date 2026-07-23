import Papa from "papaparse";
import { poundsToPence } from "@/lib/money";

export type CsvImportRow = {
  invoicenumber?: string;
  clientname?: string;
  clientemail?: string;
  amount?: string;
  issuedate?: string;
  duedate?: string;
  notes?: string;
};

export type NormalisedInvoiceInput = {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  amount: number; // pence
  issueDate: Date;
  dueDate: Date;
  notes: string | null;
};

export type RowValidationError = {
  rowNumber: number; // 1-indexed, matching spreadsheet rows (header = row 1)
  errors: string[];
  raw: CsvImportRow;
};

export type CsvImportResult = {
  validRows: NormalisedInvoiceInput[];
  errors: RowValidationError[];
};

const HEADER_ALIASES: Record<keyof CsvImportRow, string[]> = {
  invoicenumber: ["invoicenumber", "invoice number", "invoice_number"],
  clientname: ["clientname", "client name", "client_name"],
  clientemail: ["clientemail", "client email", "client_email"],
  amount: ["amount"],
  issuedate: ["issuedate", "issue date", "issue_date"],
  duedate: ["duedate", "due date", "due_date"],
  notes: ["notes"],
};

function remapHeaders(rawRow: Record<string, string>): CsvImportRow {
  const canonical: CsvImportRow = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
    keyof CsvImportRow,
    string[],
  ][]) {
    for (const [key, value] of Object.entries(rawRow)) {
      if (aliases.includes(key.trim().toLowerCase())) {
        canonical[field] = value;
        break;
      }
    }
  }
  return canonical;
}

/**
 * Pure in the sense that matters here: string in, structured rows out, no I/O.
 * Uses papaparse for raw CSV tokenising only — all validation/normalisation
 * logic lives in normaliseCsvRows below, which has no dependency on papaparse
 * at all and is unit-tested in isolation.
 */
export function parseCsvText(csvText: string): {
  rows: CsvImportRow[];
  parseErrors: string[];
} {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  return {
    rows: result.data.map(remapHeaders),
    parseErrors: result.errors.map(
      (error) => `Row ${error.row ?? "?"}: ${error.message}`,
    ),
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseAmountToPence(raw: string): number | null {
  const cleaned = raw.trim().replace(/[£,]/g, "");
  if (cleaned === "" || Number.isNaN(Number(cleaned))) return null;
  const pounds = Number(cleaned);
  if (pounds < 0) return null;
  return poundsToPence(pounds);
}

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Pure: no I/O, no Date.now() — issueDate/dueDate come from the row itself,
 * never from "now". This is the function that gets exhaustively unit tested.
 */
export function normaliseCsvRows(rows: CsvImportRow[]): CsvImportResult {
  const validRows: NormalisedInvoiceInput[] = [];
  const errors: RowValidationError[] = [];

  rows.forEach((row, index) => {
    const rowErrors: string[] = [];

    const invoiceNumber = row.invoicenumber?.trim();
    if (!invoiceNumber) rowErrors.push("invoiceNumber is required");

    const clientName = row.clientname?.trim();
    if (!clientName) rowErrors.push("clientName is required");

    let clientEmail: string | null = null;
    const rawEmail = row.clientemail?.trim();
    if (rawEmail) {
      if (!EMAIL_PATTERN.test(rawEmail)) {
        rowErrors.push("clientEmail is not a valid email address");
      } else {
        clientEmail = rawEmail;
      }
    }

    let amount: number | null = null;
    if (!row.amount?.trim()) {
      rowErrors.push("amount is required");
    } else {
      amount = parseAmountToPence(row.amount);
      if (amount === null) rowErrors.push("amount must be a positive number");
    }

    let issueDate: Date | null = null;
    if (!row.issuedate?.trim()) {
      rowErrors.push("issueDate is required");
    } else {
      issueDate = parseDate(row.issuedate);
      if (issueDate === null) rowErrors.push("issueDate is not a valid date");
    }

    let dueDate: Date | null = null;
    if (!row.duedate?.trim()) {
      rowErrors.push("dueDate is required");
    } else {
      dueDate = parseDate(row.duedate);
      if (dueDate === null) rowErrors.push("dueDate is not a valid date");
    }

    if (issueDate && dueDate && dueDate < issueDate) {
      rowErrors.push("dueDate cannot be before issueDate");
    }

    const notes = row.notes?.trim() || null;

    if (rowErrors.length > 0) {
      errors.push({ rowNumber: index + 2, errors: rowErrors, raw: row }); // +2: 1-indexed + header row
      return;
    }

    validRows.push({
      invoiceNumber: invoiceNumber as string,
      clientName: clientName as string,
      clientEmail,
      amount: amount as number,
      issueDate: issueDate as Date,
      dueDate: dueDate as Date,
      notes,
    });
  });

  return { validRows, errors };
}
