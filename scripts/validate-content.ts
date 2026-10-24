// Runs the editorial rules over content/. CI runs this on every pull request.
import { readContent } from "../src/lib/content/load";

const { problems, entries, entities } = readContent();
if (problems.length > 0) {
  for (const p of problems) console.error(`✗ ${p.entry} [${p.rule}] ${p.message}`);
  console.error(`\n${problems.length} problem(s). Nothing is published until these are fixed.`);
  process.exit(1);
}
const published = entries.filter((e) => e.editorial.state === "published").length;
console.log(`✓ content valid: ${entities.size} entities, ${entries.length} entries (${published} published)`);
