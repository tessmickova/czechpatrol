/**
 * Snímky stránek v požadovaných šířkách + kontrola chyb v konzoli.
 *
 *   PORT=4420 VYSTUP=/tmp/snimky node nastroje/snimky.mjs
 *
 * Fonty stahuje curl přes proxy (prohlížeč v sandboxu nevidí ven).
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const PORT = process.env.PORT ?? 4420;
const VYSTUP = process.env.VYSTUP ?? "/tmp/snimky";
fs.mkdirSync(VYSTUP, { recursive: true });
const SIRKY = [360, 390, 768, 1280, 1440];
const CESTY = ["/", "/udalosti/", "/vyvoj/", "/muj-prehled/", "/o-projektu/", "/opravy/", "/podporit/", "/udalosti/?zeme=CZ&obdobi=letos", "/incident/leipzig-halle-utok/"];
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const vysledky = [];
for (const sirka of SIRKY) {
  const ctx = await b.newContext({ viewport: { width: sirka, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
    try {
      const body = execFileSync("curl", ["-sL", "-A", UA, route.request().url()], { maxBuffer: 20e6 });
      route.fulfill({ status: 200, body, contentType: route.request().url().includes("googleapis") ? "text/css" : "font/woff2" });
    } catch { route.abort(); }
  });
  for (const cesta of CESTY) {
    const p = await ctx.newPage();
    const chyby = [];
    p.on("pageerror", (e) => chyby.push(String(e)));
    p.on("console", (m) => { if (m.type() === "error") chyby.push(m.text()); });
    await p.goto(`http://localhost:${PORT}${cesta}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const vodorovne = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const nazev = `${sirka}-${cesta.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "prehled"}.png`;
    await p.screenshot({ path: `${VYSTUP}/${nazev}`, fullPage: true });
    vysledky.push({ sirka, cesta, chyby: chyby.length, vodorovne, snimek: nazev });
    if (chyby.length) console.log(`  ${sirka} ${cesta}: chyby`, chyby.slice(0, 3));
    await p.close();
  }
  // postranní detail na širokém displeji
  if (sirka >= 1024) {
    const p = await ctx.newPage();
    const chyby = [];
    p.on("pageerror", (e) => chyby.push(String(e)));
    await p.goto(`http://localhost:${PORT}/udalosti/`, { waitUntil: "networkidle" });
    await p.locator("ol button[aria-expanded]").first().click();
    await p.waitForTimeout(400);
    const url = p.url();
    const panel = await p.locator("aside[aria-label='Detail události']").count();
    await p.screenshot({ path: `${VYSTUP}/${sirka}-udalosti-detail.png`, fullPage: false });
    await p.goBack();
    await p.waitForTimeout(300);
    const poZpet = await p.locator("aside[aria-label='Detail události']").count();
    vysledky.push({ sirka, cesta: "/udalosti/ + klik na řádek", chyby: chyby.length, vodorovne: false, snimek: `${sirka}-udalosti-detail.png`, panel, url: url.replace(/^http:\/\/[^/]+/, ""), panelPoZpet: poZpet });
    await p.close();
  }
  await ctx.close();
}
await b.close();
console.table(vysledky);
fs.writeFileSync(`${VYSTUP}/vysledky.json`, JSON.stringify(vysledky, null, 2));
