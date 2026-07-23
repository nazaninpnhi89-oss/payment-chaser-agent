"use client";

import { useState } from "react";
import {
  CANONICAL_FIELDS,
  REQUIRED_FIELDS,
  guessColumnMapping,
  parseCsvRaw,
  type CanonicalField,
  type ColumnMapping,
} from "@/lib/csv";
import { importCsvAction, type ImportCsvState } from "@/app/import/actions";
import { CsvImportReport } from "@/components/csv-import-report";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELD_LABELS: Record<CanonicalField, string> = {
  invoiceNumber: "Invoice number",
  clientName: "Client name",
  clientEmail: "Client email",
  amount: "Amount",
  issueDate: "Issue date",
  dueDate: "Due date",
  notes: "Notes",
};

const NONE_VALUE = "__none__";

type Step =
  | { kind: "upload" }
  | { kind: "map"; fileName: string; csvText: string; headers: string[]; mapping: ColumnMapping }
  | { kind: "done"; result: ImportCsvState };

export default function ImportPage() {
  const [step, setStep] = useState<Step>({ kind: "upload" });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const csvText = await file.text();
    const { headers, parseErrors } = parseCsvRaw(csvText);

    if (headers.length === 0) {
      setError(parseErrors[0] ?? "Could not read any columns from this file.");
      return;
    }

    setStep({
      kind: "map",
      fileName: file.name,
      csvText,
      headers,
      mapping: guessColumnMapping(headers),
    });
  }

  function updateMapping(field: CanonicalField, header: string) {
    if (step.kind !== "map") return;
    const mapping = { ...step.mapping };
    if (header === NONE_VALUE) {
      delete mapping[field];
    } else {
      mapping[field] = header;
    }
    setStep({ ...step, mapping });
  }

  async function handleImport() {
    if (step.kind !== "map") return;

    const missingRequired = REQUIRED_FIELDS.filter((field) => !step.mapping[field]);
    if (missingRequired.length > 0) {
      setError(
        `Map a column for: ${missingRequired.map((field) => FIELD_LABELS[field]).join(", ")}.`,
      );
      return;
    }

    setError(null);
    setIsImporting(true);
    const result = await importCsvAction(step.csvText, step.mapping);
    setIsImporting(false);
    setStep({ kind: "done", result });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import invoices</h1>
        <p className="text-sm text-muted-foreground">
          Upload any CSV export — you&apos;ll match its columns to the fields we need on the next
          step, whatever they&apos;re called in your file.
        </p>
      </div>

      {step.kind === "upload" && (
        <div className="space-y-2">
          <Label htmlFor="file">CSV file</Label>
          <Input id="file" name="file" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </div>
      )}

      {step.kind === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            File: <span className="font-medium text-foreground">{step.fileName}</span> — match each
            field below to a column from your file.
          </p>

          <div className="space-y-3">
            {CANONICAL_FIELDS.map((field) => (
              <div key={field} className="flex items-center gap-3">
                <Label className="w-40 shrink-0">
                  {FIELD_LABELS[field]}
                  {REQUIRED_FIELDS.includes(field) && <span className="text-destructive"> *</span>}
                </Label>
                <Select
                  value={step.mapping[field] ?? NONE_VALUE}
                  onValueChange={(value) => updateMapping(field, value as string)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Not mapped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Don&apos;t import</SelectItem>
                    {step.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import"}
            </Button>
            <Button variant="outline" onClick={() => setStep({ kind: "upload" })} disabled={isImporting}>
              Choose a different file
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {step.kind === "done" && (
        <>
          <CsvImportReport state={step.result} />
          <Button variant="outline" onClick={() => setStep({ kind: "upload" })}>
            Import another file
          </Button>
        </>
      )}
    </div>
  );
}
