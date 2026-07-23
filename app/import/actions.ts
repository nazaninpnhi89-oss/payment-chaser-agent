"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { normaliseCsvRows, parseCsvText, type RowValidationError } from "@/lib/csv";
import { createInvoicesFromImport } from "@/lib/repositories/invoiceRepository";

export type ImportCsvState = {
  importedCount: number;
  errors: RowValidationError[];
  parseErrors: string[];
  fatalError: string | null;
};

export async function importCsvAction(
  _prevState: ImportCsvState,
  formData: FormData,
): Promise<ImportCsvState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      importedCount: 0,
      errors: [],
      parseErrors: [],
      fatalError: "Choose a CSV file to upload.",
    };
  }

  const text = await file.text();
  const { rows, parseErrors } = parseCsvText(text);
  const { validRows, errors } = normaliseCsvRows(rows);

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
