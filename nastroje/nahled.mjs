import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const stranka = process.argv[2] || "/";
const predpona = process.argv[3] || "rez";
const p = await b.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 1 });
await p.goto("http://localhost:4322" + stranka, { waitUntil: "networkidle" });
const h = await p.evaluate(() => document.body.scrollHeight);
let i = 0;
for (let y = 0; y < h - 60; y += 900) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `/tmp/snap/${predpona}-${String(i).padStart(2,"0")}.png` });
  i++;
}
console.log("řezů:", i, "výška:", h);
await b.close();
