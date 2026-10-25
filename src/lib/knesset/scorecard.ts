import type { Analysis, Vote, VoteChoice } from "./schema";

// A member's record on key votes: how they voted against the position the
// editors set for each one. Pure data; the editors' reasons travel with it.
export type ScoreRow = {
  vote: Vote;
  choice: VoteChoice;
  position: "for" | "against";
  aligned: boolean | null; // null: abstained or didn't vote
  note: Analysis["editorial"]["note"];
};

export type Scorecard = { rows: ScoreRow[]; aligned: number; opposed: number; other: number };

export function computeScorecard(votes: Vote[], analyses: Map<number, Analysis>, memberId: string): Scorecard {
  const rows: ScoreRow[] = [];
  for (const vote of votes) {
    const a = analyses.get(vote.id);
    const position = a?.editorial.state === "published" && a.editorial.keyVote ? a.editorial.position : undefined;
    const mv = vote.members[memberId];
    if (!position || !mv) continue;
    const decided = mv.choice === "for" || mv.choice === "against";
    rows.push({ vote, choice: mv.choice, position, aligned: decided ? mv.choice === position : null, note: a!.editorial.note });
  }
  rows.sort((x, y) => y.vote.date.localeCompare(x.vote.date));
  return {
    rows,
    aligned: rows.filter((r) => r.aligned === true).length,
    opposed: rows.filter((r) => r.aligned === false).length,
    other: rows.filter((r) => r.aligned === null).length,
  };
}
