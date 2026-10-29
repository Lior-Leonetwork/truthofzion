import type { Box } from "./integrity";

// The Elections Committee's results by ballot box: the same columns in its
// CSV downloads (expb.csv) and on data.gov.il. Meta columns first, then one
// column per list, headed by the list's ballot letters.
const META = new Set(["_id", "סמל ועדה", "ברזל", "שם ישוב", "סמל ישוב", "קלפי", "ריכוז", "שופט", "בזב", "מצביעים", "פסולים", "כשרים", "ת. עדכון", "Unnamed"]);

type Row = Record<string, unknown>;
const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
};

export function listColumns(header: string[]) {
  return header.map((h) => h.trim()).filter((h) => h && !META.has(h) && !/^Unnamed/.test(h));
}

export function boxesFrom(rows: Row[]): Box[] {
  if (rows.length === 0) return [];
  const lists = listColumns(Object.keys(rows[0]));
  const out: Box[] = [];
  for (const r of rows) {
    const registered = num(r["בזב"]);
    const voters = num(r["מצביעים"]);
    if (!Number.isFinite(registered) || !Number.isFinite(voters)) continue; // a totals or blank line
    const votes: Record<string, number> = {};
    for (const l of lists) votes[l] = num(r[l]) || 0;
    out.push({
      cityCode: String(r["סמל ישוב"] ?? "").trim(),
      city: String(r["שם ישוב"] ?? "").trim(),
      box: String(r["קלפי"] ?? "").trim(),
      registered,
      voters,
      invalid: num(r["פסולים"]) || 0,
      valid: num(r["כשרים"]) || 0,
      votes,
    });
  }
  return out;
}

// The committee's CSVs have historically been Windows-1255; newer ones UTF-8.
export function decodeCsv(bytes: Uint8Array) {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return utf8.includes("�") ? new TextDecoder("windows-1255").decode(bytes) : utf8.replace(/^﻿/, "");
}

// Minimal RFC 4180 CSV: quoted fields, doubled quotes, CRLF.
export function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") endField();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else field += c;
  }
  if (field || row.length) endRow();
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim()));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])));
}
