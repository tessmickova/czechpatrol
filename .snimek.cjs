const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [n, u, y] of [["uvod", "/", 0], ["uredni", "/", 1250], ["udalosti", "/udalosti/", 500], ["odolnost", "/odolnost/", 300], ["manipulace", "/manipulace/", 400]]) {
    await p.goto("http://localhost:8765" + u, { waitUntil: "networkidle" });
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `docs/ux-2026-09-24/PO10-${n}.png` });
  }
  await b.close();
})();
