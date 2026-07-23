import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportCsvState } from "@/app/import/actions";

export function CsvImportReport({ state }: { state: ImportCsvState }) {
  const hasContent =
    state.importedCount > 0 || state.errors.length > 0 || state.parseErrors.length > 0 || state.fatalError;

  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      {state.fatalError && (
        <Alert variant="destructive">
          <AlertTitle>Import failed</AlertTitle>
          <AlertDescription>{state.fatalError}</AlertDescription>
        </Alert>
      )}

      {(state.importedCount > 0 || state.errors.length > 0) && (
        <Alert variant={state.errors.length > 0 ? "destructive" : "default"}>
          <AlertTitle>Import summary</AlertTitle>
          <AlertDescription>
            {state.importedCount} invoice{state.importedCount === 1 ? "" : "s"} imported
            {state.errors.length > 0 &&
              `, ${state.errors.length} row${state.errors.length === 1 ? "" : "s"} skipped`}
            .
          </AlertDescription>
        </Alert>
      )}

      {state.parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>CSV parsing issues</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {state.parseErrors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {state.errors.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.errors.map((error) => (
              <TableRow key={error.rowNumber}>
                <TableCell>{error.rowNumber}</TableCell>
                <TableCell>{error.errors.join("; ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
