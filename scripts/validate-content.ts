// Runs the editorial rules over content/ and data/ (and their demo twins).
// CI runs this on every pull request; nothing that fails it can be merged.
import path from "node:path";
import { readContent } from "../src/lib/content/load";
import { readAnalyses, readMembers, readVotes, readWatch } from "../src/lib/knesset/store";
import { checkAnalysis } from "../src/lib/knesset/verify";

let failed = false;
const report = (label: string, problems: { entry: string; rule: string; message: string }[], ok: string) => {
  if (problems.length > 0) {
    for (const p of problems) console.error(`✗ ${p.entry} [${p.rule}] ${p.message}`);
    console.error(`\n${label}: ${problems.length} problem(s). Nothing is published until these are fixed.`);
    failed = true;
  } else console.log(`✓ ${label} valid: ${ok}`);
};

for (const [contentDir, dataDir] of [
  ["content", "data"],
  ["content-demo", "data-demo"],
]) {
  const content = readContent(path.join(process.cwd(), contentDir));
  const published = content.entries.filter((e) => e.editorial.state === "published").length;
  report(contentDir, content.problems, `${content.entities.size} entities, ${content.entries.length} entries (${published} published)`);

  const root = path.join(process.cwd(), dataDir, "knesset");
  try {
    const votes = readVotes(root);
    readMembers(root);
    const watch = readWatch(root);
    const analyses = readAnalyses(root);
    const byId = new Map(votes.map((v) => [v.id, v]));
    const problems = analyses.flatMap((a) => checkAnalysis(a, byId, content.editors));
    const topics = new Set(watch.map((w) => w.id));
    for (const a of analyses) for (const t of a.topics) if (!topics.has(t)) problems.push({ entry: `analysis/${a.voteId}`, rule: "topic", message: `unknown topic "${t}"` });
    const live = analyses.filter((a) => a.editorial.state === "published").length;
    report(`${dataDir}/knesset`, problems, `${votes.length} votes, ${analyses.length} analyses (${live} published)`);
  } catch (e) {
    report(`${dataDir}/knesset`, [{ entry: dataDir, rule: "schema", message: e instanceof Error ? e.message : String(e) }], "");
  }
}
if (failed) process.exit(1);
