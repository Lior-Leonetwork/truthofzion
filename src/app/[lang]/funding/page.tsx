import type { Metadata } from "next";
import Link from "next/link";
import { FundingBrowser } from "@/components/funding-browser";
import { PageHeader } from "@/components/page-header";
import { countryName, getDict, type Locale } from "@/lib/i18n";
import { donorCountries, fundingStats, money, ngoRows, SOURCE_URL } from "@/lib/funding/view";

export async function generateMetadata({ params }: PageProps<"/[lang]/funding">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.funding };
}

export default async function Funding({ params }: PageProps<"/[lang]/funding">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const f = d.funding;
  const s = fundingStats();
  const items = ngoRows(locale);
  const donors = donorCountries(s.from);
  const stats = [
    [f.stats.ngos, s.ngos.toLocaleString(locale)],
    [f.stats.recent(s.from), money(s.recent, locale, true)],
    [f.stats.total(s.firstYear ?? s.from), money(s.total, locale, true)],
    [f.stats.updated, s.state ? new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(s.state.updatedAt)) : "—"],
  ];
  const labels = {
    all: d.filters.all,
    search: f.search,
    years: f.years,
    recentYears: f.recentYears(s.from),
    allYears: f.allYears,
    donor: f.donor,
    otherDonor: f.otherDonor,
    mainly: f.mainly,
    mainlyOnly: f.mainlyOnly,
    mainlyBadge: f.mainlyBadge,
    none: f.none,
    sortTotal: f.sortTotal,
    showMore: f.showMore,
    countries: donors.slice(0, 12).map((c) => [c.code, countryName(c.code, locale)] as [string, string]),
  };

  return (
    <>
      <PageHeader eyebrow={d.home.eyebrow} title={f.heading} intro={f.intro}>
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
              <p className="font-serif text-xl font-bold">{f.empty}</p>
              <p className="mt-2 text-muted">{f.emptyDetail}</p>
            </div>
          ) : (
            <FundingBrowser locale={locale} items={items} from={s.from} labels={labels} />
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {donors.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {f.donorCountries} · {f.recentYears(s.from)}
              </p>
              <ul className="space-y-2 text-sm">
                {donors.filter((c) => c.recent > 0).slice(0, 12).map((c) => (
                  <li key={c.code}>
                    <Link href={`/${locale}/countries/${c.code.toLowerCase()}`} className="flex justify-between gap-3 hover:text-brand">
                      <span>{countryName(c.code, locale)}</span>
                      <span className="font-semibold tabular-nums">{money(c.recent, locale, true)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed">
            <p>{f.notAccusation}</p>
            <p className="text-muted">{f.sourceNote}</p>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="inline-block font-semibold text-brand hover:underline">
              {f.official} ↗
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
