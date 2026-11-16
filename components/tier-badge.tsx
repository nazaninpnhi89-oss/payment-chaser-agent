import type { Tier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TIER_META } from "@/components/tier-meta";

export function TierBadge({ tier, className }: { tier: Tier | null; className?: string }) {
  const meta = tier ? TIER_META[tier] : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        meta ? meta.badge : "bg-muted text-muted-foreground ring-border",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta ? meta.dot : "bg-muted-foreground/50")} />
      {meta ? meta.label : "Not yet due"}
    </span>
  );
}
