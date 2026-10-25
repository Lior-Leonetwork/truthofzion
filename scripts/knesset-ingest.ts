// Pulls new plenum votes from the Knesset's official OData service into
// data/knesset/. Deterministic: no model is involved, and nothing here
// interprets a vote. Runs daily in GitHub Actions (.github/workflows/knesset.yml).
//
//   npm run knesset:ingest -- [--knesset 25] [--since-id N] [--max-votes N]
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { makeFetcher, odataUrl, query, ODataError, VOTES_SVC, type Row } from "../src/lib/knesset/odata";
import { paths, readMembers, readState, writeJson } from "../src/lib/knesset/store";
import { buildVote, countsMatch, headerId, isFinalReading, mergeMembers, resultTypes } from "../src/lib/knesset/transform";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

// The Knesset sometimes refuses non-Israeli addresses; KNESSET_HTTP_PROXY routes through one that isn't.
const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const get = makeFetcher(((url: string, init: object) => undiciFetch(url, { ...init, dispatcher })) as unknown as typeof fetch);

async function collect(url: string) {
  const rows: Row[] = [];
  for await (const r of query(get, url)) rows.push(r);
  return rows;
}

async function headersSince(knesset: number, sinceId: number) {
  // The header key has been published as "vote_id"; older dumps call it "id".
  for (const key of ["vote_id", "id"]) {
    try {
      return await collect(odataUrl(VOTES_SVC, "View_vote_rslts_hdr_Approved", { $filter: `knesset_num eq ${knesset} and ${key} gt ${sinceId}` }));
    } catch (e) {
      if (!(e instanceof ODataError && e.status === 400) || key === "id") throw e;
    }
  }
  return [];
}

async function main() {
  const p = paths();
  const state = readState();
  const knesset = Number(arg("knesset") ?? state?.knesset ?? 25);
  const sinceId = Number(arg("since-id") ?? (state?.knesset === knesset ? state.lastVoteId : 0));
  const maxVotes = Number(arg("max-votes") ?? 400);
  const today = new Date().toISOString().slice(0, 10);

  console.log(`Knesset ${knesset}: fetching votes after id ${sinceId}`);
  const types = resultTypes(await collect(odataUrl(VOTES_SVC, "vote_result_type", {})));
  const retry = state?.knesset === knesset ? state.heldBack : [];
  const retried: Row[] = [];
  for (const id of retry) {
    retried.push(...(await collect(odataUrl(VOTES_SVC, "View_vote_rslts_hdr_Approved", { $filter: `knesset_num eq ${knesset} and vote_id eq ${id}` }))));
  }
  const headers = (await headersSince(knesset, sinceId)).sort((a, b) => headerId(a)! - headerId(b)!);
  const finals = headers.filter(isFinalReading);
  console.log(`${headers.length} new votes, ${finals.length} final readings`);
  // Printed so the first live run shows what the filter is matching against.
  for (const h of headers.slice(0, 15)) console.log(`  ${isFinalReading(h) ? "✓" : " "} ${headerId(h)} ${h.sess_item_dscr} | ${h.vote_item_dscr}`);

  const members = readMembers();
  let lastVoteId = sinceId;
  let written = 0;
  const heldBack: number[] = [];
  for (const h of [...retried, ...headers]) {
    const id = headerId(h)!;
    if (isFinalReading(h)) {
      if (written >= maxVotes && id > sinceId) break; // resume from here next run
      const rows = await collect(odataUrl(VOTES_SVC, "vote_rslts_kmmbr_shadow", { $filter: `vote_id eq ${id}` }));
      const vote = buildVote(h, rows, types, today);
      if (!countsMatch(vote)) {
        console.warn(`  vote ${id}: member rows disagree with official totals; held back`);
        heldBack.push(id);
      } else {
        writeJson(p.vote(id), vote);
        mergeMembers(members, vote, new Map(rows.map((r) => [String(r.kmmbr_id).trim(), String(r.kmmbr_name ?? "").trim()])));
        written++;
      }
    }
    if (id > lastVoteId) lastVoteId = id;
  }

  writeJson(p.members, members);
  writeJson(p.state, { knesset, lastVoteId, heldBack, updatedAt: new Date().toISOString() });
  console.log(`✓ wrote ${written} votes (${heldBack.length} held back), last vote id ${lastVoteId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
