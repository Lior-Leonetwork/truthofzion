// Probe: where the Central Elections Committee publishes the 26th Knesset's
// candidate lists and results. Prints status, size, title and data-like links.
import { fetch as undiciFetch } from "undici";

const API = "https://data.gov.il/api/3/action";
const URLS = [
  "https://votes26.bechirot.gov.il/",
  "https://votes26.bechirot.gov.il/nationalresults",
  "https://bechirot.gov.il/",
  "https://www.bechirot.gov.il/",
  "https://bechirot.gov.il/elections/knesset26/",
  "https://www.gov.il/he/departments/central_elections_committee/govil-landing-page",
  "https://bechirot26.bechirot.gov.il/",
  "https://votes25.bechirot.gov.il/",
];

async function get(url: string) {
  const res = await undiciFetch(url, { headers: { "User-Agent": "Mozilla/5.0 truth-of-zion-probe", "Accept-Language": "he" }, signal: AbortSignal.timeout(45_000), redirect: "follow" });
  return { status: res.status, type: res.headers.get("content-type") ?? "", url: res.url, text: await res.text() };
}

async function main() {
  for (const q of ["הכנסת ה-26", "בחירות לכנסת 26", "ועדת הבחירות המרכזית", "תוצאות בחירות", "רשימות מועמדים"]) {
    try {
      const r = await get(`${API}/package_search?${new URLSearchParams({ q, rows: "8" })}`);
      const j = JSON.parse(r.text);
      console.log(`\n### data.gov.il "${q}": ${j.result.count}`);
      for (const p of j.result.results) {
        console.log(`- ${p.name} | ${p.title} | ${p.organization?.title ?? ""} | ${p.metadata_modified.slice(0, 10)}`);
        for (const res of p.resources.slice(0, 12)) console.log(`    ${res.id} | ${res.name} | ${res.format} | ds=${res.datastore_active} | ${(res.last_modified ?? "").slice(0, 10)} | ${res.url}`);
      }
    } catch (e) {
      console.log(`data.gov.il "${q}" failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  for (const u of URLS) {
    try {
      const r = await get(u);
      const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(r.text)?.[1]?.trim() ?? "";
      const links = [...new Set([...r.text.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((h) => /26|csv|xls|json|api|candidat|result|מועמד|רשימ|תוצא|ballot|kalpi/i.test(h)))].slice(0, 40);
      console.log(`\n### ${u} → ${r.status} ${r.type} ${r.text.length}b final=${r.url}\ntitle: ${title}`);
      console.log(r.text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 800));
      for (const l of links) console.log(`  link: ${l}`);
    } catch (e) {
      console.log(`\n### ${u} failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}
main();
