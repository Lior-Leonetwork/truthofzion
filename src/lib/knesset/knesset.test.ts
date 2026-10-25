import { describe, expect, it } from "vitest";
import { decodeXml, NotODataError, parseAtom, parseJson, parseResponse, query } from "./odata";
import { buildVote, countsMatch, isFinalReading, mergeMembers, resultTypes } from "./transform";
import { nameOverlap } from "./bill";
import { checkAnalysis, checkDraft, quoteFound } from "./verify";
import type { Analysis } from "./schema";

// Shaped like a WCF Data Services (OData v3) Atom feed. Fictional values.
const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xml:base="https://knesset.gov.il/Odata/Votes.svc/" xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
  <entry><content type="application/xml"><m:properties>
    <d:vote_id m:type="Edm.Int32">901</d:vote_id>
    <d:knesset_num m:type="Edm.Int32">25</d:knesset_num>
    <d:sess_item_id m:type="Edm.Int32">2001</d:sess_item_id>
    <d:sess_item_dscr>הצעת חוק הדוגמה (תיקון מס&apos; 3), התשפ&quot;ו-2026</d:sess_item_dscr>
    <d:vote_item_dscr>הצבעה על החוק כולו - קריאה שלישית</d:vote_item_dscr>
    <d:vote_date m:type="Edm.DateTime">2026-07-22T00:00:00</d:vote_date>
    <d:vote_time>17:42</d:vote_time>
    <d:is_accepted m:type="Edm.Int32">1</d:is_accepted>
    <d:total_for m:type="Edm.Int32">2</d:total_for>
    <d:total_against m:type="Edm.Int32">1</d:total_against>
    <d:total_abstain m:type="Edm.Int32">0</d:total_abstain>
    <d:remark m:null="true" />
  </m:properties></content></entry>
  <link rel="next" href="https://knesset.gov.il/Odata/Votes.svc/View_vote_rslts_hdr_Approved?$filter=knesset_num%20eq%2025&amp;$skiptoken=901" />
</feed>`;

const types = resultTypes([
  { result_type_id: 1, result_type_name: "בעד" },
  { result_type_id: 2, result_type_name: "נגד" },
  { result_type_id: 3, result_type_name: "נמנע" },
  { result_type_id: 4, result_type_name: "לא הצביע" },
]);

const rows = [
  { vote_id: 901, kmmbr_id: "000000001", kmmbr_name: "פלוני אלמוני", vote_result: 1, faction_name: "סיעה א" },
  { vote_id: 901, kmmbr_id: "000000002", kmmbr_name: "אלמונית פלונית", vote_result: 1, faction_name: "סיעה א" },
  { vote_id: 901, kmmbr_id: "000000003", kmmbr_name: "ישראל ישראלי", vote_result: 2, faction_name: "סיעה ב" },
  { vote_id: 901, kmmbr_id: "000000004", kmmbr_name: "שרה כהן", vote_result: 4, faction_name: "סיעה ב" },
];

describe("OData parsing", () => {
  it("reads typed properties, nulls and the next link from Atom", () => {
    const { rows: r, next } = parseAtom(ATOM, "https://knesset.gov.il/Odata/Votes.svc");
    expect(r).toHaveLength(1);
    expect(r[0].vote_id).toBe(901);
    expect(r[0].sess_item_dscr).toBe('הצעת חוק הדוגמה (תיקון מס\' 3), התשפ"ו-2026');
    expect(r[0].remark).toBeNull();
    expect(next).toBe("https://knesset.gov.il/Odata/Votes.svc/View_vote_rslts_hdr_Approved?$filter=knesset_num%20eq%2025&$skiptoken=901");
  });

  it("reads verbose and light JSON, including /Date()/ values", () => {
    const verbose = parseJson({ d: { results: [{ __metadata: {}, id: 5, vote_date: "/Date(1784678400000)/" }], __next: "https://x/next" } });
    expect(verbose.rows[0]).toEqual({ id: 5, vote_date: "2026-07-22T00:00:00" });
    expect(verbose.next).toBe("https://x/next");
    const light = parseJson({ value: [{ Id: 1, Name: "x", "@odata.etag": "e" }], "@odata.nextLink": "https://x/2" });
    expect(light.rows[0]).toEqual({ Id: 1, Name: "x" });
    expect(light.next).toBe("https://x/2");
  });

  it("follows next links until the last page", async () => {
    const pages: Record<string, unknown> = {
      "https://x/a": { value: [{ n: 1 }], "@odata.nextLink": "https://x/b" },
      "https://x/b": { value: [{ n: 2 }] },
    };
    const get = async (url: string) => ({ status: 200, contentType: "application/json", text: JSON.stringify(pages[url]) });
    const out = [];
    for await (const r of query(get, "https://x/a")) out.push(r.n);
    expect(out).toEqual([1, 2]);
  });

  it("treats a firewall or error page as an error, never as zero rows", () => {
    const blocked = "<html><head><title>Request Rejected</title></head><body>The requested URL was rejected.</body></html>";
    expect(() => parseResponse(blocked, "text/html", "https://x")).toThrow(NotODataError);
    expect(() => parseResponse('{"error":"nope"}', "application/json", "https://x")).toThrow(NotODataError);
    expect(parseResponse(ATOM, "application/atom+xml", "https://x").rows).toHaveLength(1);
    expect(parseResponse("<feed xmlns='x'></feed>", "application/atom+xml", "https://x").rows).toEqual([]);
  });

  it("decodes numeric and named entities", () => {
    expect(decodeXml("&#1488;&#x5D1; &amp; &lt;")).toBe("אב & <");
  });
});

describe("vote transform", () => {
  const header = parseAtom(ATOM, "https://knesset.gov.il/Odata/Votes.svc").rows[0];

  it("recognises final readings and skips procedural votes", () => {
    expect(isFinalReading(header)).toBe(true);
    expect(isFinalReading({ sess_item_dscr: "הצעת חוק", vote_item_dscr: "להעביר את הצעת החוק לוועדה" })).toBe(false);
    expect(isFinalReading({ sess_item_dscr: "הצעת חוק - קריאה שנייה ושלישית", vote_item_dscr: "סעיף 1" })).toBe(true);
  });

  it("builds a vote with each member's choice and faction", () => {
    const v = buildVote(header, rows, types, "2026-10-25");
    expect(v.id).toBe(901);
    expect(v.date).toBe("2026-07-22");
    expect(v.accepted).toBe(true);
    expect(v.members["000000001"]).toEqual({ choice: "for", raw: "בעד", faction: "סיעה א" });
    expect(v.members["000000004"].choice).toBe("other");
    expect(v.source.url).toContain("vote_id_t=901");
    expect(countsMatch(v)).toBe(true);
  });

  it("holds back a vote whose member rows disagree with the official totals", () => {
    const v = buildVote(header, rows.slice(1), types, "2026-10-25");
    expect(countsMatch(v)).toBe(false);
  });

  it("tracks each member's latest faction", () => {
    const v = buildVote(header, rows, types, "2026-10-25");
    const names = new Map(rows.map((r) => [r.kmmbr_id, r.kmmbr_name]));
    const m = mergeMembers({ "000000003": { id: "000000003", name: "ישראל ישראלי", faction: "סיעה ישנה", knessets: [24] } }, v, names);
    expect(m["000000003"]).toEqual({ id: "000000003", name: "ישראל ישראלי", faction: "סיעה ב", knessets: [24, 25] });
  });
});

describe("AI draft checks", () => {
  const bill = "מוצע לקבוע כי גוף ציבורי יפרסם את מקורות המימון שלו באתר האינטרנט אחת לרבעון.";
  const watch = [{ id: "integrity", name: { en: "Integrity" }, description: { en: "x" } }];

  it("accepts quotes that match the bill text, tolerating quote marks and spacing", () => {
    expect(quoteFound("יפרסם את מקורות   המימון שלו", bill)).toBe(true);
    expect(quoteFound('גוף ציבורי יפרסם', "גוף ציבורי יפרסם")).toBe(true);
  });

  it("rejects a quote the bill does not contain", () => {
    const errors = checkDraft({ summary: { en: "x" }, quotes: ["יפרסם את מקורות המימון שלו מדי חודש"], topics: [] }, bill, watch);
    expect(errors.join()).toContain("not found verbatim");
  });

  it("refuses a summary written without bill text", () => {
    expect(checkDraft({ summary: { en: "x" }, quotes: [], topics: [] }, null, watch)).toHaveLength(1);
    expect(checkDraft({ summary: null, quotes: [], topics: [] }, null, watch)).toEqual([]);
  });

  it("refuses a summary with no supporting quote, and unknown topics", () => {
    const errors = checkDraft({ summary: { en: "x" }, quotes: [], topics: ["made-up"] }, bill, watch);
    expect(errors).toHaveLength(2);
  });

  it("refuses short quotes that would match almost anything", () => {
    expect(quoteFound("גוף", bill)).toBe(false);
  });
});

describe("analysis publication gate", () => {
  const vote = buildVote(parseAtom(ATOM, "https://x").rows[0], rows, types, "2026-10-25");
  const votes = new Map([[vote.id, vote]]);
  const editors = new Map([["lior", { handle: "lior", name: "Lior" }]]);
  const base: Analysis = {
    voteId: 901,
    bill: null,
    summary: null,
    quotes: [],
    topics: [],
    keyVoteSuggested: true,
    rationale: "",
    model: "m",
    generatedOn: "2026-10-25",
    editorial: { state: "draft", keyVote: false },
  };
  const rules = (a: Analysis) => checkAnalysis(a, votes, editors).map((p) => p.rule);

  it("lets drafts sit unreviewed", () => {
    expect(rules(base)).toEqual([]);
  });

  it("requires a listed editor to publish", () => {
    expect(rules({ ...base, editorial: { state: "published", keyVote: false } })).toContain("reviewed");
    expect(rules({ ...base, editorial: { state: "published", keyVote: false, reviewedBy: "claude", reviewedOn: "2026-10-25" } })).toContain("known-editor");
    expect(rules({ ...base, editorial: { state: "published", keyVote: false, reviewedBy: "lior", reviewedOn: "2026-10-25" } })).toEqual([]);
  });

  it("requires an editor's reason for every key vote", () => {
    expect(rules({ ...base, editorial: { state: "draft", keyVote: true } })).toContain("key-vote-note");
    expect(rules({ ...base, editorial: { state: "published", keyVote: true, reviewedBy: "lior", reviewedOn: "2026-10-25" } })).toContain("key-vote-note");
    expect(rules({ ...base, editorial: { state: "draft", keyVote: true, note: { en: "Why" } } })).toEqual([]);
  });
});

describe("bill matching", () => {
  it("accepts the same bill and refuses a different one", () => {
    expect(nameOverlap("הצעת חוק הדוגמה (תיקון מס' 3), התשפ\"ו-2026", "הצעת חוק הדוגמה (תיקון מס' 3), התשפ\"ו-2026")).toBe(1);
    expect(nameOverlap("הצעת חוק הדוגמה (תיקון מס' 3)", "חוק התקציב לשנת 2027")).toBeLessThan(0.6);
  });
});
