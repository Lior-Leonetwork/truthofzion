import type { Category, Editor, Entity, Entry, SourceType, Status } from "./schema";

// The editorial standard, enforced in code. CI runs these over every file in
// content/, so an entry that breaks them cannot be merged, let alone published.
// Each rule exists because getting it wrong means accusing a real person of
// something the evidence does not support.

export type Problem = { entry: string; rule: string; message: string };

// What kind of evidence a status needs before the site may state it.
const STATUS_EVIDENCE: Record<Status, SourceType[]> = {
  convicted: ["court_ruling"],
  indicted: ["indictment", "prosecution_statement", "court_ruling"],
  under_investigation: [
    "police_statement",
    "prosecution_statement",
    "state_comptroller",
    "court_ruling",
  ],
  allegation: [], // checked separately: two independent publishers
  documented: [
    "knesset_record",
    "official_filing",
    "primary_media",
    "court_ruling",
    "state_comptroller",
  ],
};

// Some categories need evidence of a specific shape regardless of status.
const CATEGORY_EVIDENCE: Partial<Record<Category, SourceType[]>> = {
  // Foreign funding claims rest on what was actually filed, not on reporting about it.
  foreign_influence: ["official_filing", "court_ruling", "state_comptroller"],
  // A voting/record claim must point at the record itself.
  public_record: ["knesset_record", "official_filing", "primary_media"],
  // Quote the statement itself, not someone's summary of it.
  incitement: ["primary_media", "court_ruling", "knesset_record"],
};

export function checkEntry(
  entry: Entry,
  entities: Map<string, Entity>,
  editors: Map<string, Editor>,
): Problem[] {
  const problems: Problem[] = [];
  const fail = (rule: string, message: string) =>
    problems.push({ entry: entry.slug, rule, message });

  if (!entities.has(entry.entity)) {
    fail("entity-exists", `no entity "${entry.entity}" in content/entities`);
  }

  // Structure that must hold even for drafts.
  const ids = new Set<string>();
  for (const s of entry.sources) {
    if (ids.has(s.id)) fail("source-ids-unique", `duplicate source id "${s.id}"`);
    ids.add(s.id);
  }
  for (const t of entry.timeline) {
    for (const id of t.sourceIds) {
      if (!ids.has(id)) fail("timeline-sourced", `timeline cites unknown source "${id}"`);
    }
  }
  if (entry.response.sourceId && !ids.has(entry.response.sourceId)) {
    fail("response-sourced", `response cites unknown source "${entry.response.sourceId}"`);
  }
  if (entry.category === "public_record" && entry.status !== "documented") {
    fail("record-is-documented", `public_record entries must have status "documented"`);
  }
  for (const who of [entry.editorial.createdBy, entry.editorial.reviewedBy]) {
    if (who && !editors.has(who)) {
      fail("known-editor", `"${who}" is not listed in content/editors.json`);
    }
  }

  const { state } = entry.editorial;
  if (state !== "published" && state !== "retracted") return problems;

  // ---- Publication gate ----

  if (entry.sources.length === 0) {
    fail("has-sources", "a published entry needs at least one source");
  }

  const types = new Set(entry.sources.map((s) => s.type));
  const needs = STATUS_EVIDENCE[entry.status];
  if (needs.length > 0 && !needs.some((t) => types.has(t))) {
    fail(
      "status-evidence",
      `status "${entry.status}" needs a source of type: ${needs.join(" | ")}`,
    );
  }
  if (entry.status === "allegation") {
    const publishers = new Set(entry.sources.map((s) => s.publisher.trim().toLowerCase()));
    if (publishers.size < 2) {
      fail(
        "allegation-corroborated",
        "an allegation needs sources from at least two independent publishers",
      );
    }
  }
  const catNeeds = CATEGORY_EVIDENCE[entry.category];
  if (catNeeds && !catNeeds.some((t) => types.has(t))) {
    fail(
      "category-evidence",
      `category "${entry.category}" needs a source of type: ${catNeeds.join(" | ")}`,
    );
  }

  // Two people, always: the one who wrote it is never the one who approved it.
  const { createdBy, reviewedBy, publishedOn } = entry.editorial;
  if (!reviewedBy) fail("reviewed", "published entries need editorial.reviewedBy");
  else if (reviewedBy === createdBy) {
    fail("second-editor", "reviewer must be a different editor than the author");
  } else if (editors.get(reviewedBy)?.ai) {
    fail("human-reviewer", "an AI drafter can't approve publication; a human editor must");
  }
  if (!publishedOn) fail("published-on", "published entries need editorial.publishedOn");

  // Right of reply: the subject is asked before anything goes up.
  const r = entry.response;
  if (r.status === "not_yet_requested") {
    fail("right-of-reply", "the subject must be asked for a response before publication");
  } else if (!r.requestedOn) {
    fail("right-of-reply", "response.requestedOn is required once a response was requested");
  }
  if (r.status === "responded" && !r.text) {
    fail("response-text", "a response was received, so publish it (response.text)");
  }

  if (state === "retracted") {
    if (!entry.editorial.retractedOn || !entry.editorial.retractionReason) {
      fail("retraction", "retracted entries need retractedOn and retractionReason");
    }
  }

  return problems;
}

export function isPublic(entry: Entry) {
  return entry.editorial.state === "published" || entry.editorial.state === "retracted";
}
