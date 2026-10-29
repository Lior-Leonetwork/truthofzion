import { describe, expect, it } from "vitest";
import type { Member } from "../knesset/schema";
import { researchCases } from "../agent/case-researcher";
import { allowedTypes, researchDomains, caseEntry, publicationGaps, verifyCandidate, type Candidate } from "./verify";

// Fictional member, fictional case.
const members: Record<string, Member> = { "900": { id: "900", name: "ישראל ישראלי", faction: "סיעה לדוגמה" } as Member };
const news = ["ynet.co.il"];
const today = "2026-10-25";
const attorneyUrl = "https://www.gov.il/he/departments/news/example-indictment";
const newsUrl = "https://www.ynet.co.il/news/article/example";
const page = "הודעת הפרקליטות: היום הוגש כתב אישום נגד חבר הכנסת ישראל ישראלי בעבירות של מרמה והפרת אמונים.";

const candidate = (o: Partial<Candidate> = {}): Candidate => ({
  mk_id: "900",
  category: "corruption",
  status: "indicted",
  date: "2026-05-01",
  title_he: "כתב אישום בעבירות מרמה והפרת אמונים",
  title_en: "Indicted for fraud and breach of trust",
  summary_he: "לפי הודעת הפרקליטות הוגש כתב אישום.",
  summary_en: "According to the State Attorney, an indictment was filed.",
  timeline: [{ date: "2026-05-01", text_he: "הוגש כתב אישום", text_en: "Indictment filed", source: 0 }],
  sources: [{ url: attorneyUrl, type: "indictment", publisher: "פרקליטות המדינה", title: "הודעה", date: "2026-05-01", quote: "הוגש כתב אישום נגד חבר הכנסת ישראל ישראלי" }],
  explanation: "",
  ...o,
});
const texts = new Map([[attorneyUrl, [page]], [newsUrl, ["כתבה שלא מזכירה אף אחד בשם, רק עבירות של מרמה והפרת אמונים בכלל"]]]);
const verify = (c: Candidate) => verifyCandidate(c, { members, newsDomains: news, texts, today });

describe("case drafts", () => {
  it("lets each site carry only the evidence it can", () => {
    expect(allowedTypes(attorneyUrl, news)).toContain("indictment");
    expect(allowedTypes("https://www.mevaker.gov.il/x", news)).toEqual(["state_comptroller"]);
    expect(allowedTypes("https://supremedecisions.court.gov.il/x", news)).toEqual(["court_ruling"]);
    expect(allowedTypes(newsUrl, news)).toEqual(["news_report"]);
    expect(allowedTypes("https://example.com/x", news)).toEqual([]);
    expect(allowedTypes("http://www.gov.il/x", news)).toEqual([]);
  });

  it("never sends the search tool a duplicate site", () => {
    const d = researchDomains(["ynet.co.il", "knesset.gov.il"]);
    expect(new Set(d).size).toBe(d.length);
    expect(d).toContain("ynet.co.il");
  });

  it("drafts a verified case, never published, with the right of reply still to do", () => {
    const v = verify(candidate());
    expect(v.errors).toEqual([]);
    const e = caseEntry(v);
    expect(e).toMatchObject({ slug: "mk-900-corruption-2026-05-01", entity: "mk-900", status: "indicted", editorial: { state: "draft", createdBy: "claude" }, response: { status: "not_yet_requested" } });
    expect(e.timeline[0].sourceIds).toEqual(["s1"]);
    const entities = new Map([["mk-900", { slug: "mk-900", kind: "public_official", name: { he: "ישראל ישראלי" }, role: { he: "ח״כ" }, country: "IL", links: [] } as never]]);
    const editors = new Map([["claude", { handle: "claude", name: "Claude", ai: true }]]);
    expect(publicationGaps(e, entities, editors)).toEqual([]);
  });

  it("rejects a news story dressed up as an indictment", () => {
    const v = verify(candidate({ sources: [{ ...candidate().sources[0], url: newsUrl }] }));
    expect(v.errors.join(" ")).toMatch(/not allowed/);
  });

  it("rejects quotes that aren't on the page, or pages that don't name the member", () => {
    expect(verify(candidate({ sources: [{ ...candidate().sources[0], quote: "הוגש כתב אישום חמור נגד חבר הכנסת בעבירות שוחד" }] })).errors.join(" ")).toMatch(/not found verbatim/);
    const unnamed = verify(candidate({ sources: [{ url: newsUrl, type: "news_report", publisher: "ynet", title: "t", date: "2026-05-01", quote: "רק עבירות של מרמה והפרת אמונים בכלל" }] }));
    expect(unnamed.errors.join(" ")).toMatch(/doesn't name/);
  });

  it("keeps verified sources and drops the rest; refuses unknown members, statuses and future dates", () => {
    const mixed = verify(candidate({ sources: [candidate().sources[0], { ...candidate().sources[0], url: "https://example.com/x" }] }));
    expect(mixed.errors).toEqual([]);
    expect(caseEntry(mixed).sources).toHaveLength(1);
    expect(verify(candidate({ mk_id: "1" })).errors[0]).toMatch(/roster/);
    expect(verify(candidate({ status: "documented" })).errors.join(" ")).toMatch(/not allowed for corruption/);
    expect(verify(candidate({ date: "2027-01-01" })).errors.join(" ")).toMatch(/bad date/);
  });

  it("flags a press-only allegation that lacks a second outlet", () => {
    const v = verify(candidate({ status: "allegation", sources: [{ url: attorneyUrl, type: "official_filing", publisher: "x", title: "t", date: "2026-05-01", quote: "הוגש כתב אישום נגד חבר הכנסת ישראל ישראלי" }] }));
    const entities = new Map([["mk-900", { slug: "mk-900" } as never]]);
    expect(publicationGaps(caseEntry(v), entities, new Map()).map((p) => p.rule)).toContain("allegation-corroborated");
  });
});

describe("case researcher's Israeli fetcher", () => {
  const knesset = "https://main.knesset.gov.il/news/example-ethics-decision";
  const decision = "ועדת האתיקה החליטה להטיל על חבר הכנסת ישראל ישראלי הרחקה מדיוני הכנסת בשל התבטאות התומכת בטרור.";
  const final = {
    cases: [
      {
        mk_id: "900", category: "incitement", status: "documented", date: "2026-03-01",
        title_he: "הרחקה בידי ועדת האתיקה", title_en: "Suspended by the Ethics Committee", summary_he: "ס", summary_en: "s",
        timeline: [], explanation: "",
        sources: [{ url: knesset, type: "knesset_record", publisher: "הכנסת", title: "החלטה", date: "2026-03-01", quote: "להטיל על חבר הכנסת ישראל ישראלי הרחקה מדיוני הכנסת" }],
      },
    ],
  };

  it("fetches blocked official sites through our fetcher and verifies against that text", async () => {
    const calls: { messages: { role: string; content: unknown }[] }[] = [];
    const replies = [
      { stop_reason: "tool_use", content: [{ type: "tool_use", id: "a", name: "fetch_page", input: { url: knesset } }, { type: "tool_use", id: "b", name: "fetch_page", input: { url: "https://example.com/x" } }] },
      { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(final) }] },
    ];
    const client = { beta: { messages: { stream: (p: (typeof calls)[number]) => (calls.push(structuredClone(p)), { finalMessage: async () => replies.shift() }) } } };
    const fetched: string[] = [];
    const r = await researchCases(client as never, "incitement", [members["900"]], [], researchDomains(news), 3, {
      fetchPage: async (u) => (fetched.push(u), decision),
      focus: "test",
    });
    expect(fetched).toEqual([knesset]); // the disallowed site was never fetched
    const results = calls[1].messages.at(-1)!.content as { tool_use_id: string; content: string; is_error: boolean }[];
    expect(results.find((x) => x.tool_use_id === "a")).toMatchObject({ content: decision, is_error: false });
    expect(results.find((x) => x.tool_use_id === "b")).toMatchObject({ is_error: true });
    if (!r.ok) throw new Error(r.errors.join());
    const v = verifyCandidate(r.cases[0], { members, newsDomains: news, texts: new Map([[knesset, [r.fetched.get(knesset)!]]]), today });
    expect(v.errors).toEqual([]);
    expect(caseEntry(v).sources[0].type).toBe("knesset_record");
  });
});
