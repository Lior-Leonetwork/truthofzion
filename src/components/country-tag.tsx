export function CountryTag({ code, name, tone = "light" }: { code: string; name: string; tone?: "light" | "ink" }) {
  const style =
    tone === "ink" ? "border-ink-border text-ink-muted" : "border-border text-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${style}`}>
      <span className={`rounded border px-1 font-mono text-[10px] font-semibold tracking-wider ${style}`}>{code}</span>
      {name}
    </span>
  );
}
