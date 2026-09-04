import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 940 } });
const chyby = [];
p.on("pageerror", (e) => chyby.push(String(e)));
await p.goto("http://localhost:4340/", { waitUntil: "networkidle" });
await p.evaluate(() => window.scrollTo(0, 420));
await p.waitForTimeout(400);
const posun = await p.evaluate(() => {
  const el = document.querySelector("[data-vrstva]");
  return el ? getComputedStyle(el).getPropertyValue("--posun") : "žádná vrstva";
});
await p.screenshot({ path: "/tmp/snap/n2-0.png" });
await p.click('a[href="/trend/"]'); await p.waitForTimeout(300);
await p.screenshot({ path: "/tmp/snap/n2-trend.png" });
console.log("chyby:", chyby.length ? chyby : "žádné", "| parallax posun:", posun);
await b.close();
