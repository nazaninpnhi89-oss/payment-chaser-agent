import Papa from "papaparse";
import { poundsToPence } from "@/lib/money";

export type CanonicalField =
  | "invoiceNumber"
  | "clientName"
  | "clientEmail"
  | "contactFirstName"
  | "amount"
  | "issueDate"
  | "dueDate"
  | "notes";

export const CANONICAL_FIELDS: CanonicalField[] = [
  "invoiceNumber",
  "clientName",
  "clientEmail",
  "contactFirstName",
  "amount",
  "issueDate",
  "dueDate",
  "notes",
];

export const REQUIRED_FIELDS: CanonicalField[] = [
  "invoiceNumber",
  "clientName",
  "amount",
  "issueDate",
  "dueDate",
];

/** Maps a canonical field to the actual CSV header the user's file uses for it. */
export type ColumnMapping = Partial<Record<CanonicalField, string>>;

export type CsvImportRow = Record<CanonicalField, string | undefined>;

export type NormalisedInvoiceInput = {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  contactFirstName: string | null;
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

/**
 * Pure: string in, raw headers/rows out, no I/O. Rows are keyed by the
 * original header text exactly as it appears in the file (trimmed) — no
 * assumption about naming, since real-world exports vary wildly (e.g.
 * "Contact", "Total", "Invoice Date" instead of our canonical field names).
 */
export function parseCsvRaw(csvText: string): {
  headers: string[];
  rows: Record<string, string>[];
  parseErrors: string[];
} {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    parseErrors: result.errors.map((error) => `Row ${error.row ?? "?"}: ${error.message}`),
  };
}

const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  invoiceNumber: ["invoice number", "invoicenumber", "invoice_number", "invoice no", "invoice #", "invoice", "ref", "reference"],
  clientName: ["client name", "clientname", "client_name", "client", "contact", "contact name", "customer", "customer name", "name"],
  clientEmail: ["client email", "clientemail", "client_email", "contact email", "customer email", "email"],
  contactFirstName: ["first name", "firstname", "first_name", "contact first name", "contact firstname"],
  amount: ["amount", "total", "invoice amount", "value", "balance", "amount due", "outstanding"],
  issueDate: ["issue date", "issuedate", "issue_date", "invoice date", "date"],
  dueDate: ["due date", "duedate", "due_date", "payment due", "payment due date"],
  notes: ["notes", "note", "comments", "comment", "memo", "description"],
};

/**
 * Pure: best-effort guess at which raw CSV header corresponds to each
 * canonical field, by case-insensitive match against a list of common
 * naming variants. This pre-fills the column-mapping UI; the user can
 * always override it before import, so this only needs to be a good guess,
 * never a guarantee.
 */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const field of CANONICAL_FIELDS) {
    const aliases = FIELD_ALIASES[field];
    const match = headers.find((header) => aliases.includes(header.trim().toLowerCase()));
    if (match) mapping[field] = match;
  }

  return mapping;
}

/**
 * Pure: applies a (possibly user-adjusted) column mapping to raw rows,
 * producing canonical rows keyed by our field names regardless of what the
 * original CSV called them.
 */
export function applyColumnMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): CsvImportRow[] {
  return rows.map((rawRow) => {
    const canonical = {} as CsvImportRow;
    for (const field of CANONICAL_FIELDS) {
      const header = mapping[field];
      canonical[field] = header ? rawRow[header] : undefined;
    }
    return canonical;
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseAmountToPence(raw: string): number | null {
  const cleaned = raw.trim().replace(/[£,]/g, "");
  if (cleaned === "" || Number.isNaN(Number(cleaned))) return null;
  const pounds = Number(cleaned);
  if (pounds < 0) return null;
  return poundsToPence(pounds);
}

/**
 * Accepts ISO dates (2026-06-14) and other unambiguous formats via Date's
 * own parser, but checks for DD/MM/YYYY or DD-MM-YYYY first — this is a UK
 * product, and JS's Date constructor otherwise reads slash-separated dates
 * as US-style MM/DD/YYYY, silently misreading e.g. "05/06/2026".
 */
function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const ukMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ukMatch) {
    const [, dayStr, monthStr, yearStr] = ukMatch;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

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

    const invoiceNumber = row.invoiceNumber?.trim();
    if (!invoiceNumber) rowErrors.push("invoiceNumber is required");

    const clientName = row.clientName?.trim();
    if (!clientName) rowErrors.push("clientName is required");

    let clientEmail: string | null = null;
    const rawEmail = row.clientEmail?.trim();
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
    if (!row.issueDate?.trim()) {
      rowErrors.push("issueDate is required");
    } else {
      issueDate = parseDate(row.issueDate);
      if (issueDate === null) rowErrors.push("issueDate is not a valid date");
    }

    let dueDate: Date | null = null;
    if (!row.dueDate?.trim()) {
      rowErrors.push("dueDate is required");
    } else {
      dueDate = parseDate(row.dueDate);
      if (dueDate === null) rowErrors.push("dueDate is not a valid date");
    }

    if (issueDate && dueDate && dueDate < issueDate) {
      rowErrors.push("dueDate cannot be before issueDate");
    }

    const notes = row.notes?.trim() || null;
    const contactFirstName = row.contactFirstName?.trim() || null;

    if (rowErrors.length > 0) {
      errors.push({ rowNumber: index + 2, errors: rowErrors, raw: row }); // +2: 1-indexed + header row
      return;
    }

    validRows.push({
      invoiceNumber: invoiceNumber as string,
      clientName: clientName as string,
      clientEmail,
      contactFirstName,
      amount: amount as number,
      issueDate: issueDate as Date,
      dueDate: dueDate as Date,
      notes,
    });
  });

  return { validRows, errors };
}
