import { z } from "zod";

// Every piece of reader-facing text exists in Hebrew, English, or both.
// Pages fall back to the other language (and say so) when one is missing.
export const Localized = z
  .object({
    he: z.string().trim().min(1).optional(),
    en: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((v) => v.he || v.en, "needs Hebrew or English text");
export type Localized = z.infer<typeof Localized>;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase-with-dashes only");
const isoDate = z.iso.date();
const httpsUrl = z.url({ protocol: /^https$/ });

// Only public actors. There is deliberately no kind for a private person:
// the site covers people and bodies acting in a public role.
export const ENTITY_KINDS = [
  "public_official", // minister, MK, mayor, senior civil servant, judge
  "candidate", // running for public office
  "public_figure", // a public voice acting in a public role
  "organization", // NGO, company, party, association
  "media_outlet",
  "foreign_government",
] as const;

// Seniority of the role, used to sort the directory with the top roles first.
export const POSITIONS = [
  "head_of_state",
  "head_of_government",
  "minister",
  "security",
  "judiciary",
  "legislator",
  "party_leader",
  "diplomat",
  "senior_official",
  "org_leader",
] as const;
export type Position = (typeof POSITIONS)[number];

export const Entity = z
  .object({
    slug,
    kind: z.enum(ENTITY_KINDS),
    name: Localized,
    role: Localized,
    position: z.enum(POSITIONS).optional(),
    description: Localized.optional(),
    country: z.string().regex(/^[A-Z]{2}$/, "ISO 3166-1 alpha-2, e.g. IL"),
    // kmmbr_id in the Knesset's vote data; links the profile to its voting record.
    knessetMemberId: z.string().optional(),
    links: z
      .array(z.object({ label: Localized, url: httpsUrl }).strict())
      .default([]),
  })
  .strict();
export type Entity = z.infer<typeof Entity>;

export const CATEGORIES = [
  "corruption",
  "foreign_influence",
  "public_record",
  "incitement",
] as const;
export type Category = (typeof CATEGORIES)[number];

// How far a matter has actually gone. These are never interchangeable on the
// page: an allegation is not an indictment and an indictment is not a conviction.
export const STATUSES = [
  "convicted",
  "indicted",
  "under_investigation",
  "allegation",
  "documented", // a matter of public record: a vote, a filing, a recorded statement
] as const;
export type Status = (typeof STATUSES)[number];

export const SOURCE_TYPES = [
  "court_ruling",
  "indictment",
  "prosecution_statement", // State Attorney / Attorney General announcement
  "police_statement",
  "state_comptroller",
  "knesset_record", // votes, protocols, committee transcripts
  "official_filing", // registrar filings, NGO-law disclosures, asset declarations
  "primary_media", // the original video/audio/post of a statement
  "news_report",
  "other",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const Source = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    type: z.enum(SOURCE_TYPES),
    publisher: z.string().trim().min(1),
    title: z.string().trim().min(1),
    date: isoDate,
    url: httpsUrl,
    // A snapshot (archive.org, archive.today) so the citation survives link rot.
    archivedUrl: httpsUrl.optional(),
  })
  .strict();
export type Source = z.infer<typeof Source>;

export const RESPONSE_STATUSES = [
  "not_yet_requested",
  "requested", // asked, waiting within the stated deadline
  "responded",
  "declined",
  "no_response", // deadline passed with no answer
] as const;

export const Response = z
  .object({
    status: z.enum(RESPONSE_STATUSES),
    requestedOn: isoDate.optional(),
    text: Localized.optional(),
    sourceId: z.string().optional(),
  })
  .strict();

export const EDITORIAL_STATES = [
  "draft",
  "in_review",
  "published",
  "retracted",
] as const;

export const Entry = z
  .object({
    slug,
    entity: slug,
    category: z.enum(CATEGORIES),
    status: z.enum(STATUSES),
    date: isoDate, // when the underlying event happened
    title: Localized,
    summary: Localized,
    body: z.array(Localized).default([]), // paragraphs
    timeline: z
      .array(
        z
          .object({
            date: isoDate,
            text: Localized,
            sourceIds: z.array(z.string()).min(1),
          })
          .strict(),
      )
      .default([]),
    sources: z.array(Source).default([]),
    response: Response,
    corrections: z
      .array(z.object({ date: isoDate, text: Localized }).strict())
      .default([]),
    editorial: z
      .object({
        state: z.enum(EDITORIAL_STATES),
        createdBy: z.string().min(1),
        reviewedBy: z.string().min(1).optional(),
        publishedOn: isoDate.optional(),
        updatedOn: isoDate.optional(),
        retractedOn: isoDate.optional(),
        retractionReason: Localized.optional(),
      })
      .strict(),
  })
  .strict();
export type Entry = z.infer<typeof Entry>;

export const Editor = z
  .object({
    handle: z.string().min(1),
    name: z.string().min(1),
    // GitHub login. Merging an AI-draft pull request publishes its drafts in
    // this editor's name, so only listed logins can do it.
    github: z.string().optional(),
    // An automated drafter. It may author drafts but can never approve one.
    ai: z.boolean().optional(),
  })
  .strict();
export type Editor = z.infer<typeof Editor>;
