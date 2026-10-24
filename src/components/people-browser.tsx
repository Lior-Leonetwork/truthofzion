"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { PersonCard as Data } from "@/lib/view";
import { Chip, FilterRow } from "./chip";
import { PersonCard } from "./person-card";

type Labels = { all: string; country: string; search: string; none: string; countries: [string, string][] };
type Props = { locale: string; items: Data[]; labels: Labels };

export function PeopleBrowser(props: Props) {
  const param = useSearchParams().get("country");
  const initial = props.labels.countries.find(([c]) => c === param)?.[0] ?? null;
  return <Browser key={initial ?? "all"} initial={initial} {...props} />;
}

function Browser({ locale, items, labels, initial }: Props & { initial: string | null }) {
  const [country, setCountry] = useState(initial);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (p) => (!country || p.country === country) && (!q || `${p.name} ${p.role} ${p.position}`.toLowerCase().includes(q)),
    );
  }, [items, country, query]);

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
        <FilterRow label={labels.country}>
          <Chip active={!country} onClick={() => setCountry(null)}>{labels.all}</Chip>
          {labels.countries.map(([c, name]) => (
            <Chip key={c} active={country === c} onClick={() => setCountry(c)}>{name}</Chip>
          ))}
        </FilterRow>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">{labels.none}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <li key={p.slug}>
              <PersonCard p={p} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
