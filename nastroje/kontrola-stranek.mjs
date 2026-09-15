import { chromium } from "playwright";
// cesta k prohlížeči se liší podle stroje; bez proměnné se použije ten, který si nainstaloval Playwright
const prohlizec = process.env.CHROMIUM;
const b = await chromium.launch(prohlizec ? { executablePath: prohlizec } : {});
const STRANKY = ["/", "/udalosti/", "/zeme/", "/analyzy/", "/metodika/", "/zdroje/", "/opravy/", "/o-projektu/", "/odber/", "/manipulace/", "/svet/", "/vyvoj/", "/podporit/", "/muj-prehled/", "/en/", "/zeme/cz/"];
const chyby = [];
for (const url of STRANKY) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const p = await ctx.newPage();
  const konzole = [];
  p.on("console", (m) => { if (m.type() === "error") konzole.push(m.text().slice(0, 120)); });
  p.on("pageerror", (e) => konzole.push("pageerror: " + String(e).slice(0, 120)));
  const r = await p.goto("http://127.0.0.1:8799" + url, { waitUntil: "networkidle" }).catch((e) => ({ status: () => 0, err: e }));
  const info = await p.evaluate(() => ({
    h1: [...document.querySelectorAll("h1")].map((x) => x.textContent?.trim().slice(0, 40)),
    tmave: getComputedStyle(document.body).backgroundColor,
    prazdneOdkazy: [...document.querySelectorAll("a")].filter((a) => !a.textContent?.trim() && !a.querySelector("svg,img")).length,
    prazdneTlacitka: [...document.querySelectorAll("button")].filter((x) => !x.textContent?.trim() && !x.getAttribute("aria-label") && !x.querySelector("svg")).length,
    vodorovnyPresah: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  })).catch(() => null);
  const stav = r?.status?.() ?? 0;
  if (stav !== 200) chyby.push(`${url}: HTTP ${stav}`);
  if (konzole.length) chyby.push(`${url}: konzole ${konzole.slice(0, 2).join(" | ")}`);
  if (info && info.h1.length !== 1) chyby.push(`${url}: H1 ${info.h1.length}× ${JSON.stringify(info.h1)}`);
  if (info && info.tmave !== "rgb(13, 13, 10)") chyby.push(`${url}: pozadí ${info.tmave}`);
  if (info?.vodorovnyPresah) chyby.push(`${url}: vodorovný přesah`);
  if (info?.prazdneOdkazy) chyby.push(`${url}: prázdných odkazů ${info.prazdneOdkazy}`);
  console.log(`${stav} ${url.padEnd(16)} h1=${info?.h1.length ?? "?"} pozadí=${info?.tmave ?? "?"}`);
  await ctx.close();
}
console.log("\n=== NÁLEZY ===");
if (!chyby.length) console.log("žádné");
for (const c of chyby) console.log(" -", c);
await b.close();
