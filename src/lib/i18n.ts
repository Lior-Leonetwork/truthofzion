import type { Category, Localized, Status } from "./content/schema";

export const LOCALES = ["he", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "he";

export const hasLocale = (s: string): s is Locale => (LOCALES as readonly string[]).includes(s);
export const dir = (l: Locale) => (l === "he" ? "rtl" : "ltr");

// Pick the reader's language, falling back to the other one. `fallback` lets the
// page mark text that is shown in the other language.
export function t(text: Localized | undefined, locale: Locale) {
  if (!text) return { value: "", fallback: false };
  const other: Locale = locale === "he" ? "en" : "he";
  const value = text[locale] ?? text[other] ?? "";
  return { value, fallback: !text[locale], lang: text[locale] ? locale : other };
}

export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

type Dict = {
  siteName: string;
  tagline: string;
  nav: { entries: string; methodology: string; corrections: string; reply: string };
  home: {
    heading: string;
    intro: string;
    pillars: string[];
    browse: string;
    empty: string;
    emptyDetail: string;
  };
  filters: { all: string; category: string; status: string; search: string; none: string };
  categories: Record<Category, { name: string; blurb: string }>;
  statuses: Record<Status, { name: string; note: string }>;
  entry: {
    summary: string;
    details: string;
    timeline: string;
    sources: string;
    archived: string;
    response: string;
    responseStatus: Record<string, string>;
    requestedOn: string;
    corrections: string;
    noCorrections: string;
    retracted: string;
    published: string;
    updated: string;
    profile: string;
    otherLanguage: string;
    reviewedBy: string;
    reportError: string;
  };
  profile: { entries: string; links: string };
  sourceTypes: Record<string, string>;
  corrections: { heading: string; intro: string; empty: string; retraction: string };
  reply: { heading: string; paragraphs: string[]; contact: string };
  methodology: { heading: string; sections: { title: string; body: string[] }[] };
  footer: string;
  langSwitch: string;
};

const he: Dict = {
  siteName: "אמת מציון",
  tagline: "מי פועל נגד ישראל — מתועד, ממוקר, ניתן לבדיקה",
  nav: { entries: "תיקים", methodology: "מתודולוגיה", corrections: "תיקונים", reply: "זכות תגובה" },
  home: {
    heading: "אור על מה שקורה באמת",
    intro:
      "אמת מציון מתעדת שחיתות ציבורית, השפעה ומימון זרים, הסתה, ואת הרשומה הציבורית של נבחרי ציבור — כל טענה עם מקורות, וכל תיק עם מעמדו המשפטי המדויק.",
    pillars: [
      "כל טענה מקושרת למקור: פסק דין, כתב אישום, דוח מבקר המדינה, פרוטוקול כנסת או דיווח מהימן.",
      "הרשעה, כתב אישום, חקירה וטענה — לעולם לא מוצגים כאותו דבר.",
      "כל תיק נבדק בידי שני עורכים לפני פרסום, ומושא התיק מקבל הזדמנות להגיב.",
    ],
    browse: "כל התיקים",
    empty: "עדיין לא פורסמו תיקים.",
    emptyDetail: "תיקים מתפרסמים רק לאחר אימות מקורות, פנייה לתגובה ואישור של עורך שני.",
  },
  filters: { all: "הכול", category: "קטגוריה", status: "מעמד", search: "חיפוש שם או נושא", none: "אין תיקים שתואמים לסינון." },
  categories: {
    corruption: { name: "שחיתות", blurb: "שוחד, מרמה והפרת אמונים של נושאי משרה." },
    foreign_influence: { name: "השפעה ומימון זרים", blurb: "גופים ומסעות הממומנים או מכוונים מחו״ל, לפי דיווחים רשמיים." },
    public_record: { name: "הצבעות ורשומה ציבורית", blurb: "איך הצביעו ומה אמרו — מול מה שהבטיחו." },
    incitement: { name: "הסתה ופעולות עוינות", blurb: "התבטאויות ומעשים מתועדים נגד ישראל ואזרחיה." },
  },
  statuses: {
    convicted: { name: "הורשע", note: "פסק דין מרשיע." },
    indicted: { name: "הוגש כתב אישום", note: "חזקת החפות עומדת בתוקף עד להכרעת דין." },
    under_investigation: { name: "בחקירה", note: "לא הוגשו אישומים. חקירה אינה קביעת אשמה." },
    allegation: { name: "טענה", note: "טענה שדווחה בידי שני גורמים בלתי תלויים לפחות. לא הוכחה." },
    documented: { name: "רשומה ציבורית", note: "עובדה מתועדת ברשומה רשמית או בהקלטה מקורית." },
  },
  entry: {
    summary: "תקציר",
    details: "פירוט",
    timeline: "ציר זמן",
    sources: "מקורות",
    archived: "עותק בארכיון",
    response: "תגובת מושא התיק",
    responseStatus: {
      requested: "נשלחה פנייה לתגובה; ממתינים למענה.",
      responded: "התקבלה תגובה:",
      declined: "סירב/ה להגיב.",
      no_response: "לא התקבלה תגובה עד למועד הפרסום.",
    },
    requestedOn: "נשלחה פנייה ב־",
    corrections: "תיקונים",
    noCorrections: "אין תיקונים לתיק זה.",
    retracted: "התיק נמשך",
    published: "פורסם",
    updated: "עודכן",
    profile: "לפרופיל",
    otherLanguage: "טקסט זה זמין באנגלית בלבד.",
    reviewedBy: "נבדק בידי שני עורכים",
    reportError: "מצאתם טעות? דווחו לנו",
  },
  profile: { entries: "תיקים", links: "קישורים רשמיים" },
  sourceTypes: {
    court_ruling: "פסק דין",
    indictment: "כתב אישום",
    prosecution_statement: "הודעת הפרקליטות",
    police_statement: "הודעת המשטרה",
    state_comptroller: "דוח מבקר המדינה",
    knesset_record: "רשומות הכנסת",
    official_filing: "דיווח רשמי",
    primary_media: "תיעוד מקורי",
    news_report: "דיווח עיתונאי",
    other: "אחר",
  },
  corrections: {
    heading: "תיקונים ומשיכות",
    intro: "כל תיקון ומשיכה מתועדים כאן בפומבי, עם תאריך. איננו מוחקים בשקט.",
    empty: "עדיין אין תיקונים.",
    retraction: "משיכה",
  },
  reply: {
    heading: "זכות תגובה",
    paragraphs: [
      "אם שמכם או שם הארגון שלכם מופיע באתר, יש לכם זכות להגיב. לפני כל פרסום אנו פונים למושא התיק ומפרסמים את תגובתו במלואה לצד התיק.",
      "אם לדעתכם תיק כלשהו שגוי, חסר או לא מעודכן — למשל זיכוי, סגירת תיק או ביטול כתב אישום — שלחו לנו את הפרטים והמקורות. כל תיקון מתועד בפומבי בעמוד התיקונים.",
    ],
    contact: "כתובת לפניות:",
  },
  methodology: {
    heading: "מתודולוגיה וסטנדרט עריכה",
    sections: [
      {
        title: "מה אנחנו מתעדים",
        body: [
          "נושאי משרה, מועמדים, דמויות ציבוריות, ארגונים, כלי תקשורת וממשלות זרות — רק בפעולתם הציבורית. איננו מתעדים אנשים פרטיים.",
          "ארבעה תחומים: שחיתות; השפעה ומימון זרים; הצבעות ורשומה ציבורית; הסתה ופעולות עוינות.",
        ],
      },
      {
        title: "דרישות ראיה",
        body: [
          "״הורשע״ דורש פסק דין. ״הוגש כתב אישום״ דורש את כתב האישום או הודעת הפרקליטות. ״בחקירה״ דורש הודעה רשמית של המשטרה, הפרקליטות או מבקר המדינה.",
          "״טענה״ דורשת לפחות שני מקורות עיתונאיים בלתי תלויים, ומוצגת תמיד כטענה בלבד.",
          "טענות על מימון זר נשענות על הדיווח הרשמי עצמו. טענות על הצבעה או התבטאות נשענות על הרשומה או ההקלטה המקורית.",
          "הכללים האלה נאכפים בקוד: תיק שאינו עומד בהם אינו יכול להתפרסם.",
        ],
      },
      {
        title: "שני עורכים, תמיד",
        body: [
          "כל תיק נכתב בידי עורך אחד ונבדק ומאושר בידי עורך אחר. מי שכתב אינו מאשר.",
        ],
      },
      {
        title: "זכות תגובה ותיקונים",
        body: [
          "לפני פרסום אנו פונים למושא התיק. תגובה שהתקבלה מתפרסמת לצד התיק.",
          "כשמשהו משתנה — זיכוי, סגירת תיק, טעות — אנו מעדכנים ורושמים את התיקון בפומבי. תיק שנמשך נשאר עם הודעת משיכה והסבר.",
        ],
      },
    ],
  },
  footer:
    "אמת מציון מבוססת על מקורות ציבוריים. כל אדם בחזקת חף מפשע עד שהורשע בדין. מצאתם טעות? כתבו לנו.",
  langSwitch: "English",
};

const en: Dict = {
  siteName: "Truth of Zion",
  tagline: "Who acts against Israel — documented, sourced, checkable",
  nav: { entries: "Cases", methodology: "Methodology", corrections: "Corrections", reply: "Right of reply" },
  home: {
    heading: "Shining light on what really happens",
    intro:
      "Truth of Zion documents public corruption, foreign influence and funding, incitement, and the public record of officials — every claim sourced, every case labelled with its exact legal status.",
    pillars: [
      "Every claim links to its source: a court ruling, an indictment, a State Comptroller report, a Knesset record, or credible reporting.",
      "Convicted, indicted, under investigation and alleged are never presented as the same thing.",
      "Every case is checked by two editors before publication, and its subject is given the chance to respond.",
    ],
    browse: "All cases",
    empty: "No cases published yet.",
    emptyDetail: "Cases are published only after sources are verified, the subject is asked to respond, and a second editor approves.",
  },
  filters: { all: "All", category: "Category", status: "Status", search: "Search a name or topic", none: "No cases match these filters." },
  categories: {
    corruption: { name: "Corruption", blurb: "Bribery, fraud and breach of trust by office holders." },
    foreign_influence: { name: "Foreign influence & funding", blurb: "Bodies and campaigns funded or directed from abroad, per official filings." },
    public_record: { name: "Votes & public record", blurb: "How they voted and what they said — against what they promised." },
    incitement: { name: "Incitement & hostile acts", blurb: "Documented statements and acts against Israel and its citizens." },
  },
  statuses: {
    convicted: { name: "Convicted", note: "Convicted by a court." },
    indicted: { name: "Indicted", note: "Presumed innocent until a verdict." },
    under_investigation: { name: "Under investigation", note: "No charges filed. An investigation is not a finding of guilt." },
    allegation: { name: "Allegation", note: "Reported by at least two independent outlets. Not proven." },
    documented: { name: "Public record", note: "A fact documented in an official record or original recording." },
  },
  entry: {
    summary: "Summary",
    details: "Details",
    timeline: "Timeline",
    sources: "Sources",
    archived: "Archived copy",
    response: "Subject's response",
    responseStatus: {
      requested: "We asked for a response and are waiting for a reply.",
      responded: "Response received:",
      declined: "Declined to comment.",
      no_response: "No response by the time of publication.",
    },
    requestedOn: "Asked on ",
    corrections: "Corrections",
    noCorrections: "No corrections to this case.",
    retracted: "This case was retracted",
    published: "Published",
    updated: "Updated",
    profile: "View profile",
    otherLanguage: "This text is only available in Hebrew.",
    reviewedBy: "Checked by two editors",
    reportError: "Spotted an error? Tell us",
  },
  profile: { entries: "Cases", links: "Official links" },
  sourceTypes: {
    court_ruling: "Court ruling",
    indictment: "Indictment",
    prosecution_statement: "Prosecution statement",
    police_statement: "Police statement",
    state_comptroller: "State Comptroller report",
    knesset_record: "Knesset record",
    official_filing: "Official filing",
    primary_media: "Original recording",
    news_report: "News report",
    other: "Other",
  },
  corrections: {
    heading: "Corrections & retractions",
    intro: "Every correction and retraction is logged here in public, with its date. We never delete quietly.",
    empty: "No corrections yet.",
    retraction: "Retraction",
  },
  reply: {
    heading: "Right of reply",
    paragraphs: [
      "If you or your organization appear on this site, you have the right to respond. Before anything is published we contact the subject, and any response is published in full alongside the case.",
      "If you believe a case is wrong, incomplete or out of date — an acquittal, a closed investigation, a dropped indictment — send us the details and sources. Every correction is logged publicly on the corrections page.",
    ],
    contact: "Contact:",
  },
  methodology: {
    heading: "Methodology & editorial standard",
    sections: [
      {
        title: "What we document",
        body: [
          "Office holders, candidates, public figures, organizations, media outlets and foreign governments — in their public role only. We do not document private individuals.",
          "Four areas: corruption; foreign influence and funding; votes and the public record; incitement and hostile acts.",
        ],
      },
      {
        title: "Evidence requirements",
        body: [
          "“Convicted” requires a court ruling. “Indicted” requires the indictment or a prosecution announcement. “Under investigation” requires an official police, prosecution or State Comptroller statement.",
          "“Allegation” requires at least two independent news sources and is always shown as an allegation only.",
          "Foreign-funding claims rest on the official filing itself. Claims about votes or statements rest on the record or original recording.",
          "These rules are enforced in code: a case that fails them cannot be published.",
        ],
      },
      {
        title: "Two editors, always",
        body: ["Every case is written by one editor and checked and approved by a different one. Authors never approve their own work."],
      },
      {
        title: "Right of reply & corrections",
        body: [
          "Before publication we contact the subject. Any response received is published alongside the case.",
          "When something changes — an acquittal, a closed case, an error — we update and log the correction publicly. A retracted case stays up with a retraction notice and the reason.",
        ],
      },
    ],
  },
  footer:
    "Truth of Zion is built on public sources. Everyone is presumed innocent until convicted by a court. Spotted an error? Write to us.",
  langSwitch: "עברית",
};

export const DICTIONARIES: Record<Locale, Dict> = { he, en };
export const getDict = (l: Locale) => DICTIONARIES[l];
