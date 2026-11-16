import { ShieldCheck } from "lucide-react";

export function SendingDisabledBanner() {
  return (
    <div className="border-b border-amber-200/70 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:text-sm">
      <span className="inline-flex items-center gap-2">
        <ShieldCheck className="size-4 shrink-0" />
        Demo mode — emails are drafted and previewed, but never actually sent.
      </span>
    </div>
  );
}
