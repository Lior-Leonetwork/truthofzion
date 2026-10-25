// Searches data.gov.il (CKAN) for the Registrar of Associations' datasets on
// donations from foreign state entities, and prints each match's resources,
// fields and sample rows. Read-only diagnostic for building the pipeline.
//   npm run probe:datagov -- "query one" "query two"
import { fetch as undiciFetch, ProxyAgent } from "undici";

const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const API = "https://data.gov.il/api/3/action";

async function api(action: string, params: Record<string, string>) {
  const url = `${API}/${action}?${new URLSearchParams(params)}`;
  const res = await undiciFetch(url, { dispatcher, headers: { "User-Agent": "truth-of-zion-probe" }, signal: AbortSignal.timeout(60_000) });
  const text = await res.text();
  try {
    return JSON.parse(text) as { success: boolean; result: Record<string, unknown> };
  } catch {
    throw new Error(`${res.status} non-JSON from ${url}: ${text.slice(0, 300).replace(/\s+/g, " ")}`);
  }
}

type Resource = { id: string; name: string; format: string; url: string; datastore_active?: boolean; last_modified?: string; created?: string };
type Pkg = { name: string; title: string; organization?: { title: string }; metadata_modified: string; resources: Resource[]; notes?: string };

async function main() {
  const queries = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["ישות מדינית זרה", "תרומות ישות מדינית זרה", "רשם העמותות", "עמותות תרומות", "foreign state entity"];
  const seen = new Set<string>();
  for (const q of queries) {
    console.log(`\n##### search: ${q}`);
    let found: { count: number; results: Pkg[] };
    try {
      found = (await api("package_search", { q, rows: "10" })).result as unknown as { count: number; results: Pkg[] };
    } catch (e) {
      console.log(`search failed: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    console.log(`${found.count} datasets`);
    for (const p of found.results) {
      console.log(`- ${p.name} | ${p.title} | ${p.organization?.title ?? ""} | modified ${p.metadata_modified.slice(0, 10)}`);
      if (seen.has(p.name)) continue;
      seen.add(p.name);
      if (!/זר|תרומ|עמות|foreign|donat/i.test(`${p.title} ${p.name} ${p.notes ?? ""}`)) continue;
      if (p.notes) console.log(`    notes: ${p.notes.slice(0, 300).replace(/\s+/g, " ")}`);
      for (const r of p.resources) {
        console.log(`    resource ${r.id} | ${r.name} | ${r.format} | datastore=${r.datastore_active} | modified ${(r.last_modified ?? r.created ?? "").slice(0, 10)} | ${r.url}`);
        if (!r.datastore_active) continue;
        try {
          const ds = (await api("datastore_search", { resource_id: r.id, limit: "3" })).result as { total: number; fields: { id: string; type: string }[]; records: Record<string, unknown>[] };
          console.log(`      total rows ${ds.total}; fields: ${ds.fields.map((f) => `${f.id}:${f.type}`).join(", ")}`);
          for (const rec of ds.records) console.log(`      ${JSON.stringify(rec).slice(0, 600)}`);
        } catch (e) {
          console.log(`      datastore_search failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
