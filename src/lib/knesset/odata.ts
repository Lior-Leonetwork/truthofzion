// Minimal client for the Knesset's OData services. Votes.svc is OData v3 and
// may answer in Atom XML or JSON depending on the server; both are handled.
// ParliamentInfo (bills) is OData v4 JSON.

export type Row = Record<string, string | number | boolean | null>;
export type Page = { rows: Row[]; next: string | null };

// Overridable only so the scripts can be exercised against a local mock.
export const VOTES_SVC = process.env.KNESSET_VOTES_SVC ?? "https://knesset.gov.il/Odata/Votes.svc";
export const PARLIAMENT_V4 = process.env.KNESSET_PARLIAMENT_V4 ?? "https://knesset.gov.il/OdataV4/ParliamentInfo";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXml(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
}

function typed(type: string | undefined, text: string): string | number | boolean {
  switch ((type ?? "").toLowerCase()) {
    case "edm.int16":
    case "edm.int32":
    case "edm.int64":
    case "edm.byte":
    case "edm.decimal":
    case "edm.double":
      return Number(text);
    case "edm.boolean":
      return text === "true";
    default:
      return text;
  }
}

export function parseAtom(xml: string, base: string): Page {
  const rows: Row[] = [];
  for (const [, props] of xml.matchAll(/<m:properties>([\s\S]*?)<\/m:properties>/g)) {
    const row: Row = {};
    for (const m of props.matchAll(/<d:(\w+)((?:\s+[\w:]+="[^"]*")*)\s*(?:\/>|>([\s\S]*?)<\/d:\1>)/g)) {
      const [, name, attrs, body] = m;
      const isNull = /m:null="true"/.test(attrs);
      const type = /m:type="([^"]+)"/.exec(attrs)?.[1];
      row[name] = isNull ? null : typed(type, decodeXml(body ?? ""));
    }
    rows.push(row);
  }
  const href = /<link[^>]*rel="next"[^>]*href="([^"]+)"/.exec(xml)?.[1] ?? /<link[^>]*href="([^"]+)"[^>]*rel="next"/.exec(xml)?.[1];
  return { rows, next: href ? new URL(decodeXml(href), base.endsWith("/") ? base : `${base}/`).toString() : null };
}

// "/Date(1066680000000)/" (OData v2/v3 verbose JSON) → ISO string.
function jsonValue(v: unknown): string | number | boolean | null {
  if (typeof v === "string") {
    const ms = /^\/Date\((-?\d+)(?:[+-]\d+)?\)\/$/.exec(v)?.[1];
    return ms ? new Date(Number(ms)).toISOString().slice(0, 19) : v;
  }
  if (typeof v === "number" || typeof v === "boolean" || v === null) return v;
  return null;
}

export function parseJson(body: unknown): Page {
  const b = body as Record<string, unknown>;
  const d = (b.d ?? b) as Record<string, unknown> | unknown[];
  const list = (Array.isArray(d) ? d : ((d as Record<string, unknown>).results ?? (d as Record<string, unknown>).value ?? [])) as Record<string, unknown>[];
  const next = (!Array.isArray(d) && ((d as Record<string, unknown>).__next as string)) || (b["odata.nextLink"] as string) || (b["@odata.nextLink"] as string) || null;
  const rows = list.map((r) =>
    Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith("__") && !k.includes("@")).map(([k, v]) => [k, jsonValue(v)])),
  );
  return { rows, next };
}

export class NotODataError extends Error {}

// A firewall or error page can come back as 200 OK. Anything that isn't
// recognisably an OData payload is an error, never "zero rows".
export function parseResponse(text: string, contentType: string, base: string): Page {
  const head = text.trimStart();
  if (contentType.includes("json") || head.startsWith("{")) {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new NotODataError(`invalid JSON from ${base}: ${head.slice(0, 300)}`);
    }
    const b = body as Record<string, unknown>;
    if (!("value" in b) && !("d" in b)) throw new NotODataError(`unexpected JSON from ${base}: ${head.slice(0, 300)}`);
    return parseJson(body);
  }
  if (!/<feed[\s>]/.test(head.slice(0, 2000))) {
    throw new NotODataError(`not an OData feed from ${base} (${contentType || "no content-type"}): ${head.slice(0, 300)}`);
  }
  return parseAtom(text, base);
}

export class ODataError extends Error {
  constructor(
    public status: number,
    public url: string,
    body: string,
  ) {
    super(`OData ${status} for ${url}: ${body.slice(0, 300)}`);
  }
}

type Fetcher = (url: string) => Promise<{ status: number; contentType: string; text: string }>;

// Retries network failures, 429 and 5xx with backoff; anything else is the caller's problem.
export function makeFetcher(fetchImpl: typeof fetch, opts: { retries?: number; delayMs?: number } = {}): Fetcher {
  const retries = opts.retries ?? 4;
  const delay = opts.delayMs ?? 5000;
  return async (url) => {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetchImpl(url, {
          headers: { Accept: "application/json, application/atom+xml;q=0.9", "User-Agent": "truth-of-zion-ingest" },
          signal: AbortSignal.timeout(120_000),
        });
        const text = await res.text();
        if ((res.status === 429 || res.status >= 500) && attempt < retries) throw new ODataError(res.status, url, text);
        return { status: res.status, contentType: res.headers.get("content-type") ?? "", text };
      } catch (e) {
        if (attempt >= retries) throw e;
        await new Promise((r) => setTimeout(r, delay * 2 ** attempt));
      }
    }
  };
}

export async function* query(get: Fetcher, url: string, maxPages = 10_000): AsyncGenerator<Row> {
  let next: string | null = url;
  for (let page = 0; next && page < maxPages; page++) {
    const res = await get(next);
    if (res.status !== 200) throw new ODataError(res.status, next, res.text);
    const parsed = parseResponse(res.text, res.contentType, url.split("?")[0]);
    yield* parsed.rows;
    next = parsed.next;
  }
}

export function odataUrl(base: string, entity: string, params: Record<string, string>) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${base}/${entity}${qs ? `?${qs}` : ""}`;
}
