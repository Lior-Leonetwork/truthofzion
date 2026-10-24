import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseCard } from "@/components/case-card";
import { CountryTag } from "@/components/country-tag";
import { L } from "@/components/localized-text";
import { Monogram } from "@/components/monogram";
import { Section } from "@/components/section";
import { StatusBadge } from "@/components/status-badge";
import { entriesFor, getContent, getEntity } from "@/lib/content/load";
import { countryName, getDict, LOCALES, t, type Locale } from "@/lib/i18n";
import { caseCard, highestStatus, isLive } from "@/lib/view";

export const dynamicParams = false;

// A profile only exists once at least one case about it is public.
export function generateStaticParams() {
  const slugs = new Set(getContent().entries.map((e) => e.entity));
  return LOCALES.flatMap((lang) => [...slugs].map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/profiles/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const entity = getEntity(slug);
  return entity ? { title: t(entity.name, lang as Locale).value } : {};
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/profiles/[slug]">) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const entity = getEntity(slug);
  const entries = entriesFor(slug);
  if (!entity || entries.length === 0) notFound();
  const d = getDict(locale);
  const name = t(entity.name, locale).value;
  const highest = highestStatus(entries);
  const live = entries.filter(isLive).length;

  return (
    <div className="space-y-16 pb-20">
      <section className="hero-grid text-ink-text">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-center sm:py-16">
          <Monogram name={name} seed={entity.slug} size="lg" />
          <div className="flex-1 space-y-3">
            <p className="text-sm font-semibold text-accent">
              {d.profile.dossier}
              {entity.position && ` · ${d.positions[entity.position]}`}
            </p>
            <h1 className="font-serif text-4xl font-black sm:text-5xl">{name}</h1>
            <L as="p" text={entity.role} locale={locale} className="text-lg text-ink-muted" />
            <CountryTag code={entity.country} name={countryName(entity.country, locale)} tone="ink" />
          </div>
          <dl className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-border bg-ink-border">
            <div className="bg-ink-2 p-4">
              <dt className="text-xs text-ink-muted">{d.profile.cases}</dt>
              <dd className="font-serif text-3xl font-bold">{live}</dd>
            </div>
            <div className="bg-ink-2 p-4">
              <dt className="text-xs text-ink-muted">{d.profile.highest}</dt>
              <dd className="mt-2">{highest && <StatusBadge status={highest} label={d.statuses[highest].name} className="bg-ink" />}</dd>
            </div>
          </dl>
        </div>
      </section>

      {(entity.description || entity.links.length > 0) && (
        <div className="mx-auto max-w-6xl space-y-4 px-4">
          {entity.description && <L as="p" text={entity.description} locale={locale} className="max-w-3xl text-lg leading-relaxed" />}
          {entity.links.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-sm">
              {entity.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border border-border bg-surface px-3 py-1 hover:border-brand hover:text-brand">
                    <L text={l.label} locale={locale} /> ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Section title={d.profile.cases}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <li key={e.slug}>
              <CaseCard c={caseCard(e, locale)} locale={locale} retractedLabel={d.entry.retracted} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
