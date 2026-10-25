import { normalize } from "./verify";

// Words shared between the vote's agenda title and the bill's name. Used to
// refuse a bill lookup that returned a different bill than the one voted on.
export function nameOverlap(a: string, b: string) {
  const words = (s: string) => new Set(normalize(s).replace(/[^\p{L}\p{N} ]/gu, " ").split(" ").filter((w) => w.length > 1));
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wb) if (wa.has(w)) shared++;
  return shared / wb.size;
}

export function billUrl(id: number) {
  return `https://main.knesset.gov.il/Activity/Legislation/Laws/Pages/LawBill.aspx?t=lawsuggestionssearch&lawitemid=${id}`;
}
