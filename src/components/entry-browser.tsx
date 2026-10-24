"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Category, Status } from "@/lib/content/schema";

export type EntryCardData = {
  slug: string;
  title: string;
  summary: string;
  entityName: string;
  category: Category;
  status: Status;
  statusLabel: string;
  categoryLabel: string;
  date: string;
  retracted: boolean;
};

type Labels = {
  all: string;
  category: string;
  status: string;
  search: string;
  none: string;
  retracted: string;
  categories: [Category, string][];
  statuses: [Status, string][];
};

const STATUS_COLOR: Record<Status, string> = {
  convicted: "text-status-convicted",
  indicted: "text-status-indicted",
  under_investigation: "text-status-investigation",
  allegation: "text-status-allegation",
  documented: "text-status-documented",
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active ? "border-brand bg-brand text-white" : "border-border bg-surface hover:bg-brand-soft"
      }`}
    >
      {children}
    </button>
  );
}

type Props = { locale: string; items: EntryCardData[]; labels: Labels };

// The category cards link to ?category=…; keying on it resets the filters when
// a card is clicked while the page is already open.
export function EntryBrowser(props: Props) {
  const param = useSearchParams().get("category");
  const initial = props.labels.categories.find(([c]) => c === param)?.[0] ?? null;
  return <Browser key={initial ?? "all"} initial={initial} {...props} />;
}

function Browser({ locale, items, labels, initial }: Props & { initial: Category | null }) {
  const [category, setCategory] = useState<Category | null>(initial);
  const [status, setStatus] = useState<Status | null>(null);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (e) =>
        (!category || e.category === category) &&
        (!status || e.status === status) &&
        (!q || `${e.title} ${e.summary} ${e.entityName}`.toLowerCase().includes(q)),
    );
  }, [items, category, status, query]);

  return (
    <div className="space-y-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={labels.search}
        className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 outline-none focus:border-brand"
      />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-sm text-muted">{labels.category}</span>
          <Chip active={!category} onClick={() => setCategory(null)}>{labels.all}</Chip>
          {labels.categories.map(([c, name]) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{name}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 text-sm text-muted">{labels.status}</span>
          <Chip active={!status} onClick={() => setStatus(null)}>{labels.all}</Chip>
          {labels.statuses.map(([s, name]) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{name}</Chip>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted">{labels.none}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {shown.map((e) => (
            <li key={e.slug}>
              <Link href={`/${locale}/entries/${e.slug}`} className="block space-y-1.5 p-5 hover:bg-brand-soft/50">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className={`font-semibold ${STATUS_COLOR[e.status]}`}>{e.statusLabel}</span>
                  <span className="text-muted">{e.categoryLabel}</span>
                  <span className="text-muted">{e.date}</span>
                  {e.retracted && <span className="font-semibold text-status-convicted">{labels.retracted}</span>}
                </div>
                <h3 className={`font-serif text-lg font-bold ${e.retracted ? "line-through opacity-60" : ""}`}>{e.title}</h3>
                <p className="text-sm text-muted">
                  <span className="font-medium text-foreground">{e.entityName}</span> · {e.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
