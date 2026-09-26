"use client";

import { useEffect } from "react";
import { CLARITY_ID, POSTHOG_HOST, POSTHOG_KEY } from "@/config/web";

/*
  Souhlas s analytikou třetích stran (25. 9. 2026).

  Microsoft Clarity a PostHog ukládají cookies a Clarity nahrává průchod
  stránkou. Podle zákona o elektronických komunikacích a GDPR to smí jen se
  souhlasem, a zásady soukromí slibují, že bez něj nic takového neběží.
  Proto: lišta dole, dvě stejně velká tlačítka, volba se pamatuje v tomto
  prohlížeči, dá se kdykoli změnit v patičce („Nastavení analytiky“).
  Global Privacy Control = odmítnuto bez ptaní. Ve správě a v náhledu nic.

  Vlastní měření (komponenta Mereni) je jiná věc: bez cookies a bez
  identifikace, souhlas nepotřebuje.
*/
import { KLIC_SOUHLASU as KLIC } from "@/lib/souhlas-skript";
type Volba = "ano" | "ne" | null;

function nactiVolbu(): Volba {
  try { const v = localStorage.getItem(KLIC); return v === "ano" || v === "ne" ? v : null; } catch { return null; }
}
function ulozVolbu(v: Exclude<Volba, null>) {
  try { localStorage.setItem(KLIC, v); } catch { /* bez úložiště se zeptáme příště znovu */ }
}

let spusteno = false;
function spustAnalytiku() {
  if (spusteno) return;
  spusteno = true;
  // Microsoft Clarity — oficiální vkládací kód, jen po souhlasu.
  if (CLARITY_ID) {
    const w = window as unknown as { clarity?: ((...a: unknown[]) => void) & { q?: unknown[] } };
    w.clarity = w.clarity || function (...a: unknown[]) { (w.clarity!.q = w.clarity!.q || []).push(a); };
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
    document.head.appendChild(s);
    // Signál souhlasu pro EHP (Clarity consent API).
    w.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  }
  // PostHog — jen když je nastavený klíč projektu.
  if (POSTHOG_KEY) {
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        respect_dnt: true,
        mask_all_text: false,
        session_recording: { maskAllInputs: true },
      });
    }).catch(() => { /* bez analytiky web funguje stejně */ });
  }
}

/** Otevře lištu znovu (odkaz v patičce). */
export function otevriNastaveniAnalytiky() {
  window.dispatchEvent(new Event("cp:analytika-nastaveni"));
}

/*
  Lišta je vždy v HTML; ukazuje ji atribut <html data-souhlas="ptat">, který
  nastaví skript v <head> ještě před vykreslením (src/lib/souhlas-skript.ts).
  React ji jen zavírá a znovu otevírá — nečeká se na něj.
*/
const otevri = (ano: boolean) => {
  if (ano) document.documentElement.dataset.souhlas = "ptat";
  else delete document.documentElement.dataset.souhlas;
};

export function SouhlasAnalytika() {
  useEffect(() => {
    if (location.pathname.startsWith("/sprava")) return;
    if (document.documentElement.dataset.nahled === "1") return;
    if (nactiVolbu() === "ano") spustAnalytiku();
    const znovu = () => otevri(true);
    window.addEventListener("cp:analytika-nastaveni", znovu);
    return () => window.removeEventListener("cp:analytika-nastaveni", znovu);
  }, []);

  const rozhodni = (v: "ano" | "ne") => {
    const predtim = nactiVolbu();
    ulozVolbu(v);
    otevri(false);
    if (v === "ano") spustAnalytiku();
    // Odvolání souhlasu po spuštění: skripty už běží, čistý stav až po obnovení.
    else if (predtim === "ano") location.reload();
  };
  return (
    <div role="dialog" aria-label="Souhlas s analytikou" className="souhlas-lista fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-[75] px-3 md:bottom-4">
      <div className="mx-auto flex max-w-[680px] flex-wrap items-center gap-3 rounded-[18px] border border-linka bg-plocha px-4 py-3 shadow-[0_12px_40px_rgb(0_0_0/0.35)]">
        <p className="min-w-[16rem] flex-1 text-male leading-snug text-tlum">
          Smíme měřit, jak se web používá (Microsoft Clarity, PostHog)? Pomáhá nám to zlepšovat přehlednost. Ukládá to cookies; bez souhlasu nic z toho neběží. <a href="/soukromi/#analytika" className="odkaz">Podrobnosti</a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => rozhodni("ne")} className="min-h-[40px] rounded-full border border-linka px-4 text-male font-semibold text-inkoust hover:border-akcent">Odmítnout</button>
          <button type="button" onClick={() => rozhodni("ano")} className="min-h-[40px] rounded-full border border-linka px-4 text-male font-semibold text-inkoust hover:border-akcent">Povolit</button>
        </div>
      </div>
    </div>
  );
}

/** Odkaz do patičky. */
export function OdkazNastaveniAnalytiky({ trida = "" }: { trida?: string }) {
  return <button type="button" onClick={otevriNastaveniAnalytiky} className={trida}>Nastavení analytiky</button>;
}
