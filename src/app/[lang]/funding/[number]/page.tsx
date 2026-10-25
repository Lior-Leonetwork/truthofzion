import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { formatDate, getDict, LOCALES, type Locale } from "@/lib/i18n";
import { getNgos } from "@/lib/funding/store";
import { totals } from "@/lib/funding/transform";
import { donorCountryName, getNgo, money, ngoName, SOURCE_URL } from "@/lib/funding/view";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => getNgos().map((n) => ({ lang, number: n.number })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/funding/[number]">): Promise<Metadata> {
  const { lang, number } = await params;
  const ngo = getNgo(number);
  return { title: ngo ? ngoName(ngo, lang as Locale) : number };
}

export default async function NgoPage({ params }: PageProps<"/[lang]/funding/[number]">) {
  const { lang, number } = await params;
  const locale = lang as Locale;
  const d = getDict(locale);
  const f = d.funding;
  const ngo = getNgo(number);
  if (!ngo) notFound();
  const t = totals(ngo);
  const maxYear = Math.max(...t.byYear.map(([, v]) => v), 1);
  const other = locale === "he" ? ngo.nameEn : ngo.name;
  const subtitle = other && other !== ngoName(ngo, locale) ? other : undefined;
  const turnoverYearDonations = ngo.turnoverYear ? t.byYear.find(([y]) => y === ngo.turnoverYear)?.[1] : undefined;
  const share =
    ngo.turnover && ngo.turnover > 0 && ngo.turnoverYear && turnoverYearDonations
      ? f.share(
          new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-GB", { style: "percent", maximumFractionDigits: 0 }).format(turnoverYearDonations / ngo.turnover),
          ngo.turnoverYear,
          money(ngo.turnover, locale),
        )
      : null;
  const donors = new Map<string, { country: string | null; total: number; count: number }>();
  for (const x of ngo.donations) {
    const r = donors.get(x.donor) ?? { country: x.donorCountry, total: 0, count: 0 };
    r.total += x.amountNis;
    r.count += 1;
    donors.set(x.donor, r);
  }
  const registry = [
    [f.registry.number, ngo.number],
    [f.registry.status, ngo.status],
    [f.registry.sector, ngo.sector],
    [f.registry.city, ngo.city],
  ].filter(([, v]) => v);
  const stats = [
    [f.total, money(t.total, locale)],
    [f.cols.count, f.reports(ngo.donations.length)],
    [f.years, t.firstYear === t.lastYear ? String(t.lastYear) : `${t.firstYear}–${t.lastYear}`],
    [f.cols.reported, t.latestReport ? formatDate(t.latestReport, locale) : "—"],
  ];

  return (
    <div className="space-y-14 pb-20">
      <PageHeader eyebrow={`${f.ngo} · ${ngo.number}`} title={ngoName(ngo, locale)} intro={subtitle}>
        {t.mainlyYears.length > 0 && (
          <p className="max-w-3xl rounded-xl border border-status-indicted/50 bg-status-indicted/15 px-4 py-3 text-sm font-semibold">
            {f.mainlyDeclared(t.mainlyYears.join(", "))}
          </p>
        )}
        <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-border bg-ink-border sm:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-ink-2/90 p-4">
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="mt-1 font-serif text-lg font-bold tabular-nums sm:text-xl">{value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <h2 className="border-b border-border pb-3 font-serif text-2xl font-bold">{f.byYear}</h2>
          <ul className="space-y-2">
            {t.byYear.map(([year, v]) => (
              <li key={year} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-sm">
                <span className="font-mono tabular-nums text-muted">{year}</span>
                <div className="h-3 overflow-hidden rounded-full bg-border">
                  <div className={`h-full rounded-full ${t.mainlyYears.includes(year) ? "bg-status-indicted" : "bg-brand"}`} style={{ width: `${Math.max(1, (v / maxYear) * 100)}%` }} />
                </div>
                <span className="font-semibold tabular-nums">{money(v, locale)}</span>
              </li>
            ))}
          </ul>
          {share && <p className="text-sm text-muted">{share}</p>}
        </div>
        <aside className="space-y-4">
          <dl className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm">
            {registry.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted">{k}</dt>
                <dd lang="he" className="text-end font-semibold">{v}</dd>
              </div>
            ))}
            {ngo.goals && (
              <div className="space-y-1 border-t border-border pt-3">
                <dt className="text-muted">{f.registry.goals}</dt>
                <dd lang="he" dir="rtl" className="line-clamp-6 leading-relaxed">{ngo.goals}</dd>
              </div>
            )}
          </dl>
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed">
            <p>{f.notAccusation}</p>
            <p className="text-muted">{f.sourceNote}</p>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="inline-block font-semibold text-brand hover:underline">
              {f.official} ↗
            </a>
          </div>
        </aside>
      </div>

      <Section title={f.byDonor}>
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-start text-xs text-muted">
              <tr>
                <th className="p-3 text-start font-semibold">{f.cols.donor}</th>
                <th className="p-3 text-start font-semibold">{f.cols.country}</th>
                <th className="p-3 text-end font-semibold">{f.cols.count}</th>
                <th className="p-3 text-end font-semibold">{f.cols.amount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...donors.entries()].sort((a, b) => b[1].total - a[1].total).map(([donor, r]) => (
                <tr key={donor}>
                  <td lang="he" className="p-3 font-semibold">{donor}</td>
                  <td className="p-3">
                    {r.country ? (
                      <Link href={`/${locale}/countries/${r.country.toLowerCase()}`} className="hover:text-brand hover:underline">
                        {donorCountryName(r.country, locale, f.otherDonor)}
                      </Link>
                    ) : (
                      <span className="text-muted">{f.otherDonor}</span>
                    )}
                  </td>
                  <td className="p-3 text-end tabular-nums">{r.count}</td>
                  <td className="p-3 text-end font-semibold tabular-nums">{money(r.total, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={f.allReports}>
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-background text-xs text-muted">
              <tr>
                <th className="p-3 text-start font-semibold">{f.cols.year}</th>
                <th className="p-3 text-start font-semibold">{f.cols.donor}</th>
                <th className="p-3 text-end font-semibold">{f.cols.amount}</th>
                <th className="p-3 text-start font-semibold">{f.cols.purpose}</th>
                <th className="p-3 text-start font-semibold">{f.cols.reported}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border align-top">
              {ngo.donations.map((x, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap p-3 tabular-nums">
                    {x.year}
                    {x.quarter && <span className="text-muted"> · {f.quarter(x.quarter)}</span>}
                  </td>
                  <td lang="he" className="p-3">{x.donor}</td>
                  <td className="whitespace-nowrap p-3 text-end font-semibold tabular-nums">
                    {money(x.amountNis, locale)}
                    {x.currency && !/^(ש"ח|שקל|ILS|NIS)/i.test(x.currency) && <span className="block text-xs font-normal text-muted">{x.currency}</span>}
                  </td>
                  <td lang="he" dir="rtl" className="p-3 text-start">
                    {x.purpose}
                    {x.conditions && <span className="mt-1 block text-xs text-muted">{f.cols.conditions}: {x.conditions}</span>}
                  </td>
                  <td className="whitespace-nowrap p-3 text-muted tabular-nums">{x.reportDate ? formatDate(x.reportDate, locale) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
