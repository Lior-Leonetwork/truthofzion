import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseBrowser } from "@/components/case-browser";
import { PageHeader } from "@/components/page-header";
import { getContent } from "@/lib/content/load";
import { CATEGORIES, STATUSES } from "@/lib/content/schema";
import { getDict, type Locale } from "@/lib/i18n";
import { caseCard, countries } from "@/lib/view";

export async function generateMetadata({ params }: PageProps<"/[lang]/investigations">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.investigations };
}

export default async function Investigations({ params }: PageProps<"/[lang]/investigations">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const items = getContent().entries.map((e) => caseCard(e, locale));
  const labels = {
    ...d.filters,
    retracted: d.entry.retracted,
    categories: CATEGORIES.map((c) => [c, d.categories[c].name] as [typeof c, string]),
    statuses: STATUSES.map((s) => [s, d.statuses[s].name] as [typeof s, string]),
    countries: countries(locale).map((c) => [c.code, c.name] as [string, string]),
  };
  return (
    <>
      <PageHeader eyebrow={d.home.eyebrow} title={d.investigations.heading} intro={d.investigations.intro} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="font-serif text-xl font-bold">{d.home.empty}</p>
            <p className="mt-2 text-muted">{d.home.emptyDetail}</p>
          </div>
        ) : (
          <Suspense>
            <CaseBrowser locale={locale} items={items} labels={labels} />
          </Suspense>
        )}
      </div>
    </>
  );
}
