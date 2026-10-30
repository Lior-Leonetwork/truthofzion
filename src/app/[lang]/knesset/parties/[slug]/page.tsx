import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseCard } from "@/components/case-card";
import { PageHeader } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";
import { Section } from "@/components/section";
import { SpectrumBadge } from "@/components/spectrum-badge";
import { getContent } from "@/lib/content/load";
import { formatDate, getDict, LOCALES, t, type Locale } from "@/lib/i18n";
import { parties, partyKeyVotes } from "@/lib/knesset/parties";
import { readPolicy } from "@/lib/knesset/store";
import { caseCard, people } from "@/lib/view";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => parties().map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/knesset/parties/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = parties().find((x) => x.slug === slug);
  return p ? { title: t(p.short, lang as Locale).value } : {};
}

export default async function PartyPage({ params }: PageProps<"/[lang]/knesset/parties/[slug]">) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const d = getDict(locale);
  const k = d.knesset;
  const party = parties().find((x) => x.slug === slug);
  if (!party) notFound();
  const kv = partyKeyVotes(party);
  const decided = kv.aligned + kv.opposed;
  const ids = new Set(party.members.map((m) => m.id));
  const { entities, entries } = getContent();
  const memberOf = (slug: string) => entities.get(slug)?.knessetMemberId ?? (slug.startsWith("mk-") ? slug.slice(3) : undefined);
  const who = people(locale).filter((p) => ids.has(memberOf(p.slug) ?? ""));
  const cases = entries
    .filter((e) => {
      const mk = memberOf(e.entity);
      return mk ? ids.has(mk) : false;
    })
    .map((e) => caseCard(e, locale));
  const stances = new Map((readPolicy()?.stances ?? []).map((s) => [s.id, s]));

  return (
    <div className="space-y-14 pb-20">
      <PageHeader eyebrow={d.parties.heading} title={t(party.short, locale).value}>
        <div className="flex flex-wrap items-center gap-3">
          <SpectrumBadge spectrum={party.spectrum} label={d.spectrum[party.spectrum]} sector={party.sector ? d.sector[party.sector as keyof typeof d.sector] : null} />
          <span className="text-ink-muted">{d.parties.seats(party.members.length)}</span>
        </div>
        {decided > 0 && (
          <div className="mt-4 max-w-xl space-y-2">
            <div className="h-3 overflow-hidden rounded-full bg-status-convicted/40">
              <div className="h-full rounded-full bg-status-documented" style={{ width: `${(kv.aligned / decided) * 100}%` }} />
            </div>
            <p className="text-ink-muted">{d.parties.alignment(kv.aligned, decided)}</p>
          </div>
        )}
      </PageHeader>

      <Section title={d.parties.keyVotes}>
        <p className="max-w-3xl text-sm text-muted">{d.parties.keyVotesNote}</p>
        {kv.rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">{d.parties.noKeyVotes}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-background text-xs text-muted">
                <tr>
                  <th className="p-3 text-start font-semibold">{d.parties.keyVotes}</th>
                  <th className="p-3 text-start font-semibold">{d.record.sitePosition}</th>
                  <th className="p-3 font-semibold">{k.choices.for}</th>
                  <th className="p-3 font-semibold">{k.choices.against}</th>
                  <th className="p-3 font-semibold">{k.choices.abstain}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border align-top">
                {kv.rows.map((r) => {
                  const stance = r.analysis.editorial.policy ? stances.get(r.analysis.editorial.policy) : undefined;
                  const cell = (choice: "for" | "against") =>
                    r.counts[choice] === 0 ? "text-muted" : choice === r.position ? "font-bold text-status-documented" : "font-bold text-status-convicted";
                  return (
                    <tr key={r.vote.id}>
                      <td className="p-3">
                        <Link href={`/${locale}/knesset/votes/${r.vote.id}`} lang="he" dir="rtl" className="font-semibold hover:text-brand hover:underline">
                          {r.vote.item.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          {formatDate(r.vote.date, locale)}
                          {stance && <> · {t(stance.statement, locale).value.split(/[:.]/)[0]}</>}
                        </p>
                      </td>
                      <td className="whitespace-nowrap p-3 font-semibold">★ {k.choices[r.position]}</td>
                      <td className={`p-3 text-center tabular-nums ${cell("for")}`}>{r.counts.for}</td>
                      <td className={`p-3 text-center tabular-nums ${cell("against")}`}>{r.counts.against}</td>
                      <td className="p-3 text-center tabular-nums text-muted">{r.counts.abstain}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={d.parties.members}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {who.map((p) => (
            <li key={p.slug}>
              <PersonCard p={p} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title={d.parties.cases}>
        <p className="max-w-3xl text-sm text-muted">{d.parties.research}</p>
        {cases.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <li key={c.slug}>
                <CaseCard c={c} locale={locale} retractedLabel={d.entry.retracted} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
