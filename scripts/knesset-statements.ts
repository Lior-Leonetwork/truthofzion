// "Said one thing, voted the opposite." For key votes (marked by an editor),
// Claude searches approved news outlets for members' earlier public statements
// that contradict their final-reading vote. Each candidate is verified in code
// (vote record, timing, outlet, quote verbatim in the fetched article, member
// named in it) and only then written as a DRAFT case in content/, which the
// workflow puts in the editors' review pull request. Nothing is published here.
//
//   ANTHROPIC_API_KEY=... npm run knesset:statements -- [--max 3]
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { z } from "zod";
import { findStatements, rosterFor } from "../src/lib/agent/statement-checker";
import { checkFinding, entityDraft, entryDraft, htmlToText, sourceFor } from "../src/lib/knesset/statements";
import { paths, readAnalyses, readMembers, readStatementSources, readVotes, writeJson } from "../src/lib/knesset/store";

const maxAt = process.argv.indexOf("--max");
const max = maxAt > 0 ? Number(process.argv[maxAt + 1]) : 3;
if (!Number.isInteger(max) || max < 0) throw new Error(`--max must be a whole number`);

const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;

const Checked = z.record(z.string(), z.object({ checkedOn: z.string(), candidates: z.number(), drafted: z.number() }));
const contentDir = path.join(process.cwd(), "content");

// Our own copy of the article, so verification doesn't rest only on the model's tools.
async function fetchArticle(url: string) {
  try {
    const res = await undiciFetch(url, {
      dispatcher,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; truth-of-zion-verifier)", "Accept-Language": "he,en" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return { text: htmlToText(html), title: /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? null };
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY not set; skipping statement checks.");
    return;
  }
  const client = new Anthropic();
  const p = paths();
  const sources = readStatementSources();
  if (sources.length === 0) throw new Error(`no approved outlets in ${p.statementSources}`);
  const members = readMembers();
  const votes = new Map(readVotes().map((v) => [v.id, v]));
  const checked = fs.existsSync(p.statementsChecked) ? Checked.parse(JSON.parse(fs.readFileSync(p.statementsChecked, "utf8"))) : {};
  const keyVotes = readAnalyses()
    .filter((a) => a.editorial.state === "published" && a.editorial.keyVote && votes.has(a.voteId) && !checked[a.voteId])
    .sort((a, b) => b.voteId - a.voteId)
    .slice(0, max);
  console.log(`${keyVotes.length} key votes to check`);
  const today = new Date().toISOString().slice(0, 10);

  for (const analysis of keyVotes) {
    const vote = votes.get(analysis.voteId)!;
    console.log(`\nvote ${vote.id}: ${vote.item.title}`);
    const result = await findStatements(client, vote, analysis, rosterFor(vote, members), sources).catch(
      (e: Error) => ({ ok: false as const, errors: [`request failed: ${e.message}`] }),
    );
    if (!result.ok) {
      console.warn(`  ✗ ${result.errors.join("; ")}`);
      continue; // not marked checked: retried next run
    }
    let drafted = 0;
    for (const f of result.findings) {
      const ours = sourceFor(f.url, sources) ? await fetchArticle(f.url) : null;
      const theirs = result.fetched.get(f.url);
      const texts = [theirs?.text, ours?.text].filter((t): t is string => Boolean(t));
      const errors = checkFinding({ finding: f, vote, members, sources, texts });
      if (errors.length) {
        console.warn(`  ✗ ${f.mk_id} ${members[f.mk_id]?.name ?? ""}: ${errors.join("; ")}`);
        continue;
      }
      const member = members[f.mk_id];
      const entity = entityDraft(member);
      const entityFile = path.join(contentDir, "entities", `${entity.slug}.json`);
      if (!fs.existsSync(entityFile)) writeJson(entityFile, entity);
      const entry = entryDraft(f, vote, member, sourceFor(f.url, sources)!, theirs?.title ?? ours?.title ?? null);
      const entryFile = path.join(contentDir, "entries", `${entry.slug}.json`);
      if (fs.existsSync(entryFile)) continue; // an editor may already be working on it
      writeJson(entryFile, entry);
      drafted++;
      console.log(`  ✓ draft ${entry.slug} (${f.stance}, voted ${vote.members[f.mk_id].choice})`);
    }
    checked[vote.id] = { checkedOn: today, candidates: result.findings.length, drafted };
    console.log(`  ${result.findings.length} candidates, ${drafted} verified drafts`);
  }
  writeJson(p.statementsChecked, checked);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
