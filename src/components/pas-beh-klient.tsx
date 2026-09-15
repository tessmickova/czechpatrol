"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
  Běžící pás zemí.

  Dřív to byla animace CSS (transform) vázaná na přepínač pohybu. Měla dvě
  vady: s vypnutým pohybem — a ten je vypnutý, dokud si ho někdo nezapne —
  pás stál úplně, a i když běžel, nedal se prstem posunout, protože posouvání
  transformem a rolování jsou dvě různé věci.

  Teď se posouvá skutečné rolování (`scrollLeft`). Z toho plyne obojí naráz:
  pás sám pomalu jede a zároveň se dá kdykoli chytit a odtáhnout. Po dotyku
  se na chvíli zastaví, aby člověku neujížděl pod prstem.

  Kdo má v systému nastavené omezení pohybu, nedostane pohyb žádný. Tohle je
  jediná výjimka z přepínače pohybu na stránce: ten dál řídí parallax a
  nálety, ale pás jede i bez něj — je to jediné místo, kde pohyb nese
  informaci (že je pás delší, než je vidět).
*/

/** Pixelů za sekundu. Pomalu: pás je na čtení, ne na chytání. */
const RYCHLOST = 22;
/** Jak dlouho po dotyku zůstane stát. */
const KLID_MS = 2500;

export function PasBeh({ children }: { children: ReactNode }) {
  const obal = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = obal.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let bezi = true;
    let doKdy = 0;
    /*
      Vlastní posun taky vyvolá událost „scroll". Bez téhle značky si pás
      sám sobě pořád nastavoval pauzu a stál — jel a hned se zastavil,
      jel a hned se zastavil, každý snímek dokola.
    */
    let vlastni = false;
    let posledni = performance.now();
    let snimek = 0;
    /*
      Pozice se drží zvlášť jako desetinné číslo.

      Při 22 px za sekundu připadá na jeden snímek 0,37 px. Prohlížeč ale
      `scrollLeft` zaokrouhlí, takže přečtená hodnota byla pořád stejná,
      přičítalo se k ní znovu 0,37 a pás stál na místě. Sčítá se proto
      vlastní součet a do `scrollLeft` se zapisuje výsledek.
    */
    let pozice = el.scrollLeft;

    const pauza = () => {
      if (vlastni) { vlastni = false; return; }
      /* Člověk pásem pohnul: navázat tam, kde ho nechal. */
      pozice = el.scrollLeft;
      doKdy = performance.now() + KLID_MS;
    };
    const krok = (ted: number) => {
      const dt = ted - posledni;
      posledni = ted;
      /*
        Polovina šířky je jedna sada položek — druhá je kopie. Jakmile první
        sada odjede, vrátíme se o ni zpět a přechod není vidět.
      */
      const pulka = el.scrollWidth / 2;
      if (bezi && ted > doKdy && !document.hidden && pulka > 0) {
        pozice += (RYCHLOST * dt) / 1000;
        if (pozice >= pulka) pozice -= pulka;
        vlastni = true;
        el.scrollLeft = pozice;
      }
      snimek = requestAnimationFrame(krok);
    };
    snimek = requestAnimationFrame(krok);

    const stop = () => { bezi = false; };
    const start = () => { bezi = true; pauza(); };
    el.addEventListener("pointerenter", stop);
    el.addEventListener("pointerleave", start);
    el.addEventListener("pointerdown", stop);
    el.addEventListener("focusin", stop);
    el.addEventListener("focusout", start);
    /* Prst i kolečko mají přednost před během. */
    el.addEventListener("scroll", pauza, { passive: true });
    window.addEventListener("pointerup", start);

    return () => {
      cancelAnimationFrame(snimek);
      el.removeEventListener("pointerenter", stop);
      el.removeEventListener("pointerleave", start);
      el.removeEventListener("pointerdown", stop);
      el.removeEventListener("focusin", stop);
      el.removeEventListener("focusout", start);
      el.removeEventListener("scroll", pauza);
      window.removeEventListener("pointerup", start);
    };
  }, []);

  return (
    <div
      ref={obal}
      /*
        touch-pan-x: prohlížeč ví, že vodorovné tažení patří pásu, a nečeká,
        jestli z něj nebude svislé rolování stránky. Bez toho je tažení prstem
        na mobilu znatelně líné.
      */
      className="pas-scroll min-w-0 flex-1 touch-pan-x overflow-x-auto overscroll-x-contain py-1.5"
    >
      <div className="flex w-max">{children}</div>
    </div>
  );
}
