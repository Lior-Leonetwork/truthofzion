import type { Row } from "./odata";
import type { Member, Vote, VoteChoice } from "./schema";

// Built on the Knesset's ParliamentInfo (OData v4) tables KNS_PlenumVote and
// KNS_PlenumVoteResult. The older Votes.svc stopped updating in July 2021.

const str = (v: Row[string] | undefined) => (v === null || v === undefined ? "" : String(v)).trim();
const num = (v: Row[string] | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));

// When each Knesset was sworn in. Votes don't carry a Knesset number.
export const KNESSET_START: Record<number, string> = { 25: "2022-11-15" };

// How far back the archive reaches: votes from the last two years, never
// earlier than the start of the Knesset being collected.
export function startDate(knesset: number, today: string, years = 2, override?: string) {
  if (override) return override;
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  const back = d.toISOString().slice(0, 10);
  const sworn = KNESSET_START[knesset];
  return sworn && sworn > back ? sworn : back;
}

// Final passage: the "for" option reads "לקבל את הצעת החוק בקריאה שלישית".
// Excludes votes to send a bill to committee "to prepare for second and third reading".
export function isFinalReading(r: Row) {
  const option = str(r.ForOptionDesc);
  return /^לקבל/.test(option) && /שלישית/.test(option) && !/להעביר|להכנה/.test(option);
}

// The service sometimes returns the same row twice.
export function dedupeById(rows: Row[]) {
  const seen = new Map<string, Row>();
  for (const r of rows) seen.set(str(r.Id), r);
  return [...seen.values()];
}

const CHOICES: Record<string, VoteChoice> = { בעד: "for", נגד: "against", נמנע: "abstain" };

export function recordUrl(id: number) {
  return `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PlenumVote(${id})`;
}

type Position = { faction: string; start: string; finish: string };

// KNS_PersonToPosition rows → each person's faction memberships over time.
export function factionsFrom(rows: Row[]) {
  const map = new Map<string, Position[]>();
  for (const r of rows) {
    const faction = str(r.FactionName);
    if (!faction) continue;
    const list = map.get(str(r.PersonID)) ?? [];
    list.push({ faction, start: str(r.StartDate).slice(0, 10), finish: str(r.FinishDate).slice(0, 10) || "9999-12-31" });
    map.set(str(r.PersonID), list);
  }
  return map;
}

export function factionAt(factions: Map<string, Position[]>, personId: string, date: string) {
  const list = factions.get(personId) ?? [];
  const match = list.find((p) => p.start <= date && date <= p.finish);
  return (match ?? [...list].sort((a, b) => b.start.localeCompare(a.start))[0])?.faction ?? "";
}

export type Built = { ok: true; vote: Vote; names: Map<string, string> } | { ok: false; reason: string };

export function buildVote(header: Row, results: Row[], factions: Map<string, Position[]>, knesset: number, today: string): Built {
  const id = num(header.Id)!;
  const stamp = str(header.VoteDateTime);
  const date = stamp.slice(0, 10);
  const members: Vote["members"] = {};
  const names = new Map<string, string>();
  for (const r of results) {
    const mk = str(r.MkId);
    const raw = str(r.ResultDesc);
    if (members[mk] && members[mk].raw !== raw) return { ok: false, reason: `member ${mk} recorded as both "${members[mk].raw}" and "${raw}"` };
    members[mk] = { choice: CHOICES[raw] ?? "other", raw, faction: factionAt(factions, mk, date) };
    names.set(mk, `${str(r.FirstName)} ${str(r.LastName)}`.trim());
  }
  if (Object.keys(members).length === 0) return { ok: false, reason: "no member results published yet" };
  const totals = { for: 0, against: 0, abstain: 0 };
  for (const m of Object.values(members)) if (m.choice !== "other") totals[m.choice]++;
  return {
    ok: true,
    names,
    vote: {
      id,
      knesset,
      date,
      time: stamp.slice(11, 16),
      item: { id: num(header.ItemID), title: str(header.VoteTitle) },
      voteTitle: [str(header.ForOptionDesc), str(header.VoteSubject)].filter((x) => x && x !== "null").join(" — "),
      accepted: null,
      totals,
      members,
      source: { url: recordUrl(id), retrievedOn: today },
    },
  };
}

export function mergeMembers(existing: Record<string, Member>, vote: Vote, names: Map<string, string>) {
  for (const [id, m] of Object.entries(vote.members)) {
    const prev = existing[id];
    const knessets = new Set([...(prev?.knessets ?? []), vote.knesset]);
    existing[id] = {
      id,
      name: names.get(id) || prev?.name || id,
      faction: m.faction || prev?.faction || "",
      knessets: [...knessets].sort((a, b) => a - b),
    };
  }
  return existing;
}
