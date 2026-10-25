import type { Category, Localized, Position, Status } from "./content/schema";
import type { Spectrum } from "./knesset/schema";

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
  nav: { investigations: string; people: string; countries: string; knesset: string; funding: string; methodology: string; corrections: string; reply: string };
  knesset: {
    heading: string;
    intro: string;
    stats: { votes: string; keyVotes: string; members: string; updated: string };
    passed: string;
    rejected: string;
    choices: { for: string; against: string; abstain: string; other: string };
    keyVote: string;
    keyVotes: string;
    allVotes: string;
    search: string;
    topic: string;
    aiSummary: string;
    aiSummaryAuto: string;
    noSummary: string;
    fromBill: string;
    official: string;
    billText: string;
    countedNote: string;
    roll: string;
    byFaction: string;
    editorNote: string;
    empty: string;
    emptyDetail: string;
    none: string;
    latest: string;
    member: { record: string; faction: string; votes: string; profile: string };
    howTitle: string;
    how: string[];
  };
  funding: {
    heading: string;
    intro: string;
    stats: { ngos: string; recent: (from: number) => string; total: (from: number) => string; updated: string };
    search: string;
    years: string;
    recentYears: (from: number) => string;
    allYears: string;
    donor: string;
    otherDonor: string;
    mainly: string;
    mainlyOnly: string;
    mainlyBadge: string;
    none: string;
    empty: string;
    emptyDetail: string;
    sortTotal: string;
    showMore: string;
    ngo: string;
    official: string;
    sourceNote: string;
    notAccusation: string;
    registry: { status: string; sector: string; city: string; goals: string; number: string };
    total: string;
    reports: (n: number) => string;
    byYear: string;
    byDonor: string;
    allReports: string;
    cols: { year: string; donor: string; amount: string; purpose: string; conditions: string; reported: string; country: string; count: string };
    quarter: (q: number) => string;
    mainlyDeclared: (years: string) => string;
    share: (pct: string, year: number, turnover: string) => string;
    countryHeading: string;
    countryIntro: (country: string) => string;
    recipients: string;
    donorCountries: string;
    toNgos: (n: number) => string;
    investigationsHeading: string;
    investigationsIntro: string;
    allFunding: string;
    homeTitle: string;
  };
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
  people: { heading: string; intro: string; search: string; allCountries: string; none: string; orientation: string; memberRole: string };
  spectrum: Record<Spectrum, string>;
  sector: Record<"haredi" | "arab" | "religious_zionist", string>;
  record: {
    title: string;
    summary: (aligned: number, total: number) => string;
    none: string;
    sitePosition: string;
    theirVote: string;
    withSite: string;
    againstSite: string;
    noVote: string;
    why: string;
    byCamp: string;
    classificationNote: string;
  };
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
  nav: { investigations: "תחקירים", people: "אישים", countries: "מדינות", knesset: "הצבעות בכנסת", funding: "מימון זר", methodology: "מתודולוגיה", corrections: "תיקונים", reply: "זכות תגובה" },
  knesset: {
    heading: "הצבעות בכנסת",
    intro: "כל הצבעה על חוק בקריאה שלישית, ישירות מהנתונים הרשמיים של הכנסת: מי הצביע בעד, מי נגד ומי נמנע.",
    stats: { votes: "הצבעות", keyVotes: "הצבעות מפתח", members: "חברי כנסת", updated: "עודכן" },
    passed: "התקבל",
    rejected: "נדחה",
    choices: { for: "בעד", against: "נגד", abstain: "נמנע", other: "לא הצביע" },
    keyVote: "הצבעת מפתח",
    keyVotes: "הצבעות מפתח",
    allVotes: "כל ההצבעות",
    search: "חיפוש חוק או חבר כנסת",
    topic: "נושא",
    aiSummary: "תקציר שנוסח בסיוע בינה מלאכותית מתוך דברי ההסבר הרשמיים, ונבדק בידי עורך",
    aiSummaryAuto: "תקציר שנכתב בידי בינה מלאכותית מתוך דברי ההסבר הרשמיים בלבד ופורסם אוטומטית, ללא בדיקת עורך. הציטוטים נבדקו מילה במילה מול המקור.",
    noSummary: "עדיין אין תקציר מאושר להצבעה זו. מוצגת הכותרת הרשמית בלבד.",
    fromBill: "מתוך דברי ההסבר",
    official: "הרשומה הרשמית בנתונים הפתוחים של הכנסת",
    billText: "הצעת החוק באתר הכנסת",
    countedNote: "הסיכומים נספרו מהצבעות חברי הכנסת כפי שפורסמו בנתונים הפתוחים של הכנסת.",
    roll: "איך הצביע כל חבר כנסת",
    byFaction: "לפי סיעה",
    editorNote: "הערת העורך",
    empty: "נתוני ההצבעות הראשונים ייאספו בריצה היומית הבאה.",
    emptyDetail: "ההצבעות נשאבות אוטומטית מהממשק הרשמי של הכנסת מדי יום.",
    none: "אין הצבעות שתואמות לסינון.",
    latest: "מהכנסת",
    member: { record: "רשומת הצבעות", faction: "סיעה", votes: "הצבעות בקריאה שלישית", profile: "רשומת ההצבעות בכנסת" },
    howTitle: "מאיפה הנתונים",
    how: [
      "תוצאות ההצבעות נשאבות מדי יום מהממשק הפתוח הרשמי של הכנסת ומתפרסמות כפי שהן, ללא עיבוד או פרשנות.",
      "הצבעה שבה רישום חבר כנסת סותר את עצמו, או שעדיין לא פורסמו בה תוצאות, מעוכבת ואינה מתפרסמת.",
      "תקצירים נכתבים בסיוע בינה מלאכותית רק מתוך דברי ההסבר הרשמיים, כל ציטוט נבדק מילה במילה מול המקור, ושום תקציר אינו מתפרסם לפני שעורך אישר אותו.",
      "״הצבעת מפתח״ היא החלטה של עורך, עם הסבר, ולא של המערכת.",
    ],
  },
  funding: {
    heading: "מימון ממדינות זרות",
    intro: "כל תרומה מ״ישות מדינית זרה״ שעמותה בישראל דיווחה עליה לרשם העמותות, כפי שדווחה. הנתונים נמשכים מדי יום מהמאגר הרשמי של משרד המשפטים.",
    stats: { ngos: "עמותות מדווחות", recent: (from) => `התקבל מאז ${from}`, total: (from) => `סך הכול מאז ${from}`, updated: "עודכן" },
    search: "חיפוש עמותה או תורם",
    years: "שנים",
    recentYears: (from) => `מ-${from} ואילך`,
    allYears: "כל השנים",
    donor: "מדינה תורמת",
    otherDonor: "גוף זר אחר",
    mainly: "הצהרת העמותה",
    mainlyOnly: "עיקר המימון ממדינות זרות",
    mainlyBadge: "לפי דיווחה: עיקר מימונה ממדינות זרות",
    none: "אין עמותות שתואמות לסינון.",
    empty: "הנתונים הראשונים בדרך.",
    emptyDetail: "המאגר הרשמי נמשך דרך שרת בישראל, ויופיע כאן לאחר הריצה הראשונה.",
    sortTotal: "מסודר לפי הסכום בתקופה שנבחרה",
    showMore: "הצג עוד",
    ngo: "עמותה",
    official: "הדיווח הרשמי ברשם העמותות",
    sourceNote: "מקור: דיווחי העמותות לרשם העמותות על תרומות מישות מדינית זרה (מאגר משרד המשפטים ב-data.gov.il). הסכומים בשקלים כפי שדווחו.",
    notAccusation: "קבלת תרומה ממדינה זרה חוקית, והדיווח עליה הוא חובה לפי החוק. אנו מפרסמים את הדיווחים כדי שהציבור יידע מי מממן את מי. הרשימה כשלעצמה אינה טענה נגד העמותה.",
    registry: { status: "סטטוס", sector: "תחום פעילות", city: "יישוב", goals: "מטרות העמותה", number: "מספר עמותה" },
    total: "סך התרומות שדווחו",
    reports: (n) => (n === 1 ? "דיווח אחד" : `${n.toLocaleString("he-IL")} דיווחים`),
    byYear: "לפי שנה",
    byDonor: "לפי תורם",
    allReports: "כל הדיווחים",
    cols: { year: "שנה", donor: "תורם", amount: "סכום", purpose: "מטרת התרומה", conditions: "תנאים", reported: "דווח", country: "מדינה", count: "דיווחים" },
    quarter: (q) => `רבעון ${q}`,
    mainlyDeclared: (years) => `בדיווחיה לשנים ${years} הצהירה העמותה כי עיקר מימונה מתרומות של ישויות מדיניות זרות.`,
    share: (pct, year, turnover) => `התרומות שדווחו לשנת ${year} שוות ל-${pct} מהכנסות העמותה באותה שנה (${turnover}, לפי הדוח הכספי האחרון ברשם).`,
    countryHeading: "מימון לעמותות בישראל",
    countryIntro: (country) => `תרומות שהתורם בהן מזוהה עם ${country}, לפי דיווחי העמותות לרשם העמותות.`,
    recipients: "העמותות המקבלות",
    donorCountries: "המדינות התורמות",
    toNgos: (n) => (n === 1 ? "לעמותה אחת" : `ל-${n} עמותות`),
    investigationsHeading: "מהרשומה הרשמית: עמותות שעיקר מימונן ממדינות זרות",
    investigationsIntro: "עמותות שהצהירו בעצמן, בדיווח לרשם העמותות, כי עיקר מימונן מגיע מישויות מדיניות זרות. מתעדכן אוטומטית מהמאגר הרשמי.",
    allFunding: "לכל נתוני המימון הזר",
    homeTitle: "מי מממן את מי: מדינות זרות ועמותות בישראל",
  },
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
  people: {
    heading: "אישים וגופים",
    intro: "בעלי תפקידים בכירים וגופים שנחקרו, וכל חברי הכנסת עם רשומת ההצבעות שלהם.",
    search: "חיפוש שם, תפקיד או סיעה",
    allCountries: "כל המדינות",
    none: "לא נמצאו אישים.",
    orientation: "מחנה",
    memberRole: "חבר/ת כנסת",
  },
  spectrum: {
    far_right: "ימין קיצוני",
    right: "ימין",
    center_right: "מרכז-ימין",
    center: "מרכז",
    center_left: "מרכז-שמאל",
    left: "שמאל",
    far_left: "שמאל קיצוני",
    unclassified: "ללא סיווג",
  },
  sector: { haredi: "חרדי", arab: "ערבי", religious_zionist: "ציוני-דתי" },
  record: {
    title: "הצבעות מפתח",
    summary: (a, t) => `הצביע/ה בהתאם לעמדת האתר ב־${a} מתוך ${t} הצבעות מפתח`,
    none: "אין עדיין הצבעות מפתח עם עמדה של האתר שבהן השתתף/ה.",
    sitePosition: "עמדת האתר",
    theirVote: "הצבעה",
    withSite: "בהתאם לעמדת האתר",
    againstSite: "נגד עמדת האתר",
    noVote: "לא הצביע/ה בעד או נגד",
    why: "למה",
    byCamp: "לפי מחנה פוליטי",
    classificationNote: "סיווג הסיעות על הרצף הפוליטי ועמדת האתר בהצבעות המפתח הם החלטות מערכת, מנומקות ושקופות. ההצבעות עצמן הן נתונים רשמיים של הכנסת.",
  },
  countries: { heading: "מדינות", intro: "תחקירים לפי המדינה שבה מכהן מושא התחקיר, ומדינות זרות שמממנות עמותות בישראל לפי הדיווחים הרשמיים.", people: "אישים", cases: "תיקים", none: "אין עדיין תחקירים." },
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
        title: "ימין, שמאל והצבעות מפתח",
        body: [
          "כל סיעה בכנסת מסווגת על הרצף הפוליטי (ימין קיצוני, ימין, מרכז, מרכז-שמאל, שמאל) לפי המקובל בתקשורת הישראלית. זו החלטת מערכת, והיא מוצגת ככזו.",
          "בהצבעות שהמערכת מגדירה כהצבעות מפתח, האתר קובע עמדה (בעד או נגד) ומפרסם את הנימוק. בעמוד של כל חבר כנסת מוצג כיצד הצביע בכל אחת מהן, לצד הנימוק. איננו מדביקים לאנשים תוויות: הרשומה מדברת בעד עצמה.",
        ],
      },
      {
        title: "מימון ממדינות זרות",
        body: [
          "עמותות בישראל חייבות לדווח לרשם העמותות על כל תרומה מ״ישות מדינית זרה״. אנו מושכים את הדיווחים מדי יום מהמאגר הרשמי של משרד המשפטים ומפרסמים אותם כפי שהוגשו, ללא עריכה וללא פרשנות של מודל.",
          "המדינה התורמת מזוהה רק כששם התורם בדיווח נוקב בה במפורש. כל השאר מוצג כ״גוף זר אחר״. ההצהרה שעיקר המימון מגיע ממדינות זרות היא של העמותה עצמה, בדיווחה.",
          "קבלת תרומה כזו חוקית. עמותה שמופיעה ברשימה לא הואשמה בדבר: אנו מציגים מי מממן את מי, והקורא שופט.",
        ],
      },
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
  nav: { investigations: "Investigations", people: "People", countries: "Countries", knesset: "Knesset votes", funding: "Foreign funding", methodology: "Methodology", corrections: "Corrections", reply: "Right of reply" },
  knesset: {
    heading: "Knesset votes",
    intro: "Every final-reading vote on a law, straight from the Knesset's official data: who voted for, who voted against, who abstained.",
    stats: { votes: "Votes", keyVotes: "Key votes", members: "Members", updated: "Updated" },
    passed: "Passed",
    rejected: "Rejected",
    choices: { for: "For", against: "Against", abstain: "Abstain", other: "Did not vote" },
    keyVote: "Key vote",
    keyVotes: "Key votes",
    allVotes: "All votes",
    search: "Search a bill or member",
    topic: "Topic",
    aiSummary: "Summary drafted with AI from the official explanatory notes, checked by an editor",
    aiSummaryAuto: "Summary written by AI from the official explanatory notes only and published automatically, without an editor's review. Quotes were checked word for word against the source.",
    noSummary: "No approved summary for this vote yet. Showing the official title only.",
    fromBill: "From the explanatory notes",
    official: "Official record in the Knesset's open data",
    billText: "The bill on the Knesset website",
    countedNote: "Totals are counted from each member's vote as published in the Knesset's open data.",
    roll: "How each member voted",
    byFaction: "By faction",
    editorNote: "Editor's note",
    empty: "The first vote data will be collected on the next daily run.",
    emptyDetail: "Votes are pulled automatically from the Knesset's official open-data service every day.",
    none: "No votes match these filters.",
    latest: "From the Knesset",
    member: { record: "Voting record", faction: "Faction", votes: "Final-reading votes", profile: "Knesset voting record" },
    howTitle: "Where this data comes from",
    how: [
      "Vote results are pulled daily from the Knesset's official open-data service and published as recorded, without interpretation.",
      "A vote with contradictory member records, or with no member results published yet, is held back, not published.",
      "Summaries are drafted with AI from the official explanatory notes only, every quote is checked word for word against the source, and no summary is published before an editor approves it.",
      "A \"key vote\" is an editor's decision, with a stated reason, never the system's.",
    ],
  },
  funding: {
    heading: "Funding from foreign states",
    intro: "Every donation from a \"foreign state entity\" that an Israeli NGO reported to the Registrar of Associations, as reported. Pulled daily from the Ministry of Justice's official register.",
    stats: { ngos: "Reporting NGOs", recent: (from) => `Received since ${from}`, total: (from) => `Total since ${from}`, updated: "Updated" },
    search: "Search an NGO or donor",
    years: "Years",
    recentYears: (from) => `${from} onward`,
    allYears: "All years",
    donor: "Donor country",
    otherDonor: "Other foreign body",
    mainly: "NGO's declaration",
    mainlyOnly: "Mainly funded by foreign states",
    mainlyBadge: "Self-declared: mainly funded by foreign states",
    none: "No NGOs match these filters.",
    empty: "The first data is on its way.",
    emptyDetail: "The official register is read through a server in Israel and will appear here after the first run.",
    sortTotal: "Sorted by the amount in the selected period",
    showMore: "Show more",
    ngo: "NGO",
    official: "The official filing at the Registrar of Associations",
    sourceNote: "Source: NGOs' reports to the Registrar of Associations of donations from foreign state entities (Ministry of Justice register on data.gov.il). Amounts in shekels, as reported.",
    notAccusation: "Taking a donation from a foreign state is legal, and reporting it is required by law. We publish the reports so the public knows who funds whom. Being listed is not, by itself, a claim against the NGO.",
    registry: { status: "Status", sector: "Field", city: "City", goals: "Stated goals", number: "NGO number" },
    total: "Total reported donations",
    reports: (n) => (n === 1 ? "1 report" : `${n.toLocaleString("en-GB")} reports`),
    byYear: "By year",
    byDonor: "By donor",
    allReports: "Every report",
    cols: { year: "Year", donor: "Donor", amount: "Amount", purpose: "Purpose", conditions: "Conditions", reported: "Reported", country: "Country", count: "Reports" },
    quarter: (q) => `Q${q}`,
    mainlyDeclared: (years) => `In its reports for ${years}, the NGO declared that most of its funding comes from donations by foreign state entities.`,
    share: (pct, year, turnover) => `Donations reported for ${year} equal ${pct} of the NGO's revenue that year (${turnover}, per its latest financial report at the Registrar).`,
    countryHeading: "Funding to Israeli NGOs",
    countryIntro: (country) => `Donations whose donor is identified with ${country}, as Israeli NGOs reported them to the Registrar of Associations.`,
    recipients: "Recipient NGOs",
    donorCountries: "Donor countries",
    toNgos: (n) => (n === 1 ? "to 1 NGO" : `to ${n} NGOs`),
    investigationsHeading: "From the official record: NGOs funded mainly by foreign states",
    investigationsIntro: "NGOs that declared themselves, in their reports to the Registrar of Associations, that most of their funding comes from foreign state entities. Updated automatically from the official register.",
    allFunding: "All foreign funding data",
    homeTitle: "Who funds whom: foreign states and Israeli NGOs",
  },
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
  people: {
    heading: "People & bodies",
    intro: "Office holders and bodies we have investigated, and every Knesset member with their voting record.",
    search: "Search a name, role or party",
    allCountries: "All countries",
    none: "No people found.",
    orientation: "Camp",
    memberRole: "Member of Knesset",
  },
  spectrum: {
    far_right: "Far right",
    right: "Right",
    center_right: "Center-right",
    center: "Center",
    center_left: "Center-left",
    left: "Left",
    far_left: "Far left",
    unclassified: "Unclassified",
  },
  sector: { haredi: "Haredi", arab: "Arab", religious_zionist: "Religious Zionist" },
  record: {
    title: "Key votes",
    summary: (a, t) => `Voted with the site's position on ${a} of ${t} key votes`,
    none: "No key votes with a site position that this member took part in yet.",
    sitePosition: "Site's position",
    theirVote: "Their vote",
    withSite: "With the site's position",
    againstSite: "Against the site's position",
    noVote: "Didn't vote for or against",
    why: "Why",
    byCamp: "By political camp",
    classificationNote: "The parties' places on the political spectrum and the site's position on key votes are editorial decisions, stated and reasoned. The votes themselves are the Knesset's official data.",
  },
  countries: { heading: "Countries", intro: "Investigations by the country where the subject holds office, and foreign states that fund Israeli NGOs according to the official filings.", people: "People", cases: "Cases", none: "No investigations yet." },
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
        title: "Right, left and key votes",
        body: [
          "Each Knesset party is placed on the political spectrum (far right, right, center, center-left, left) following common usage in the Israeli press. This is an editorial decision and is shown as one.",
          "On votes the editors designate as key votes, the site takes a position (for or against) and publishes its reason. Each member's page shows how they voted on every one of them, next to that reason. We don't put labels on people: the record speaks for itself.",
        ],
      },
      {
        title: "Funding from foreign states",
        body: [
          "Israeli NGOs must report every donation from a \"foreign state entity\" to the Registrar of Associations. We pull those reports daily from the Ministry of Justice's official register and publish them as filed, unedited and with no model interpreting them.",
          "A donor country is named only when the donor's name in the report names it outright. Everything else is shown as \"other foreign body\". The statement that most funding comes from foreign states is the NGO's own, in its report.",
          "Taking such a donation is legal. An NGO on this list has not been accused of anything: we show who funds whom, and the reader judges.",
        ],
      },
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
