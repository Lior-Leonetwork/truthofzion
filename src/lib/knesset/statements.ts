import { z } from "zod";
import { Localized } from "../content/schema";
import type { Entity, Entry } from "../content/schema";
import { decodeXml } from "./odata";
import type { Member, Vote, VoteChoice } from "./schema";
import { normalize } from "./verify";

// "Said one thing, voted the opposite": a member's public statement about a
// bill, set against how they voted on it at the final reading. The model only
// finds candidates; everything below decides, in code, what may become a draft.

// Outlets the model may search and cite. Editors maintain the list.
export const StatementSource = z.object({ domain: z.string().regex(/^[a-z0-9.-]+$/), name: Localized }).strict();
export type StatementSource = z.infer<typeof StatementSource>;

export const Finding = z.object({
  mk_id: z.string(),
  stance: z.enum(["support", "oppose"]),
  quote: z.string(),
  url: z.string(),
  published_date: z.string(),
  explanation: z.string(),
});
export type Finding = z.infer<typeof Finding>;
export const FindingsOut = z.object({ findings: z.array(Finding) });

export type Stance = Finding["stance"];

export function contradicts(stance: Stance, choice: VoteChoice) {
  return (stance === "support" && choice === "against") || (stance === "oppose" && choice === "for");
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function sourceFor(url: string, sources: StatementSource[]) {
  const host = hostOf(url);
  if (!host || !/^https?:\/\//.test(url)) return null;
  return sources.find((s) => host === s.domain || host.endsWith(`.${s.domain}`)) ?? null;
}

export function htmlToText(html: string) {
  return decodeXml(
    html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MIN_QUOTE = 15;

export type CheckInput = {
  finding: Finding;
  vote: Vote;
  members: Record<string, Member>;
  sources: StatementSource[];
  texts: string[]; // the article as fetched: by the model's fetch tool and/or by us
};

// Every reason a candidate can't become a draft. Empty means it can.
export function checkFinding({ finding: f, vote, members, sources, texts }: CheckInput): string[] {
  const errors: string[] = [];
  const mv = vote.members[f.mk_id];
  const member = members[f.mk_id];
  if (!mv || !member) return [`member ${f.mk_id} has no recorded vote on ${vote.id}`];
  if (mv.choice !== "for" && mv.choice !== "against") errors.push(`member's vote was "${mv.raw}", not for or against`);
  else if (!contradicts(f.stance, mv.choice)) errors.push(`statement (${f.stance}) agrees with the vote (${mv.choice})`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.published_date)) errors.push(`bad date "${f.published_date}"`);
  else if (f.published_date >= vote.date) errors.push("statement is not from before the vote");
  if (!sourceFor(f.url, sources)) errors.push(`source ${hostOf(f.url) ?? f.url} is not on the approved outlet list`);
  const quote = normalize(f.quote).replace(/^["״“”']+|["״“”']+$/g, "").trim();
  if (quote.length < MIN_QUOTE) errors.push("quote too short to stand on its own");
  const page = texts.map(normalize).find((t) => t.includes(quote));
  if (!page) errors.push("quote not found verbatim in the article as fetched");
  else {
    // The article must name the member, not just contain the words.
    const surname = normalize(member.name).split(" ").pop() ?? "";
    if (surname.length > 1 && !page.includes(surname)) errors.push(`article doesn't mention ${member.name}`);
  }
  return errors;
}

const fmt = (iso: string, locale: "he" | "en") =>
  new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

export const entitySlug = (personId: string) => `mk-${personId.replace(/[^0-9a-z]/gi, "").toLowerCase()}`;

export function entityDraft(member: Member): Entity {
  return {
    slug: entitySlug(member.id),
    kind: "public_official",
    position: "legislator",
    name: { he: member.name },
    role: { he: `חבר/ת הכנסת (${member.faction})`, en: `Member of Knesset (${member.faction})` },
    country: "IL",
    knessetMemberId: member.id,
    links: [],
  };
}

// The draft case. Its wording is fixed templates around the quote and the
// vote record, so no model-written prose is published; editors add context.
export function entryDraft(f: Finding, vote: Vote, member: Member, source: StatementSource, articleTitle: string | null): Entry {
  const choice = vote.members[f.mk_id].choice as "for" | "against";
  const bill = vote.item.title.length > 90 ? `${vote.item.title.slice(0, 87)}…` : vote.item.title;
  const quote = f.quote.trim().replace(/^["״“”']+|["״“”']+$/g, "");
  const choiceHe = choice === "for" ? "בעד" : "נגד";
  return {
    slug: `${entitySlug(member.id)}-vote-${vote.id}`,
    entity: entitySlug(member.id),
    category: "public_record",
    status: "documented",
    date: vote.date,
    title: {
      he: `הביע/ה ${f.stance === "support" ? "תמיכה" : "התנגדות"} ב"${bill}" והצביע/ה ${choiceHe}`,
      en: `Publicly ${f.stance === "support" ? "backed" : "opposed"} "${bill}", then voted ${choice} it`,
    },
    summary: {
      he: `ב־${fmt(f.published_date, "he")} פורסם ב${source.name.he ?? source.domain} ציטוט של ${member.name}: "${quote}". ב־${fmt(vote.date, "he")} הצביע/ה ${choiceHe} בקריאה השלישית.`,
      en: `On ${fmt(f.published_date, "en")}, ${source.name.en ?? source.domain} quoted ${member.name}: "${quote}" On ${fmt(vote.date, "en")} they voted ${choice} it at the final reading.`,
    },
    body: [],
    timeline: [
      { date: f.published_date, text: { he: "התבטאות פומבית", en: "Public statement" }, sourceIds: ["statement"] },
      { date: vote.date, text: { he: `הצבעה ${choiceHe} בקריאה שלישית`, en: `Voted ${choice} it at the final reading` }, sourceIds: ["vote"] },
    ],
    sources: [
      {
        id: "statement",
        type: source.domain === "knesset.gov.il" ? "knesset_record" : "news_report",
        publisher: source.name.he ?? source.domain,
        title: articleTitle?.trim() || bill,
        date: f.published_date,
        url: f.url,
      },
      {
        id: "vote",
        type: "knesset_record",
        publisher: "הכנסת",
        title: `${vote.item.title} — ${vote.voteTitle}`,
        date: vote.date,
        url: vote.source.url,
      },
    ],
    response: { status: "not_yet_requested" },
    corrections: [],
    editorial: { state: "draft", createdBy: "claude" },
  };
}
