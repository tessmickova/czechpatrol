import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 940 } });
const chyby = [];
p.on("pageerror", (e) => chyby.push(String(e)));
p.on("console", (m) => { if (m.type() === "error") chyby.push("console: " + m.text()); });

await p.goto("http://localhost:4350/", { waitUntil: "networkidle" });
await p.waitForSelector("h1", { timeout: 8000 });
console.log("hero:", (await p.locator("h1").first().innerText()).replace(/\n/g, " "));

// filtry na /udalosti
await p.click('a[href="#/udalosti/"]');
await p.waitForTimeout(400);
const pred = await p.locator("article").count();
await p.click('button:has-text("Sabotáže")');
await p.waitForTimeout(300);
const po = await p.locator("article").count();
console.log("filtr Sabotáže:", pred, "->", po);
await p.screenshot({ path: "/tmp/snap/spa-filtr.png" });

// rozbalení karty
await p.click('a[href="#/"]'); await p.waitForTimeout(400);
await p.locator("summary:has-text('Proč je to důležité')").first().click();
await p.waitForTimeout(250);
const fakt = await p.locator("text=Co víme").first().isVisible();
console.log("rozbalení karty ukazuje FAKTA:", fakt);

// parallax
await p.evaluate(() => scrollTo(0, 500)); await p.waitForTimeout(350);
const posun = await p.evaluate(() => getComputedStyle(document.querySelector("[data-vrstva]")).getPropertyValue("--posun"));
console.log("parallax posun:", posun);

// detail události
await p.click('a[href="#/incident/ukazka-rozvodna-sever/"]');
await p.waitForTimeout(400);
console.log("detail:", (await p.locator("h1").first().innerText()).slice(0, 40));
await p.screenshot({ path: "/tmp/snap/spa-detail.png" });

console.log("chyby:", chyby.length ? chyby.slice(0, 5) : "žádné");
await b.close();
