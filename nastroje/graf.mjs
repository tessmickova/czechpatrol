import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 940 } });
await p.goto("http://localhost:4322/incident/ukazka-rozvodna-sever/", { waitUntil: "networkidle" });
const el = await p.locator("text=Souvislosti").first();
await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
await p.screenshot({ path: "/tmp/snap/graf.png" });
await b.close(); console.log("ok");
