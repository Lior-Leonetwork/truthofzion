import type { Row } from "./odata";
import type { Member, Vote, VoteChoice } from "./schema";

const str = (v: Row[string]) => (v === null || v === undefined ? "" : String(v)).trim();
const num = (v: Row[string]) => (v === null || v === undefined || v === "" ? null : Number(v));

// The header table's key has been published as both "vote_id" and "id".
export const headerId = (r: Row) => num(r.vote_id ?? r.id);

// Final passage of a law: the votes that decide whether it becomes law. These
// are the ones the site publishes; procedural votes are skipped.
const FINAL_READING = [/קריאה\s+שלישית/, /קריאה\s+שני[י]?ה\s+ושלישית/, /החוק\s+כולו/, /הצעת\s+החוק\s+כולה/];

export function isFinalReading(r: Row) {
  const text = `${str(r.sess_item_dscr)} ${str(r.vote_item_dscr)}`;
  return FINAL_READING.some((re) => re.test(text));
}

const CHOICES: Record<string, VoteChoice> = { בעד: "for", נגד: "against", נמנע: "abstain" };

export function resultTypes(rows: Row[]) {
  return new Map(rows.map((r) => [num(r.result_type_id)!, str(r.result_type_name)]));
}

export function voteUrl(id: number) {
  return `https://www.knesset.gov.il/vote/heb/Vote_Res_Map.asp?vote_id_t=${id}`;
}

export function buildVote(header: Row, memberRows: Row[], types: Map<number, string>, today: string): Vote {
  const id = headerId(header)!;
  const members: Vote["members"] = {};
  for (const r of memberRows) {
    const raw = types.get(num(r.vote_result)!) ?? str(r.vote_result);
    members[str(r.kmmbr_id)] = { choice: CHOICES[raw] ?? "other", raw, faction: str(r.faction_name) };
  }
  return {
    id,
    knesset: num(header.knesset_num)!,
    date: str(header.vote_date).slice(0, 10),
    time: str(header.vote_time),
    item: { id: num(header.sess_item_id), title: str(header.sess_item_dscr) },
    voteTitle: str(header.vote_item_dscr),
    accepted: num(header.is_accepted) === 1 || header.is_accepted === true,
    totals: {
      for: num(header.total_for) ?? 0,
      against: num(header.total_against) ?? 0,
      abstain: num(header.total_abstain) ?? 0,
    },
    members,
    source: { url: voteUrl(id), retrievedOn: today },
  };
}

// The official totals and the per-member rows come from different tables. If
// they disagree the vote is held back rather than published inconsistently.
export function countsMatch(v: Vote) {
  const c = { for: 0, against: 0, abstain: 0 };
  for (const m of Object.values(v.members)) if (m.choice !== "other") c[m.choice]++;
  return c.for === v.totals.for && c.against === v.totals.against && c.abstain === v.totals.abstain;
}

export function mergeMembers(existing: Record<string, Member>, vote: Vote, names: Map<string, string>) {
  for (const [id, m] of Object.entries(vote.members)) {
    const prev = existing[id];
    const knessets = new Set([...(prev?.knessets ?? []), vote.knesset]);
    existing[id] = {
      id,
      name: names.get(id) ?? prev?.name ?? id,
      faction: m.faction || prev?.faction || "",
      knessets: [...knessets].sort((a, b) => a - b),
    };
  }
  return existing;
}
