import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { VoteBrowser } from "@/components/vote-browser";
import { getDict, t, type Locale } from "@/lib/i18n";
import { readState, getKnesset } from "@/lib/knesset/store";
import { knessetLabels, voteCard } from "@/lib/knesset/view";

export async function generateMetadata({ params }: PageProps<"/[lang]/knesset">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.knesset };
}

export default async function Knesset({ params }: PageProps<"/[lang]/knesset">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const k = d.knesset;
  const { votes, members, watch } = getKnesset();
  const items = votes.map((v) => voteCard(v, locale));
  const state = readState();
  const stats = [
    [k.stats.votes, String(votes.length)],
    [k.stats.keyVotes, String(items.filter((v) => v.keyVote).length)],
    [k.stats.members, String(Object.keys(members).length)],
    [k.stats.updated, state ? new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(state.updatedAt)) : "—"],
  ];
  const usedTopics = new Set(items.flatMap((v) => v.topics));
  const labels = {
    all: d.filters.all,
    keyVotes: k.keyVotes,
    topic: k.topic,
    search: k.search,
    none: k.none,
    keyVote: k.keyVote,
    passed: k.passed,
    rejected: k.rejected,
    bar: knessetLabels(locale),
    topics: watch.filter((w) => usedTopics.has(w.id)).map((w) => [w.id, t(w.name, locale).value] as [string, string]),
  };

  return (
    <>
      <PageHeader eyebrow={d.home.eyebrow} title={k.heading} intro={k.intro}>
        <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-border bg-ink-border sm:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-ink-2/90 p-4">
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="mt-1 font-serif text-xl font-bold tabular-nums sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-serif text-xl font-bold">{k.empty}</p>
              <p className="mt-2 text-muted">{k.emptyDetail}</p>
            </div>
          ) : (
            <VoteBrowser locale={locale} items={items} labels={labels} />
          )}
        </div>
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{k.howTitle}</p>
            <ul className="space-y-3 text-sm leading-relaxed">
              {k.how.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-accent">●</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
