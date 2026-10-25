import { getContent } from "./content/load";
import { POSITIONS, type Entity, type Entry, type Status } from "./content/schema";
import { countryName, formatDate, getDict, t, type Locale } from "./i18n";
import { getKnesset } from "./knesset/store";
import { factionInfo, scorecardFor, SPECTRUM_ORDER } from "./knesset/view";
import type { Spectrum } from "./knesset/schema";
import { donorCountries } from "./funding/view";

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
  href: string;
  kind: "case" | "member"; // investigated subject, or a Knesset member shown for their record
  name: string;
  role: string;
  position: string;
  country: string;
  countryName: string;
  cases: number;
  casesLabel: string;
  highest: Status | null;
  highestLabel: string;
  party: string | null;
  spectrum: Spectrum | null;
  spectrumLabel: string | null;
  sectorLabel: string | null;
  record: string | null; // "voted with the site's position on X of Y key votes"
  recordShare: number | null; // X / Y, for sorting
};

function memberExtras(memberId: string | undefined, locale: Locale) {
  const member = memberId ? getKnesset().members[memberId] : undefined;
  if (!member) return { party: null, spectrum: null, spectrumLabel: null, sectorLabel: null, record: null, recordShare: null };
  const f = factionInfo(member.faction, locale);
  const card = scorecardFor(member.id);
  const decided = card.aligned + card.opposed;
  return {
    party: f.short,
    spectrum: f.spectrum,
    spectrumLabel: f.spectrumLabel,
    sectorLabel: f.sectorLabel,
    record: decided > 0 ? getDict(locale).record.summary(card.aligned, decided) : null,
    recordShare: decided > 0 ? card.aligned / decided : null,
  };
}

// Investigated subjects (those with a public case), then every Knesset member
// not already among them, grouped right to left by their party's classification.
export function people(locale: Locale): PersonCard[] {
  const d = getDict(locale);
  const { entities, entries } = getContent();
  const cases: PersonCard[] = [...entities.values()]
    .map((entity) => ({ entity, list: entries.filter((e) => e.entity === entity.slug) }))
    .filter(({ list }) => list.length > 0)
    .sort((a, b) => positionRank(a.entity) - positionRank(b.entity) || b.list.length - a.list.length)
    .map(({ entity, list }) => {
      const live = list.filter(isLive).length;
      const highest = highestStatus(list);
      return {
        slug: entity.slug,
        href: `/${locale}/profiles/${entity.slug}`,
        kind: "case" as const,
        name: t(entity.name, locale).value,
        role: t(entity.role, locale).value,
        position: entity.position ? d.positions[entity.position] : "",
        country: entity.country,
        countryName: countryName(entity.country, locale),
        cases: live,
        casesLabel: d.cases(live),
        highest,
        highestLabel: highest ? d.statuses[highest].name : "",
        ...memberExtras(entity.knessetMemberId, locale),
      };
    });

  const linked = new Set(cases.map((c) => entities.get(c.slug)?.knessetMemberId).filter(Boolean));
  const collator = new Intl.Collator("he");
  const members: PersonCard[] = Object.values(getKnesset().members)
    .filter((m) => !linked.has(m.id))
    .map((m) => {
      const extras = memberExtras(m.id, locale);
      return {
        slug: `mk-${m.id}`,
        href: `/${locale}/knesset/members/${m.id}`,
        kind: "member" as const,
        name: m.name,
        role: `${d.people.memberRole} · ${extras.party ?? m.faction}`,
        position: d.positions.legislator,
        country: "IL",
        countryName: countryName("IL", locale),
        cases: 0,
        casesLabel: "",
        highest: null,
        highestLabel: "",
        ...extras,
      };
    })
    .sort(
      (a, b) =>
        SPECTRUM_ORDER.indexOf(a.spectrum ?? "unclassified") - SPECTRUM_ORDER.indexOf(b.spectrum ?? "unclassified") ||
        collator.compare(a.party ?? "", b.party ?? "") ||
        collator.compare(a.name, b.name),
    );
  return [...cases, ...members];
}

// funding: what bodies of that country gave Israeli NGOs in the recent window
// (official filings), so donor countries are listed even with no case yet.
export type CountrySummary = { code: string; name: string; people: number; cases: number; funding: number; fundedNgos: number };

export function countries(locale: Locale): CountrySummary[] {
  const map = new Map<string, CountrySummary>();
  const blank = (code: string) => ({ code, name: countryName(code, locale), people: 0, cases: 0, funding: 0, fundedNgos: 0 });
  for (const p of people(locale)) {
    const c = map.get(p.country) ?? blank(p.country);
    c.people += 1;
    c.cases += p.cases;
    map.set(p.country, c);
  }
  for (const f of donorCountries()) {
    const c = map.get(f.code) ?? blank(f.code);
    c.funding = f.recent;
    c.fundedNgos = f.ngos;
    map.set(f.code, c);
  }
  // Israel first, then by number of cases, then by funding.
  return [...map.values()].sort(
    (a, b) => Number(b.code === "IL") - Number(a.code === "IL") || b.cases - a.cases || b.funding - a.funding,
  );
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
