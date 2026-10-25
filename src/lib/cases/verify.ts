import { z } from "zod";
import { checkEntry, type Problem } from "../content/rules";
import type { Editor, Entity, Entry, SourceType, Status } from "../content/schema";
import type { Member } from "../knesset/schema";
import { hostOf } from "../knesset/statements";
import { normalize } from "../knesset/verify";

// Draft case files about office holders (criminal cases, incitement),
// researched by Claude and verified here before anything is written. A draft
// is never published by this pipeline: it needs an editor and the subject's
// right of reply, like every case on the site.

export const CASE_CATEGORIES = ["corruption", "incitement"] as const;
export type CaseCategory = (typeof CASE_CATEGORIES)[number];

const STATUSES_FOR: Record<CaseCategory, Status[]> = {
  corruption: ["convicted", "indicted", "under_investigation", "allegation"],
  incitement: ["convicted", "indicted", "under_investigation", "documented", "allegation"],
};

export const Candidate = z.object({
  mk_id: z.string(),
  category: z.enum(CASE_CATEGORIES),
  status: z.string(),
  date: z.string(),
  title_he: z.string(),
  title_en: z.string(),
  summary_he: z.string(),
  summary_en: z.string(),
  timeline: z.array(z.object({ date: z.string(), text_he: z.string(), text_en: z.string(), source: z.number().int() })).default([]),
  sources: z.array(
    z.object({ url: z.string(), type: z.string(), publisher: z.string(), title: z.string(), date: z.string(), quote: z.string() }),
  ),
  explanation: z.string().default(""),
});
export type Candidate = z.infer<typeof Candidate>;
export const CandidatesOut = z.object({ cases: z.array(Candidate) });

// Where evidence may come from, and what kind of evidence each place can be.
// The model proposes a type; code only accepts one this table allows, so a
// news story can never stand in for an indictment.
const OFFICIAL: { domain: string; types: SourceType[] }[] = [
  { domain: "mevaker.gov.il", types: ["state_comptroller"] },
  { domain: "police.gov.il", types: ["police_statement"] },
  { domain: "supremedecisions.court.gov.il", types: ["court_ruling"] },
  { domain: "court.gov.il", types: ["court_ruling"] },
  { domain: "knesset.gov.il", types: ["knesset_record"] },
  { domain: "gov.il", types: ["prosecution_statement", "indictment", "police_statement", "official_filing"] },
];
export const OFFICIAL_DOMAINS = OFFICIAL.map((o) => o.domain);

const matches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function allowedTypes(url: string, newsDomains: string[]): SourceType[] {
  const host = hostOf(url);
  if (!host || !url.startsWith("https://")) return [];
  const official = OFFICIAL.find((o) => matches(host, o.domain));
  if (official) return official.types;
  return newsDomains.some((d) => matches(host, d)) ? ["news_report"] : [];
}

const MIN_QUOTE = 20;
const isoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export type Verified = { candidate: Candidate; sourceIndexes: number[]; errors: string[] };

// Keeps the sources whose quote is verbatim in the page as fetched and whose
// page names the person; the case survives if at least one source does.
export function verifyCandidate(
  c: Candidate,
  { members, newsDomains, texts, today }: { members: Record<string, Member>; newsDomains: string[]; texts: Map<string, string[]>; today: string },
): Verified {
  const errors: string[] = [];
  const member = members[c.mk_id];
  if (!member) return { candidate: c, sourceIndexes: [], errors: [`${c.mk_id} is not in the Knesset roster`] };
  if (!(STATUSES_FOR[c.category] as string[]).includes(c.status)) errors.push(`status "${c.status}" is not allowed for ${c.category}`);
  if (!isoDate(c.date) || c.date > today) errors.push(`bad date "${c.date}"`);
  for (const f of [c.title_he, c.title_en, c.summary_he, c.summary_en]) if (!f.trim()) errors.push("missing title or summary");
  const surname = normalize(member.name).split(" ").pop() ?? "";
  const kept: number[] = [];
  c.sources.forEach((s, i) => {
    const why: string[] = [];
    if (!allowedTypes(s.url, newsDomains).includes(s.type as SourceType)) why.push(`type "${s.type}" not allowed for ${hostOf(s.url) ?? s.url}`);
    if (!isoDate(s.date) || s.date > today) why.push(`bad date "${s.date}"`);
    const quote = normalize(s.quote).replace(/^["״“”']+|["״“”']+$/g, "").trim();
    if (quote.length < MIN_QUOTE) why.push("quote too short");
    const page = (texts.get(s.url) ?? []).map(normalize).find((t) => t.includes(quote));
    if (!page) why.push("quote not found verbatim in the page as fetched");
    else if (surname.length > 1 && !page.includes(surname)) why.push(`page doesn't name ${member.name}`);
    if (why.length) errors.push(`source ${i + 1}: ${why.join("; ")}`);
    else kept.push(i);
  });
  if (kept.length === 0) errors.push("no source survived verification");
  return { candidate: c, sourceIndexes: kept, errors: kept.length ? errors.filter((e) => !e.startsWith("source ")) : errors };
}

export const caseSlug = (c: Pick<Candidate, "mk_id" | "category" | "date">) => `mk-${c.mk_id}-${c.category}-${c.date}`;

export function caseEntry({ candidate: c, sourceIndexes }: Verified): Entry {
  const ids = new Map(sourceIndexes.map((i, n) => [i, `s${n + 1}`]));
  return {
    slug: caseSlug(c),
    entity: `mk-${c.mk_id}`,
    category: c.category,
    status: c.status as Status,
    date: c.date,
    title: { he: c.title_he.trim(), en: c.title_en.trim() },
    summary: { he: c.summary_he.trim(), en: c.summary_en.trim() },
    body: [],
    timeline: c.timeline
      .filter((t) => ids.has(t.source) && isoDate(t.date))
      .map((t) => ({ date: t.date, text: { he: t.text_he, en: t.text_en }, sourceIds: [ids.get(t.source)!] })),
    sources: sourceIndexes.map((i) => {
      const s = c.sources[i];
      return { id: ids.get(i)!, type: s.type as SourceType, publisher: s.publisher.trim(), title: s.title.trim(), date: s.date, url: s.url };
    }),
    response: { status: "not_yet_requested" },
    corrections: [],
    editorial: { state: "draft", createdBy: "claude" },
  };
}

// What still stands between the draft and publication besides the editor's
// review and the right of reply, which every draft lacks by design.
const EDITOR_STEPS = new Set(["reviewed", "second-editor", "human-reviewer", "published-on", "right-of-reply", "response-text"]);

export function publicationGaps(entry: Entry, entities: Map<string, Entity>, editors: Map<string, Editor>): Problem[] {
  const asPublished: Entry = { ...entry, editorial: { ...entry.editorial, state: "published" } };
  return checkEntry(asPublished, entities, editors).filter((p) => !EDITOR_STEPS.has(p.rule));
}
