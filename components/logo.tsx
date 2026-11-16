import { cn } from "@/lib/utils";

/**
 * Payment Chaser mark: a paper plane leaving a motion trail —
 * "your invoice reminder is on its way". Pure SVG so it stays crisp at any size
 * and matches app/icon.svg (the favicon).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-8", className)}>
      <defs>
        <linearGradient id="pc-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f5f63" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#pc-grad)" />
      <path d="M8 21.5 31 10.5l-5.5 20-6.2-5.4-4 4.4v-6.6Z" fill="#fff" />
      <path d="m15.3 22.9 15.7-12.4-11.7 14.6Z" fill="#99f6e4" />
      <path d="M6 28.5h5M8 32h6" stroke="#99f6e4" strokeWidth="2" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">Payment Chaser</span>
        <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">Get paid, politely</span>
      </span>
    </span>
  );
}
