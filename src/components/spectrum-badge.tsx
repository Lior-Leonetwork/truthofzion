import type { Spectrum } from "@/lib/knesset/schema";

// Blue for the right, red for the left, as Israeli election maps usually do.
export const SPECTRUM_DOT: Record<Spectrum, string> = {
  far_right: "bg-[#1e3a8a]",
  right: "bg-[#2563eb]",
  center_right: "bg-[#60a5fa]",
  center: "bg-[#a78bfa]",
  center_left: "bg-[#f87171]",
  left: "bg-[#dc2626]",
  far_left: "bg-[#7f1d1d]",
  unclassified: "bg-[#9ca3af]",
};

export function SpectrumBadge({ spectrum, label, sector }: { spectrum: Spectrum; label: string; sector?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-foreground">
      <span className={`h-2 w-2 rounded-full ${SPECTRUM_DOT[spectrum]}`} />
      {label}
      {sector && <span className="font-normal text-muted">· {sector}</span>}
    </span>
  );
}
