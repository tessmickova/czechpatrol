import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 940 } });
const chyby = [];
p.on("pageerror", (e) => chyby.push(String(e)));
await p.goto("http://localhost:4390/", { waitUntil: "networkidle" });
await p.waitForSelector("h1");
await p.screenshot({ path: "/tmp/snap/r-hero.png" });
await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(300);
await p.screenshot({ path: "/tmp/snap/r-nove.png" });
await p.evaluate(() => scrollTo(0, 1750)); await p.waitForTimeout(300);
await p.screenshot({ path: "/tmp/snap/r-rozcestnik.png" });
for (const [h, n] of [["#/udalosti/","udalosti"],["#/trend/","trend"],["#/odber/","odber"],["#/osa/","osa"]]) {
  await p.evaluate((x) => location.hash = x, h); await p.waitForTimeout(400);
  await p.screenshot({ path: `/tmp/snap/r-${n}.png` });
}
console.log("chyby:", chyby.length ? chyby.slice(0,3) : "žádné");
await b.close();
