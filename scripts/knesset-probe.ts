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

type V4 = { value?: Record<string, unknown>[]; "@odata.nextLink"?: string; "@odata.count"?: number };
async function v4(entity: string, params: Record<string, string>): Promise<V4> {
  const res = await get(odataUrl(PARLIAMENT_V4, entity, params));
  if (res.status !== 200) throw new Error(`${res.status} ${res.text.slice(0, 300)}`);
  return JSON.parse(res.text) as V4;
}

// What current plenum votes look like: counts, titles, paging, result labels.
async function probeV4VoteShape() {
  console.log(`\n=== KNS_PlenumVote deep dive`);
  const since = "VoteDateTime ge 2022-11-15T00:00:00Z"; // 25th Knesset sworn in
  const counted = await v4("KNS_PlenumVote", { $filter: since, $count: "true", $top: "0" });
  console.log(`votes since 2022-11-15: ${counted["@odata.count"]}`);

  const page = await v4("KNS_PlenumVote", { $filter: since, $orderby: "Id desc", $top: "500", $select: "Id,VoteDateTime,ItemID,VoteTitle,VoteSubject,VoteMethodDesc,VoteStatusDesc,ForOptionDesc,AgainstOptionDesc" });
  const rows = page.value ?? [];
  console.log(`asked for 500, got ${rows.length} rows; nextLink: ${page["@odata.nextLink"] ?? "none"}`);
  console.log(`unique Ids: ${new Set(rows.map((r) => r.Id)).size}`);
  const tally = (key: string) => {
    const c = new Map<string, number>();
    for (const r of rows) c.set(String(r[key] ?? ""), (c.get(String(r[key] ?? "")) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  };
  for (const key of ["VoteSubject", "VoteMethodDesc", "VoteStatusDesc", "ForOptionDesc"]) {
    console.log(`\n${key} (top values in latest ${rows.length}):`);
    for (const [v, n] of tally(key)) console.log(`  ${String(n).padStart(4)}  ${v.slice(0, 100)}`);
  }
  const third = rows.filter((r) => /שלישית|החוק כולו/.test(`${r.VoteTitle} ${r.VoteSubject}`));
  console.log(`\nrows mentioning שלישית / החוק כולו: ${third.length}`);
  for (const r of rows.slice(0, 30)) console.log(`  ${r.Id} ${String(r.VoteDateTime).slice(0, 10)} item ${r.ItemID} | ${String(r.VoteTitle).slice(0, 70)} | ${String(r.VoteSubject).slice(0, 50)}`);
  for (const r of third.slice(0, 10)) console.log(`  [3rd] ${r.Id} item ${r.ItemID} | ${String(r.VoteTitle).slice(0, 80)} | ${String(r.VoteSubject).slice(0, 60)}`);

  const sample = (third[0] ?? rows[0])?.Id;
  if (sample !== undefined) {
    const res = await v4("KNS_PlenumVoteResult", { $filter: `VoteID eq ${sample}`, $top: "300" });
    const rr = res.value ?? [];
    const by = new Map<string, number>();
    for (const r of rr) by.set(`${r.ResultCode} ${r.ResultDesc}`, (by.get(`${r.ResultCode} ${r.ResultDesc}`) ?? 0) + 1);
    console.log(`\nresults for vote ${sample}: ${rr.length} rows, ${new Set(rr.map((r) => r.MkId)).size} unique MKs; nextLink: ${res["@odata.nextLink"] ?? "none"}`);
    for (const [k, n] of by) console.log(`  ${n} × ${k}`);
    const item = (third[0] ?? rows[0])?.ItemID;
    const bill = await v4("KNS_Bill", { $filter: `Id eq ${item}`, $select: "Id,Name,SummaryLaw,StatusID" });
    const b = bill.value?.[0];
    console.log(`\nItemID ${item} as KNS_Bill: ${b ? `${b.Name} | SummaryLaw ${b.SummaryLaw ? `${String(b.SummaryLaw).length} chars: ${String(b.SummaryLaw).slice(0, 200)}` : "empty"}` : "not a bill"}`);
  }
  const withSummary = await v4("KNS_Bill", { $filter: "KnessetNum eq 25 and SummaryLaw ne null", $count: "true", $top: "1", $select: "Id,Name,SummaryLaw" });
  console.log(`25th-Knesset bills with SummaryLaw: ${withSummary["@odata.count"]}; e.g. ${String(withSummary.value?.[0]?.SummaryLaw ?? "").slice(0, 200)}`);
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
  await probeV4VoteShape().catch((e) => console.log(`vote deep dive failed: ${e instanceof Error ? e.message : e}`));
}

main();
