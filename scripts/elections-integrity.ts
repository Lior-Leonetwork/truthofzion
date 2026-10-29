// Runs the integrity checks on the Elections Committee's official results by
// ballot box for the 26th Knesset (data/elections/26/raw/expb.csv, downloaded
// from votes26.bechirot.gov.il by an editor), comparing each box with the
// same box in the 25th Knesset (the committee's file on data.gov.il, read
// through the Israeli VPN). Writes data/elections/26/integrity.json and the
// national totals. No model is involved.
//
//   npm run elections:integrity
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { analyze, T } from "../src/lib/elections/integrity";
import { boxesFrom, decodeCsv, parseCsv } from "../src/lib/elections/parse";
import { allRows } from "../src/lib/funding/ckan";
import { writeJson } from "../src/lib/knesset/store";

const DIR = path.join(process.cwd(), "data", "elections", "26");
const K25_BOXES = "cc223336-07bc-485d-b160-62df92967c0a"; // תוצאות האמת של הבחירות לכנסת ה-25 לפי קלפיות
const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const get = (url: string) => undiciFetch(url, { dispatcher, signal: AbortSignal.timeout(120_000) });

async function main() {
  const file = path.join(DIR, "raw", "expb.csv");
  if (!fs.existsSync(file)) {
    console.log(`No ${path.relative(process.cwd(), file)} yet: download it from votes26.bechirot.gov.il and commit it.`);
    return;
  }
  const bytes = fs.readFileSync(file);
  const current = boxesFrom(parseCsv(decodeCsv(bytes)));
  if (current.length < 1000) throw new Error(`only ${current.length} ballot boxes parsed from ${file}; check the file`);
  console.log(`26th Knesset: ${current.length} ballot boxes`);

  let previous: ReturnType<typeof boxesFrom> = [];
  try {
    previous = boxesFrom(await allRows(get, K25_BOXES));
    console.log(`25th Knesset (data.gov.il): ${previous.length} ballot boxes`);
  } catch (e) {
    console.warn(`25th Knesset comparison unavailable (${e instanceof Error ? e.message : e}); running without it`);
  }

  const result = analyze(current, previous);
  const totals = { registered: 0, voters: 0, invalid: 0, valid: 0 };
  const lists: Record<string, number> = {};
  for (const b of current) {
    totals.registered += b.registered;
    totals.voters += b.voters;
    totals.invalid += b.invalid;
    totals.valid += b.valid;
    for (const [l, n] of Object.entries(b.votes)) lists[l] = (lists[l] ?? 0) + n;
  }
  const byKind: Record<string, number> = {};
  for (const f of result.flagged) for (const fl of f.flags) byKind[fl.kind] = (byKind[fl.kind] ?? 0) + 1;

  writeJson(path.join(DIR, "integrity.json"), {
    generatedAt: new Date().toISOString(),
    source: {
      current: { file: "data/elections/26/raw/expb.csv", from: "https://votes26.bechirot.gov.il/", sha256: createHash("sha256").update(bytes).digest("hex") },
      previous: previous.length ? { resource: K25_BOXES, from: "https://data.gov.il/dataset/votes-knesset" } : null,
    },
    thresholds: T,
    boxes: result.boxes,
    compared: previous.length,
    byKind,
    flagged: result.flagged,
    digits: result.digits,
  });
  writeJson(path.join(DIR, "totals.json"), {
    ...totals,
    lists: Object.entries(lists)
      .map(([letters, votes]) => ({ letters, votes, share: totals.valid ? votes / totals.valid : 0 }))
      .sort((a, b) => b.votes - a.votes),
  });
  console.log(`${result.flagged.length} boxes flagged (${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(", ")}); ${result.digits.length} towns fail the last-digit test`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
