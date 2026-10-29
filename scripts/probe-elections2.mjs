// Probe 2: find the Central Elections Committee's 26th Knesset results source.
// 1) read news articles that cite it and list every bechirot/gov.il link;
// 2) open candidate sites in a real browser and log every data request.
import { chromium } from "playwright";

const ARTICLES = [
  "https://www.kipa.co.il/%D7%97%D7%93%D7%A9%D7%95%D7%AA/1235019-0/",
  "https://www.kikar.co.il/political-news/final-election-results-likud-27-yesh-21-coalition-",
  "https://www.ynet.co.il/news/elections2026/article/bj5pk302zg",
];
const SITES = ["https://votes26.bechirot.gov.il/", "https://www.bechirot.gov.il/", "https://bechirot.gov.il/"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: "he-IL", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" });

for (const url of ARTICLES) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    const links = await page.$$eval("a[href], iframe[src]", (els) => els.map((e) => e.href || e.src));
    const hits = [...new Set(links.filter((l) => /bechirot|elections|votes2|gov\.il/i.test(l)))];
    console.log(`\n### article ${url}\n${hits.map((h) => "  link: " + h).join("\n") || "  (no matching links)"}`);
  } catch (e) {
    console.log(`\n### article ${url} failed: ${e.message}`);
  }
  await page.close();
}

for (const url of SITES) {
  const page = await ctx.newPage();
  const requests = [];
  page.on("response", (r) => {
    const t = r.headers()["content-type"] || "";
    if (!/image|font|css/.test(t)) requests.push(`${r.status()} ${t.split(";")[0]} ${r.url()}`);
  });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(4000);
    const text = (await page.innerText("body")).replace(/\s+/g, " ").slice(0, 1500);
    const links = [...new Set(await page.$$eval("a[href]", (els) => els.map((e) => e.href)))].slice(0, 60);
    console.log(`\n### site ${url} → final ${page.url()}\ntext: ${text}`);
    for (const r of requests.slice(0, 60)) console.log(`  req: ${r}`);
    for (const l of links) console.log(`  a: ${l}`);
  } catch (e) {
    console.log(`\n### site ${url} failed: ${e.message}`);
    for (const r of requests.slice(0, 30)) console.log(`  req: ${r}`);
  }
  await page.close();
}
await browser.close();
