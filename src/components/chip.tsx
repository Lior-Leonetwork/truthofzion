"use client";

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm transition ${
        active ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:border-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      <div className="no-scrollbar -my-1 flex gap-2 overflow-x-auto py-1">{children}</div>
    </div>
  );
}
