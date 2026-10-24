import { describe, expect, it } from "vitest";
import { parseContent, type RawFile } from "./load";

// Fictional fixtures. No real person or organization appears in tests.
const editors: RawFile = {
  path: "content/editors.json",
  text: JSON.stringify([
    { handle: "alice", name: "Alice" },
    { handle: "bob", name: "Bob" },
  ]),
};

const entity = {
  slug: "example-official",
  kind: "public_official",
  name: { he: "נבחר ציבור לדוגמה", en: "Example Official" },
  role: { en: "Fictional minister" },
  country: "IL",
};

function entry(overrides: Record<string, unknown> = {}) {
  return {
    slug: "example-case",
    entity: "example-official",
    category: "corruption",
    status: "convicted",
    date: "2025-01-15",
    title: { en: "Convicted of breach of trust" },
    summary: { en: "A fictional case." },
    sources: [
      {
        id: "ruling",
        type: "court_ruling",
        publisher: "Example District Court",
        title: "Verdict",
        date: "2025-01-15",
        url: "https://example.org/verdict",
      },
    ],
    response: { status: "declined", requestedOn: "2025-01-10" },
    editorial: {
      state: "published",
      createdBy: "alice",
      reviewedBy: "bob",
      publishedOn: "2025-01-20",
    },
    ...overrides,
  };
}

function check(e: Record<string, unknown>, ents: unknown[] = [entity]) {
  return parseContent({
    editors,
    entities: ents.map((x) => ({
      path: `content/entities/${(x as { slug: string }).slug}.json`,
      text: JSON.stringify(x),
    })),
    entries: [{ path: `content/entries/${e.slug}.json`, text: JSON.stringify(e) }],
  });
}

const rules = (e: Record<string, unknown>) => check(e).problems.map((p) => p.rule);

describe("editorial rules", () => {
  it("accepts a fully sourced, reviewed entry", () => {
    expect(check(entry()).problems).toEqual([]);
  });

  it("refuses a conviction claim without a court ruling", () => {
    const e = entry({
      sources: [{ ...entry().sources[0], type: "news_report", publisher: "Paper" }],
    });
    expect(rules(e)).toContain("status-evidence");
  });

  it("refuses publication with no sources", () => {
    expect(rules(entry({ sources: [] }))).toContain("has-sources");
  });

  it("requires two independent publishers for an allegation", () => {
    const news = { type: "news_report", title: "Report", date: "2025-01-01" };
    const one = entry({
      status: "allegation",
      sources: [
        { ...news, id: "a", publisher: "Paper A", url: "https://a.example/1" },
        { ...news, id: "b", publisher: "paper a", url: "https://a.example/2" },
      ],
    });
    expect(rules(one)).toContain("allegation-corroborated");

    const two = entry({
      status: "allegation",
      sources: [
        { ...news, id: "a", publisher: "Paper A", url: "https://a.example/1" },
        { ...news, id: "b", publisher: "Paper B", url: "https://b.example/1" },
      ],
    });
    expect(rules(two)).not.toContain("allegation-corroborated");
  });

  it("requires a second editor who is not the author", () => {
    const self = entry({ editorial: { ...entry().editorial, reviewedBy: "alice" } });
    expect(rules(self)).toContain("second-editor");

    const none = entry({ editorial: { ...entry().editorial, reviewedBy: undefined } });
    expect(rules(none)).toContain("reviewed");
  });

  it("refuses editors who are not on the list", () => {
    const e = entry({ editorial: { ...entry().editorial, reviewedBy: "mallory" } });
    expect(rules(e)).toContain("known-editor");
  });

  it("requires the subject to be asked for a response before publishing", () => {
    expect(rules(entry({ response: { status: "not_yet_requested" } }))).toContain("right-of-reply");
    expect(rules(entry({ response: { status: "no_response" } }))).toContain("right-of-reply");
  });

  it("requires a received response to be published", () => {
    const e = entry({ response: { status: "responded", requestedOn: "2025-01-10" } });
    expect(rules(e)).toContain("response-text");
  });

  it("lets drafts be incomplete but still checks their structure", () => {
    const draft = entry({
      sources: [],
      response: { status: "not_yet_requested" },
      editorial: { state: "draft", createdBy: "alice" },
    });
    expect(check(draft).problems).toEqual([]);

    const broken = entry({
      timeline: [{ date: "2025-01-01", text: { en: "x" }, sourceIds: ["missing"] }],
      editorial: { state: "draft", createdBy: "alice" },
    });
    expect(rules(broken)).toContain("timeline-sourced");
  });

  it("needs the filing itself for foreign-funding claims", () => {
    const e = entry({
      category: "foreign_influence",
      status: "documented",
      sources: [{ ...entry().sources[0], type: "primary_media" }],
    });
    expect(rules(e)).toContain("category-evidence");
  });

  it("needs the primary statement for incitement claims", () => {
    const e = entry({
      category: "incitement",
      status: "allegation",
      sources: [
        { id: "a", type: "news_report", publisher: "A", title: "t", date: "2025-01-01", url: "https://a.example" },
        { id: "b", type: "news_report", publisher: "B", title: "t", date: "2025-01-01", url: "https://b.example" },
      ],
    });
    expect(rules(e)).toContain("category-evidence");
  });

  it("only allows public actors, never private individuals", () => {
    const res = check(entry(), [{ ...entity, kind: "private_person" }]);
    expect(res.problems.map((p) => p.rule)).toContain("schema");
  });

  it("only accepts https source links", () => {
    const e = entry({ sources: [{ ...entry().sources[0], url: "http://example.org" }] });
    expect(rules(e)).toContain("schema");
  });

  it("requires a reason for a retraction", () => {
    const e = entry({ editorial: { ...entry().editorial, state: "retracted" } });
    expect(rules(e)).toContain("retraction");
  });

  it("flags entries pointing at an unknown entity", () => {
    expect(rules(entry({ entity: "nobody" }))).toContain("entity-exists");
  });
});
