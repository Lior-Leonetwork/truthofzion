import type { Status } from "@/lib/content/schema";
import { getDict, type Locale } from "@/lib/i18n";

const STYLE: Record<Status, string> = {
  convicted: "border-status-convicted text-status-convicted",
  indicted: "border-status-indicted text-status-indicted",
  under_investigation: "border-status-investigation text-status-investigation",
  allegation: "border-status-allegation text-status-allegation border-dashed",
  documented: "border-status-documented text-status-documented",
};

export function StatusBadge({ status, locale, withNote = false }: { status: Status; locale: Locale; withNote?: boolean }) {
  const s = getDict(locale).statuses[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLE[status]}`}>{s.name}</span>
      {withNote && <span className="text-xs text-muted">{s.note}</span>}
    </span>
  );
}
