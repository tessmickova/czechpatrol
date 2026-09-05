import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const sirka = Number(process.env.SIRKA ?? 1440);
const p = await b.newPage({ viewport: { width: sirka, height: 940 } });
await p.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
  try {
    const body = execFileSync("curl", ["-sL", "-A", UA, route.request().url()], { maxBuffer: 20e6 });
    route.fulfill({ status: 200, body, contentType: route.request().url().includes("googleapis") ? "text/css" : "font/woff2" });
  } catch { route.abort(); }
});
const chyby = []; p.on("pageerror", (e) => chyby.push(String(e)));
const cesty = (process.env.CESTY ?? "/ucet/,/izs/,/soukromi/,/sprava/").split(",");
for (const c of cesty) {
  await p.goto(`http://localhost:${process.env.PORT ?? 4410}/#${c}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, 0); });
  const nazev = c.replace(/\//g, "") || "prehled";
  await p.screenshot({ path: `/tmp/snap/s-${nazev}.png` });
  if (process.env.CELE) await p.screenshot({ path: `/tmp/snap/s-${nazev}-cele.png`, fullPage: true });
}
// panel
await p.goto(`http://localhost:${process.env.PORT ?? 4410}/#/`, { waitUntil: "networkidle" });
await p.waitForTimeout(300);
await p.evaluate(() => window.dispatchEvent(new CustomEvent("czechpatrol:panel")));
await p.waitForTimeout(500);
await p.screenshot({ path: `/tmp/snap/s-panel.png` });
await p.evaluate(() => { const d = document.querySelector("aside .overflow-y-auto"); if (d) d.scrollTop = 900; else console.log("panel nenalezen"); });
await p.waitForTimeout(200);
await p.screenshot({ path: `/tmp/snap/s-panel2.png` });
console.log("chyby:", chyby.length ? chyby.slice(0, 3) : "žádné");
await b.close();
