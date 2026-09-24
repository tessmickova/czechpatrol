const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const [n, w, h] of [["desktop", 1440, 900], ["mobil", 390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.goto("http://localhost:8765/", { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `docs/ux-2026-09-24/PO4-uvod-${n}.png`, fullPage: false });
    const sekce = await p.$('[aria-labelledby="aktuality-nadpis"]');
    const tl = await sekce.$$("li > button");
    if (tl[1]) await tl[1].click();
    await p.waitForTimeout(300);
    await sekce.screenshot({ path: `docs/ux-2026-09-24/PO4-aktuality-${n}.png` });
    if (n === "desktop") {
      // zarovnání řádků: y-souřadnice prvních čtyř řádků v obou sloupcích
      const y = await p.$$eval('[aria-labelledby="aktuality-nadpis"] ul', (uls) => uls.map((u) => [...u.querySelectorAll(":scope > li > button")].slice(0, 5).map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; })));
      console.log(JSON.stringify(y));
      const top = await p.$eval("body > div, body", (e) => e.querySelector("[class*='border-b'] span")?.parentElement?.innerText);
      console.log(top);
    }
    await p.close();
  }
  await b.close();
})();
