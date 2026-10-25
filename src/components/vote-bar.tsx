// Proportional for / against / abstain bar.
export function VoteBar({ totals, labels, tone = "light" }: {
  totals: { for: number; against: number; abstain: number };
  labels: { for: string; against: string; abstain: string };
  tone?: "light" | "ink";
}) {
  const sum = totals.for + totals.against + totals.abstain || 1;
  const parts = [
    { key: "for", n: totals.for, cls: "bg-status-documented", label: labels.for },
    { key: "against", n: totals.against, cls: "bg-status-convicted", label: labels.against },
    { key: "abstain", n: totals.abstain, cls: "bg-status-allegation", label: labels.abstain },
  ];
  return (
    <div className="space-y-1.5">
      <div className={`flex h-2.5 overflow-hidden rounded-full ${tone === "ink" ? "bg-ink-border" : "bg-border"}`}>
        {parts.map((p) => p.n > 0 && <div key={p.key} className={p.cls} style={{ width: `${(p.n / sum) * 100}%` }} />)}
      </div>
      <div className={`flex flex-wrap gap-x-4 text-xs ${tone === "ink" ? "text-ink-muted" : "text-muted"}`}>
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${p.cls}`} />
            {p.label} <span className={`font-semibold tabular-nums ${tone === "ink" ? "text-ink-text" : "text-foreground"}`}>{p.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
