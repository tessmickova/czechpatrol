const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 1440, height: 1500 } });
  await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
  await p.screenshot({ path: `docs/ux-2026-09-24/PO8-uvod-desktop.png` });
  await b.close();
})();
