"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NgoRow } from "@/lib/funding/view";
import { money } from "@/lib/funding/format";
import { Chip, FilterRow } from "./chip";

type Labels = {
  all: string;
  search: string;
  years: string;
  recentYears: string;
  allYears: string;
  donor: string;
  otherDonor: string;
  mainly: string;
  mainlyOnly: string;
  mainlyBadge: string;
  none: string;
  sortTotal: string;
  showMore: string;
  countries: [string, string][];
};

const PAGE = 60;

export function FundingBrowser({ locale, items, from, labels }: { locale: string; items: NgoRow[]; from: number; labels: Labels }) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState(true);
  const [country, setCountry] = useState<string | null>(null);
  const [mainly, setMainly] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((n) => ({
        n,
        sum: n.cells.reduce((s, [y, c, v]) => s + ((!recent || y >= from) && (country === null || c === country) ? v : 0), 0),
      }))
      .filter(
        ({ n, sum }) =>
          sum > 0 &&
          (!mainly || n.mainlyYears.some((y) => !recent || y >= from)) &&
          (!q || `${n.name} ${n.nameHe} ${n.topDonor} ${n.number}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.sum - a.sum);
  }, [items, query, recent, country, mainly, from]);
  const max = shown[0]?.sum ?? 1;

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.search}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
        />
        <FilterRow label={labels.years}>
          <Chip active={recent} onClick={() => setRecent(true)}>{labels.recentYears}</Chip>
          <Chip active={!recent} onClick={() => setRecent(false)}>{labels.allYears}</Chip>
        </FilterRow>
        <FilterRow label={labels.donor}>
          <Chip active={country === null} onClick={() => setCountry(null)}>{labels.all}</Chip>
          {labels.countries.map(([code, name]) => (
            <Chip key={code} active={country === code} onClick={() => setCountry(code)}>{name}</Chip>
          ))}
          <Chip active={country === ""} onClick={() => setCountry("")}>{labels.otherDonor}</Chip>
        </FilterRow>
        <FilterRow label={labels.mainly}>
          <Chip active={!mainly} onClick={() => setMainly(false)}>{labels.all}</Chip>
          <Chip active={mainly} onClick={() => setMainly(true)}>{labels.mainlyOnly}</Chip>
        </FilterRow>
      </div>
      <p className="text-sm text-muted">
        {shown.length.toLocaleString(locale)} · {labels.sortTotal}
      </p>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">{labels.none}</p>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {shown.slice(0, limit).map(({ n, sum }, i) => (
            <li key={n.number}>
              <Link href={`/${locale}/funding/${n.number}`} className="group flex items-center gap-4 p-4 hover:bg-background">
                <span className="w-8 shrink-0 text-end font-mono text-xs text-muted tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-serif text-lg font-bold group-hover:text-brand">{n.name}</p>
                  <p className="truncate text-xs text-muted">
                    {n.sub}
                    {n.topDonor && <span lang="he"> · {n.topDonor}</span>}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(1, (sum / max) * 100)}%` }} />
                  </div>
                </div>
                <div className="shrink-0 space-y-1 text-end">
                  <p className="font-serif text-lg font-bold tabular-nums">{money(sum, locale, true)}</p>
                  {n.mainlyYears.length > 0 && (
                    <p className="rounded-full bg-status-indicted/10 px-2 py-0.5 text-[11px] font-semibold text-status-indicted">{labels.mainlyBadge}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {shown.length > limit && (
        <div className="text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="rounded-xl border border-border bg-surface px-5 py-2.5 font-semibold hover:border-brand">
            {labels.showMore}
          </button>
        </div>
      )}
    </div>
  );
}
