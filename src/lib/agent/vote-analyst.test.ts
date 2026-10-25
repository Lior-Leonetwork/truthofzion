import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import type { Vote } from "../knesset/schema";
import { analyzeVote } from "./vote-analyst";

// A stand-in for the Claude client: returns whatever output the test supplies.
function fakeClient(output: unknown, stop_reason = "end_turn") {
  const calls: unknown[] = [];
  const client = {
    beta: {
      messages: {
        parse: async (params: unknown) => {
          calls.push(params);
          return { stop_reason, parsed_output: output, model: "claude-opus-5-5" };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

const vote: Vote = {
  id: 901,
  knesset: 25,
  date: "2026-07-22",
  time: "17:42",
  item: { id: 2001, title: "הצעת חוק הדוגמה" },
  voteTitle: "קריאה שלישית",
  accepted: true,
  totals: { for: 2, against: 1, abstain: 0 },
  members: {},
  source: { url: "https://www.knesset.gov.il/vote/heb/Vote_Res_Map.asp?vote_id_t=901", retrievedOn: "2026-10-25" },
};
const bill = { id: 2001, name: "הצעת חוק הדוגמה", summary: "מוצע לחייב גופים ציבוריים לפרסם את מקורות המימון שלהם.", url: "https://example.org/bill" };
const watch = [{ id: "integrity", name: { en: "Integrity" }, description: { en: "x" } }];
const good = {
  summary_he: "החוק מחייב גופים ציבוריים לפרסם את מקורות המימון.",
  summary_en: "The law requires public bodies to publish their funding sources.",
  quotes: ["לפרסם את מקורות המימון שלהם"],
  topics: ["integrity"],
  key_vote_suggested: true,
  rationale: "Funding transparency.",
};

describe("vote analyst", () => {
  it("writes a verified draft, never published and never a key vote", async () => {
    const { client, calls } = fakeClient(good);
    const res = await analyzeVote(client, vote, bill, watch, "2026-10-25");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.analysis.editorial).toEqual({ state: "draft", keyVote: false });
    expect(res.analysis.keyVoteSuggested).toBe(true);
    expect(res.analysis.summary).toEqual({ he: good.summary_he, en: good.summary_en });
    expect(JSON.stringify(calls[0])).toContain("מקורות המימון");
  });

  it("discards a draft with a quote the bill doesn't contain", async () => {
    const { client } = fakeClient({ ...good, quotes: ["לפרסם את כל מקורות המימון מדי יום"] });
    const res = await analyzeVote(client, vote, bill, watch, "2026-10-25");
    expect(res.ok).toBe(false);
  });

  it("discards a summary written without bill text", async () => {
    const { client } = fakeClient({ ...good, quotes: [] });
    expect((await analyzeVote(client, vote, null, watch, "2026-10-25")).ok).toBe(false);
  });

  it("handles a refusal", async () => {
    const { client } = fakeClient(null, "refusal");
    expect(await analyzeVote(client, vote, bill, watch, "2026-10-25")).toEqual({ ok: false, errors: ["model declined"] });
  });
});
