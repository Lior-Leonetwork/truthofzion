// Prints the fields and sample rows of the Elections Committee's official
// per-ballot-box and per-locality results on data.gov.il (25th Knesset).
import { fetch as undiciFetch } from "undici";
const API = "https://data.gov.il/api/3/action";
async function main() {
for (const [label, id] of [
  ["K25 by ballot box", "cc223336-07bc-485d-b160-62df92967c0a"],
  ["K25 by locality", "b392b8ee-ba45-4ea0-bfed-f03a1a36e99c"],
  ["K24 candidate lists", "0f07d5bf-5b8d-4c28-bf37-e69459ddb4ed"],
]) {
  const res = await undiciFetch(`${API}/datastore_search?${new URLSearchParams({ resource_id: id, limit: "3" })}`, { signal: AbortSignal.timeout(60000) });
  const j = (await res.json()) as { result: { total: number; fields: { id: string; type: string }[]; records: object[] } };
  console.log(`\n### ${label}: ${j.result.total} rows\nfields: ${j.result.fields.map((f) => `${f.id}:${f.type}`).join(" | ")}`);
  for (const r of j.result.records) console.log(JSON.stringify(r));
}
}
main();
