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
}

main();
