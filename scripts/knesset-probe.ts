// Prints what the Knesset's services actually return, raw, so a run that
// finds nothing can be diagnosed. Read-only; writes nothing.
//   npm run knesset:probe
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { makeFetcher, odataUrl, PARLIAMENT_V4, VOTES_SVC } from "../src/lib/knesset/odata";

const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const get = makeFetcher(((url: string, init: object) => undiciFetch(url, { ...init, dispatcher })) as unknown as typeof fetch, { retries: 1 });

const probes: [string, string][] = [
  ["service document", `${VOTES_SVC}/`],
  ["result types", odataUrl(VOTES_SVC, "vote_result_type", {})],
  ["latest headers (by vote_id)", odataUrl(VOTES_SVC, "View_vote_rslts_hdr_Approved", { $top: "3", $orderby: "vote_id desc" })],
  ["latest headers (by id)", odataUrl(VOTES_SVC, "View_vote_rslts_hdr_Approved", { $top: "3", $orderby: "id desc" })],
  ["Knesset 25 headers", odataUrl(VOTES_SVC, "View_vote_rslts_hdr_Approved", { $top: "3", $filter: "knesset_num eq 25" })],
  ["member votes", odataUrl(VOTES_SVC, "vote_rslts_kmmbr_shadow", { $top: "2" })],
  ["bills (v4)", odataUrl(PARLIAMENT_V4, "KNS_Bill", { $top: "1", $orderby: "Id desc" })],
];

// ParliamentInfo (v4) is the Knesset's current service; Votes.svc stopped in 2021.
// List every vote-related table it has, with fields and two sample rows.
async function probeV4Votes() {
  console.log(`\n=== ParliamentInfo v4: vote-related tables`);
  const res = await get(`${PARLIAMENT_V4}/$metadata?$format=json`);
  console.log(`status ${res.status} · ${res.contentType}`);
  if (res.status !== 200) return console.log(res.text.slice(0, 500));
  const meta = JSON.parse(res.text) as Record<string, Record<string, Record<string, unknown>>>;
  const ns = Object.keys(meta).find((k) => typeof meta[k] === "object" && !k.startsWith("$"))!;
  const tables = Object.entries(meta[ns]).filter(([, v]) => v.$Kind === "EntityType");
  console.log(`${tables.length} tables: ${tables.map(([n]) => n).join(", ")}`);
  for (const [name, def] of tables.filter(([n]) => /vote|plm|plenum|bill/i.test(n))) {
    const fields = Object.entries(def).filter(([k, v]) => !k.startsWith("$") && (v as { $Kind?: string }).$Kind === undefined).map(([k]) => k);
    console.log(`\n--- ${name}: ${fields.join(", ")}`);
    const sample = await get(odataUrl(PARLIAMENT_V4, name, { $top: "2", $orderby: "Id desc" }));
    console.log(`status ${sample.status}: ${sample.text.slice(0, 1200).replace(/\s+/g, " ")}`);
  }
}

async function main() {
  for (const [label, url] of probes) {
    console.log(`\n=== ${label}\n${url}`);
    try {
      const res = await get(url);
      console.log(`status ${res.status} · ${res.contentType || "no content-type"} · ${res.text.length} bytes`);
      console.log(res.text.slice(0, 1500).replace(/\s+/g, " "));
    } catch (e) {
      console.log(`request failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  await probeV4Votes().catch((e) => console.log(`v4 probe failed: ${e instanceof Error ? e.message : e}`));
}

main();
