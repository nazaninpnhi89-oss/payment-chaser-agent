import type { Tier } from "@/lib/types";

/** Display metadata for each escalation tier — mirrors the rules in lib/tier.ts. */
export const TIER_META: Record<
  Tier,
  { label: string; range: string; tone: string; badge: string; dot: string; bar: string }
> = {
  gentle: {
    label: "Gentle",
    range: "1–14 days",
    tone: "A friendly nudge — assumes it slipped through the cracks.",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    bar: "bg-sky-400",
  },
  firm: {
    label: "Firm",
    range: "15–30 days",
    tone: "Polite but direct — asks for a specific payment date.",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-400",
  },
  formal: {
    label: "Formal",
    range: "31–60 days",
    tone: "Businesslike — references terms and previous reminders.",
    badge: "bg-orange-50 text-orange-800 ring-orange-200",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
  },
  final: {
    label: "Final notice",
    range: "60+ days",
    tone: "Serious — notes statutory interest may apply.",
    badge: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
};

export const TIER_ORDER: Tier[] = ["gentle", "firm", "formal", "final"];
