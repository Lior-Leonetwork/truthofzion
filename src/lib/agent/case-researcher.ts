import type Anthropic from "@anthropic-ai/sdk";
import type { CaseCategory } from "../cases/verify";
import { CandidatesOut, type Candidate } from "../cases/verify";
import type { Member } from "../knesset/schema";
import { extractJson } from "./statement-checker";
import { MODEL } from "./vote-analyst";

// Researches case files about Knesset members from official sources (State
// Attorney, police, courts, State Comptroller, the Knesset) and approved news
// outlets. Returns candidates plus the page text the fetch tool retrieved;
// scripts/cases-draft.ts verifies every source in code, and what survives is
// written only as a draft for an editor.

const BRIEF: Record<CaseCategory, string> = {
  corruption: `Criminal and integrity cases: an indictment filed, a conviction, a criminal investigation officially announced or confirmed (police, State Attorney, Attorney General), or a State Comptroller finding about the member personally. Corruption, fraud, breach of trust, bribery, and other offences committed in or through public office.`,
  incitement: `Incitement and support for terror: the member's own public words that praise or support a terrorist organisation or attack, call for violence against Israel or Israelis, or identify with an enemy at war with Israel; and official steps taken over such words (a Knesset Ethics Committee decision, an impeachment or disqualification proceeding, a police investigation, an indictment or a court ruling).`,
};

const SYSTEM = `You research case files about Israeli Knesset members for an accountability site. Everything you return is checked by code and then reviewed by an editor, who also asks the member for a response before anything is published.

Rules:
- Only members in the roster provided. Use their roster id.
- Only facts stated in the sources you cite. Never rely on memory: if you can't find and fetch a source that states it, leave it out.
- The status must be exactly what the sources establish: "convicted" only with a court ruling or an official announcement of a conviction; "indicted" only when an indictment was filed (not just recommended or announced as intended); "under_investigation" only with an official announcement of an investigation; "documented" (incitement only) for the member's own recorded public words; "allegation" for anything only reported by the press, which then needs two independent outlets.
- Prefer official sources: the State Attorney and ministries on gov.il, police.gov.il, court.gov.il and its rulings, mevaker.gov.il, knesset.gov.il. Fetch every page you cite.
- For each source, copy one quote exactly as it appears on the page (at least a full clause) that states the fact and names the member. Code checks it character for character against the page.
- Write neutrally and attribute: "according to the indictment", "the court ruled". No adjectives, no motives, no conclusions beyond the sources. Say if a conviction is under appeal or a case was closed, when the sources say so.
- Skip cases already covered (listed below). An empty list is a good answer; never include a case you are unsure of.

Finish with only a JSON object, no other text:
{"cases":[{"mk_id":"<roster id>","category":"<category>","status":"convicted|indicted|under_investigation|documented|allegation","date":"YYYY-MM-DD (the latest event)","title_he":"","title_en":"","summary_he":"2-4 sentences","summary_en":"","timeline":[{"date":"YYYY-MM-DD","text_he":"","text_en":"","source":<index into sources, from 0>}],"sources":[{"url":"https://...","type":"court_ruling|indictment|prosecution_statement|police_statement|state_comptroller|knesset_record|official_filing|news_report","publisher":"","title":"","date":"YYYY-MM-DD","quote":"<exact words from the page>"}],"explanation":"<one sentence for the editor>"}]}`;

export type ResearchResult =
  | { ok: true; cases: Candidate[]; fetched: Map<string, string> }
  | { ok: false; errors: string[] };

export async function researchCases(
  client: Anthropic,
  category: CaseCategory,
  roster: Member[],
  covered: string[],
  domains: string[],
  max: number,
): Promise<ResearchResult> {
  const prompt = [
    `<category id="${category}">${BRIEF[category]}</category>`,
    `<roster>\n${roster.map((m) => `${m.id} | ${m.name} | ${m.faction}`).join("\n")}\n</roster>`,
    `<already_covered>\n${covered.join("\n") || "(none)"}\n</already_covered>`,
    `<allowed_sites>${domains.join(", ")}</allowed_sites>`,
    `Find up to ${max} cases in this category, most recent and most serious first. Search in Hebrew and English.`,
  ].join("\n\n");
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  const fetched = new Map<string, string>();
  let response: Anthropic.Beta.BetaMessage | null = null;

  for (let turn = 0; turn < 8; turn++) {
    // Long research turns: stream, and take the assembled message.
    response = await client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: SYSTEM,
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 15, allowed_domains: domains },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 25, allowed_domains: domains },
      ],
      messages,
    }).finalMessage();
    for (const block of response.content) {
      if (block.type === "web_fetch_tool_result" && block.content.type === "web_fetch_result") {
        const doc = block.content.content;
        if (doc.source.type === "text") fetched.set(block.content.url, doc.source.data);
      }
    }
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }

  if (!response) return { ok: false, errors: ["no response"] };
  if (response.stop_reason === "refusal") return { ok: false, errors: ["model declined"] };
  if (response.stop_reason === "pause_turn") return { ok: false, errors: ["research did not finish"] };
  if (response.stop_reason === "max_tokens") return { ok: false, errors: ["output truncated"] };
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
  const parsed = CandidatesOut.safeParse(extractJson(text));
  if (!parsed.success) return { ok: false, errors: ["final answer was not the expected JSON"] };
  return { ok: true, cases: parsed.data.cases.filter((c) => c.category === category), fetched };
}
