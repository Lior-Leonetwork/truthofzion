// Writes bilingual summaries and topic tags for ingested votes with Claude,
// from the bill's official explanatory notes only; every quote is verified
// in code and failing drafts are discarded. With --publish they are published
// automatically (labelled as such on the site, never with a key vote or a
// position); without it they are drafts for an editor.
//
//   ANTHROPIC_API_KEY=... npm run knesset:analyze -- [--max 20] [--publish]
import Anthropic from "@anthropic-ai/sdk";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { z } from "zod";
import { analyzeVote, type Bill } from "../src/lib/agent/vote-analyst";
import { billUrl, nameOverlap } from "../src/lib/knesset/bill";
import { makeFetcher, odataUrl, PARLIAMENT_V4, query } from "../src/lib/knesset/odata";
import { paths, readAnalyses, readVotes, readWatch, writeJson } from "../src/lib/knesset/store";
import type { Vote } from "../src/lib/knesset/schema";
import fs from "node:fs";
import path from "node:path";

const maxAt = process.argv.indexOf("--max");
const max = maxAt > 0 ? Number(process.argv[maxAt + 1]) : 20;
if (!Number.isInteger(max) || max < 0) throw new Error(`--max must be a whole number, got ${process.argv[maxAt + 1]}`);
const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const get = makeFetcher(((url: string, init: object) => undiciFetch(url, { ...init, dispatcher })) as unknown as typeof fetch);

// Votes the analyst failed on, so a bad case isn't re-billed every day.
const Skipped = z.record(z.string(), z.object({ attempts: z.number(), errors: z.array(z.string()) }));
const skippedFile = path.join(path.dirname(paths().state), "analysis-skipped.json");

async function findBill(vote: Vote): Promise<Bill | null> {
  if (!vote.item.id) return null;
  for await (const row of query(get, odataUrl(PARLIAMENT_V4, "KNS_Bill", { $filter: `Id eq ${vote.item.id}` }), 1)) {
    const name = String(row.Name ?? "");
    // The agenda item id is not guaranteed to be a bill id; check it is the same bill.
    if (nameOverlap(vote.item.title, name) < 0.6) {
      console.warn(`  vote ${vote.id}: bill ${vote.item.id} "${name}" doesn't match "${vote.item.title}"; no bill text`);
      return null;
    }
    const summary = typeof row.SummaryLaw === "string" && row.SummaryLaw.trim() ? row.SummaryLaw : null;
    return { id: vote.item.id, name, summary, url: billUrl(vote.item.id) };
  }
  return null;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY not set; skipping analysis.");
    return;
  }
  const client = new Anthropic();
  const watch = readWatch();
  const done = new Set(readAnalyses().map((a) => a.voteId));
  const skipped = fs.existsSync(skippedFile) ? Skipped.parse(JSON.parse(fs.readFileSync(skippedFile, "utf8"))) : {};
  const todo = readVotes().filter((v) => !done.has(v.id) && (skipped[v.id]?.attempts ?? 0) < 2).slice(0, max);
  const today = new Date().toISOString().slice(0, 10);
  console.log(`${todo.length} votes to analyse`);

  let drafted = 0;
  for (const vote of todo) {
    const bill = await findBill(vote).catch((e) => {
      console.warn(`  vote ${vote.id}: bill lookup failed (${e.message}); continuing without bill text`);
      return null;
    });
    const result = await analyzeVote(client, vote, bill, watch, today, { autoPublish: process.argv.includes("--publish") });
    if (result.ok) {
      writeJson(paths().analysis(vote.id), result.analysis);
      delete skipped[vote.id];
      drafted++;
      console.log(`  ✓ ${vote.id} ${vote.item.title.slice(0, 60)}`);
    } else {
      skipped[vote.id] = { attempts: (skipped[vote.id]?.attempts ?? 0) + 1, errors: result.errors };
      console.warn(`  ✗ ${vote.id}: ${result.errors.join("; ")}`);
    }
  }
  writeJson(skippedFile, skipped);
  console.log(`✓ ${drafted} drafts written for editor review`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
