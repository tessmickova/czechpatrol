const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.screenshot({ path: `docs/ux-2026-09-24/PO9-uvod-desktop.png` });
  const sekce = await p.$('#opatreni');
  const y = await sekce.evaluate((e) => e.getBoundingClientRect().top + window.scrollY - 120);
  await p.evaluate((y) => window.scrollTo(0, y), y);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `docs/ux-2026-09-24/PO9-uredni-desktop.png` });
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await m.evaluate(() => window.scrollTo(0, 560));
  await m.waitForTimeout(300);
  await m.screenshot({ path: `docs/ux-2026-09-24/PO9-uvod-mobil.png` });
  await b.close();
})();
