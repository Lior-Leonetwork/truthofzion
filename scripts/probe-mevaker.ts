// Probe: what the State Comptroller's public donation pages return to a plain
// HTTP request from Israel (no browser). Prints status, title, a text excerpt,
// and links/frames/forms that look like the data source.
import { fetch as undiciFetch } from "undici";

const URLS = [
  "https://www.mevaker.gov.il/",
  "https://www.mevaker.gov.il/state-audit/elections/donations",
  "https://www.mevaker.gov.il/state-audit/elections/applications",
];

async function main() {
  for (const u of URLS) {
    try {
      const res = await undiciFetch(u, { headers: { "User-Agent": "truth-of-zion-research (contact via site)", "Accept-Language": "he" }, signal: AbortSignal.timeout(45_000) });
      const html = await res.text();
      const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
      const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const refs = [...new Set([...html.matchAll(/(?:href|src|action)=\\?"([^"#\\]+)/gi), ...html.matchAll(/(https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^"'\s\\<>)]*)/gi)].map((m) => m[1]).filter((h) => !/_next\/static|fonts|google|facebook|twitter|youtube|instagram|linkedin|tiktok/i.test(h)))].slice(0, 80);
      const main = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? "";
      const mainText = main.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      console.log(`main: ${mainText.slice(0, 2500)}`);
      console.log(`\n### ${u} → ${res.status} ${res.headers.get("content-type")} ${html.length}b\ntitle: ${title}\ntext: ${text.slice(0, 1200)}`);
      for (const r of refs) console.log(`  ref: ${r}`);
    } catch (e) {
      const cause = e instanceof Error ? (e as Error & { cause?: { code?: string; message?: string } }).cause : undefined;
      console.log(`\n### ${u} failed: ${e instanceof Error ? e.message : e} | cause: ${cause?.code ?? ""} ${cause?.message ?? ""}`);
    }
  }
}
main();
