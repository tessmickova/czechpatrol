import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 940 } });
await p.goto("http://localhost:4332/", { waitUntil: "networkidle" });
for (const [sel, jm] of [["text=Rozložení tlaku", "radar"], ["text=Jak se situace vyvíjí", "trend"], ["text=K čemu by se situace", "zebrik"]]) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
  await p.screenshot({ path: `/tmp/snap/k-${jm}.png` });
}
await b.close(); console.log("ok");
