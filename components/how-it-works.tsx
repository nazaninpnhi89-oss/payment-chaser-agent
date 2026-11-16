import { FileUp, Send, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: FileUp,
    title: "Import your invoices",
    body: "Upload a CSV from any accounting tool — you match the columns, whatever they're called.",
  },
  {
    icon: Sparkles,
    title: "AI drafts the reminder",
    body: "Each email's tone is matched to how overdue it is, from a gentle nudge to a final notice.",
  },
  {
    icon: Send,
    title: "You approve & send",
    body: "Nothing goes out automatically. Review, edit if you like, then send in one click.",
  },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {STEPS.map(({ icon: Icon, title, body }, index) => (
        <li key={title} className="flex gap-3 rounded-xl border bg-card/70 p-4 backdrop-blur">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
              {title}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
