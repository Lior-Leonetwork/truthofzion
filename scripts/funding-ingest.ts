// Pulls every donation from a foreign state entity that Israeli NGOs reported
// to the Registrar of Associations (data.gov.il, dataset moj-amutot) into
// data/funding/. Deterministic: no model is involved, and nothing here
// interprets a filing. The NGOs' own reports are published as they were filed.
// Runs daily in GitHub Actions (.github/workflows/funding.yml), through the
// Israeli VPN because data.gov.il only answers Israeli addresses.
//
//   npm run funding:ingest
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { allRows, ckan, DONATIONS_RESOURCE, REGISTRY_RESOURCE } from "../src/lib/funding/ckan";
import { fundingPaths, readNgos, writeNgos } from "../src/lib/funding/store";
import { buildNgos } from "../src/lib/funding/transform";
import { writeJson } from "../src/lib/knesset/store";

const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const get = (url: string) =>
  undiciFetch(url, { dispatcher, headers: { "User-Agent": "truth-of-zion-funding" }, signal: AbortSignal.timeout(120_000) });

const REGISTRY_FIELDS = ["מספר עמותה", "שם עמותה בעברית", "שם עמותה באנגלית", "סטטוס עמותה", "סיווג פעילות ענפי", "כתובת - ישוב", "מטרות עמותה", "מחזור כספי (הכנסות)", "שנת דיווח דוח כספי אחרון"];

async function main() {
  const meta = await ckan<{ last_modified?: string; metadata_modified?: string }>(get, "resource_show", { id: DONATIONS_RESOURCE });
  const donations = await allRows(get, DONATIONS_RESOURCE);
  console.log(`${donations.length} donation reports (source modified ${meta.last_modified ?? meta.metadata_modified ?? "?"})`);
  const registry = await allRows(get, REGISTRY_RESOURCE, { fields: REGISTRY_FIELDS });
  console.log(`${registry.length} registered NGOs`);

  const ngos = buildNgos(donations, registry);
  const reports = ngos.reduce((n, g) => n + g.donations.length, 0);
  const before = readNgos();
  const prevReports = before.reduce((n, g) => n + g.donations.length, 0);
  // The Registrar's file only grows. A big drop means a broken export, not
  // NGOs that stopped being funded; keep what we have and fail loudly.
  if (reports < prevReports * 0.9) throw new Error(`refusing to replace ${prevReports} reports with ${reports}`);

  const p = fundingPaths();
  writeNgos(p.ngos, ngos);
  writeJson(p.state, {
    updatedAt: new Date().toISOString(),
    reports,
    ngos: ngos.length,
    sourceModified: meta.last_modified ?? meta.metadata_modified ?? null,
  });
  const unknown = ngos.flatMap((g) => g.donations).filter((d) => !d.donorCountry).length;
  console.log(`${ngos.length} NGOs, ${reports} reports (${reports - prevReports >= 0 ? "+" : ""}${reports - prevReports}); ${unknown} with no country named in the donor field`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
