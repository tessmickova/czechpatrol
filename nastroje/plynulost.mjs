import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 940 } });
const chyby = []; p.on("pageerror", (e) => chyby.push(String(e)));
await p.goto("http://localhost:4401/#/trend/", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
await p.locator('button:has-text("Přehrát vývoj")').first().click();

// vzorkujeme pozici běžce, ať je vidět, jestli jede plynule
const vzorky = await p.evaluate(async () => {
  const bezec = () => document.querySelector('[aria-label="Vývoj celkové úrovně v čase"]')
    ?.parentElement?.querySelector("span[style*='left']");
  const out = [];
  const t0 = performance.now();
  while (performance.now() - t0 < 3000) {
    const el = bezec();
    out.push({ t: Math.round(performance.now() - t0), l: parseFloat(el?.style.left ?? "0") });
    await new Promise((r) => requestAnimationFrame(r));
  }
  return out;
});

const kroky = [];
for (let i = 1; i < vzorky.length; i++) kroky.push(vzorky[i].l - vzorky[i - 1].l);
const kladne = kroky.filter((k) => k > 0);
const prumer = kladne.reduce((a, b) => a + b, 0) / Math.max(1, kladne.length);
const max = Math.max(...kroky);
const skoky = kroky.filter((k) => k > prumer * 4).length;
console.log("vzorků:", vzorky.length, "za 3 s | posun celkem:", (vzorky.at(-1).l - vzorky[0].l).toFixed(1) + " %");
console.log("průměrný krok:", prumer.toFixed(3) + " %", "| největší:", max.toFixed(3) + " %", "| skoků >4× průměr:", skoky);
console.log("odhad délky přehrání:", (100 / (vzorky.at(-1).l - vzorky[0].l) * 3).toFixed(1) + " s");
await p.screenshot({ path: "/tmp/snap/plynulost.png" });
console.log("chyby:", chyby.length ? chyby.slice(0,2) : "žádné");
await b.close();
