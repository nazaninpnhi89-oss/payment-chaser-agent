import { Scale } from "lucide-react";
import { formatPence } from "@/lib/money";

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
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <Scale className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Statutory interest (indicative)</h2>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        {[
          ["Interest", interestPence],
          ["Compensation", compensationPence],
          ["Total", totalPence],
        ].map(([label, pence]) => (
          <div key={label as string} className="rounded-lg bg-muted/50 px-3 py-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold">{formatPence(pence as number)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Late Payment of Commercial Debts (Interest) Act 1998. Indicative calculation only. Not legal advice.
      </p>
    </section>
  );
}
