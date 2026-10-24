import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseCard } from "@/components/case-card";
import { PageHeader } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";
import { Section } from "@/components/section";
import { getContent } from "@/lib/content/load";
import { countryName, getDict, LOCALES, type Locale } from "@/lib/i18n";
import { caseCard, countries, people } from "@/lib/view";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => countries(lang).map((c) => ({ lang, code: c.code.toLowerCase() })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/countries/[code]">): Promise<Metadata> {
  const { lang, code } = await params;
  return { title: countryName(code.toUpperCase(), lang as Locale) };
}

export default async function CountryPage({ params }: PageProps<"/[lang]/countries/[code]">) {
  const { lang, code: raw } = await params;
  const locale = lang as Locale;
  const code = raw.toUpperCase();
  const d = getDict(locale);
  const summary = countries(locale).find((c) => c.code === code);
  if (!summary) notFound();
  const who = people(locale).filter((p) => p.country === code);
  const slugs = new Set(who.map((p) => p.slug));
  const cases = getContent().entries.filter((e) => slugs.has(e.entity)).map((e) => caseCard(e, locale));

  return (
    <div className="space-y-16 pb-20">
      <PageHeader eyebrow={code} title={summary.name}>
        <p className="text-ink-muted">
          {d.cases(summary.cases)} · {summary.people} {d.countries.people}
        </p>
      </PageHeader>
      <Section title={d.countries.people}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {who.map((p) => (
            <li key={p.slug}>
              <PersonCard p={p} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>
      <Section title={d.countries.cases}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <li key={c.slug}>
              <CaseCard c={c} locale={locale} retractedLabel={d.entry.retracted} />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
