import { getContent } from "../content/load";
import { formatDate, getDict, t, type Locale } from "../i18n";
import type { Spectrum, Vote, VoteChoice } from "./schema";
import { computeScorecard } from "./scorecard";
import { getKnesset } from "./store";

export type VoteCard = {
  id: number;
  title: string;
  date: string;
  accepted: boolean | null;
  totals: Vote["totals"];
  summary: string | null;
  keyVote: boolean;
  topics: string[];
  topicLabels: string[];
};

export function voteCard(v: Vote, locale: Locale): VoteCard {
  const { analyses, watch } = getKnesset();
  const a = analyses.get(v.id);
  const names = new Map(watch.map((w) => [w.id, t(w.name, locale).value]));
  return {
    id: v.id,
    title: v.item.title,
    date: formatDate(v.date, locale),
    accepted: v.accepted,
    totals: v.totals,
    summary: a?.summary ? t(a.summary, locale).value : null,
    keyVote: a?.editorial.keyVote ?? false,
    topics: a?.topics ?? [],
    topicLabels: (a?.topics ?? []).map((id) => names.get(id) ?? id),
  };
}

export function memberRecord(id: string) {
  const { votes } = getKnesset();
  const record = votes.filter((v) => v.members[id]).map((v) => ({ vote: v, choice: v.members[id].choice as VoteChoice }));
  const counts = { for: 0, against: 0, abstain: 0, other: 0 };
  for (const r of record) counts[r.choice]++;
  return { record, counts };
}

// The investigated profile (if any) that links to this member's voting record.
export function profileFor(memberId: string) {
  return [...getContent().entities.values()].find((e) => e.knessetMemberId === memberId) ?? null;
}

export function knessetLabels(locale: Locale) {
  const k = getDict(locale).knesset;
  return { for: k.choices.for, against: k.choices.against, abstain: k.choices.abstain };
}

// Editors' classification for a faction as the Knesset spells it.
export function factionInfo(name: string, locale: Locale) {
  const f = getKnesset().factions.get(name);
  const d = getDict(locale);
  return {
    short: f ? t(f.short, locale).value : name,
    spectrum: f?.spectrum ?? ("unclassified" as Spectrum),
    spectrumLabel: d.spectrum[f?.spectrum ?? "unclassified"],
    sectorLabel: f?.sector ? d.sector[f.sector] : null,
  };
}

export function scorecardFor(memberId: string) {
  const { votes, analyses } = getKnesset();
  return computeScorecard(votes, analyses, memberId);
}

export const SPECTRUM_ORDER: Spectrum[] = ["far_right", "right", "center_right", "center", "center_left", "left", "far_left", "unclassified"];
