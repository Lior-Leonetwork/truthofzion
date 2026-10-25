import { z } from "zod";
import { Localized } from "../content/schema";

// How one member voted. Anything the Knesset records that isn't for, against
// or abstain (present but not voting, etc.) is kept as "other" with its raw label.
export const VOTE_CHOICES = ["for", "against", "abstain", "other"] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

export const MemberVote = z
  .object({
    choice: z.enum(VOTE_CHOICES),
    raw: z.string(), // the Knesset's own label, e.g. "בעד"
    faction: z.string(),
  })
  .strict();

// One plenum vote, exactly as the Knesset recorded it. Written only by the
// ingester from official data; never edited by hand or by the model.
export const Vote = z
  .object({
    id: z.number().int().positive(),
    knesset: z.number().int().positive(),
    date: z.iso.date(),
    time: z.string(),
    item: z.object({ id: z.number().int().nullable(), title: z.string() }).strict(),
    voteTitle: z.string(),
    // The Knesset's current data doesn't say whether a vote passed, and some
    // votes need special majorities, so this stays null rather than guessed.
    accepted: z.boolean().nullable(),
    // Counted from the per-member rows (the current data has no official totals).
    totals: z.object({ for: z.number().int(), against: z.number().int(), abstain: z.number().int() }).strict(),
    members: z.record(z.string(), MemberVote),
    source: z.object({ url: z.url(), retrievedOn: z.iso.date() }).strict(),
  })
  .strict();
export type Vote = z.infer<typeof Vote>;

export const Member = z
  .object({
    id: z.string(), // the Knesset's PersonID (MkId in vote results)
    name: z.string(), // Hebrew, as the Knesset records it
    faction: z.string(), // faction at the member's latest ingested vote
    knessets: z.array(z.number().int()),
  })
  .strict();
export type Member = z.infer<typeof Member>;

export const IngestState = z
  .object({
    knesset: z.number().int(),
    lastVoteId: z.number().int(),
    // Earliest vote date collected. Set on the first run (two years back by
    // default) and kept, so the archive grows forward from there.
    fromDate: z.iso.date().optional(),
    heldBack: z.array(z.number().int()).default([]), // retried every run
    updatedAt: z.iso.datetime(),
  })
  .strict();

// Topics editors want flagged. Tags, not verdicts: the model may suggest
// that a bill touches a topic; it never decides who is right.
export const WatchTopic = z
  .object({ id: z.string().regex(/^[a-z0-9-]+$/), name: Localized, description: Localized })
  .strict();
export type WatchTopic = z.infer<typeof WatchTopic>;

// The model's draft about a vote, plus the editorial decision on it. Only
// "published" analyses are shown, and only an editor can publish one.
export const Analysis = z
  .object({
    voteId: z.number().int().positive(),
    bill: z
      .object({ id: z.number().int(), name: z.string(), summarySource: z.url() })
      .strict()
      .nullable(),
    summary: Localized.nullable(),
    quotes: z.array(z.string()), // verbatim from the bill's official summary
    topics: z.array(z.string()),
    keyVoteSuggested: z.boolean(),
    rationale: z.string(), // for editors only, never rendered
    model: z.string(),
    generatedOn: z.iso.date(),
    editorial: z
      .object({
        state: z.enum(["draft", "published", "rejected"]),
        reviewedBy: z.string().optional(),
        reviewedOn: z.iso.date().optional(),
        keyVote: z.boolean().default(false), // the editor's call, not the model's
        note: Localized.optional(), // editor's note on why it is a key vote
      })
      .strict(),
  })
  .strict();
export type Analysis = z.infer<typeof Analysis>;
