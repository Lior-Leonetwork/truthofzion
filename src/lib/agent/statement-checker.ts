import type Anthropic from "@anthropic-ai/sdk";
import type { Analysis, Member, Vote } from "../knesset/schema";
import { FindingsOut, type Finding, type StatementSource } from "../knesset/statements";
import { MODEL } from "./vote-analyst";

// Searches approved news outlets for members' public statements about a bill
// that contradict how they then voted. Returns candidates plus the article
// text the fetch tool actually retrieved; scripts/knesset-statements.ts
// verifies every candidate in code before anything is written.

const SYSTEM = `You research public statements by Israeli Knesset members for an accountability site. An editor reviews everything before publication, and code verifies every quote against the article text.

Task: for one bill, find members who publicly committed to a position on it before the final vote and then voted the opposite way.

Rules:
- Only members in the roster provided, and only those whose vote contradicts the statement: said they support the bill but voted against, or said they oppose it but voted for.
- Only the member's own words, quoted directly in the article (not a journalist's paraphrase, not a party spokesperson), clearly about this specific bill.
- Only explicit positions ("I will vote against this law", "this law must pass"), not doubts, conditions or general remarks.
- The statement must be published before the vote date.
- Search and fetch only the approved outlets. Fetch each article you cite.
- Copy the quote exactly as it appears in the article, in its original language, at least a full clause long.
- An empty list is a good answer. Never include a finding you are unsure of.

Finish with only a JSON object, no other text:
{"findings":[{"mk_id":"<roster id>","stance":"support"|"oppose","quote":"<exact words>","url":"<article url>","published_date":"YYYY-MM-DD","explanation":"<one sentence for the editor>"}]}`;

export type Roster = { id: string; name: string; faction: string; choice: "for" | "against" }[];

export function rosterFor(vote: Vote, members: Record<string, Member>): Roster {
  return Object.entries(vote.members)
    .filter(([, m]) => m.choice === "for" || m.choice === "against")
    .map(([id, m]) => ({ id, name: members[id]?.name ?? id, faction: m.faction, choice: m.choice as "for" | "against" }));
}

function prompt(vote: Vote, analysis: Analysis | undefined, roster: Roster, sources: StatementSource[]) {
  const summary = analysis?.summary?.he ?? analysis?.summary?.en ?? "";
  return [
    `<bill>${vote.item.title}</bill>`,
    summary ? `<bill_summary>${summary}</bill_summary>` : "",
    `<final_vote date="${vote.date}">for ${vote.totals.for}, against ${vote.totals.against}</final_vote>`,
    `<roster>\n${roster.map((r) => `${r.id} | ${r.name} | ${r.faction} | voted ${r.choice}`).join("\n")}\n</roster>`,
    `<approved_outlets>${sources.map((s) => s.domain).join(", ")}</approved_outlets>`,
    "Search in Hebrew and English. Look at coverage from the months before the vote.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export type CheckerResult =
  | { ok: true; findings: Finding[]; fetched: Map<string, { text: string; title: string | null }> }
  | { ok: false; errors: string[] };

export function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function findStatements(
  client: Anthropic,
  vote: Vote,
  analysis: Analysis | undefined,
  roster: Roster,
  sources: StatementSource[],
): Promise<CheckerResult> {
  const domains = sources.map((s) => s.domain);
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt(vote, analysis, roster, sources) }];
  const fetched = new Map<string, { text: string; title: string | null }>();
  let response: Anthropic.Beta.BetaMessage | null = null;

  for (let turn = 0; turn < 6; turn++) {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: SYSTEM,
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 8, allowed_domains: domains },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 12, allowed_domains: domains },
      ],
      messages,
    });
    for (const block of response.content) {
      if (block.type === "web_fetch_tool_result" && block.content.type === "web_fetch_result") {
        const doc = block.content.content;
        if (doc.source.type === "text") fetched.set(block.content.url, { text: doc.source.data, title: doc.title });
      }
    }
    if (response.stop_reason !== "pause_turn") break;
    // A long server-side tool turn pauses; send it back unchanged to resume.
    messages.push({ role: "assistant", content: response.content });
  }

  if (!response) return { ok: false, errors: ["no response"] };
  if (response.stop_reason === "refusal") return { ok: false, errors: ["model declined"] };
  if (response.stop_reason === "pause_turn") return { ok: false, errors: ["research did not finish"] };
  if (response.stop_reason === "max_tokens") return { ok: false, errors: ["output truncated"] };
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  const parsed = FindingsOut.safeParse(extractJson(text));
  if (!parsed.success) return { ok: false, errors: ["final answer was not the expected JSON"] };
  return { ok: true, findings: parsed.data.findings, fetched };
}
