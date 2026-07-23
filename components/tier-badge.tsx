import { Badge } from "@/components/ui/badge";
import type { Tier } from "@/lib/types";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<Tier, string> = {
  gentle: "Gentle",
  firm: "Firm",
  formal: "Formal",
  final: "Final",
};

const TIER_CLASSES: Record<Tier, string> = {
  gentle: "bg-sky-100 text-sky-900 border-sky-200",
  firm: "bg-amber-100 text-amber-900 border-amber-200",
  formal: "bg-orange-100 text-orange-900 border-orange-200",
  final: "bg-red-100 text-red-900 border-red-200",
};

export function TierBadge({ tier }: { tier: Tier | null }) {
  if (!tier) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not yet due
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("border", TIER_CLASSES[tier])}>
      {TIER_LABEL[tier]}
    </Badge>
  );
}
