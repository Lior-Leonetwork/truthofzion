import Link from "next/link";
import { Suspense } from "react";
import { EntryBrowser, type EntryCardData } from "@/components/entry-browser";
import { getContent } from "@/lib/content/load";
import { CATEGORIES, STATUSES } from "@/lib/content/schema";
import { formatDate, getDict, t, type Locale } from "@/lib/i18n";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const { entries, entities } = getContent();

  const items: EntryCardData[] = entries.map((e) => ({
    slug: e.slug,
    title: t(e.title, locale).value,
    summary: t(e.summary, locale).value,
    entityName: t(entities.get(e.entity)?.name, locale).value,
    category: e.category,
    status: e.status,
    statusLabel: d.statuses[e.status].name,
    categoryLabel: d.categories[e.category].name,
    date: formatDate(e.date, locale),
    retracted: e.editorial.state === "retracted",
  }));
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c, entries.filter((e) => e.category === c && e.editorial.state === "published").length]),
  );
  const labels = {
    ...d.filters,
    retracted: d.entry.retracted,
    categories: CATEGORIES.map((c) => [c, d.categories[c].name] as [typeof c, string]),
    statuses: STATUSES.map((s) => [s, d.statuses[s].name] as [typeof s, string]),
  };

  return (
    <div className="space-y-14">
      <section className="space-y-5">
        <p className="text-sm font-semibold tracking-wide text-gold">{d.tagline}</p>
        <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-5xl">{d.home.heading}</h1>
        <p className="max-w-3xl text-lg text-muted">{d.home.intro}</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {d.home.pillars.map((p) => (
            <li key={p} className="rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed">{p}</li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/${locale}?category=${c}#cases`}
            className="group rounded-xl border border-border bg-surface p-5 hover:border-brand"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-xl font-bold group-hover:text-brand">{d.categories[c].name}</h2>
              <span className="text-sm tabular-nums text-muted">{counts[c]}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{d.categories[c].blurb}</p>
          </Link>
        ))}
      </section>

      <section id="cases" className="scroll-mt-6 space-y-5">
        <h2 className="font-serif text-2xl font-bold">{d.home.browse}</h2>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-semibold">{d.home.empty}</p>
            <p className="mt-2 text-sm text-muted">{d.home.emptyDetail}</p>
          </div>
        ) : (
          <Suspense>
            <EntryBrowser locale={locale} items={items} labels={labels} />
          </Suspense>
        )}
      </section>
    </div>
  );
}
