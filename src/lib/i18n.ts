import type { Category, Localized, Position, Status } from "./content/schema";

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

export function countryName(code: string, locale: Locale) {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
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
  demo: string;
  nav: { investigations: string; people: string; countries: string; methodology: string; corrections: string; reply: string };
  home: {
    eyebrow: string;
    heading: string;
    intro: string;
    ctaPrimary: string;
    ctaSecondary: string;
    stats: { cases: string; people: string; countries: string; sources: string };
    latest: string;
    viewAll: string;
    topRoles: string;
    allPeople: string;
    byCountry: string;
    byArea: string;
    how: { title: string; steps: { title: string; body: string }[] };
    empty: string;
    emptyDetail: string;
  };
  cases: (n: number) => string;
  investigations: { heading: string; intro: string };
  people: { heading: string; intro: string; search: string; allCountries: string; none: string };
  countries: { heading: string; intro: string; people: string; cases: string; none: string };
  positions: Record<Position, string>;
  filters: { all: string; category: string; status: string; country: string; search: string; none: string };
  categories: Record<Category, { name: string; blurb: string }>;
  statuses: Record<Status, { name: string; note: string }>;
  progress: { label: string; publicRecord: string };
  entry: {
    caseFile: string;
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
    subject: string;
    facts: string;
    category: string;
    date: string;
    sourcesCount: string;
    reviewedBy: string;
    reportError: string;
    related: string;
  };
  profile: { dossier: string; cases: string; links: string; highest: string };
  sourceTypes: Record<string, string>;
  corrections: { heading: string; intro: string; empty: string; retraction: string };
  reply: { heading: string; paragraphs: string[]; contact: string };
  methodology: { heading: string; intro: string; sections: { title: string; body: string[] }[] };
  footer: { about: string; legal: string };
  langSwitch: string;
};

const he: Dict = {
  siteName: "אמת מציון",
  tagline: "תחקירים עצמאיים · מבוססי מקורות",
  demo: "מצב הדגמה — כל השמות, התפקידים והתיקים באתר בדויים.",
  nav: { investigations: "תחקירים", people: "אישים", countries: "מדינות", methodology: "מתודולוגיה", corrections: "תיקונים", reply: "זכות תגובה" },
  home: {
    eyebrow: "תחקירים עצמאיים · מבוססי מקורות",
    heading: "שופכים אור על מי שפועל נגד ישראל",
    intro:
      "אנו חוקרים בעלי תפקידים בכירים בישראל ובעולם: שחיתות, מימון והשפעה זרים, הסתה, והפער בין מה שהבטיחו למה שעשו. כל טענה מגובה במסמך, וכל תיק מוצג עם מעמדו המשפטי המדויק.",
    ctaPrimary: "לתחקירים",
    ctaSecondary: "איך אנחנו חוקרים",
    stats: { cases: "תיקים", people: "אישים וגופים", countries: "מדינות", sources: "מקורות מתועדים" },
    latest: "תחקירים אחרונים",
    viewAll: "לכל התחקירים",
    topRoles: "בכירים תחת הזרקור",
    allPeople: "לכל האישים",
    byCountry: "לפי מדינה",
    byArea: "תחומי חקירה",
    how: {
      title: "איך אנחנו חוקרים",
      steps: [
        { title: "ניטור", body: "מעקב רציף אחר פסקי דין, כתבי אישום, דוחות מבקר המדינה, הצבעות בכנסת ודיווחי מימון זר." },
        { title: "אימות", body: "כל ציטוט נבדק מול המקור ונשמר בארכיון. מה שלא ניתן לאמת לא מתפרסם." },
        { title: "זכות תגובה", body: "לפני פרסום אנו פונים למושא התחקיר ומפרסמים את תגובתו במלואה." },
        { title: "עורך שני", body: "כל תיק מאושר בידי עורך נוסף שאינו הכותב." },
      ],
    },
    empty: "התחקירים הראשונים בדרך.",
    emptyDetail: "תיק מתפרסם רק לאחר אימות מקורות, פנייה לתגובה ואישור של עורך שני.",
  },
  cases: (n) => (n === 1 ? "תיק אחד" : `${n} תיקים`),
  investigations: { heading: "תחקירים", intro: "כל התיקים שפורסמו, עם מעמדם המשפטי ומקורותיהם." },
  people: { heading: "אישים וגופים", intro: "בעלי תפקידים בכירים וגופים שנחקרו, מסודרים לפי בכירות.", search: "חיפוש שם או תפקיד", allCountries: "כל המדינות", none: "לא נמצאו אישים." },
  countries: { heading: "מדינות", intro: "תחקירים לפי המדינה שבה מכהן מושא התחקיר.", people: "אישים", cases: "תיקים", none: "אין עדיין תחקירים." },
  positions: {
    head_of_state: "ראש מדינה",
    head_of_government: "ראש ממשלה",
    minister: "שר/ה",
    security: "מערכת הביטחון",
    judiciary: "מערכת המשפט",
    legislator: "חבר/ת פרלמנט",
    party_leader: "ראש מפלגה",
    diplomat: "דיפלומט/ית",
    senior_official: "בכיר/ה בשירות הציבורי",
    org_leader: "ארגון",
  },
  filters: { all: "הכול", category: "תחום", status: "מעמד", country: "מדינה", search: "חיפוש שם או נושא", none: "אין תיקים שתואמים לסינון." },
  categories: {
    corruption: { name: "שחיתות", blurb: "שוחד, מרמה והפרת אמונים של נושאי משרה." },
    foreign_influence: { name: "השפעה ומימון זרים", blurb: "גופים ומסעות הממומנים או מכוונים מחו״ל, לפי דיווחים רשמיים." },
    public_record: { name: "הצבעות ורשומה ציבורית", blurb: "איך הצביעו ומה אמרו, מול מה שהבטיחו." },
    incitement: { name: "הסתה ופעולות עוינות", blurb: "התבטאויות ומעשים מתועדים נגד ישראל ואזרחיה." },
  },
  statuses: {
    convicted: { name: "הורשע", note: "פסק דין מרשיע." },
    indicted: { name: "כתב אישום", note: "חזקת החפות עומדת בתוקף עד להכרעת דין." },
    under_investigation: { name: "בחקירה", note: "לא הוגשו אישומים. חקירה אינה קביעת אשמה." },
    allegation: { name: "טענה", note: "דווחה בידי שני גורמים בלתי תלויים לפחות. לא הוכחה." },
    documented: { name: "רשומה ציבורית", note: "עובדה מתועדת ברשומה רשמית או בהקלטה מקורית." },
  },
  progress: { label: "מעמד משפטי", publicRecord: "מתועד ברשומה ציבורית" },
  entry: {
    caseFile: "תיק",
    summary: "תקציר",
    details: "פירוט",
    timeline: "ציר זמן",
    sources: "מקורות",
    archived: "עותק בארכיון",
    response: "תגובת מושא התחקיר",
    responseStatus: {
      requested: "נשלחה פנייה לתגובה; ממתינים למענה.",
      responded: "התקבלה תגובה",
      declined: "סירב/ה להגיב.",
      no_response: "לא התקבלה תגובה עד למועד הפרסום.",
    },
    requestedOn: "נשלחה פנייה ב־",
    corrections: "תיקונים",
    noCorrections: "אין תיקונים לתיק זה.",
    retracted: "התיק נמשך",
    published: "פורסם",
    updated: "עודכן",
    profile: "לתיק האישי",
    subject: "מושא התחקיר",
    facts: "פרטי התיק",
    category: "תחום",
    date: "מועד האירוע",
    sourcesCount: "מקורות",
    reviewedBy: "נבדק בידי שני עורכים",
    reportError: "מצאתם טעות? דווחו לנו",
    related: "תיקים נוספים",
  },
  profile: { dossier: "תיק אישי", cases: "תיקים", links: "קישורים רשמיים", highest: "המעמד החמור ביותר" },
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
      "אם שמכם או שם הארגון שלכם מופיע באתר, יש לכם זכות להגיב. לפני כל פרסום אנו פונים למושא התחקיר ומפרסמים את תגובתו במלואה לצד התיק.",
      "אם לדעתכם תיק שגוי, חסר או לא מעודכן (למשל זיכוי, סגירת תיק או ביטול כתב אישום), שלחו לנו את הפרטים והמקורות. כל תיקון מתועד בפומבי בעמוד התיקונים.",
    ],
    contact: "כתובת לפניות:",
  },
  methodology: {
    heading: "איך אנחנו חוקרים",
    intro: "הכללים כאן אינם הצהרת כוונות: הם כתובים בקוד, ותיק שאינו עומד בהם אינו יכול להתפרסם.",
    sections: [
      {
        title: "את מי אנחנו חוקרים",
        body: [
          "בעלי תפקידים בכירים בישראל ובעולם: ראשי מדינות וממשלות, שרים, חברי פרלמנט, בכירים במערכות הביטחון והמשפט, דיפלומטים, ראשי מפלגות וארגונים. רק בפעולתם הציבורית. איננו חוקרים אנשים פרטיים.",
        ],
      },
      {
        title: "דרישות ראיה",
        body: [
          "״הורשע״ דורש פסק דין. ״כתב אישום״ דורש את כתב האישום או הודעת הפרקליטות. ״בחקירה״ דורש הודעה רשמית של המשטרה, הפרקליטות או מבקר המדינה.",
          "״טענה״ דורשת לפחות שני מקורות בלתי תלויים, ומוצגת תמיד כטענה בלבד.",
          "טענות על מימון זר נשענות על הדיווח הרשמי עצמו. טענות על הצבעה או התבטאות נשענות על הרשומה או ההקלטה המקורית.",
        ],
      },
      { title: "שני עורכים, תמיד", body: ["כל תיק נכתב בידי עורך אחד ומאושר בידי עורך אחר. מי שכתב אינו מאשר."] },
      {
        title: "זכות תגובה ותיקונים",
        body: [
          "לפני פרסום אנו פונים למושא התחקיר. תגובה שהתקבלה מתפרסמת לצד התיק.",
          "כשמשהו משתנה (זיכוי, סגירת תיק, טעות) אנו מעדכנים ורושמים את התיקון בפומבי. תיק שנמשך נשאר באתר עם הודעת משיכה והסבר.",
        ],
      },
    ],
  },
  footer: {
    about: "אמת מציון היא מערכת תחקירים עצמאית המבוססת על מקורות ציבוריים ומסמכים רשמיים.",
    legal: "כל אדם בחזקת חף מפשע עד שהורשע בדין.",
  },
  langSwitch: "English",
};

const en: Dict = {
  siteName: "Truth of Zion",
  tagline: "Independent, source-based investigations",
  demo: "Demo mode: every name, role and case on this site is fictional.",
  nav: { investigations: "Investigations", people: "People", countries: "Countries", methodology: "Methodology", corrections: "Corrections", reply: "Right of reply" },
  home: {
    eyebrow: "Independent, source-based investigations",
    heading: "Shining light on those who act against Israel",
    intro:
      "We investigate people in top roles in Israel and around the world: corruption, foreign funding and influence, incitement, and the gap between what they promised and what they did. Every claim is backed by a document, and every case shows its exact legal status.",
    ctaPrimary: "Investigations",
    ctaSecondary: "How we investigate",
    stats: { cases: "Cases", people: "People & bodies", countries: "Countries", sources: "Documented sources" },
    latest: "Latest investigations",
    viewAll: "All investigations",
    topRoles: "Top roles under scrutiny",
    allPeople: "All people",
    byCountry: "By country",
    byArea: "Areas of investigation",
    how: {
      title: "How we investigate",
      steps: [
        { title: "Monitor", body: "Continuous tracking of court rulings, indictments, State Comptroller reports, parliamentary votes and foreign-funding filings." },
        { title: "Verify", body: "Every quote is checked against its source and archived. What can't be verified isn't published." },
        { title: "Right of reply", body: "Before publication we contact the subject and publish their response in full." },
        { title: "Second editor", body: "Every case is approved by a second editor who didn't write it." },
      ],
    },
    empty: "The first investigations are on their way.",
    emptyDetail: "A case is published only after its sources are verified, the subject is asked to respond, and a second editor approves.",
  },
  cases: (n) => (n === 1 ? "1 case" : `${n} cases`),
  investigations: { heading: "Investigations", intro: "Every published case, with its legal status and sources." },
  people: { heading: "People & bodies", intro: "Office holders and bodies we have investigated, ordered by seniority.", search: "Search a name or role", allCountries: "All countries", none: "No people found." },
  countries: { heading: "Countries", intro: "Investigations by the country where the subject holds office.", people: "People", cases: "Cases", none: "No investigations yet." },
  positions: {
    head_of_state: "Head of state",
    head_of_government: "Head of government",
    minister: "Minister",
    security: "Security establishment",
    judiciary: "Judiciary",
    legislator: "Legislator",
    party_leader: "Party leader",
    diplomat: "Diplomat",
    senior_official: "Senior official",
    org_leader: "Organization",
  },
  filters: { all: "All", category: "Area", status: "Status", country: "Country", search: "Search a name or topic", none: "No cases match these filters." },
  categories: {
    corruption: { name: "Corruption", blurb: "Bribery, fraud and breach of trust by office holders." },
    foreign_influence: { name: "Foreign influence & funding", blurb: "Bodies and campaigns funded or directed from abroad, per official filings." },
    public_record: { name: "Votes & public record", blurb: "How they voted and what they said, against what they promised." },
    incitement: { name: "Incitement & hostile acts", blurb: "Documented statements and acts against Israel and its citizens." },
  },
  statuses: {
    convicted: { name: "Convicted", note: "Convicted by a court." },
    indicted: { name: "Indicted", note: "Presumed innocent until a verdict." },
    under_investigation: { name: "Under investigation", note: "No charges filed. An investigation is not a finding of guilt." },
    allegation: { name: "Allegation", note: "Reported by at least two independent sources. Not proven." },
    documented: { name: "Public record", note: "A fact documented in an official record or original recording." },
  },
  progress: { label: "Legal status", publicRecord: "Documented in the public record" },
  entry: {
    caseFile: "Case",
    summary: "Summary",
    details: "Details",
    timeline: "Timeline",
    sources: "Sources",
    archived: "Archived copy",
    response: "Subject's response",
    responseStatus: {
      requested: "We asked for a response and are waiting for a reply.",
      responded: "Response received",
      declined: "Declined to comment.",
      no_response: "No response by the time of publication.",
    },
    requestedOn: "Asked on ",
    corrections: "Corrections",
    noCorrections: "No corrections to this case.",
    retracted: "This case was retracted",
    published: "Published",
    updated: "Updated",
    profile: "Full dossier",
    subject: "Subject",
    facts: "Case facts",
    category: "Area",
    date: "Date of events",
    sourcesCount: "Sources",
    reviewedBy: "Checked by two editors",
    reportError: "Spotted an error? Tell us",
    related: "Other cases",
  },
  profile: { dossier: "Dossier", cases: "Cases", links: "Official links", highest: "Most serious status" },
  sourceTypes: {
    court_ruling: "Court ruling",
    indictment: "Indictment",
    prosecution_statement: "Prosecution statement",
    police_statement: "Police statement",
    state_comptroller: "State Comptroller report",
    knesset_record: "Parliamentary record",
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
      "If you believe a case is wrong, incomplete or out of date (an acquittal, a closed investigation, a dropped indictment), send us the details and sources. Every correction is logged publicly on the corrections page.",
    ],
    contact: "Contact:",
  },
  methodology: {
    heading: "How we investigate",
    intro: "These rules aren't a statement of intent: they are written in code, and a case that fails them cannot be published.",
    sections: [
      {
        title: "Who we investigate",
        body: [
          "People in top roles in Israel and around the world: heads of state and government, ministers, legislators, senior security and judicial officials, diplomats, party and organization leaders. Only in their public role. We do not investigate private individuals.",
        ],
      },
      {
        title: "Evidence requirements",
        body: [
          "“Convicted” requires a court ruling. “Indicted” requires the indictment or a prosecution announcement. “Under investigation” requires an official police, prosecution or State Comptroller statement.",
          "“Allegation” requires at least two independent sources and is always shown as an allegation only.",
          "Foreign-funding claims rest on the official filing itself. Claims about votes or statements rest on the record or original recording.",
        ],
      },
      { title: "Two editors, always", body: ["Every case is written by one editor and approved by a different one. Authors never approve their own work."] },
      {
        title: "Right of reply & corrections",
        body: [
          "Before publication we contact the subject. Any response received is published alongside the case.",
          "When something changes (an acquittal, a closed case, an error) we update and log the correction publicly. A retracted case stays up with a retraction notice and the reason.",
        ],
      },
    ],
  },
  footer: {
    about: "Truth of Zion is an independent investigations project built on public sources and official documents.",
    legal: "Everyone is presumed innocent until convicted by a court.",
  },
  langSwitch: "עברית",
};

export const DICTIONARIES: Record<Locale, Dict> = { he, en };
export const getDict = (l: Locale) => DICTIONARIES[l];
