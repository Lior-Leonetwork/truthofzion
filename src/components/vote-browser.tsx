"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { VoteCard } from "@/lib/knesset/view";
import { Chip, FilterRow } from "./chip";
import { VoteBar } from "./vote-bar";

type Labels = {
  all: string;
  keyVotes: string;
  topic: string;
  search: string;
  none: string;
  keyVote: string;
  passed: string;
  rejected: string;
  bar: { for: string; against: string; abstain: string };
  topics: [string, string][];
};

export function VoteBrowser({ locale, items, labels }: { locale: string; items: VoteCard[]; labels: Labels }) {
  const [keyOnly, setKeyOnly] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (v) => (!keyOnly || v.keyVote) && (!topic || v.topics.includes(topic)) && (!q || `${v.title} ${v.summary ?? ""}`.toLowerCase().includes(q)),
    );
  }, [items, keyOnly, topic, query]);

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
        <FilterRow label={labels.keyVote}>
          <Chip active={!keyOnly} onClick={() => setKeyOnly(false)}>{labels.all}</Chip>
          <Chip active={keyOnly} onClick={() => setKeyOnly(true)}>{labels.keyVotes}</Chip>
        </FilterRow>
        {labels.topics.length > 0 && (
          <FilterRow label={labels.topic}>
            <Chip active={!topic} onClick={() => setTopic(null)}>{labels.all}</Chip>
            {labels.topics.map(([id, name]) => (
              <Chip key={id} active={topic === id} onClick={() => setTopic(id)}>{name}</Chip>
            ))}
          </FilterRow>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">{labels.none}</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {shown.map((v) => (
            <li key={v.id}>
              <VoteRow v={v} locale={locale} labels={labels} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VoteRow({ v, locale, labels }: {
  v: VoteCard;
  locale: string;
  labels: Pick<Labels, "keyVote" | "passed" | "rejected" | "bar">;
}) {
  return (
    <Link
      href={`/${locale}/knesset/votes/${v.id}`}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-0.5 font-semibold text-white ${v.accepted ? "bg-status-documented" : "bg-status-allegation"}`}>
          {v.accepted ? labels.passed : labels.rejected}
        </span>
        {v.keyVote && <span className="rounded-full bg-accent px-2.5 py-0.5 font-semibold text-ink">★ {labels.keyVote}</span>}
        {v.topicLabels.map((tl) => (
          <span key={tl} className="text-muted">{tl}</span>
        ))}
        <span className="ms-auto text-muted">{v.date}</span>
      </div>
      <h3 lang="he" dir="rtl" className="font-serif text-lg font-bold leading-snug group-hover:text-brand">{v.title}</h3>
      {v.summary && <p className="line-clamp-2 text-sm text-muted">{v.summary}</p>}
      <div className="mt-auto pt-1">
        <VoteBar totals={v.totals} labels={labels.bar} />
      </div>
    </Link>
  );
}
