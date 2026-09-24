const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const [n, w, h] of [["desktop", 1440, 1400], ["mobil", 390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
    await p.screenshot({ path: `docs/ux-2026-09-24/PO7-uvod-${n}.png` });
    if (n === "desktop") { await p.goto("http://localhost:8765/udalosti/", { waitUntil: "networkidle" }); await p.screenshot({ path: `docs/ux-2026-09-24/PO7-udalosti-desktop.png`, clip: { x: 0, y: 0, width: 1440, height: 500 } }); }
    await p.close();
  }
  await b.close();
})();
