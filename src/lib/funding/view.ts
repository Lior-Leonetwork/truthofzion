import { countryName, type Locale } from "../i18n";
import { resourcePage, DONATIONS_RESOURCE } from "./ckan";
import type { Ngo } from "./schema";
import { getNgos, readFundingState } from "./store";
import { totals } from "./transform";
import { money } from "./format";

export { money };

export const SOURCE_URL = resourcePage(DONATIONS_RESOURCE);

// The window the site leads with, matching the Knesset section: the last two
// full years plus the current one. Every year stays one click away.
export function recentFrom(today = new Date()) {
  return today.getUTCFullYear() - 2;
}

export function donorCountryName(code: string | null, locale: Locale, other: string) {
  return code ? countryName(code, locale) : other;
}

export const ngoName = (n: Ngo, locale: Locale) => (locale === "en" && n.nameEn ? n.nameEn : n.name);

// What the directory needs per NGO: amounts by year and donor country, so the
// client can filter without shipping every filing.
export type NgoRow = {
  number: string;
  name: string;
  nameHe: string;
  sub: string;
  cells: [number, string, number][]; // year, donor country ("" = not named), ₪
  mainlyYears: number[];
  topDonor: string;
  lastYear: number;
};

export function ngoRows(locale: Locale): NgoRow[] {
  return getNgos().map((n) => {
    const cells = new Map<string, number>();
    for (const d of n.donations) {
      const k = `${d.year}|${d.donorCountry ?? ""}`;
      cells.set(k, (cells.get(k) ?? 0) + d.amountNis);
    }
    const t = totals(n);
    return {
      number: n.number,
      name: ngoName(n, locale),
      nameHe: n.name,
      sub: [n.city, n.sector].filter(Boolean).join(" · "),
      cells: [...cells.entries()].map(([k, v]) => {
        const [y, c] = k.split("|");
        return [Number(y), c, Math.round(v)] as [number, string, number];
      }),
      mainlyYears: t.mainlyYears,
      topDonor: t.topDonors[0]?.[0] ?? "",
      lastYear: t.lastYear,
    };
  });
}

export type DonorCountry = { code: string; total: number; recent: number; ngos: number };

export function donorCountries(from = recentFrom()): DonorCountry[] {
  const map = new Map<string, { total: number; recent: number; ngos: Set<string> }>();
  for (const n of getNgos()) {
    for (const d of n.donations) {
      if (!d.donorCountry) continue;
      const c = map.get(d.donorCountry) ?? { total: 0, recent: 0, ngos: new Set() };
      c.total += d.amountNis;
      if (d.year >= from) c.recent += d.amountNis;
      c.ngos.add(n.number);
      map.set(d.donorCountry, c);
    }
  }
  return [...map.entries()]
    .map(([code, c]) => ({ code, total: c.total, recent: c.recent, ngos: c.ngos.size }))
    .sort((a, b) => b.recent - a.recent || b.total - a.total);
}

// NGOs that received money from one donor country, largest first.
export function recipientsOf(code: string) {
  return getNgos()
    .map((n) => {
      const ds = n.donations.filter((d) => d.donorCountry === code);
      const years = ds.map((d) => d.year);
      return { ngo: n, total: ds.reduce((s, d) => s + d.amountNis, 0), firstYear: Math.min(...years), lastYear: Math.max(...years) };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

// NGOs whose own filings declare that most of their funding comes from foreign
// state entities, in a recent year. The declaration is the NGO's, not ours.
export function mainlyForeignFunded(from = recentFrom()) {
  return getNgos()
    .map((n) => {
      const t = totals(n);
      const recent = n.donations.filter((d) => d.year >= from).reduce((s, d) => s + d.amountNis, 0);
      return { ngo: n, years: t.mainlyYears.filter((y) => y >= from), recent };
    })
    .filter((r) => r.years.length > 0)
    .sort((a, b) => b.recent - a.recent);
}

export function fundingStats(from = recentFrom()) {
  const ngos = getNgos();
  const all = ngos.flatMap((n) => n.donations);
  const recent = all.filter((d) => d.year >= from);
  return {
    ngos: ngos.length,
    reports: all.length,
    total: all.reduce((s, d) => s + d.amountNis, 0),
    recent: recent.reduce((s, d) => s + d.amountNis, 0),
    recentNgos: new Set(ngos.filter((n) => n.donations.some((d) => d.year >= from)).map((n) => n.number)).size,
    firstYear: all.length ? Math.min(...all.map((d) => d.year)) : null,
    from,
    state: readFundingState(),
  };
}

export const getNgo = (number: string) => getNgos().find((n) => n.number === number);

// Cards for the NGOs that declared they are funded mainly by foreign states.
export function mainlyCards(locale: Locale, labels: { badge: string; since: string }, limit?: number) {
  return mainlyForeignFunded()
    .slice(0, limit)
    .map(({ ngo, recent }) => ({
      number: ngo.number,
      name: ngoName(ngo, locale),
      sub: [ngo.city, ngo.sector].filter(Boolean).join(" · "),
      amount: money(recent, locale, true),
      amountLabel: labels.since,
      note: labels.badge,
    }));
}
