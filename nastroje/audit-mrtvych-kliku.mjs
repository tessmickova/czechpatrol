/*
  Audit mrtvých kliků (26. 9. 2026).

  Na každé zadané stránce, na mobilu i počítači:
  1. najde prvky, které VYPADAJÍ klikatelně a nejsou (kurzor ruky, hover
     styl, podtržení, title bez akce),
  2. klikne na každé tlačítko, záložku a přepínač a zaznamená, jestli se
     něco stalo (navigace, změna DOM, posun, nové okno),
  3. zkontroluje interní odkazy a kotvy.
  Požadavky mimo web se blokují, takže se nic skutečného nespustí.

  Použití: npx next build; (cd out && python3 -m http.server 8765) &
           node nastroje/audit-mrtvych-kliku.mjs / /udalosti/ /analyzy/
  Výsledek: audit-kliku.json (VYSTUP=...). Nálezy vždy ověřit ručně —
  klik na už aktivní filtr nebo na popisek pole je v pořádku.
*/
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");
const BASE = process.env.ADRESA || "http://localhost:8765";
const STRANKY = process.argv.slice(2);
const VYSLEDEK = [];

const existuje = (u) => {
  const p = u.split("#")[0].split("?")[0];
  if (!p || p === "/") return true;
  const f = path.join(OUT, decodeURIComponent(p));
  return fs.existsSync(f) || fs.existsSync(path.join(f, "index.html")) || fs.existsSync(f + ".html");
};

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
for (const [zar, vp] of [["mobil", { width: 390, height: 844 }], ["desktop", { width: 1300, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: zar === "mobil" });
  await ctx.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  p.on("dialog", (d) => d.dismiss());
  // Souhlas s měřením pryč, ať nepřekrývá obsah.
  await p.goto(BASE + "/");
  await p.getByRole("button", { name: "Odmítnout" }).click({ timeout: 3000 }).catch(() => {});

  for (const s of STRANKY) {
    const url = BASE + s;
    await p.goto(url, { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForTimeout(300);

    // 1) Statické: vypadá klikatelně, ale není interaktivní; odkazy a kotvy.
    const staticke = await p.evaluate(() => {
      const INTER = 'a[href],button,summary,input,select,textarea,label,[role=button],[role=tab],[role=radio],[role=link],[role=switch],[role=checkbox],[role=menuitem],[onclick],[tabindex]:not([tabindex="-1"])';
      const vid = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0"; };
      const popis = (e) => (e.getAttribute("aria-label") || e.innerText || e.getAttribute("title") || e.tagName).replace(/\s+/g, " ").trim().slice(0, 70);
      const sel = (e) => { const parts = []; let x = e; for (let i = 0; x && i < 3; i++, x = x.parentElement) parts.unshift(x.tagName.toLowerCase() + (x.id ? "#" + x.id : "")); return parts.join(">"); };
      const nalezy = [];
      for (const e of document.querySelectorAll("body *")) {
        if (!vid(e) || e.closest(INTER)) continue;
        if (e.closest("svg") && e.tagName.toLowerCase() !== "svg") continue;
        const cs = getComputedStyle(e);
        const cls = typeof e.className === "string" ? e.className : "";
        const duvody = [];
        if (cs.cursor === "pointer" && (!e.parentElement || getComputedStyle(e.parentElement).cursor !== "pointer")) duvody.push("kurzor ruky");
        if (/(^|\s)hover:(bg|border|text|underline|shadow|opacity|scale|-translate|translate)/.test(cls)) duvody.push("hover styl");
        if (/(^|\s)group(\s|$)/.test(cls) && e.querySelector('[class*="group-hover:"]') && !e.querySelector("a[href],button")) duvody.push("karta s group-hover bez odkazu");
        if (cs.textDecorationLine.includes("underline") && e.childElementCount === 0 && e.innerText.trim()) duvody.push("podtržený text");
        if (duvody.length) nalezy.push({ druh: "vypada-klikatelne", duvody, text: popis(e), kde: sel(e) });
      }
      for (const a of document.querySelectorAll("a")) {
        if (!vid(a)) continue;
        const h = a.getAttribute("href");
        if (h === null) nalezy.push({ druh: "odkaz-bez-href", text: popis(a), kde: sel(a) });
        else if (h === "#" || h.startsWith("javascript:")) nalezy.push({ druh: "prazdny-odkaz", text: popis(a), href: h, kde: sel(a) });
        else if (h.startsWith("#") && !document.getElementById(decodeURIComponent(h.slice(1)))) nalezy.push({ druh: "kotva-nikam", text: popis(a), href: h, kde: sel(a) });
        else if (h.startsWith("/")) nalezy.push({ druh: "_interni", href: h, text: popis(a) });
      }
      for (const e of document.querySelectorAll("[title]")) if (vid(e) && !e.closest(INTER) && !["svg", "abbr", "iframe"].includes(e.tagName.toLowerCase())) nalezy.push({ druh: "title-bez-akce", text: popis(e), title: e.getAttribute("title").slice(0, 60), kde: sel(e) });
      return nalezy;
    });
    for (const n of staticke) {
      if (n.druh === "_interni") { if (!existuje(n.href)) VYSLEDEK.push({ stranka: s, zar, druh: "odkaz-na-neexistujici", text: n.text, href: n.href }); continue; }
      VYSLEDEK.push({ stranka: s, zar, ...n });
    }

    // 2) Dynamické: tlačítka a ovládací prvky — stane se po kliknutí něco?
    const pocet = await p.evaluate(() => {
      const L = [...document.querySelectorAll('button,summary,[role=button]:not(a),[role=tab],[role=radio],[role=switch],[role=checkbox],label')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && !e.disabled; });
      L.forEach((e, i) => e.setAttribute("data-audit", String(i)));
      return L.length;
    });
    for (let i = 0; i < pocet; i++) {
      if (p.url().split("#")[0] !== url.split("#")[0]) { await p.goto(url, { waitUntil: "networkidle" }).catch(() => {}); await p.waitForTimeout(200); await p.evaluate(() => { const L = [...document.querySelectorAll('button,summary,[role=button]:not(a),[role=tab],[role=radio],[role=switch],[role=checkbox],label')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && !e.disabled; }); L.forEach((e, j) => e.setAttribute("data-audit", String(j))); }); }
      const el = p.locator(`[data-audit="${i}"]`).first();
      if (!(await el.count()) || !(await el.isVisible().catch(() => false))) continue;
      const info = await el.evaluate((e) => ({ text: (e.getAttribute("aria-label") || e.innerText || e.getAttribute("title") || e.tagName).replace(/\s+/g, " ").trim().slice(0, 70), tag: e.tagName.toLowerCase(), type: e.getAttribute("type") }));
      if (/^(odmítnout|povolit)$/i.test(info.text)) continue;
      await p.evaluate(() => { window.__mut = 0; window.__obs?.disconnect(); window.__obs = new MutationObserver((m) => { window.__mut += m.length; }); window.__obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); window.__sc = scrollY; window.__open = 0; const o = window.open; window.open = (...a) => { window.__open++; return null; }; });
      const pred = p.url();
      let chyba = null;
      const popup = ctx.waitForEvent("page", { timeout: 600 }).catch(() => null);
      await el.click({ timeout: 1500, noWaitAfter: true }).catch((e) => { chyba = e.message.split("\n")[0].slice(0, 80); });
      const nova = await popup; if (nova) await nova.close();
      await p.waitForTimeout(300);
      const po = await p.evaluate(() => ({ mut: window.__mut ?? 0, sc: Math.abs(scrollY - (window.__sc ?? scrollY)), open: window.__open ?? 0 })).catch(() => ({ mut: 1, sc: 0, open: 0 }));
      const nav = p.url() !== pred;
      if (chyba) VYSLEDEK.push({ stranka: s, zar, druh: "nelze-kliknout", text: info.text, tag: info.tag, chyba });
      else if (!nav && !nova && po.mut === 0 && po.sc === 0 && po.open === 0) VYSLEDEK.push({ stranka: s, zar, druh: "klik-bez-efektu", text: info.text, tag: info.tag, type: info.type });
      await p.keyboard.press("Escape").catch(() => {});
    }
    fs.writeFileSync(process.env.VYSTUP || "audit-kliku.json", JSON.stringify(VYSLEDEK, null, 1));
    console.log("hotovo", zar, s, pocet);
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(process.env.VYSTUP || "audit-kliku.json", JSON.stringify(VYSLEDEK, null, 1));
console.log("nalezu", VYSLEDEK.length);
