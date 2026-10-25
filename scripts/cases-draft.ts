// Drafts case files about Knesset members (criminal cases, incitement) from
// official sources and approved outlets. Claude researches; code verifies
// every source (allowed site, evidence type the site can carry, quote verbatim
// in the page as fetched, page names the member) and writes what survives as
// DRAFT entries in content/, for the editors' review pull request. Nothing is
// published here: each case needs an editor and the member's right of reply.
//
//   ANTHROPIC_API_KEY=... npm run cases:draft -- --category corruption|incitement [--max 5]
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { z } from "zod";
import { researchCases } from "../src/lib/agent/case-researcher";
import { CASE_CATEGORIES, caseEntry, caseSlug, OFFICIAL_DOMAINS, publicationGaps, verifyCandidate, type CaseCategory } from "../src/lib/cases/verify";
import { readContent } from "../src/lib/content/load";
import { entityDraft, htmlToText } from "../src/lib/knesset/statements";
import { readMembers, readStatementSources, writeJson } from "../src/lib/knesset/store";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const category = arg("category") as CaseCategory;
if (!CASE_CATEGORIES.includes(category)) throw new Error(`--category must be one of ${CASE_CATEGORIES.join(", ")}`);
const max = Number(arg("max") ?? 5);
if (!Number.isInteger(max) || max < 1) throw new Error("--max must be a positive whole number");

const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const contentDir = path.join(process.cwd(), "content");
const casesDir = path.join(process.cwd(), "data", "cases");
const checkedFile = path.join(casesDir, "checked.json");
const reportFile = path.join(process.cwd(), ".cases-report.md"); // PR body material, not committed
const Checked = z.record(z.string(), z.object({ checkedOn: z.string(), title: z.string(), outcome: z.enum(["drafted", "rejected"]), errors: z.array(z.string()) }));

// Our own copy of each page, fetched through the Israeli VPN: verification
// doesn't rest only on what the model's tools returned.
async function fetchPage(url: string) {
  try {
    const res = await undiciFetch(url, {
      dispatcher,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; truth-of-zion-verifier)", "Accept-Language": "he,en" },
      signal: AbortSignal.timeout(30_000),
    });
    return res.ok ? htmlToText(await res.text()) : null;
  } catch {
    return null;
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY not set; skipping case research.");
    return;
  }
  const client = new Anthropic();
  const members = readMembers();
  const newsDomains = readStatementSources().map((s) => s.domain);
  const content = readContent();
  const checked = fs.existsSync(checkedFile) ? Checked.parse(JSON.parse(fs.readFileSync(checkedFile, "utf8"))) : {};
  const today = new Date().toISOString().slice(0, 10);
  const covered = [
    ...content.entries.filter((e) => e.entity.startsWith("mk-")).map((e) => `${e.entity.slice(3)} | ${e.category} | ${e.date} | ${e.title.he ?? e.title.en}`),
    ...Object.entries(checked).map(([slug, c]) => `${slug} | ${c.title} (${c.outcome === "drafted" ? "drafted" : "reviewed, not usable"})`),
  ];

  console.log(`Researching ${category} (up to ${max} cases) among ${Object.keys(members).length} members`);
  const result = await researchCases(client, category, Object.values(members), covered, [...OFFICIAL_DOMAINS, ...newsDomains], max);
  if (!result.ok) throw new Error(result.errors.join("; "));
  console.log(`${result.cases.length} candidates`);

  const report: string[] = [];
  for (const c of result.cases.slice(0, max)) {
    const slug = caseSlug(c);
    const texts = new Map<string, string[]>();
    for (const s of c.sources) {
      const ours = await fetchPage(s.url);
      texts.set(s.url, [result.fetched.get(s.url), ours].filter((t): t is string => Boolean(t)));
    }
    const v = verifyCandidate(c, { members, newsDomains, texts, today });
    const name = members[c.mk_id]?.name ?? c.mk_id;
    if (v.errors.length) {
      console.warn(`  ✗ ${slug} ${name}: ${v.errors.join("; ")}`);
      checked[slug] = { checkedOn: today, title: c.title_he, outcome: "rejected", errors: v.errors };
      continue;
    }
    const entryFile = path.join(contentDir, "entries", `${slug}.json`);
    if (fs.existsSync(entryFile)) continue; // an editor may already be working on it
    const entity = entityDraft(members[c.mk_id]);
    const entityFile = path.join(contentDir, "entities", `${entity.slug}.json`);
    if (!fs.existsSync(entityFile)) writeJson(entityFile, entity);
    const entry = caseEntry(v);
    writeJson(entryFile, entry);
    checked[slug] = { checkedOn: today, title: c.title_he, outcome: "drafted", errors: [] };
    const entities = new Map(content.entities);
    entities.set(entity.slug, entity);
    const gaps = publicationGaps(entry, entities, content.editors);
    console.log(`  ✓ draft ${slug} (${c.status}, ${entry.sources.length} verified sources)${gaps.length ? ` · gaps: ${gaps.map((g) => g.rule).join(", ")}` : ""}`);
    report.push(
      [
        `### ${name}: ${entry.title.he}`,
        `\`content/entries/${slug}.json\` · ${c.category} · **${c.status}** · ${entry.sources.length} verified source(s)`,
        c.explanation && `> ${c.explanation}`,
        gaps.length ? `Before publishing, also fix: ${gaps.map((g) => `${g.message}`).join("; ")}` : "Evidence rules pass; needs your review and the member's response.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }
  writeJson(checkedFile, checked);
  fs.mkdirSync(casesDir, { recursive: true });
  const prev = fs.existsSync(reportFile) ? fs.readFileSync(reportFile, "utf8") : "";
  if (report.length) fs.writeFileSync(reportFile, `${prev}\n## ${category} · ${today}\n\n${report.join("\n\n")}\n`);
  console.log(`✓ ${report.length} drafts written`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
