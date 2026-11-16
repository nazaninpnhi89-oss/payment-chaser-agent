import { Clock, FileSpreadsheet, PoundSterling, Scale } from "lucide-react";
import { formatPence } from "@/lib/money";
import type { InvoiceView, Tier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TIER_META, TIER_ORDER } from "@/components/tier-meta";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground/70" />
      </div>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function DashboardStats({ overdue }: { overdue: InvoiceView[] }) {
  const totalPence = overdue.reduce((sum, invoice) => sum + invoice.amount, 0);
  const interestPence = overdue.reduce((sum, invoice) => sum + invoice.statutoryTotalPence, 0);
  const oldest = overdue.reduce((max, invoice) => Math.max(max, invoice.daysOverdue), 0);
  const neverChased = overdue.filter((invoice) => invoice.chaseCount === 0).length;

  const counts = TIER_ORDER.reduce(
    (acc, tier) => ({ ...acc, [tier]: overdue.filter((invoice) => invoice.tier === tier).length }),
    {} as Record<Tier, number>,
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={PoundSterling}
          label="Total overdue"
          value={formatPence(totalPence)}
          hint={`Across ${overdue.length} invoice${overdue.length === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={FileSpreadsheet}
          label="Awaiting a chase"
          value={String(neverChased)}
          hint="Overdue and not yet chased"
        />
        <StatCard icon={Clock} label="Oldest debt" value={`${oldest} days`} hint="Days past the due date" />
        <StatCard
          icon={Scale}
          label="Statutory interest"
          value={formatPence(interestPence)}
          hint="Indicative only, not legal advice"
        />
      </div>

      {overdue.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">Escalation tiers</p>
            <p className="text-xs text-muted-foreground">The tone of each email is set by how late the invoice is</p>
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted">
            {TIER_ORDER.map((tier) =>
              counts[tier] > 0 ? (
                <div
                  key={tier}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", TIER_META[tier].bar)}
                  style={{ width: `${(counts[tier] / overdue.length) * 100}%` }}
                  title={`${TIER_META[tier].label}: ${counts[tier]}`}
                />
              ) : null,
            )}
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TIER_ORDER.map((tier) => (
              <div key={tier} className="flex gap-2">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", TIER_META[tier].dot)} />
                <div>
                  <dt className="text-[13px] font-medium">
                    {TIER_META[tier].label}{" "}
                    <span className="font-normal text-muted-foreground">· {TIER_META[tier].range}</span>
                    <span className="tabular ml-1.5 rounded bg-muted px-1.5 py-px text-xs">{counts[tier]}</span>
                  </dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{TIER_META[tier].tone}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
