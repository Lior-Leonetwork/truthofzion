// Minimal client for data.gov.il's CKAN API. Like knesset.gov.il, it only
// answers Israeli addresses; anything else gets an HTML block page with a 200,
// so every response must parse as a successful CKAN envelope or we stop.

export const DATAGOV_API = process.env.DATAGOV_API ?? "https://data.gov.il/api/3/action";

// Registrar of Associations (moj-amutot) resources.
export const DONATIONS_RESOURCE = "35cb40b5-3f13-4bca-9ce2-488085913107"; // תרומות מישות מדינית זרה
export const REGISTRY_RESOURCE = "be5b7935-3922-45d4-9638-08871b17ec95"; // עמותות רשומות
export const DATASET_PAGE = "https://data.gov.il/dataset/moj-amutot";
export const resourcePage = (id: string) => `${DATASET_PAGE}/resource/${id}`;

export class NotCkanError extends Error {}

type Fetch = (url: string) => Promise<{ status: number; text(): Promise<string> }>;

export async function ckan<T>(get: Fetch, action: string, params: Record<string, string>): Promise<T> {
  const url = `${DATAGOV_API}/${action}?${new URLSearchParams(params)}`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    try {
      const res = await get(url);
      const text = await res.text();
      let body: { success?: boolean; result?: T; error?: unknown };
      try {
        body = JSON.parse(text);
      } catch {
        // Not JSON: a block page or an outage. Retrying won't change a block.
        throw new NotCkanError(`${res.status} non-JSON from ${url}: ${text.slice(0, 200).replace(/\s+/g, " ")}`);
      }
      if (!body.success || body.result === undefined) throw new Error(`${res.status} CKAN error from ${url}: ${JSON.stringify(body.error ?? body).slice(0, 300)}`);
      return body.result;
    } catch (e) {
      if (e instanceof NotCkanError) throw e;
      lastError = e;
    }
  }
  throw lastError;
}

type Search = { total: number; records: Record<string, unknown>[] };

// Every row of a datastore resource, paging by offset in a stable order.
export async function allRows(get: Fetch, resourceId: string, opts: { pageSize?: number; fields?: string[] } = {}) {
  const pageSize = opts.pageSize ?? 5000;
  const rows: Record<string, unknown>[] = [];
  let total = Infinity;
  while (rows.length < total) {
    const params: Record<string, string> = { resource_id: resourceId, limit: String(pageSize), offset: String(rows.length), sort: "_id asc" };
    if (opts.fields) params.fields = ["_id", ...opts.fields].join(",");
    const page = await ckan<Search>(get, "datastore_search", params);
    total = page.total;
    if (page.records.length === 0) break;
    rows.push(...page.records);
  }
  if (rows.length < total) throw new Error(`${resourceId}: got ${rows.length} of ${total} rows`);
  return rows;
}
