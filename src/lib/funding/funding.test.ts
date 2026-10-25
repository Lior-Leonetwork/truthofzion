import { describe, expect, it } from "vitest";
import { allRows, ckan, NotCkanError } from "./ckan";
import { buildNgos, donationFrom, donorCountry, isoFromDmy, totals, untilde } from "./transform";

const row = (o: Record<string, unknown> = {}) => ({
  "מספר עמותה": 580002053,
  "שם עמותה": "סינמטק תל - אביב (ע~ר)",
  "תאריך דיווח התרומה": "14/01/2019",
  "ישות מדינית זרה תורמת": "שגרירות אוסטריה",
  "סוג ישות מדינית זרה תורמת (קוד)": "אורגן~ רשות או נציגות של מדינה זרה או של איחוד מדינות זרות",
  "סכום התרומה בש~ח": 4350,
  "מטבע": "ש~ח",
  "שער המרה": 1,
  "מטרת תרומה": "פסטיבל",
  "התנאים לתרומה": "",
  "שנת תרומה": 2018,
  "רבעון תרומה": "רביעי",
  "עיקר מימון תרומות מישות מדינית זרה": "לא",
  ...o,
});

describe("Registrar export parsing", () => {
  it("restores the characters the export replaced with ~", () => {
    expect(untilde("סינמטק תל - אביב (ע~ר)")).toBe('סינמטק תל - אביב (ע"ר)');
    expect(untilde("אורגן~ רשות או נציגות")).toBe("אורגן, רשות או נציגות");
    expect(untilde("ש~ח")).toBe('ש"ח');
  });

  it("reads dd/mm/yyyy dates and rejects anything else", () => {
    expect(isoFromDmy("14/01/2019")).toBe("2019-01-14");
    expect(isoFromDmy("1/2/2020 00:00:00")).toBe("2020-02-01");
    expect(isoFromDmy("2019-01-14")).toBeNull();
    expect(isoFromDmy(null)).toBeNull();
  });

  it("names a country only when the donor names exactly one", () => {
    expect(donorCountry("שגרירות אוסטריה")).toBe("AT");
    expect(donorCountry("שגרירות אוסטרליה")).toBe("AU");
    expect(donorCountry("האיחוד האירופי")).toBe("EU");
    expect(donorCountry("Royal Norwegian Embassy")).toBe("NO");
    expect(donorCountry("UNDP")).toBe("UN");
    expect(donorCountry("משרד החוץ השוויצרי")).toBe("CH");
    expect(donorCountry("Rosa Luxemburg Stiftung")).toBe("DE");
    expect(donorCountry("NORWOOD RANDY")).toBeNull();
    expect(donorCountry("ועידת התביעות")).toBeNull();
    expect(donorCountry("Paltel", "הרשות הפלסטינית")).toBe("PS");
    expect(donorCountry("נורבגיה", "הרשות הפלסטינית")).toBe("NO"); // the donor's name wins over the filed type
    expect(donorCountry("שגרירות גרמניה ושגרירות צרפת")).toBeNull();
  });

  it("parses a row and skips rows missing the NGO, year or amount", () => {
    const d = donationFrom(row())!;
    expect(d.number).toBe("580002053");
    expect(d.donation).toMatchObject({ reportDate: "2019-01-14", amountNis: 4350, year: 2018, quarter: 4, donorCountry: "AT", mainlyForeignFunded: false, currency: 'ש"ח' });
    expect(donationFrom(row({ "סכום התרומה בש~ח": null }))).toBeNull();
    expect(donationFrom(row({ "מספר עמותה": "" }))).toBeNull();
    expect(donationFrom(row({ "שנת תרומה": "" }))).toBeNull();
  });

  it("groups by NGO, joins the registry, and totals by year and donor", () => {
    const ngos = buildNgos(
      [
        row(),
        row({ "שנת תרומה": 2020, "סכום התרומה בש~ח": 1000, "ישות מדינית זרה תורמת": "האיחוד האירופי", "עיקר מימון תרומות מישות מדינית זרה": "כן" }),
        row({ "מספר עמותה": 580000001, "שם עמותה": "אחרת" }),
      ],
      [{ "מספר עמותה": "580002053", "שם עמותה בעברית": "סינמטק תל-אביב", "שם עמותה באנגלית": "Tel Aviv Cinematheque", "מחזור כספי (הכנסות)": 900000, "שנת דיווח דוח כספי אחרון": 2023 }],
    );
    expect(ngos.map((n) => n.number)).toEqual(["580000001", "580002053"]);
    const cin = ngos[1];
    expect(cin).toMatchObject({ name: "סינמטק תל-אביב", nameEn: "Tel Aviv Cinematheque", turnover: 900000, turnoverYear: 2023 });
    expect(cin.donations.map((d) => d.year)).toEqual([2020, 2018]); // newest first
    expect(ngos[0]).toMatchObject({ name: "אחרת", nameEn: "", turnover: null });
    const t = totals(cin);
    expect(t).toMatchObject({ total: 5350, mainlyYears: [2020], firstYear: 2018, lastYear: 2020 });
    expect(t.byYear).toEqual([[2018, 4350], [2020, 1000]]);
    expect(t.topDonors[0]).toEqual(["שגרירות אוסטריה", 4350]);
  });
});

describe("data.gov.il client", () => {
  const reply = (status: number, body: string) => async () => ({ status, text: async () => body });

  it("refuses a block page instead of reading it as no data", async () => {
    await expect(ckan(reply(200, "<html>Access denied</html>"), "datastore_search", {})).rejects.toBeInstanceOf(NotCkanError);
  });

  it("pages through a resource until it has every row", async () => {
    const data = Array.from({ length: 7 }, (_, i) => ({ _id: i + 1 }));
    const urls: string[] = [];
    const get = async (url: string) => {
      urls.push(url);
      const q = new URL(url).searchParams;
      const offset = Number(q.get("offset"));
      const records = data.slice(offset, offset + Number(q.get("limit")));
      return { status: 200, text: async () => JSON.stringify({ success: true, result: { total: data.length, records } }) };
    };
    const rows = await allRows(get, "res", { pageSize: 3 });
    expect(rows).toHaveLength(7);
    expect(urls).toHaveLength(3);
  });

  it("fails if the resource stops short of its stated total", async () => {
    const get = async () => ({ status: 200, text: async () => JSON.stringify({ success: true, result: { total: 10, records: [] } }) });
    await expect(allRows(get, "res")).rejects.toThrow(/got 0 of 10/);
  });
});
