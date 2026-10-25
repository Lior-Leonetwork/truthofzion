import type { Editor } from "../content/schema";
import type { Problem } from "../content/rules";
import type { Analysis, Vote, WatchTopic } from "./schema";

// Hebrew text arrives with assorted quote marks, maqaf/hyphens and spacing.
// Normalising them is the only leniency: the words themselves must match.
export function normalize(s: string) {
  return s
    .replace(/[׳‘’`]/g, "'")
    .replace(/[״“”]/g, '"')
    .replace(/[־‐-―]/g, "-")
    .replace(/[֑-ׇ]/g, "") // niqqud and cantillation
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteFound(quote: string, source: string) {
  const q = normalize(quote);
  return q.length >= 8 && normalize(source).includes(q);
}

// Run on the model's output before anything is written. A draft that fails
// is discarded, not repaired.
export function checkDraft(draft: Pick<Analysis, "summary" | "quotes" | "topics">, billText: string | null, watch: WatchTopic[]) {
  const errors: string[] = [];
  if (!billText) {
    if (draft.summary) errors.push("summary written without an official bill text to ground it");
    if (draft.quotes.length) errors.push("quotes given without an official bill text");
  } else {
    if (draft.summary && draft.quotes.length === 0) errors.push("summary has no supporting quote from the bill text");
    for (const q of draft.quotes) if (!quoteFound(q, billText)) errors.push(`quote not found verbatim in bill text: "${q.slice(0, 80)}"`);
  }
  const known = new Set(watch.map((w) => w.id));
  for (const t of draft.topics) if (!known.has(t)) errors.push(`unknown topic "${t}"`);
  return errors;
}

// The publication gate for analyses, run in CI next to the content rules.
// The model never sets keyVote (vote-analyst.ts always writes false, and that
// is tested); an editor may set it while reviewing, but only with a reason.
export function checkAnalysis(a: Analysis, votes: Map<number, Vote>, editors: Map<string, Editor>): Problem[] {
  const problems: Problem[] = [];
  const fail = (rule: string, message: string) => problems.push({ entry: `analysis/${a.voteId}`, rule, message });
  if (!votes.has(a.voteId)) fail("vote-exists", `no ingested vote ${a.voteId}`);
  if (a.editorial.keyVote && !a.editorial.note) fail("key-vote-note", "a key vote needs an editor's note explaining why");
  if (a.editorial.keyVote && !a.editorial.position) {
    fail("key-vote-position", 'a key vote needs the site\'s position ("for" or "against")');
  }
  if (a.editorial.position && !a.editorial.keyVote) fail("position-without-key-vote", "a position is only set on key votes");
  if (a.editorial.state !== "published") return problems;
  if (a.editorial.autoPublished && !a.editorial.reviewedBy) {
    if (a.editorial.keyVote || a.editorial.position) {
      fail("auto-no-stance", "an automatically published summary can't carry a key vote or a position; an editor must review it");
    }
    if (a.summary && a.quotes.length === 0) fail("auto-quoted", "an automatically published summary needs its verified quotes");
    return problems;
  }
  const by = a.editorial.reviewedBy;
  if (!by) fail("reviewed", "a published analysis needs editorial.reviewedBy");
  else if (!editors.has(by)) fail("known-editor", `"${by}" is not listed in content/editors.json`);
  if (!a.editorial.reviewedOn) fail("reviewed-on", "editorial.reviewedOn is required");
  return problems;
}
