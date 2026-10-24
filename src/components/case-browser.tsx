"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Category, Status } from "@/lib/content/schema";
import type { CaseCard as Data } from "@/lib/view";
import { CaseCard } from "./case-card";
import { Chip, FilterRow } from "./chip";

type Labels = {
  all: string;
  category: string;
  status: string;
  country: string;
  search: string;
  none: string;
  retracted: string;
  categories: [Category, string][];
  statuses: [Status, string][];
  countries: [string, string][];
};
type Props = { locale: string; items: Data[]; labels: Labels };

// ?category= and ?country= links land with that filter applied; keying on
// them resets the filters when such a link is followed from this page.
export function CaseBrowser(props: Props) {
  const params = useSearchParams();
  const cat = props.labels.categories.find(([c]) => c === params.get("category"))?.[0] ?? null;
  const country = props.labels.countries.find(([c]) => c === params.get("country"))?.[0] ?? null;
  return <Browser key={`${cat}-${country}`} initialCategory={cat} initialCountry={country} {...props} />;
}

function Browser({ locale, items, labels, initialCategory, initialCountry }: Props & {
  initialCategory: Category | null;
  initialCountry: string | null;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState<Status | null>(null);
  const [country, setCountry] = useState(initialCountry);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (e) =>
        (!category || e.category === category) &&
        (!status || e.status === status) &&
        (!country || e.country === country) &&
        (!q || `${e.title} ${e.summary} ${e.subject}`.toLowerCase().includes(q)),
    );
  }, [items, category, status, country, query]);

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
        <FilterRow label={labels.category}>
          <Chip active={!category} onClick={() => setCategory(null)}>{labels.all}</Chip>
          {labels.categories.map(([c, name]) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{name}</Chip>
          ))}
        </FilterRow>
        <FilterRow label={labels.status}>
          <Chip active={!status} onClick={() => setStatus(null)}>{labels.all}</Chip>
          {labels.statuses.map(([s, name]) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{name}</Chip>
          ))}
        </FilterRow>
        {labels.countries.length > 1 && (
          <FilterRow label={labels.country}>
            <Chip active={!country} onClick={() => setCountry(null)}>{labels.all}</Chip>
            {labels.countries.map(([c, name]) => (
              <Chip key={c} active={country === c} onClick={() => setCountry(c)}>{name}</Chip>
            ))}
          </FilterRow>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">{labels.none}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <li key={c.slug}>
              <CaseCard c={c} locale={locale} retractedLabel={labels.retracted} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
