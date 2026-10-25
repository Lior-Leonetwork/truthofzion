// Applies the editors' approved policy (data/knesset/policy.json) to the
// published vote summaries: Claude reads each bill's official text and says
// which stance, if any, it clearly advances or works against, quoting the
// passage; code verifies the quote and sets the site's position from the
// stance. Votes an editor has reviewed are never touched. Nothing runs until
// a human editor has approved the policy; re-approving it re-checks every vote.
//
//   ANTHROPIC_API_KEY=... npm run knesset:keyvotes -- [--max 40] [--vote <id>]
import Anthropic from "@anthropic-ai/sdk";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { classifyKeyVote } from "../src/lib/agent/key-vote";
import { readContent } from "../src/lib/content/load";
import { makeFetcher, odataUrl, PARLIAMENT_V4, query } from "../src/lib/knesset/odata";
import { paths, readAnalyses, readPolicy, readVotes, writeJson } from "../src/lib/knesset/store";

const maxAt = process.argv.indexOf("--max");
const max = maxAt > 0 ? Number(process.argv[maxAt + 1]) : 40;
if (!Number.isInteger(max) || max < 0) throw new Error(`--max must be a whole number, got ${process.argv[maxAt + 1]}`);
const voteAt = process.argv.indexOf("--vote");
const only = voteAt > 0 ? Number(process.argv[voteAt + 1]) : null;
const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const get = makeFetcher(((url: string, init: object) => undiciFetch(url, { ...init, dispatcher })) as unknown as typeof fetch);

async function billText(id: number) {
  for await (const row of query(get, odataUrl(PARLIAMENT_V4, "KNS_Bill", { $filter: `Id eq ${id}` }), 1)) {
    return typeof row.SummaryLaw === "string" && row.SummaryLaw.trim() ? row.SummaryLaw : null;
  }
  return null;
}

async function main() {
  const policy = readPolicy();
  const editors = readContent().editors;
  if (!policy?.approvedBy || !policy.approvedOn || !editors.has(policy.approvedBy) || editors.get(policy.approvedBy)?.ai) {
    console.log("The key-vote policy has not been approved by a human editor; skipping.");
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY not set; skipping key votes.");
    return;
  }
  const client = new Anthropic();
  const votes = new Map(readVotes().map((v) => [v.id, v]));
  const todo = readAnalyses()
    .filter((a) => a.editorial.state === "published" && !a.editorial.reviewedBy && a.bill)
    .filter((a) => (only ? a.voteId === only : !a.editorial.keyVoteCheckedOn || a.editorial.keyVoteCheckedOn < policy.approvedOn!))
    .sort((x, y) => y.voteId - x.voteId)
    .slice(0, max);
  const today = new Date().toISOString().slice(0, 10);
  console.log(`${todo.length} votes to check against ${policy.stances.length} stances`);

  let keyVotes = 0;
  for (const a of todo) {
    const vote = votes.get(a.voteId);
    const text = vote && (await billText(a.bill!.id).catch(() => null));
    if (!vote || !text) {
      console.warn(`  ${a.voteId}: no bill text; skipped`);
      continue;
    }
    const r = await classifyKeyVote(client, vote, a.bill!.name, text, policy);
    if (!r.ok) {
      console.warn(`  ✗ ${a.voteId}: ${r.errors.join("; ")}`);
      continue; // retried next run
    }
    const rest = { ...a.editorial };
    for (const k of ["position", "note", "autoKeyVote", "policy", "evidence"] as const) delete rest[k];
    a.editorial = { ...rest, keyVote: false, keyVoteCheckedOn: today, ...(r.keyVote ? r.editorial : {}) };
    writeJson(paths().analysis(a.voteId), a);
    if (r.keyVote) {
      keyVotes++;
      console.log(`  ★ ${a.voteId} ${r.editorial.policy} → ${r.editorial.position}: ${vote.item.title.slice(0, 60)}`);
    }
  }
  console.log(`✓ ${todo.length} checked, ${keyVotes} key votes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
