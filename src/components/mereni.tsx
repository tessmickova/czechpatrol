"use client";

import { useEffect } from "react";
import { API_URL } from "@/config/web";

/*
  Měření návštěvnosti bez identifikace (25. 9. 2026).

  Posílá do API jen: zobrazení stránky (cesta, odkud, druh zařízení),
  kliknutí na odkaz nebo tlačítko (název prvku, poloha v procentech) a
  jednou za sekundu hrubou polohu myši. Žádné cookies, žádný identifikátor,
  žádná IP v naší databázi (API ji neukládá). Do Not Track a Global Privacy
  Control se ctí: pak se neposílá nic. Ve správě a v náhledu se neměří.
*/
type Druh = "zobrazeni" | "klik" | "pohyb";
interface Udalost { druh: Druh; cesta: string; prvek?: string; odkud?: string; zarizeni?: string; x?: number; y?: number }

function zarizeni(): string {
  const w = window.innerWidth;
  return w < 640 ? "mobil" : w < 1024 ? "tablet" : "pocitac";
}
function odkud(): string {
  const r = document.referrer;
  if (!r) return "primo";
  try {
    const h = new URL(r).hostname;
    if (h === location.hostname) return "web";
    if (/google\.|seznam\.cz|bing\.com|duckduckgo|yahoo\.|ecosia/.test(h)) return "vyhledavac";
    if (/facebook|instagram|twitter|x\.com|t\.co|bsky|threads|linkedin|reddit|mastodon|telegram|t\.me|whatsapp/.test(h)) return "socialni";
    return "web";
  } catch { return "primo"; }
}
function popisPrvku(el: Element): string | null {
  const c = el.closest("a, button, summary, [role=button], [role=tab], [data-mereni]") as HTMLElement | null;
  if (!c) return null;
  const vlastni = c.getAttribute("data-mereni");
  if (vlastni) return vlastni;
  const aria = c.getAttribute("aria-label");
  const text = (c.textContent ?? "").replace(/\s+/g, " ").trim();
  const href = c instanceof HTMLAnchorElement ? c.getAttribute("href") : null;
  return (text || aria || href || c.tagName.toLowerCase()).slice(0, 80);
}

export function Mereni() {
  useEffect(() => {
    if (!API_URL) return;
    if (location.pathname.startsWith("/sprava")) return;
    if (document.documentElement.dataset.nahled === "1") return;
    const n = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (n.doNotTrack === "1" || n.globalPrivacyControl) return;

    const cesta = location.pathname;
    const zar = zarizeni();
    let fronta: Udalost[] = [{ druh: "zobrazeni", cesta, odkud: odkud(), zarizeni: zar }];
    const vyskaStranky = () => Math.max(1, document.documentElement.scrollHeight);
    const poloha = (e: MouseEvent) => ({ x: Math.round((e.clientX / window.innerWidth) * 100), y: Math.round(((e.clientY + window.scrollY) / vyskaStranky()) * 100) });

    const odesli = () => {
      if (!fronta.length) return;
      const telo = JSON.stringify({ udalosti: fronta.slice(0, 60) });
      fronta = [];
      try {
        if (navigator.sendBeacon) { navigator.sendBeacon(`${API_URL}/mereni`, new Blob([telo], { type: "application/json" })); return; }
      } catch { /* níže obyčejný fetch */ }
      fetch(`${API_URL}/mereni`, { method: "POST", headers: { "Content-Type": "application/json" }, body: telo, keepalive: true }).catch(() => {});
    };

    const klik = (e: MouseEvent) => {
      const prvek = e.target instanceof Element ? popisPrvku(e.target) : null;
      if (!prvek) return;
      fronta.push({ druh: "klik", cesta, prvek, zarizeni: zar, ...poloha(e) });
    };
    let posledni = 0;
    const pohyb = (e: MouseEvent) => {
      const t = Date.now();
      if (t - posledni < 1000) return;
      posledni = t;
      fronta.push({ druh: "pohyb", cesta, zarizeni: zar, ...poloha(e) });
      if (fronta.length >= 40) odesli();
    };
    const skryto = () => { if (document.visibilityState === "hidden") odesli(); };
    document.addEventListener("click", klik, { capture: true, passive: true });
    document.addEventListener("mousemove", pohyb, { passive: true });
    document.addEventListener("visibilitychange", skryto);
    window.addEventListener("pagehide", odesli);
    const casovac = window.setInterval(odesli, 15_000);
    const prvni = window.setTimeout(odesli, 1500);
    return () => {
      document.removeEventListener("click", klik, { capture: true } as EventListenerOptions);
      document.removeEventListener("mousemove", pohyb);
      document.removeEventListener("visibilitychange", skryto);
      window.removeEventListener("pagehide", odesli);
      clearInterval(casovac); clearTimeout(prvni);
      odesli();
    };
  }, []);
  return null;
}
