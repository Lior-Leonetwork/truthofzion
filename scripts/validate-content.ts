// Runs the editorial rules over content/ and content-demo/. CI runs this on every pull request.
import path from "node:path";
import { readContent } from "../src/lib/content/load";

let failed = false;
for (const dir of ["content", "content-demo"]) {
  const { problems, entries, entities } = readContent(path.join(process.cwd(), dir));
  if (problems.length > 0) {
    for (const p of problems) console.error(`✗ ${p.entry} [${p.rule}] ${p.message}`);
    console.error(`\n${dir}: ${problems.length} problem(s). Nothing is published until these are fixed.`);
    failed = true;
    continue;
  }
  const published = entries.filter((e) => e.editorial.state === "published").length;
  console.log(`✓ ${dir} valid: ${entities.size} entities, ${entries.length} entries (${published} published)`);
}
if (failed) process.exit(1);
