import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { parseContent } from "../content/load";
import { extractJson, findStatements, rosterFor } from "../agent/statement-checker";
import type { Member, Vote } from "./schema";
import { checkFinding, contradicts, entityDraft, entryDraft, htmlToText, sourceFor, type Finding } from "./statements";

// Fictional members, bill and article.
const sources = [
  { domain: "ynet.co.il", name: { he: "ynet", en: "Ynet" } },
  { domain: "israelhayom.co.il", name: { he: "ישראל היום", en: "Israel Hayom" } },
];
const members: Record<string, Member> = {
  "11": { id: "11", name: "פלוני אלמוני", faction: "סיעה א", knessets: [25] },
  "12": { id: "12", name: "אלמונית פלונית", faction: "סיעה ב", knessets: [25] },
  "13": { id: "13", name: "ישראל ישראלי", faction: "סיעה ב", knessets: [25] },
};
const vote: Vote = {
  id: 46700,
  knesset: 25,
  date: "2026-07-28",
  time: "17:42",
  item: { id: 2229019, title: "הצעת חוק הדוגמה, התשפ\"ו-2026" },
  voteTitle: "לקבל את הצעת החוק בקריאה שלישית",
  accepted: null,
  totals: { for: 1, against: 1, abstain: 0 },
  members: {
    "11": { choice: "for", raw: "בעד", faction: "סיעה א" },
    "12": { choice: "against", raw: "נגד", faction: "סיעה ב" },
    "13": { choice: "other", raw: "נוכח", faction: "סיעה ב" },
  },
  source: { url: "https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PlenumVote(46700)", retrievedOn: "2026-10-25" },
};
const article =
  "ח\"כ פלוני אלמוני אמר אתמול: \"אני אצביע נגד החוק הזה, הוא פוגע באזרחים\". לדבריו, אין סיכוי שהסיעה תתמוך.";
const finding: Finding = {
  mk_id: "11",
  stance: "oppose",
  quote: "אני אצביע נגד החוק הזה, הוא פוגע באזרחים",
  url: "https://www.ynet.co.il/news/article/abc123",
  published_date: "2026-05-02",
  explanation: "Said he would vote against; voted for.",
};
const check = (f: Partial<Finding>, texts = [article]) =>
  checkFinding({ finding: { ...finding, ...f }, vote, members, sources, texts });

describe("statement vs vote checks", () => {
  it("knows what counts as a contradiction", () => {
    expect(contradicts("oppose", "for")).toBe(true);
    expect(contradicts("support", "against")).toBe(true);
    expect(contradicts("support", "for")).toBe(false);
    expect(contradicts("oppose", "abstain")).toBe(false);
  });

  it("accepts a verified contradiction", () => {
    expect(check({})).toEqual([]);
  });

  it("rejects a statement that agrees with the vote", () => {
    expect(check({ stance: "support" }).join()).toContain("agrees with the vote");
  });

  it("rejects members who abstained or didn't vote, or aren't in the record", () => {
    expect(check({ mk_id: "13" }).join()).toContain("not for or against");
    expect(check({ mk_id: "99" }).join()).toContain("no recorded vote");
  });

  it("rejects statements from on or after the vote date", () => {
    expect(check({ published_date: "2026-07-28" }).join()).toContain("before the vote");
    expect(check({ published_date: "May 2026" }).join()).toContain("bad date");
  });

  it("rejects outlets not on the approved list, including look-alike domains", () => {
    expect(check({ url: "https://example.com/a" }).join()).toContain("approved outlet");
    expect(check({ url: "https://ynet.co.il.evil.com/a" }).join()).toContain("approved outlet");
    expect(sourceFor("https://www.ynet.co.il/x", sources)?.domain).toBe("ynet.co.il");
    expect(sourceFor("https://m.israelhayom.co.il/x", sources)?.domain).toBe("israelhayom.co.il");
  });

  it("rejects a quote that isn't word for word in the fetched article", () => {
    expect(check({ quote: "אני אצביע נגד החוק הזה בכל מקרה" }).join()).toContain("not found verbatim");
    expect(check({}, []).join()).toContain("not found verbatim");
  });

  it("rejects quotes too short to stand alone", () => {
    expect(check({ quote: "נגד החוק" }).join()).toContain("too short");
  });

  it("rejects an article that doesn't name the member", () => {
    const anonymous = article.replace("פלוני אלמוני", "חבר כנסת בכיר");
    expect(check({}, [anonymous]).join()).toContain("doesn't mention");
  });

  it("extracts readable text from article HTML", () => {
    const html = `<html><head><script>var q="אני אצביע נגד";</script><style>p{}</style></head><body><p>ח&quot;כ פלוני אלמוני:</p><p>&quot;אני אצביע נגד החוק הזה, הוא פוגע באזרחים&quot;</p></body></html>`;
    const text = htmlToText(html);
    expect(text).not.toContain("var q");
    expect(check({}, [text])).toEqual([]);
  });
});

describe("draft case", () => {
  const editors = { path: "content/editors.json", text: JSON.stringify([{ handle: "lior", name: "Lior" }, { handle: "claude", name: "Claude", ai: true }]) };
  const entity = entityDraft(members["11"]);
  const entry = entryDraft(finding, vote, members["11"], sources[0], "כותרת הכתבה");
  const run = (e: object) =>
    parseContent({
      editors,
      entities: [{ path: `content/entities/${entity.slug}.json`, text: JSON.stringify(entity) }],
      entries: [{ path: `content/entries/${entry.slug}.json`, text: JSON.stringify(e) }],
    }).problems.map((p) => p.rule);

  it("is a valid draft linked to the member's voting record", () => {
    expect(entity.knessetMemberId).toBe("11");
    expect(entry.editorial).toEqual({ state: "draft", createdBy: "claude" });
    expect(entry.summary.he).toContain(finding.quote);
    expect(entry.sources.map((s) => s.type)).toEqual(["news_report", "knesset_record"]);
    expect(run(entry)).toEqual([]);
  });

  it("can't be published without the member being asked to respond", () => {
    const e = { ...entry, editorial: { state: "published", createdBy: "claude", reviewedBy: "lior", publishedOn: "2026-10-26" } };
    expect(run(e)).toContain("right-of-reply");
  });

  it("can never be approved by the AI drafter", () => {
    const e = {
      ...entry,
      response: { status: "no_response", requestedOn: "2026-10-20" },
      editorial: { state: "published", createdBy: "lior", reviewedBy: "claude", publishedOn: "2026-10-26" },
    };
    expect(run(e)).toContain("human-reviewer");
  });
});

describe("statement checker", () => {
  const roster = rosterFor(vote, members);

  it("lists only members who voted for or against", () => {
    expect(roster.map((r) => r.id).sort()).toEqual(["11", "12"]);
  });

  it("pulls the JSON answer out of surrounding text", () => {
    expect(extractJson('Here you go:\n{"findings":[]}\nDone.')).toEqual({ findings: [] });
    expect(extractJson("no json")).toBeNull();
  });

  it("resumes paused turns, keeps fetched article text, and restricts tools to approved outlets", async () => {
    const calls: Record<string, unknown>[] = [];
    const replies = [
      {
        stop_reason: "pause_turn",
        content: [
          {
            type: "web_fetch_tool_result",
            tool_use_id: "t1",
            content: { type: "web_fetch_result", url: finding.url, retrieved_at: null, content: { type: "document", title: "כותרת", citations: null, source: { type: "text", media_type: "text/plain", data: article } } },
          },
        ],
      },
      { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ findings: [finding] }) }] },
    ];
    const client = {
      beta: { messages: { create: async (p: Record<string, unknown>) => (calls.push(p), replies.shift()) } },
    } as unknown as Anthropic;
    const res = await findStatements(client, vote, undefined, roster, sources);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(calls).toHaveLength(2);
    expect((calls[1].messages as unknown[]).length).toBe(2); // paused turn sent back
    const tools = calls[0].tools as { allowed_domains: string[] }[];
    expect(tools.every((t) => t.allowed_domains.join() === "ynet.co.il,israelhayom.co.il")).toBe(true);
    expect(res.fetched.get(finding.url)?.text).toBe(article);
    expect(res.findings).toHaveLength(1);
  });

  it("returns nothing usable when the answer isn't valid", async () => {
    const client = {
      beta: { messages: { create: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "I found several!" }] }) } },
    } as unknown as Anthropic;
    expect((await findStatements(client, vote, undefined, roster, sources)).ok).toBe(false);
  });
});
