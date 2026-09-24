const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const [n, w, h] of [["desktop", 1440, 900], ["mobil", 390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
    await p.screenshot({ path: `docs/ux-2026-09-24/PO6-uvod-${n}.png` });
    await p.goto("http://localhost:8765/pripravenost/", { waitUntil: "networkidle" });
    await p.waitForTimeout(300);
    await p.screenshot({ path: `docs/ux-2026-09-24/PO6-pripravenost-${n}.png` });
    await p.close();
  }
  await b.close();
})();
