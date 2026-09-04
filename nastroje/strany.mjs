import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 940 } });
for (const [c, n] of [["/udalosti/","udalosti"],["/dnes/","dnes"],["/metodika/","metodika"],["/incident/ukazka-rozvodna-sever/","incident"],["/cr/","cr"]]) {
  await p.goto("http://localhost:4332" + c, { waitUntil: "networkidle" });
  await p.screenshot({ path: `/tmp/snap/p-${n}-0.png` });
  await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(150);
  await p.screenshot({ path: `/tmp/snap/p-${n}-1.png` });
}
await b.close(); console.log("ok");
