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
import { createInvoicesFromImport } from "@/lib/repositories/invoiceRepository";

export type ImportCsvState = {
  importedCount: number;
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

  const created =
    validRows.length > 0 ? await createInvoicesFromImport(env.DEFAULT_ORG_ID, validRows) : [];

  if (created.length > 0) {
    revalidatePath("/");
  }

  return {
    importedCount: created.length,
    errors,
    parseErrors,
    fatalError: null,
  };
}
