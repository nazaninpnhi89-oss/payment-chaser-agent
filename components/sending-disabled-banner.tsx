import { AlertTriangle } from "lucide-react";

export function SendingDisabledBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <AlertTriangle className="size-4 shrink-0" />
      Sending is disabled — emails are previewed only.
    </div>
  );
}
