import Link from "next/link";
import { CaseCard } from "@/components/case-card";
import { CategoryIcon } from "@/components/icons";
import { PersonCard } from "@/components/person-card";
import { Section } from "@/components/section";
import { getContent } from "@/lib/content/load";
import { CATEGORIES } from "@/lib/content/schema";
import { getDict, type Locale } from "@/lib/i18n";
import { caseCard, countries, isLive, people, stats } from "@/lib/view";
import { VoteRow } from "@/components/vote-browser";
import { getKnesset } from "@/lib/knesset/store";
import { knessetLabels, voteCard } from "@/lib/knesset/view";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const live = getContent().entries.filter(isLive);
  const latest = live.slice(0, 5).map((e) => caseCard(e, locale));
  const top = people(locale).slice(0, 6);
  const byCountry = countries(locale);
  const s = stats();
  const recentVotes = getKnesset().votes.slice(0, 4).map((v) => voteCard(v, locale));
  const voteLabels = { keyVote: d.knesset.keyVote, passed: d.knesset.passed, rejected: d.knesset.rejected, bar: knessetLabels(locale) };
  const perCategory = Object.fromEntries(CATEGORIES.map((c) => [c, live.filter((e) => e.category === c).length]));

  return (
    <div className="space-y-20 pb-20">
      <section className="hero-grid text-ink-text">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-16 sm:pb-20 sm:pt-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-border bg-ink-2/70 px-3 py-1 text-sm text-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            {d.home.eyebrow}
          </p>
          <h1 className="max-w-4xl font-serif text-5xl font-black leading-[1.05] sm:text-7xl">{d.home.heading}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted sm:text-xl">{d.home.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${locale}/investigations`} className="rounded-xl bg-accent px-5 py-3 font-semibold text-ink hover:brightness-110">
              {d.home.ctaPrimary}
            </Link>
            <Link href={`/${locale}/methodology`} className="rounded-xl border border-ink-border px-5 py-3 font-semibold hover:bg-ink-2">
              {d.home.ctaSecondary}
            </Link>
          </div>
          <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-border bg-ink-border sm:grid-cols-4">
            {(["cases", "people", "countries", "sources"] as const).map((k) => (
              <div key={k} className="bg-ink-2/90 p-5">
                <dt className="text-sm text-ink-muted">{d.home.stats[k]}</dt>
                <dd className="mt-1 font-serif text-4xl font-bold tabular-nums">{s[k]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Section title={d.home.latest} link={latest.length ? { href: `/${locale}/investigations`, label: d.home.viewAll } : undefined}>
        {latest.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="font-serif text-xl font-bold">{d.home.empty}</p>
            <p className="mt-2 text-muted">{d.home.emptyDetail}</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <CaseCard c={latest[0]} locale={locale} retractedLabel={d.entry.retracted} featured />
            <div className="grid gap-4 sm:grid-cols-2">
              {latest.slice(1).map((c) => (
                <CaseCard key={c.slug} c={c} locale={locale} retractedLabel={d.entry.retracted} />
              ))}
            </div>
          </div>
        )}
      </Section>

      {top.length > 0 && (
        <Section title={d.home.topRoles} link={{ href: `/${locale}/people`, label: d.home.allPeople }}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((p) => (
              <li key={p.slug}>
                <PersonCard p={p} locale={locale} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {recentVotes.length > 0 && (
        <Section title={d.knesset.latest} link={{ href: `/${locale}/knesset`, label: d.nav.knesset }}>
          <ul className="grid gap-4 md:grid-cols-2">
            {recentVotes.map((v) => (
              <li key={v.id}>
                <VoteRow v={v} locale={locale} labels={voteLabels} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={d.home.byArea}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <li key={c}>
              <Link
                href={`/${locale}/investigations?category=${c}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:border-brand hover:shadow-lg"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <CategoryIcon category={c} />
                </span>
                <h3 className="font-serif text-lg font-bold group-hover:text-brand">{d.categories[c].name}</h3>
                <p className="text-sm text-muted">{d.categories[c].blurb}</p>
                <p className="mt-auto text-sm font-semibold">{d.cases(perCategory[c])}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {byCountry.length > 0 && (
        <Section title={d.home.byCountry} link={{ href: `/${locale}/countries`, label: d.nav.countries }}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {byCountry.map((c) => (
              <li key={c.code}>
                <Link
                  href={`/${locale}/countries/${c.code.toLowerCase()}`}
                  className="flex h-full flex-col gap-1 rounded-2xl border border-border bg-surface p-4 hover:border-brand"
                >
                  <span className="font-mono text-xs font-semibold tracking-widest text-muted">{c.code}</span>
                  <span className="font-serif text-lg font-bold">{c.name}</span>
                  <span className="text-sm text-muted">{d.cases(c.cases)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <section className="bg-ink text-ink-text">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-16">
          <h2 className="font-serif text-3xl font-bold">{d.home.how.title}</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {d.home.how.steps.map((step, i) => (
              <li key={step.title} className="space-y-2 border-t border-ink-border pt-4">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <h3 className="font-serif text-xl font-bold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <Link href={`/${locale}/methodology`} className="inline-block font-semibold text-accent hover:underline">
            {d.nav.methodology} <span className="inline-block rtl:rotate-180">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
