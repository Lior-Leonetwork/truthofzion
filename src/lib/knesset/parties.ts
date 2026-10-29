import type { Localized } from "../content/schema";
import type { Analysis, Member, Spectrum, Vote } from "./schema";
import { getKnesset } from "./store";

// A party as readers know it. The Knesset sometimes spells one party two ways
// (a renamed list), so factions are grouped by their English short name.
export type Party = {
  slug: string;
  names: string[];
  short: Localized;
  spectrum: Spectrum;
  sector: string | null;
  members: Member[];
};

export const partySlug = (en: string) =>
  en
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "party";

export function parties(): Party[] {
  const { factions, members } = getKnesset();
  const map = new Map<string, Party>();
  for (const f of factions.values()) {
    const slug = partySlug(f.short.en ?? f.name);
    const p = map.get(slug) ?? { slug, names: [], short: f.short, spectrum: f.spectrum, sector: f.sector ?? null, members: [] };
    p.names.push(f.name);
    map.set(slug, p);
  }
  for (const m of Object.values(members)) {
    const p = [...map.values()].find((x) => x.names.includes(m.faction));
    p?.members.push(m);
  }
  return [...map.values()].filter((p) => p.members.length > 0);
}

export const partyFor = (faction: string) => parties().find((p) => p.names.includes(faction)) ?? null;

export type PartyKeyVote = {
  vote: Vote;
  analysis: Analysis;
  position: "for" | "against";
  counts: { for: number; against: number; abstain: number };
};

// How the party's members voted on each key vote, against the site's position,
// counted per member from the official roll call. Members with no for, against
// or abstain on record aren't counted (the record doesn't say who was absent).
export function partyKeyVotes(p: Party) {
  const { votes, analyses } = getKnesset();
  const ids = new Set(p.members.map((m) => m.id));
  const rows: PartyKeyVote[] = [];
  let aligned = 0;
  let opposed = 0;
  for (const vote of votes) {
    const a = analyses.get(vote.id);
    if (!a?.editorial.keyVote || !a.editorial.position) continue;
    const counts = { for: 0, against: 0, abstain: 0 };
    let present = 0;
    for (const [id, mv] of Object.entries(vote.members)) {
      if (!ids.has(id) || !p.names.includes(mv.faction)) continue;
      if (mv.choice === "other") continue;
      present++;
      counts[mv.choice]++;
    }
    if (present === 0) continue;
    const pos = a.editorial.position;
    aligned += counts[pos];
    opposed += counts[pos === "for" ? "against" : "for"];
    rows.push({ vote, analysis: a, position: pos, counts });
  }
  rows.sort((x, y) => y.vote.date.localeCompare(x.vote.date) || y.vote.id - x.vote.id);
  return { rows, aligned, opposed };
}
