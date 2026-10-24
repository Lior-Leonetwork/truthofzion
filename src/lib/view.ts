import { getContent } from "./content/load";
import { POSITIONS, type Entity, type Entry, type Status } from "./content/schema";
import { countryName, formatDate, getDict, t, type Locale } from "./i18n";

// Most serious first. Used for a profile's headline status.
const SEVERITY: Status[] = ["convicted", "indicted", "under_investigation", "allegation", "documented"];

export const isLive = (e: Entry) => e.editorial.state === "published";

export function highestStatus(entries: Entry[]): Status | null {
  const live = entries.filter(isLive);
  return SEVERITY.find((s) => live.some((e) => e.status === s)) ?? null;
}

const positionRank = (e: Entity) => (e.position ? POSITIONS.indexOf(e.position) : POSITIONS.length);

export type CaseCard = {
  slug: string;
  title: string;
  summary: string;
  subject: string;
  subjectSlug: string;
  country: string;
  countryName: string;
  category: Entry["category"];
  categoryLabel: string;
  status: Status;
  statusLabel: string;
  date: string;
  retracted: boolean;
};

export function caseCard(e: Entry, locale: Locale): CaseCard {
  const d = getDict(locale);
  const entity = getContent().entities.get(e.entity);
  const country = entity?.country ?? "";
  return {
    slug: e.slug,
    title: t(e.title, locale).value,
    summary: t(e.summary, locale).value,
    subject: t(entity?.name, locale).value,
    subjectSlug: e.entity,
    country,
    countryName: country ? countryName(country, locale) : "",
    category: e.category,
    categoryLabel: d.categories[e.category].name,
    status: e.status,
    statusLabel: d.statuses[e.status].name,
    date: formatDate(e.date, locale),
    retracted: e.editorial.state === "retracted",
  };
}

export type PersonCard = {
  slug: string;
  name: string;
  role: string;
  position: string;
  country: string;
  countryName: string;
  cases: number;
  casesLabel: string;
  highest: Status | null;
  highestLabel: string;
};

// Only subjects with at least one public case appear anywhere on the site.
export function people(locale: Locale): PersonCard[] {
  const d = getDict(locale);
  const { entities, entries } = getContent();
  return [...entities.values()]
    .map((entity) => ({ entity, list: entries.filter((e) => e.entity === entity.slug) }))
    .filter(({ list }) => list.length > 0)
    .sort((a, b) => positionRank(a.entity) - positionRank(b.entity) || b.list.length - a.list.length)
    .map(({ entity, list }) => {
      const live = list.filter(isLive).length;
      const highest = highestStatus(list);
      return {
        slug: entity.slug,
        name: t(entity.name, locale).value,
        role: t(entity.role, locale).value,
        position: entity.position ? d.positions[entity.position] : "",
        country: entity.country,
        countryName: countryName(entity.country, locale),
        cases: live,
        casesLabel: d.cases(live),
        highest,
        highestLabel: highest ? d.statuses[highest].name : "",
      };
    });
}

export type CountrySummary = { code: string; name: string; people: number; cases: number };

export function countries(locale: Locale): CountrySummary[] {
  const map = new Map<string, CountrySummary>();
  for (const p of people(locale)) {
    const c = map.get(p.country) ?? { code: p.country, name: p.countryName, people: 0, cases: 0 };
    c.people += 1;
    c.cases += p.cases;
    map.set(p.country, c);
  }
  // Israel first, then by number of cases.
  return [...map.values()].sort((a, b) => Number(b.code === "IL") - Number(a.code === "IL") || b.cases - a.cases);
}

export function stats() {
  const { entries } = getContent();
  const live = entries.filter(isLive);
  const subjects = new Set(live.map((e) => e.entity));
  const { entities } = getContent();
  return {
    cases: live.length,
    people: subjects.size,
    countries: new Set([...subjects].map((s) => entities.get(s)?.country)).size,
    sources: live.reduce((n, e) => n + e.sources.length, 0),
  };
}
