import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PeopleBrowser } from "@/components/people-browser";
import { getDict, type Locale } from "@/lib/i18n";
import { SPECTRUM_ORDER } from "@/lib/knesset/view";
import { countries, people } from "@/lib/view";

export async function generateMetadata({ params }: PageProps<"/[lang]/people">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.people };
}

export default async function People({ params }: PageProps<"/[lang]/people">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const items = people(locale);
  const labels = {
    all: d.filters.all,
    country: d.filters.country,
    orientation: d.people.orientation,
    spectra: SPECTRUM_ORDER.filter((s) => items.some((p) => p.spectrum === s)).map((s) => [s, d.spectrum[s]] as [string, string]),
    search: d.people.search,
    none: d.people.none,
    countries: countries(locale).map((c) => [c.code, c.name] as [string, string]),
  };
  return (
    <>
      <PageHeader eyebrow={d.home.eyebrow} title={d.people.heading} intro={d.people.intro} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">{d.people.none}</p>
        ) : (
          <Suspense>
            <PeopleBrowser locale={locale} items={items} labels={labels} />
          </Suspense>
        )}
      </div>
    </>
  );
}
