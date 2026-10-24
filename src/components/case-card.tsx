import Link from "next/link";
import type { CaseCard as Data } from "@/lib/view";
import { CountryTag } from "./country-tag";
import { StatusBadge } from "./status-badge";

export function CaseCard({ c, locale, retractedLabel, featured = false }: {
  c: Data;
  locale: string;
  retractedLabel: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/${locale}/entries/${c.slug}`}
      className={`group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg ${
        featured ? "sm:p-7" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={c.status} label={c.statusLabel} />
        <span className="text-xs text-muted">{c.categoryLabel}</span>
        {c.retracted && <span className="text-xs font-semibold text-status-convicted">{retractedLabel}</span>}
      </div>
      <h3
        className={`font-serif font-bold leading-snug group-hover:text-brand ${featured ? "text-2xl sm:text-3xl" : "text-lg"} ${
          c.retracted ? "line-through opacity-60" : ""
        }`}
      >
        {c.title}
      </h3>
      <p className={`text-sm leading-relaxed text-muted ${featured ? "sm:text-base" : "line-clamp-3"}`}>{c.summary}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        <span className="font-semibold">{c.subject}</span>
        <span className="flex items-center gap-3 text-muted">
          {c.country && <CountryTag code={c.country} name={c.countryName} />}
          <span>{c.date}</span>
        </span>
      </div>
    </Link>
  );
}
