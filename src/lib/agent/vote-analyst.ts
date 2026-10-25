import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Analysis, Vote, WatchTopic } from "../knesset/schema";
import { checkDraft } from "../knesset/verify";

export const MODEL = "claude-opus-5-5";

export type Bill = { id: number; name: string; summary: string | null; url: string };

const Draft = z.object({
  summary_he: z.string().describe("Neutral plain-language summary in Hebrew, 2-4 sentences. Empty string if no bill text was provided."),
  summary_en: z.string().describe("The same summary in English. Empty string if no bill text was provided."),
  quotes: z.array(z.string()).describe("Exact phrases copied character-for-character from the bill text that support the summary."),
  topics: z.array(z.string()).describe("Ids from the watch-topic list that this bill substantively concerns. Empty if none."),
  key_vote_suggested: z.boolean().describe("True if an editor should consider this a key vote for one of the watch topics."),
  rationale: z.string().describe("For editors only: one or two sentences on the topics and key-vote suggestion."),
});

const SYSTEM = `You draft material for an Israeli public-accountability site. An editor reviews everything you write before anything is published.

You receive one Knesset plenum vote (the official record) and, when available, the official explanatory summary of the bill (דברי הסבר). Your job:

1. Summarize what the bill does, in neutral plain language, in Hebrew and in English. Use only the bill text provided. If no bill text is provided, leave both summaries empty: do not summarize from memory.
2. Support the summary with short quotes copied exactly from the bill text. Each quote is checked by code against the source; a quote that does not match character-for-character causes the whole draft to be discarded.
3. Tag the watch topics the bill substantively concerns, using only ids from the list provided.
4. Suggest whether editors should consider it a key vote, and explain briefly for the editors.

Describe what the bill does, not whether it is good or bad. Do not characterize any member, party, or their motives, and do not say who is for or against Israel: the vote record speaks for itself, and judgements are the editors' to make.`;

function prompt(vote: Vote, bill: Bill | null, watch: WatchTopic[]) {
  const topics = watch.map((w) => `- ${w.id}: ${w.name.en ?? w.name.he} — ${w.description.en ?? w.description.he}`).join("\n");
  return [
    "<vote>",
    `Knesset ${vote.knesset}, vote ${vote.id}, ${vote.date}`,
    `Agenda item: ${vote.item.title}`,
    `Vote: ${vote.voteTitle}`,
    `Result: ${vote.accepted === null ? "" : vote.accepted ? "accepted — " : "rejected — "}for ${vote.totals.for}, against ${vote.totals.against}, abstain ${vote.totals.abstain}`,
    "</vote>",
    bill?.summary
      ? `<bill_text name="${bill.name}">\n${bill.summary}\n</bill_text>`
      : "<bill_text>No official bill text is available for this vote.</bill_text>",
    `<watch_topics>\n${topics || "(none defined)"}\n</watch_topics>`,
  ].join("\n\n");
}

export type AnalystResult = { ok: true; analysis: Analysis } | { ok: false; errors: string[] };

export async function analyzeVote(
  client: Anthropic,
  vote: Vote,
  bill: Bill | null,
  watch: WatchTopic[],
  today: string,
): Promise<AnalystResult> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(Draft) },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt(vote, bill, watch) }],
  });
  if (response.stop_reason === "refusal") return { ok: false, errors: ["model declined"] };
  if (response.stop_reason === "max_tokens") return { ok: false, errors: ["output truncated"] };
  const out = response.parsed_output;
  if (!out) return { ok: false, errors: ["no structured output"] };

  const summary = out.summary_he.trim() || out.summary_en.trim()
    ? { he: out.summary_he.trim() || undefined, en: out.summary_en.trim() || undefined }
    : null;
  const draft = { summary, quotes: out.quotes, topics: out.topics };
  const errors = checkDraft(draft, bill?.summary ?? null, watch);
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    analysis: {
      voteId: vote.id,
      bill: bill ? { id: bill.id, name: bill.name, summarySource: bill.url } : null,
      ...draft,
      keyVoteSuggested: out.key_vote_suggested,
      rationale: out.rationale,
      model: response.model,
      generatedOn: today,
      editorial: { state: "draft", keyVote: false },
    },
  };
}
