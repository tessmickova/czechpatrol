import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 940 } });
const chyby = []; p.on("pageerror", (e) => chyby.push(String(e)));
await p.goto("http://localhost:4410/", { waitUntil: "networkidle" });
await p.waitForTimeout(600);
const panely = await p.locator("section[id], main section").count();
const vyska = await p.evaluate(() => document.body.scrollHeight);
console.log("výška stránky:", vyska, "| sekcí:", panely);
let i = 0;
for (let y = 0; y < vyska - 200; y += 900) {
  await p.evaluate((yy) => scrollTo(0, yy), y);
  await p.waitForTimeout(180);
  await p.screenshot({ path: `/tmp/snap/d-${String(i).padStart(2,"0")}.png` });
  i++;
}
console.log("řezů:", i, "| chyby:", chyby.length ? chyby.slice(0,2) : "žádné");
await b.close();
