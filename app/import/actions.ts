"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import {
  applyColumnMapping,
  normaliseCsvRows,
  parseCsvRaw,
  type ColumnMapping,
  type RowValidationError,
} from "@/lib/csv";
import {
  createInvoicesFromImport,
  listExistingInvoiceNumbers,
} from "@/lib/repositories/invoiceRepository";

export type ImportCsvState = {
  importedCount: number;
  /** Invoice numbers skipped because they already exist (or repeat within the file). */
  duplicateInvoiceNumbers: string[];
  errors: RowValidationError[];
  parseErrors: string[];
  fatalError: string | null;
};

export async function importCsvAction(
  csvText: string,
  mapping: ColumnMapping,
): Promise<ImportCsvState> {
  const { rows, parseErrors } = parseCsvRaw(csvText);
  const canonicalRows = applyColumnMapping(rows, mapping);
  const { validRows, errors } = normaliseCsvRows(canonicalRows);

  try {
    // Re-importing the same export (or an updated one) must not create a
    // second copy of an invoice — that would let the same debt be chased twice.
    const existing = await listExistingInvoiceNumbers(
      env.DEFAULT_ORG_ID,
      validRows.map((row) => row.invoiceNumber),
    );
    const seen = new Set(existing);
    const duplicateInvoiceNumbers: string[] = [];
    const newRows = validRows.filter((row) => {
      if (seen.has(row.invoiceNumber)) {
        duplicateInvoiceNumbers.push(row.invoiceNumber);
        return false;
      }
      seen.add(row.invoiceNumber);
      return true;
    });

    const created =
      newRows.length > 0 ? await createInvoicesFromImport(env.DEFAULT_ORG_ID, newRows) : [];

    if (created.length > 0) {
      revalidatePath("/");
    }

    return {
      importedCount: created.length,
      duplicateInvoiceNumbers,
      errors,
      parseErrors,
      fatalError: null,
    };
  } catch (error) {
    console.error("[import] Failed to save invoices", error);
    return {
      importedCount: 0,
      duplicateInvoiceNumbers: [],
      errors,
      parseErrors,
      fatalError: "The invoices could not be saved. Nothing was imported — please try again.",
    };
  }
}
