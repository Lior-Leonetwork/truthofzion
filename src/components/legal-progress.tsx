import type { Status } from "@/lib/content/schema";
import { STATUS_BG, STATUS_TEXT } from "./status-style";

const STEPS: Status[] = ["allegation", "under_investigation", "indicted", "convicted"];

// Where a case stands on the road from allegation to verdict. A public-record
// entry isn't on that road, so it gets a single marker instead.
export function LegalProgress({ status, labels, note, title, publicRecord }: {
  status: Status;
  labels: Record<Status, string>;
  note: string;
  title: string;
  publicRecord: string;
}) {
  if (status === "documented") {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
        <p className={`flex items-center gap-2 font-semibold ${STATUS_TEXT.documented}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BG.documented}`} />
          {publicRecord}
        </p>
        <p className="text-sm text-muted">{note}</p>
      </div>
    );
  }
  const at = STEPS.indexOf(status);
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s} className="space-y-2">
            <div className={`h-1.5 rounded-full ${i <= at ? STATUS_BG[status] : "bg-border"}`} />
            <p className={`text-xs ${i === at ? `font-bold ${STATUS_TEXT[status]}` : i < at ? "text-foreground" : "text-muted"}`}>
              {labels[s]}
            </p>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">{note}</p>
    </div>
  );
}
