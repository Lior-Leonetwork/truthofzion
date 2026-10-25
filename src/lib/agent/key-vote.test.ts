import { describe, expect, it } from "vitest";
import type { Analysis, Policy, Vote } from "../knesset/schema";
import { checkAnalysis } from "../knesset/verify";
import { checkKeyVote } from "./key-vote";

// Fictional bill and policy.
const policy: Policy = {
  approvedBy: "ed",
  approvedOn: "2026-01-01",
  stances: [{ id: "counter-terror", topic: "security", statement: { en: "A tougher fight against terror." } }],
};
const bill = "הצעת החוק נועדה לקבוע כי מי שהורשע בעבירת טרור יישלל ממנו מעמד התושבות.";
const out = (o: object = {}) => ({
  stance_id: "counter-terror",
  effect: "advances" as const,
  evidence: "מי שהורשע בעבירת טרור יישלל ממנו מעמד התושבות",
  note_he: "החוק שולל תושבות ממורשעים בטרור.",
  note_en: "The law revokes the residency of those convicted of terror.",
  ...o,
});

describe("automatic key votes", () => {
  it("sets the site's position from the stance, not from the model", () => {
    const r = checkKeyVote(out(), policy, bill);
    expect(r).toMatchObject({ ok: true, keyVote: true, editorial: { position: "for", policy: "counter-terror", autoKeyVote: true } });
    const against = checkKeyVote(out({ effect: "works_against" }), policy, bill);
    expect(against).toMatchObject({ editorial: { position: "against" } });
  });

  it("treats 'none' as not a key vote", () => {
    expect(checkKeyVote(out({ effect: "none" }), policy, bill)).toEqual({ ok: true, keyVote: false });
    expect(checkKeyVote(out({ stance_id: "" }), policy, bill)).toEqual({ ok: true, keyVote: false });
  });

  it("voids a result whose evidence isn't in the bill or whose stance is unknown", () => {
    expect(checkKeyVote(out({ evidence: "מי שתמך בטרור יגורש לאלתר מן המדינה" }), policy, bill).ok).toBe(false);
    expect(checkKeyVote(out({ evidence: "טרור" }), policy, bill).ok).toBe(false); // too short to prove anything
    expect(checkKeyVote(out({ stance_id: "made-up" }), policy, bill).ok).toBe(false);
  });

  it("publishes an automatic key vote only under a human-approved policy", () => {
    const vote = { id: 1 } as Vote;
    const editors = new Map([
      ["ed", { handle: "ed", name: "Ed" }],
      ["bot", { handle: "bot", name: "Bot", ai: true }],
    ]);
    const r = checkKeyVote(out(), policy, bill);
    if (!r.ok || !r.keyVote) throw new Error("expected a key vote");
    const a: Analysis = {
      voteId: 1,
      bill: null,
      summary: { he: "תקציר" },
      quotes: ["ציטוט כלשהו"],
      topics: [],
      keyVoteSuggested: false,
      rationale: "",
      model: "m",
      generatedOn: "2026-01-02",
      editorial: { state: "published", autoPublished: true, ...r.editorial },
    };
    const rules = (p: Policy | null) => checkAnalysis(a, new Map([[1, vote]]), editors, p).map((x) => x.rule);
    expect(rules(policy)).toEqual([]);
    expect(rules({ ...policy, approvedBy: null })).toContain("auto-no-stance");
    expect(rules({ ...policy, approvedBy: "bot" })).toContain("auto-no-stance");
    expect(rules(null)).toContain("auto-no-stance");
    expect(checkAnalysis({ ...a, editorial: { ...a.editorial, evidence: undefined } }, new Map([[1, vote]]), editors, policy).map((x) => x.rule)).toContain("auto-evidence");
    // An auto-published summary still can't carry an editor-style key vote on its own.
    expect(checkAnalysis({ ...a, editorial: { ...a.editorial, autoKeyVote: undefined } }, new Map([[1, vote]]), editors, policy).map((x) => x.rule)).toContain("auto-no-stance");
  });
});
