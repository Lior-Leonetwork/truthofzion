// Runs after an editor merges an AI-draft pull request: every draft that is
// now on main was in that PR, so the merge is the editor's approval. Drafts are
// published in that editor's name; drafts they marked "rejected" are signed too.
//
//   npm run knesset:publish -- --by <github-login>
import path from "node:path";
import { readContent } from "../src/lib/content/load";
import { paths, readAnalyses, writeJson } from "../src/lib/knesset/store";

const i = process.argv.indexOf("--by");
const login = i > 0 ? process.argv[i + 1] : "";
const { editors } = readContent(path.join(process.cwd(), "content"));
const editor = [...editors.values()].find((e) => e.github?.toLowerCase() === login.toLowerCase());
if (!editor) {
  console.error(`"${login}" is not an editor in content/editors.json; nothing published. Drafts stay unpublished.`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
let published = 0;
let rejected = 0;
for (const a of readAnalyses()) {
  if (a.editorial.reviewedBy) continue;
  if (a.editorial.state === "draft") {
    a.editorial = { ...a.editorial, state: "published", reviewedBy: editor.handle, reviewedOn: today };
    published++;
  } else if (a.editorial.state === "rejected") {
    a.editorial = { ...a.editorial, reviewedBy: editor.handle, reviewedOn: today };
    rejected++;
  } else continue;
  writeJson(paths().analysis(a.voteId), a);
}
console.log(`✓ ${published} published, ${rejected} rejected, signed by ${editor.handle}`);
