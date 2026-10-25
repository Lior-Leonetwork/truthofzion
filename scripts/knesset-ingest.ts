// Pulls new final-reading plenum votes from the Knesset's official open data
// (ParliamentInfo OData v4: KNS_PlenumVote, KNS_PlenumVoteResult) into
// data/knesset/. Deterministic: no model is involved, and nothing here
// interprets a vote. Runs daily in GitHub Actions (.github/workflows/knesset.yml),
// through an Israeli VPN because knesset.gov.il only answers Israeli addresses.
//
//   npm run knesset:ingest -- [--knesset 25] [--from YYYY-MM-DD] [--since-id N] [--max-votes N]
//
// The first run collects votes from the last two years (or --from); every run
// after that continues forward from where the previous one stopped.
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { makeFetcher, odataUrl, PARLIAMENT_V4, query, type Row } from "../src/lib/knesset/odata";
import { paths, readMembers, readState, writeJson } from "../src/lib/knesset/store";
import { buildVote, dedupeById, factionsFrom, isFinalReading, KNESSET_START, mergeMembers, startDate } from "../src/lib/knesset/transform";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const proxy = process.env.KNESSET_HTTP_PROXY;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
const get = makeFetcher(((url: string, init: object) => undiciFetch(url, { ...init, dispatcher })) as unknown as typeof fetch);

async function collect(entity: string, params: Record<string, string>) {
  const rows: Row[] = [];
  for await (const r of query(get, odataUrl(PARLIAMENT_V4, entity, params))) rows.push(r);
  return rows;
}

async function main() {
  const p = paths();
  const state = readState();
  const knesset = Number(arg("knesset") ?? state?.knesset ?? 25);
  if (!KNESSET_START[knesset]) throw new Error(`no start date known for Knesset ${knesset}; add it to KNESSET_START`);
  const sameKnesset = state?.knesset === knesset;
  const sinceId = Number(arg("since-id") ?? (sameKnesset ? state.lastVoteId : 0));
  const maxVotes = Number(arg("max-votes") ?? 400);
  const today = new Date().toISOString().slice(0, 10);
  const start = startDate(knesset, today, 2, arg("from") ?? (sameKnesset ? state.fromDate : undefined));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error(`--from must be YYYY-MM-DD, got ${start}`);

  console.log(`Knesset ${knesset}: votes from ${start}, after id ${sinceId}`);
  const factions = factionsFrom(await collect("KNS_PersonToPosition", { $filter: `KnessetNum eq ${knesset}` }));
  console.log(`${factions.size} members with faction records`);

  const retry = state?.knesset === knesset ? state.heldBack : [];
  const retried = retry.length
    ? await collect("KNS_PlenumVote", { $filter: retry.map((id) => `Id eq ${id}`).join(" or ") })
    : [];
  const fresh = await collect("KNS_PlenumVote", {
    $filter: `Id gt ${sinceId} and VoteDateTime ge ${start}T00:00:00Z`,
    $orderby: "Id",
  });
  const headers = dedupeById([...retried, ...fresh]).sort((a, b) => Number(a.Id) - Number(b.Id));
  const finals = headers.filter(isFinalReading);
  console.log(`${fresh.length} new vote rows (${headers.length} unique incl. retries), ${finals.length} final readings`);
  for (const h of finals.slice(0, 10)) console.log(`  ✓ ${h.Id} ${String(h.VoteDateTime).slice(0, 10)} ${h.VoteTitle}`);

  const members = readMembers();
  let lastVoteId = sinceId;
  let written = 0;
  const heldBack: number[] = [];
  for (const h of headers) {
    const id = Number(h.Id);
    if (isFinalReading(h)) {
      if (written >= maxVotes && id > sinceId) break; // resume from here next run
      const results = await collect("KNS_PlenumVoteResult", { $filter: `VoteID eq ${id}` });
      const built = buildVote(h, results, factions, knesset, today);
      if (!built.ok) {
        console.warn(`  vote ${id}: ${built.reason}; held back`);
        heldBack.push(id);
      } else {
        writeJson(p.vote(id), built.vote);
        mergeMembers(members, built.vote, built.names);
        written++;
      }
    }
    if (id > lastVoteId) lastVoteId = id;
  }

  writeJson(p.members, members);
  writeJson(p.state, { knesset, lastVoteId, fromDate: start, heldBack, updatedAt: new Date().toISOString() });
  console.log(`✓ wrote ${written} votes (${heldBack.length} held back), last vote id ${lastVoteId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
