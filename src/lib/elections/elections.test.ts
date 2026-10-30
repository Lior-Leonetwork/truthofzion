import { describe, expect, it } from "vitest";
import { analyze, type Box } from "./integrity";

// Fictional towns and lists.
const box = (o: Partial<Box> & { box: string }): Box => {
  const votes = o.votes ?? { א: 200, ב: 150, ג: 100 };
  const valid = Object.values(votes).reduce((s, n) => s + n, 0);
  return { cityCode: "1", city: "עיר לדוגמה", registered: 700, voters: valid + 5, invalid: 5, valid, votes, ...o };
};
const town = (extra: Box[] = []) => [box({ box: "1" }), box({ box: "2" }), box({ box: "3" }), box({ box: "4" }), ...extra];
const kinds = (r: ReturnType<typeof analyze>, b: string) => r.flagged.find((f) => f.box === b)?.flags.map((f) => f.kind) ?? [];

describe("ballot-box integrity checks", () => {
  it("flags nothing in an ordinary town", () => {
    expect(analyze(town()).flagged).toEqual([]);
  });

  it("flags more voters than registered, and totals that don't add up", () => {
    const r = analyze(town([box({ box: "5", registered: 400, voters: 460, invalid: 5, votes: { א: 455 } }), box({ box: "6", invalid: 9 })]));
    expect(kinds(r, "5")).toContain("over_registered");
    expect(kinds(r, "6")).toContain("totals_mismatch");
  });

  it("flags a box far out of line with the rest of its town, for any list alike", () => {
    const r = analyze(town([box({ box: "5", votes: { א: 10, ב: 5, ג: 440 } }), box({ box: "6", votes: { א: 440, ב: 5, ג: 10 } })]));
    const listFlag = (b: string) => r.flagged.find((f) => f.box === b)?.flags.find((f) => f.kind === "list_outlier")?.detail.list;
    expect(listFlag("5")).toBe("ג");
    expect(listFlag("6")).toBe("א"); // same rule, whichever list it is
    expect(kinds(r, "1")).toEqual([]);
  });

  it("doesn't flag a town that votes as a bloc, only boxes that differ from it", () => {
    const bloc = ["1", "2", "3", "4", "5"].map((b) => box({ box: b, cityCode: "2", votes: { ד: 480, א: 5 } }));
    expect(analyze(bloc).flagged).toEqual([]);
  });

  it("flags extreme turnout, turnout far above the town, and jumps from the previous election", () => {
    const hi = box({ box: "5", registered: 460, votes: { א: 200, ב: 150, ג: 100 } }); // 455/460 voted
    const r = analyze(town([hi]), [box({ box: "5", registered: 470, voters: 200, valid: 195, votes: { א: 195 } })]);
    expect(kinds(r, "5")).toEqual(expect.arrayContaining(["high_turnout", "turnout_outlier", "turnout_jump"]));
  });

  it("compares with the previous election only when it's plausibly the same box", () => {
    const r = analyze(town(), [box({ box: "1", registered: 2000, voters: 300 })]);
    expect(kinds(r, "1")).not.toContain("turnout_jump");
  });

  it("lists towns whose counts' last digits are far from uniform", () => {
    const honest = Array.from({ length: 60 }, (_, i) => box({ box: String(i), cityCode: "3", votes: { א: 100 + i, ב: 57 + ((i * 7) % 10), ג: 31 + ((i * 3) % 10), ד: 19 + ((i * 9) % 10) } }));
    const rounded = Array.from({ length: 60 }, (_, i) => box({ box: String(i), cityCode: "4", city: "עיר אחרת", votes: { א: 100 + i * 10, ב: 50, ג: 30, ד: 20 } }));
    const r = analyze([...honest, ...rounded]);
    expect(r.digits.map((d) => d.cityCode)).toEqual(["4"]);
  });
});

describe("official ballot-box files", async () => {
  const { boxesFrom, decodeCsv, parseCsv } = await import("./parse");
  // Fictional rows in the committee's column layout.
  const csv = 'סמל ועדה,ברזל,שם ישוב,סמל ישוב,קלפי,ריכוז,שופט,בזב,מצביעים,פסולים,כשרים,אמת,"מחל"\r\n18,1,"עיר ""לדוגמה""",967,3.1,1,0,570,173,4,169,100,69\r\n,,,,,,,,,,,,\r\n';

  it("parses the committee's columns, keeps ballot letters as lists, skips blank lines", () => {
    const boxes = boxesFrom(parseCsv(csv));
    expect(boxes).toEqual([{ cityCode: "967", city: 'עיר "לדוגמה"', box: "3.1", registered: 570, voters: 173, invalid: 4, valid: 169, votes: { אמת: 100, מחל: 69 } }]);
  });

  it("reads Windows-1255 files as well as UTF-8", () => {
    const hebrew = new Uint8Array([0xf9, 0xec, 0xe5, 0xed]); // "שלום" in Windows-1255
    expect(decodeCsv(hebrew)).toBe("שלום");
    expect(decodeCsv(new TextEncoder().encode("﻿שלום"))).toBe("שלום");
  });
});
