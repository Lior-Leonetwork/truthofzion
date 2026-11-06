// Probe: what the State Comptroller's public donation pages return to a plain
// HTTP request from Israel (no browser). Prints status, title, a text excerpt,
// and links/frames/forms that look like the data source.
import { fetch as undiciFetch } from "undici";

const URLS = [
  "https://www.mevaker.gov.il/he/mimun/donation/Pages/default.aspx",
  "https://www.mevaker.gov.il/he/mimun/donation/Pages/donationsPrime.aspx",
  "https://www.mevaker.gov.il/he/mimun/donation/Pages/TrumotandArvuyot.aspx",
];

async function main() {
  for (const u of URLS) {
    try {
      const res = await undiciFetch(u, { headers: { "User-Agent": "truth-of-zion-research (contact via site)", "Accept-Language": "he" }, signal: AbortSignal.timeout(45_000) });
      const html = await res.text();
      const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
      const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const refs = [...new Set([...html.matchAll(/(?:href|src|action)="([^"#]+)"/gi)].map((m) => m[1]).filter((h) => /mimun|donat|trum|tormim|xls|csv|json|api|asmx|svc|app|statements|iframe/i.test(h)))].slice(0, 40);
      console.log(`\n### ${u} → ${res.status} ${res.headers.get("content-type")} ${html.length}b\ntitle: ${title}\ntext: ${text.slice(0, 1200)}`);
      for (const r of refs) console.log(`  ref: ${r}`);
    } catch (e) {
      console.log(`\n### ${u} failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}
main();
