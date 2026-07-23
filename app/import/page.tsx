"use client";

import { useActionState } from "react";
import { importCsvAction, type ImportCsvState } from "@/app/import/actions";
import { CsvImportReport } from "@/components/csv-import-report";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const initialState: ImportCsvState = {
  importedCount: 0,
  errors: [],
  parseErrors: [],
  fatalError: null,
};

export default function ImportPage() {
  const [state, formAction, isPending] = useActionState(importCsvAction, initialState);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import invoices</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV with columns: invoiceNumber, clientName, clientEmail, amount, issueDate,
          dueDate, notes. clientEmail and notes are optional.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">CSV file</Label>
          <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Importing..." : "Import"}
        </Button>
      </form>

      <CsvImportReport state={state} />
    </div>
  );
}
