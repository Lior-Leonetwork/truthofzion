import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L } from "@/components/localized-text";
import { Monogram } from "@/components/monogram";
import { SpectrumBadge } from "@/components/spectrum-badge";
import { formatDate, getDict, LOCALES, t, type Locale } from "@/lib/i18n";
import type { VoteChoice } from "@/lib/knesset/schema";
import { getKnesset } from "@/lib/knesset/store";
import { factionInfo, memberRecord, profileFor, scorecardFor } from "@/lib/knesset/view";
import { partyFor } from "@/lib/knesset/parties";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => Object.keys(getKnesset().members).map((id) => ({ lang, id })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/knesset/members/[id]">): Promise<Metadata> {
  const m = getKnesset().members[(await params).id];
  return m ? { title: m.name } : {};
}

const CHOICE_TEXT: Record<VoteChoice, string> = {
  for: "text-status-documented",
  against: "text-status-convicted",
  abstain: "text-status-allegation",
  other: "text-muted",
};

export default async function MemberPage({ params }: PageProps<"/[lang]/knesset/members/[id]">) {
  const { lang, id } = await params;
  const locale = lang as Locale;
  const d = getDict(locale);
  const k = d.knesset;
  const { members, analyses } = getKnesset();
  const member = members[id];
  if (!member) notFound();
  const { record, counts } = memberRecord(id);
  const profile = profileFor(id);
  const party = factionInfo(member.faction, locale);
  const partyPage = partyFor(member.faction);
  const card = scorecardFor(id);
  const r = d.record;

  return (
    <div className="pb-20">
      <section className="hero-grid text-ink-text">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:py-16">
          <Monogram name={member.name} seed={member.id} size="lg" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-accent">{k.member.record}</p>
            <h1 lang="he" dir="rtl" className="font-serif text-4xl font-black sm:text-5xl">{member.name}</h1>
            <p className="text-ink-muted">
              {k.member.faction}:{" "}
              {partyPage ? (
                <Link href={`/${locale}/knesset/parties/${partyPage.slug}`} lang="he" className="underline decoration-ink-muted underline-offset-4 hover:text-ink-text">
                  {party.short}
                </Link>
              ) : (
                <span lang="he">{party.short}</span>
              )}{" "}
              · Knesset {member.knessets.join(", ")}
            </p>
            <SpectrumBadge spectrum={party.spectrum} label={party.spectrumLabel} sector={party.sectorLabel} />
            {profile && (
              <Link href={`/${locale}/profiles/${profile.slug}`} className="inline-block text-sm font-semibold text-accent hover:underline">
                {d.profile.dossier}: {t(profile.name, locale).value} <span className="inline-block rtl:rotate-180">→</span>
              </Link>
            )}
          </div>
          <dl className="grid shrink-0 grid-cols-4 gap-px overflow-hidden rounded-2xl border border-ink-border bg-ink-border text-center">
            {(["for", "against", "abstain", "other"] as VoteChoice[]).map((c) => (
              <div key={c} className="bg-ink-2 px-3 py-3">
                <dd className="font-serif text-2xl font-bold tabular-nums">{counts[c]}</dd>
                <dt className="text-xs text-ink-muted">{k.choices[c]}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-4 px-4 pt-12">
        <h2 className="font-serif text-2xl font-bold">{r.title}</h2>
        {card.rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-muted">{r.none}</p>
        ) : (
          <>
            {card.aligned + card.opposed > 0 && (
              <div className="space-y-2 rounded-2xl border border-border bg-surface p-5">
                <p className="font-serif text-xl font-bold">{r.summary(card.aligned, card.aligned + card.opposed)}</p>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-border">
                  <div className="bg-status-documented" style={{ width: `${(card.aligned / (card.aligned + card.opposed)) * 100}%` }} />
                  <div className="bg-status-convicted" style={{ width: `${(card.opposed / (card.aligned + card.opposed)) * 100}%` }} />
                </div>
              </div>
            )}
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {card.rows.map((row) => (
                <li key={row.vote.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
                        row.aligned === null ? "bg-status-allegation" : row.aligned ? "bg-status-documented" : "bg-status-convicted"
                      }`}
                    >
                      {row.aligned === null ? r.noVote : row.aligned ? r.withSite : r.againstSite}
                    </span>
                    <Link href={`/${locale}/knesset/votes/${row.vote.id}`} lang="he" dir="rtl" className="min-w-0 flex-1 font-semibold hover:text-brand">
                      {row.vote.item.title}
                    </Link>
                    <span className="text-xs text-muted">{formatDate(row.vote.date, locale)}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {r.sitePosition}: <strong className="text-foreground">{k.choices[row.position]}</strong> · {r.theirVote}:{" "}
                    <strong className="text-foreground">{k.choices[row.choice]}</strong>
                  </p>
                  {row.note && (
                    <p className="border-s-2 border-accent ps-3 text-sm">
                      <span className="font-semibold">{r.why}: </span>
                      <L text={row.note} locale={locale} />
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="text-xs text-muted">{r.classificationNote}</p>
      </section>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-12">
        <h2 className="font-serif text-2xl font-bold">{k.member.votes}</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {record.map(({ vote, choice }) => {
            const a = analyses.get(vote.id);
            return (
              <li key={vote.id}>
                <Link href={`/${locale}/knesset/votes/${vote.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-brand-soft/50">
                  <span className={`w-20 shrink-0 font-semibold ${CHOICE_TEXT[choice]}`}>{k.choices[choice]}</span>
                  <span lang="he" dir="rtl" className="min-w-0 flex-1 font-medium">{vote.item.title}</span>
                  {a?.editorial.keyVote && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">★ {k.keyVote}</span>}
                  <span className="text-xs text-muted">{vote.accepted === null ? "" : `${vote.accepted ? k.passed : k.rejected} · `}{formatDate(vote.date, locale)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
