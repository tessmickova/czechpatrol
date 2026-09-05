import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const sirka = Number(process.env.SIRKA ?? 1440);
const p = await b.newPage({ viewport: { width: sirka, height: 940 } });
// Prohlížeč v sandboxu nevidí ven; fonty tedy stáhne curl přes proxy a podstrčí je.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
await p.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
  try {
    const body = execFileSync("curl", ["-sL", "-A", UA, route.request().url()], { maxBuffer: 20e6 });
    const css = route.request().url().includes("googleapis");
    route.fulfill({ status: 200, body, contentType: css ? "text/css" : "font/woff2" });
  } catch { route.abort(); }
});
const chyby = []; p.on("pageerror", (e) => chyby.push(String(e)));
await p.goto("http://localhost:4410/", { waitUntil: "networkidle" });
await p.waitForTimeout(600);
await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });
const predpona = process.env.PREDPONA ?? "d";
const panely = await p.locator("section[id], main section").count();
const vyska = await p.evaluate(() => document.body.scrollHeight);
console.log("výška stránky:", vyska, "| sekcí:", panely);
let i = 0;
for (let y = 0; y < vyska - 200; y += 900) {
  await p.evaluate((yy) => scrollTo(0, yy), y);
  await p.waitForTimeout(180);
  await p.screenshot({ path: `/tmp/snap/${predpona}-${String(i).padStart(2,"0")}.png` });
  i++;
}
console.log("řezů:", i, "| chyby:", chyby.length ? chyby.slice(0,2) : "žádné");
await b.close();
