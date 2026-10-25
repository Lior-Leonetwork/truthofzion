import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Analysis, Policy, Vote } from "../knesset/schema";
import { normalize, quoteFound } from "../knesset/verify";
import { MODEL } from "./vote-analyst";

// Applies the editors' approved policy to one vote. The model only reads the
// official bill text and says which stance (if any) the bill clearly advances
// or works against, quoting the passage that shows it. The site's position
// then follows in code: a bill that advances a stance is a "for" key vote,
// one that works against it an "against" key vote. The model never judges a
// member, and a quote that isn't in the bill text voids the result.

const Result = z.object({
  stance_id: z.string().describe('The id of the one stance this bill clearly and directly concerns, or "" if none does.'),
  effect: z.enum(["advances", "works_against", "none"]).describe("What the bill does to that stance, judged only from the bill text."),
  evidence: z.string().describe("One passage copied character-for-character from the bill text that shows the effect. Empty if none."),
  note_he: z.string().describe("One or two neutral Hebrew sentences: what the bill does and how that relates to the stance. No members, parties or motives."),
  note_en: z.string().describe("The same note in English."),
});

const SYSTEM = `You apply an Israeli accountability site's published editorial policy to Knesset votes.

You receive one plenum vote, the official explanatory notes of its bill (דברי הסבר), and the site's stances. Decide whether the bill clearly and directly advances, or clearly and directly works against, exactly one stance.

- Judge only from the bill text provided. Do not use outside knowledge about the bill, its sponsors or the parties.
- Most bills concern none of the stances. Mark a key vote only when the connection is direct and plain from the text; a tangential, technical or budgetary link is "none". If two stances pull in opposite directions, answer "none".
- Quote one passage from the bill text, copied exactly, that shows the effect. It is checked by code; a quote that is not in the text voids your answer.
- The note says what the bill does and how it relates to the stance, neutrally. Never mention or characterise any member, party or motive.`;

export type KeyVoteResult =
  | { ok: true; keyVote: false }
  | { ok: true; keyVote: true; editorial: Pick<Analysis["editorial"], "keyVote" | "position" | "note" | "autoKeyVote" | "policy" | "evidence"> }
  | { ok: false; errors: string[] };

export function checkKeyVote(out: z.infer<typeof Result>, policy: Policy, billText: string): KeyVoteResult {
  if (out.effect === "none" || !out.stance_id) return { ok: true, keyVote: false };
  const errors: string[] = [];
  if (!policy.stances.some((s) => s.id === out.stance_id)) errors.push(`unknown stance "${out.stance_id}"`);
  if (normalize(out.evidence).length < 15 || !quoteFound(out.evidence, billText)) errors.push("evidence not found verbatim in the bill text");
  if (!out.note_he.trim() || !out.note_en.trim()) errors.push("missing note");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    keyVote: true,
    editorial: {
      keyVote: true,
      position: out.effect === "advances" ? "for" : "against",
      note: { he: out.note_he.trim(), en: out.note_en.trim() },
      autoKeyVote: true,
      policy: out.stance_id,
      evidence: out.evidence.trim(),
    },
  };
}

export async function classifyKeyVote(client: Anthropic, vote: Vote, billName: string, billText: string, policy: Policy): Promise<KeyVoteResult> {
  const stances = policy.stances.map((s) => `- ${s.id}: ${s.statement.en ?? s.statement.he} / ${s.statement.he ?? ""}`).join("\n");
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(Result) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `<vote>Knesset ${vote.knesset}, vote ${vote.id}, ${vote.date}\nAgenda item: ${vote.item.title}\nVote: ${vote.voteTitle}</vote>`,
          `<bill_text name="${billName}">\n${billText}\n</bill_text>`,
          `<stances>\n${stances}\n</stances>`,
        ].join("\n\n"),
      },
    ],
  });
  if (response.stop_reason === "refusal") return { ok: false, errors: ["model declined"] };
  if (response.stop_reason === "max_tokens") return { ok: false, errors: ["output truncated"] };
  if (!response.parsed_output) return { ok: false, errors: ["no structured output"] };
  return checkKeyVote(response.parsed_output, policy, billText);
}
