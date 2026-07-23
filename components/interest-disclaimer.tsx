import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatPence } from "@/lib/money";
import { Info } from "lucide-react";

export function InterestDisclaimer({
  interestPence,
  compensationPence,
  totalPence,
}: {
  interestPence: number;
  compensationPence: number;
  totalPence: number;
}) {
  return (
    <Alert>
      <Info />
      <AlertTitle>Statutory interest (indicative)</AlertTitle>
      <AlertDescription>
        <p>
          Interest: {formatPence(interestPence)} &middot; Compensation: {formatPence(compensationPence)}{" "}
          &middot; Total: <span className="font-medium">{formatPence(totalPence)}</span>
        </p>
        <p className="mt-1 text-xs italic">Indicative calculation only. Not legal advice.</p>
      </AlertDescription>
    </Alert>
  );
}
