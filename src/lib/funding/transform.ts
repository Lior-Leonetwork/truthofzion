import type { Donation, Ngo } from "./schema";

type Row = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const n = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

// The Registrar's export replaces commas and gershayim with "~":
// "עוז ושלום~ החוג" (comma), "(ע~ר)", "ש~ח" (gershayim).
export function untilde(v: unknown) {
  return s(v).replace(/~(?=\s)/g, ",").replace(/~/g, '"').replace(/\s+/g, " ");
}

export function isoFromDmy(v: unknown) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s(v));
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

const QUARTERS: Record<string, number> = { ראשון: 1, שני: 2, שלישי: 3, רביעי: 4 };

// Donor country from the donor's name, only when it names the country (or the
// EU / UN) outright, or is a well-known state agency of one. Anything ambiguous
// stays null rather than guessed: the donor's name is always shown as filed.
const COUNTRIES: [string, RegExp][] = [
  ["EU", /האיחוד האירופ|האחוד האירופ|איחוד אירופ|הקהי?לה האירופ|European Union|\bEU\b|European Commission|הנציבות האירופית|European Research Council|\bERC\b/i],
  ["UN", /האו"ם|United Nations|\bUNDP\b|U\.N\.D\.P|\bUNICEF\b|\bUNHCR\b|\bUNRWA\b|\bUNESCO\b|\bUNFPA\b|\bOCHA\b|UN ?Women|World Health Organization|World Food Programme|\bWFP\b/i],
  ["DE", /גרמני|German|Deutsch|Bundesrepublik|Rosa Luxemb|רוזה לוקסמבורג|Heinrich[- ]B(?:ö|oe?)ll|היינריך[- ]ב[ו]?ל|Friedrich[- ](?:Ebert|Naumann)|קרן (?:פרידריך )?אברט|Hans[- ]B(?:ö|oe)ckler|הנס בוקלר|Stiftung (?:EVZ|Erinnerung)|קרן גרמניה EVZ|\bGIZ\b|Misereor|\bBftW\b|\bZIVIK\b|Bread for the world|Brot für die Welt|קרן הנס זי?ידל|Hanns Seidel|אדנאואר|Adenauer|עיריית מינכן|Munich|München|Caritas ?Verband|Carits Verban|\bKZE\b/i],
  ["NO", /נורבג|נורווג|Norw(?:ay|e[gi])|\bNRC\b/i],
  ["NL", /הולנד|Netherlands|Dutch|Nederland|Oxfam ?Novib|\bICCO\b/i],
  ["GB", /בריט|הממלכה המאוחדת|British|United Kingdom|\bUK\b|\bFCDO\b|Christian Aid/i],
  ["CH", /שוויצ|שווייצ|שוויץ|שווייץ|Swiss|Switzerland|Schweiz|Suisse|\bSDC\b|HEKS/i],
  ["SE", /שוודי|Swed|\bSida\b|Diakonia|דיאקוניה/i],
  ["DK", /דנמרק|Danish|Denmark|Dan ?Church ?Aid|\bCKU\b/i],
  ["FI", /פינלנד|Finland|Finnish/i],
  ["IE", /אירלנד|Ireland|Irish|Tr[oó]caire/i],
  ["FR", /צרפת|France|French|Française|\bAFD\b/i],
  ["BE", /בלגי|Belgi|Broederlijk Delen|\bEnabel\b/i],
  ["ES", /ספרד|Spain|Spanish|España|\bAECID\b/i],
  ["IT", /איטלי|Ital/i],
  ["AT", /אוסטרי(?!ל)|Austria(?!l)|Österreich/i],
  ["LU", /(?<!רוזה )לוקסמבורג|(?<!Rosa )Luxemb/i],
  ["CA", /קנדה|Canad/i],
  ["US", /ארה"ב|ארצות הברית|הסוכנות האמריק\S* לפיתוח|US Disbursing|השגרירות האמריק|USAID|U\.?S\.? ?(?:Government|State|Embassy|Department|A\.?I\.?D)|\bUSA\b|American Emb+as+y|State Department|\bMEPI\b|Near Eastern Affairs|\bDRL\b|United States/i],
  ["AU", /אוסטרליה|Australia/i],
  ["NZ", /ניו זילנד|New Zealand/i],
  ["JP", /יפן|Japan/i],
  ["CZ", /צ'כי|Czech/i],
  ["PL", /פולין|Poland|Polish/i],
  ["HU", /הונגרי|Hungar/i],
  ["KR", /קוריאה|Korea/i],
  ["CY", /קפריסין|Cyprus/i],
  ["GR", /יוון|Greece|Greek/i],
  ["PT", /פורטוגל|Portug/i],
  ["QA", /קטר|קטאר|Qatar/i],
  ["AE", /האמירויות|אמירויות|Emirates|\bUAE\b/i],
  ["SA", /ערב הסעודית|Saudi/i],
  ["TR", /טורקי|Turk/i],
  ["MA", /מרוקו|Morocc/i],
  ["JO", /ממלכת ירדן|ירדני|Jordan/i],
  ["PS", /הרשות הפלסטינית|Palestinian Authority/i],
  ["OM", /עומאן|Oman\b/i],
  ["BA", /סרפסקה|Srpska|בוסניה|Bosnia/i],
];

export function donorCountry(donor: string, donorType = "") {
  const hits = COUNTRIES.filter(([, re]) => re.test(donor)).map(([code]) => code);
  if (hits.length === 1) return hits[0];
  if (hits.length === 0 && /הרשות הפלסטינית/.test(donorType)) return "PS"; // as the NGO classified it
  return null; // two matches = ambiguous
}

export function donationFrom(r: Row): { number: string; name: string; donation: Donation } | null {
  const number = s(r["מספר עמותה"]).replace(/\.0+$/, "");
  const year = n(r["שנת תרומה"]);
  const amount = n(r["סכום התרומה בש~ח"]);
  if (!number || year === null || amount === null) return null;
  const donor = untilde(r["ישות מדינית זרה תורמת"]);
  const donorType = untilde(r["סוג ישות מדינית זרה תורמת (קוד)"]);
  return {
    number,
    name: untilde(r["שם עמותה"]),
    donation: {
      reportDate: isoFromDmy(r["תאריך דיווח התרומה"]),
      donor,
      donorType,
      donorCountry: donorCountry(donor, donorType),
      amountNis: amount,
      currency: untilde(r["מטבע"]),
      rate: n(r["שער המרה"]),
      purpose: untilde(r["מטרת תרומה"]),
      conditions: untilde(r["התנאים לתרומה"]),
      year: Math.trunc(year),
      quarter: QUARTERS[s(r["רבעון תרומה"])] ?? null,
      mainlyForeignFunded: s(r["עיקר מימון תרומות מישות מדינית זרה"]) === "כן",
    },
  };
}

export function buildNgos(donationRows: Row[], registryRows: Row[]): Ngo[] {
  const registry = new Map(registryRows.map((r) => [s(r["מספר עמותה"]).replace(/\.0+$/, ""), r]));
  const byNgo = new Map<string, Ngo>();
  for (const row of donationRows) {
    const d = donationFrom(row);
    if (!d) continue;
    let ngo = byNgo.get(d.number);
    if (!ngo) {
      const reg = registry.get(d.number);
      ngo = {
        number: d.number,
        name: reg ? untilde(reg["שם עמותה בעברית"]) || d.name : d.name,
        nameEn: reg ? untilde(reg["שם עמותה באנגלית"]) : "",
        status: reg ? untilde(reg["סטטוס עמותה"]) : "",
        sector: reg ? untilde(reg["סיווג פעילות ענפי"]) : "",
        city: reg ? untilde(reg["כתובת - ישוב"]) : "",
        goals: reg ? untilde(reg["מטרות עמותה"]) : "",
        turnover: reg ? n(reg["מחזור כספי (הכנסות)"]) : null,
        turnoverYear: reg ? n(reg["שנת דיווח דוח כספי אחרון"]) : null,
        donations: [],
      };
      byNgo.set(d.number, ngo);
    }
    ngo.donations.push(d.donation);
  }
  for (const ngo of byNgo.values()) {
    ngo.donations.sort((a, b) => b.year - a.year || (b.quarter ?? 0) - (a.quarter ?? 0) || b.amountNis - a.amountNis);
  }
  return [...byNgo.values()].sort((a, b) => a.number.localeCompare(b.number));
}

export function totals(ngo: Ngo) {
  const byYear = new Map<number, number>();
  for (const d of ngo.donations) byYear.set(d.year, (byYear.get(d.year) ?? 0) + d.amountNis);
  const mainlyYears = [...new Set(ngo.donations.filter((d) => d.mainlyForeignFunded).map((d) => d.year))].sort();
  const donors = new Map<string, number>();
  for (const d of ngo.donations) donors.set(d.donor, (donors.get(d.donor) ?? 0) + d.amountNis);
  return {
    total: ngo.donations.reduce((t, d) => t + d.amountNis, 0),
    byYear: [...byYear.entries()].sort((a, b) => a[0] - b[0]),
    mainlyYears,
    topDonors: [...donors.entries()].sort((a, b) => b[1] - a[1]),
    firstYear: Math.min(...ngo.donations.map((d) => d.year)),
    lastYear: Math.max(...ngo.donations.map((d) => d.year)),
    latestReport: ngo.donations.map((d) => d.reportDate).filter(Boolean).sort().pop() ?? null,
  };
}
