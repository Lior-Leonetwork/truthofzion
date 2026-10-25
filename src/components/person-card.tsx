import Link from "next/link";
import type { PersonCard as Data } from "@/lib/view";
import { CountryTag } from "./country-tag";
import { Monogram } from "./monogram";
import { SpectrumBadge } from "./spectrum-badge";
import { StatusBadge } from "./status-badge";

export function PersonCard({ p }: { p: Data; locale?: string }) {
  return (
    <Link
      href={p.href}
      className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        <Monogram name={p.name} seed={p.slug} />
        <div className="min-w-0 space-y-1.5">
          <h3 lang={p.kind === "member" ? "he" : undefined} className="font-serif text-lg font-bold leading-tight group-hover:text-brand">
            {p.name}
          </h3>
          <p className="text-sm text-muted">{p.role}</p>
          {p.spectrum && p.spectrumLabel && <SpectrumBadge spectrum={p.spectrum} label={p.spectrumLabel} sector={p.sectorLabel} />}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <CountryTag code={p.country} name={p.countryName} />
        {p.kind === "case" ? (
          <span className="flex items-center gap-2 text-xs text-muted">
            {p.casesLabel}
            {p.highest && <StatusBadge status={p.highest} label={p.highestLabel} />}
          </span>
        ) : (
          p.record && <span className="text-xs text-muted">{p.record}</span>
        )}
      </div>
    </Link>
  );
}
