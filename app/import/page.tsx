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
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight, Check, Download, FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
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
  contactFirstName: "Contact first name",
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
    try {
      const result = await importCsvAction(step.csvText, step.mapping);
      setStep({ kind: "done", result });
    } catch {
      setError("Import failed — please try again.");
    } finally {
      setIsImporting(false);
    }
  }

  const stepIndex = step.kind === "upload" ? 0 : step.kind === "map" ? 1 : 2;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CSV export from any accounting tool. Column names don&apos;t matter — you&apos;ll
          match them to our fields on the next step.
        </p>
      </div>

      <ol className="flex items-center gap-2 text-sm">
        {["Upload file", "Match columns", "Done"].map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                index < stepIndex && "bg-brand text-brand-foreground",
                index === stepIndex && "bg-brand-soft text-brand ring-2 ring-brand/30",
                index > stepIndex && "bg-muted text-muted-foreground",
              )}
            >
              {index < stepIndex ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={cn("font-medium", index > stepIndex && "text-muted-foreground")}>{label}</span>
            {index < 2 && <ArrowRight className="mx-1 size-3.5 text-muted-foreground/60" />}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-card p-6 shadow-xs">
        {step.kind === "upload" && (
          <div className="space-y-4">
            <label
              htmlFor="file"
              className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-brand/50 hover:bg-brand-soft/40"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand transition-transform group-hover:scale-105">
                <Upload className="size-5" />
              </span>
              <span className="mt-4 text-sm font-semibold">Click to choose a CSV file</span>
              <span className="mt-1 text-xs text-muted-foreground">
                Needs at least: invoice number, client, amount, issue date and due date
              </span>
              <input
                id="file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">No file handy? Try it with 5 example invoices.</span>
              <a href="/sample-invoices.csv" download className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Download /> Sample CSV
              </a>
            </div>
          </div>
        )}

        {step.kind === "map" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <FileSpreadsheet className="size-5 text-brand" />
              <div className="text-sm">
                <p className="font-medium">{step.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  We&apos;ve guessed the matches — check them and adjust anything that&apos;s wrong.
                </p>
              </div>
            </div>

            <div className="divide-y rounded-lg border">
              {CANONICAL_FIELDS.map((field) => (
                <div key={field} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <Label className="w-44 shrink-0">
                    {FIELD_LABELS[field]}
                    {REQUIRED_FIELDS.includes(field) ? (
                      <span className="text-destructive"> *</span>
                    ) : (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">optional</span>
                    )}
                  </Label>
                  <Select
                    value={step.mapping[field] ?? NONE_VALUE}
                    onValueChange={(value) => updateMapping(field, value as string)}
                  >
                    <SelectTrigger className="w-full flex-1">
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

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? "Importing..." : "Import invoices"}
              </Button>
              <Button variant="outline" onClick={() => setStep({ kind: "upload" })} disabled={isImporting}>
                Choose a different file
              </Button>
            </div>
          </div>
        )}

        {step.kind === "done" && (
          <div className="space-y-4">
            <CsvImportReport state={step.result} />
            <div className="flex flex-wrap gap-2">
              <Link href="/" className={buttonVariants()}>
                Go to dashboard <ArrowRight />
              </Link>
              <Button variant="outline" onClick={() => setStep({ kind: "upload" })}>
                Import another file
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
