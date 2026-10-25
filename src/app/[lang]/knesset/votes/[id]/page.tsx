import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L } from "@/components/localized-text";
import { SPECTRUM_DOT } from "@/components/spectrum-badge";
import { VoteBar } from "@/components/vote-bar";
import { formatDate, getDict, LOCALES, t, type Locale } from "@/lib/i18n";
import type { VoteChoice } from "@/lib/knesset/schema";
import { getKnesset } from "@/lib/knesset/store";
import { factionInfo, knessetLabels, SPECTRUM_ORDER } from "@/lib/knesset/view";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => getKnesset().votes.map((v) => ({ lang, id: String(v.id) })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/knesset/votes/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  const v = getKnesset().votes.find((x) => x.id === id);
  return v ? { title: v.item.title } : {};
}

const CHOICE_STYLE: Record<VoteChoice, string> = {
  for: "border-status-documented text-status-documented",
  against: "border-status-convicted text-status-convicted",
  abstain: "border-status-allegation text-status-allegation",
  other: "border-border text-muted",
};

export default async function VotePage({ params }: PageProps<"/[lang]/knesset/votes/[id]">) {
  const { lang, id } = await params;
  const locale = lang as Locale;
  const d = getDict(locale);
  const k = d.knesset;
  const { votes, members, analyses, watch } = getKnesset();
  const vote = votes.find((v) => v.id === Number(id));
  if (!vote) notFound();
  const a = analyses.get(vote.id);
  const topicNames = new Map(watch.map((w) => [w.id, t(w.name, locale).value]));

  // How each political camp voted.
  const camps = SPECTRUM_ORDER.map((spectrum) => {
    const c = { for: 0, against: 0, abstain: 0, other: 0 };
    for (const m of Object.values(vote.members)) if (factionInfo(m.faction, locale).spectrum === spectrum) c[m.choice]++;
    return { spectrum, ...c, total: c.for + c.against + c.abstain + c.other };
  }).filter((c) => c.total > 0);

  // Group the roll call by choice, then by faction within each choice.
  const groups = (["for", "against", "abstain", "other"] as VoteChoice[]).map((choice) => {
    const ids = Object.entries(vote.members).filter(([, m]) => m.choice === choice);
    const byFaction = new Map<string, { id: string; name: string }[]>();
    for (const [mid, m] of ids) {
      const list = byFaction.get(m.faction) ?? [];
      list.push({ id: mid, name: members[mid]?.name ?? mid });
      byFaction.set(m.faction, list);
    }
    return { choice, count: ids.length, byFaction: [...byFaction.entries()].sort((x, y) => y[1].length - x[1].length) };
  });

  return (
    <>
      <section className="hero-grid text-ink-text">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-12 sm:py-16">
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
            <Link href={`/${locale}/knesset`} className="hover:text-ink-text">{d.nav.knesset}</Link>
            <span>·</span>
            <span>{formatDate(vote.date, locale)}</span>
            {vote.accepted !== null && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${vote.accepted ? "bg-status-documented" : "bg-status-allegation"}`}>
                {vote.accepted ? k.passed : k.rejected}
              </span>
            )}
            {a?.editorial.keyVote && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-ink">★ {k.keyVote}</span>}
          </div>
          <h1 lang="he" dir="rtl" className="max-w-4xl font-serif text-3xl font-black leading-tight sm:text-4xl">{vote.item.title}</h1>
          <p lang="he" dir="rtl" className="text-ink-muted">{vote.voteTitle}</p>
          <div className="max-w-xl rounded-2xl border border-ink-border bg-ink-2/80 p-4">
            <VoteBar totals={vote.totals} labels={knessetLabels(locale)} tone="ink" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-10">
          {a?.summary ? (
            <section className="space-y-4">
              <L as="p" text={a.summary} locale={locale} className="font-serif text-xl leading-relaxed" />
              {a.quotes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{k.fromBill}</p>
                  {a.quotes.map((q) => (
                    <blockquote key={q} lang="he" dir="rtl" className="border-s-4 border-accent ps-4 text-muted">״{q}״</blockquote>
                  ))}
                </div>
              )}
              <p className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded border border-border px-1.5 py-0.5 font-mono">AI</span>{" "}
                {a.editorial.autoPublished && !a.editorial.reviewedBy ? k.aiSummaryAuto : k.aiSummary}
              </p>
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-5 text-muted">{k.noSummary}</p>
          )}

          {a?.editorial.keyVote && a.editorial.note && (
            <section className="rounded-2xl border border-accent bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{k.editorNote}</p>
              <L as="p" text={a.editorial.note} locale={locale} className="mt-1" />
            </section>
          )}

          <section className="space-y-4">
            <h2 className="flex items-center gap-3 font-serif text-2xl font-bold">
              <span className="h-6 w-1 rounded-full bg-accent" />
              {d.record.byCamp}
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-border">
                    <th className="p-3 text-start font-semibold">{d.people.orientation}</th>
                    <th className="p-3 font-semibold">{k.choices.for}</th>
                    <th className="p-3 font-semibold">{k.choices.against}</th>
                    <th className="p-3 font-semibold">{k.choices.abstain}</th>
                    <th className="p-3 font-semibold">{k.choices.other}</th>
                  </tr>
                </thead>
                <tbody>
                  {camps.map((c) => (
                    <tr key={c.spectrum} className="border-b border-border last:border-0">
                      <td className="p-3">
                        <span className="inline-flex items-center gap-2 font-semibold">
                          <span className={`h-2.5 w-2.5 rounded-full ${SPECTRUM_DOT[c.spectrum]}`} />
                          {d.spectrum[c.spectrum]}
                        </span>
                      </td>
                      <td className="p-3 text-center tabular-nums">{c.for}</td>
                      <td className="p-3 text-center tabular-nums">{c.against}</td>
                      <td className="p-3 text-center tabular-nums">{c.abstain}</td>
                      <td className="p-3 text-center tabular-nums text-muted">{c.other}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">{d.record.classificationNote}</p>
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-3 font-serif text-2xl font-bold">
              <span className="h-6 w-1 rounded-full bg-accent" />
              {k.roll}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {groups.filter((g) => g.count > 0).map((g) => (
                <div key={g.choice} className={`space-y-3 rounded-2xl border-t-4 bg-surface p-4 ${CHOICE_STYLE[g.choice]}`}>
                  <p className="font-semibold">
                    {k.choices[g.choice]} <span className="tabular-nums">({g.count})</span>
                  </p>
                  {g.byFaction.map(([faction, list]) => (
                    <div key={faction} className="space-y-1.5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <span className={`h-2 w-2 rounded-full ${SPECTRUM_DOT[factionInfo(faction, locale).spectrum]}`} />
                        <span lang="he">{factionInfo(faction, locale).short}</span>
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {list.map((m) => (
                          <li key={m.id}>
                            <Link
                              href={`/${locale}/knesset/members/${m.id}`}
                              lang="he"
                              dir="rtl"
                              className="inline-block rounded-full border border-border px-2.5 py-0.5 text-sm text-foreground hover:border-brand hover:text-brand"
                            >
                              {m.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {a && a.topics.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{k.topic}</p>
              <ul className="flex flex-wrap gap-1.5 text-sm">
                {a.topics.map((tid) => (
                  <li key={tid} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-brand">{topicNames.get(tid) ?? tid}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            <a href={vote.source.url} target="_blank" rel="noopener noreferrer" className="block font-semibold text-brand hover:underline">
              {k.official} ↗
            </a>
            {a?.bill && (
              <a href={a.bill.summarySource} target="_blank" rel="noopener noreferrer" className="block font-semibold text-brand hover:underline">
                {k.billText} ↗
              </a>
            )}
            <p className="text-xs text-muted" dir="ltr">Knesset {vote.knesset} · vote {vote.id} · {vote.time}</p>
            <p className="text-xs text-muted">{k.countedNote}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
