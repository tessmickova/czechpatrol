"use client";

import { useEffect, useState } from "react";

/*
  Přepínač pohybu na stránce.

  Pohyb je vypnutý, dokud si ho někdo sám nezapne. Parallax, odkrývací nálety
  a běžící pás zemí jsou pro část návštěvníků — migréna, světloplachost,
  vestibulární obtíže, rozptýlená pozornost — překážka, ne ozdoba. Pauza při
  najetí myší jim nepomůže: na dotyku ani při ovládání klávesnicí není kam najet.

  Volba se ukládá do prohlížeče a nastavuje se ještě před vykreslením
  (skript v layoutu), aby stránka nezačala běžet a pak se nezastavila.
*/

export const KLIC_POHYBU = "cp-pohyb";
export const KLIC_MOTIVU = "cp-motiv";

/** Běží v <head> před vykreslením. Bez něj by pohyb na okamžik problikl. */
export const SKRIPT_POHYBU =
  `try{var d=document.documentElement;` +
  `if(localStorage.getItem("${KLIC_POHYBU}")==="zapnuty")d.dataset.pohyb="zapnuty";` +
  `var m=localStorage.getItem("${KLIC_MOTIVU}");if(m==="svetly"||m==="tmavy")d.dataset.motiv=m;` +
  `}catch(e){}`;

export function PrepinacPohybu() {
  const [zapnuty, setZapnuty] = useState(false);

  useEffect(() => {
    try {
      setZapnuty(localStorage.getItem(KLIC_POHYBU) === "zapnuty");
    } catch {
      // Zamčené úložiště. Pohyb zůstane vypnutý — to je bezpečná strana.
    }
  }, []);

  function prepni() {
    const novy = !zapnuty;
    setZapnuty(novy);
    if (novy) document.documentElement.dataset.pohyb = "zapnuty";
    else delete document.documentElement.dataset.pohyb;
    try {
      localStorage.setItem(KLIC_POHYBU, novy ? "zapnuty" : "vypnuty");
    } catch {
      // Neuložilo se. Pro tuhle návštěvu to platí, po zavření se to vrátí.
    }
  }

  return (
    <button
      type="button"
      onClick={prepni}
      aria-pressed={zapnuty}
      className="min-h-[44px] text-left text-zaklad text-noc-tlum underline underline-offset-4 hover:text-noc-text"
    >
      Pohyb na stránce: {zapnuty ? "zapnutý" : "vypnutý"}
    </button>
  );
}

type Motiv = "system" | "svetly" | "tmavy";

/*
  Výchozí je tmavý, ne nastavení systému. Tmavá je součást značky a nikdo
  na web nemá přistát na bílé ploše; světlý je vědomá volba pro toho,
  komu tmavé pozadí nevyhovuje.
*/
const NAZVY_MOTIVU: Record<Motiv, string> = {
  system: "tmavý (výchozí)",
  svetly: "světlý",
  tmavy: "tmavý",
};

/*
  Přepínač světlého a tmavého režimu.

  Výchozí je nastavení systému. Žádný z režimů není univerzálně lepší:
  pro část lidí je tmavý web hůř čitelný, pro jinou je bílá plocha
  nesnesitelná. Volba se ukládá a nastavuje se před vykreslením, aby
  stránka neproblikla opačným motivem.
*/
export function PrepinacMotivu() {
  const [motiv, setMotiv] = useState<Motiv>("system");

  useEffect(() => {
    try {
      const m = localStorage.getItem(KLIC_MOTIVU);
      if (m === "svetly" || m === "tmavy") setMotiv(m);
    } catch {
      // Zamčené úložiště: zůstane volba podle systému.
    }
  }, []);

  function nastav(novy: Motiv) {
    setMotiv(novy);
    if (novy === "system") delete document.documentElement.dataset.motiv;
    else document.documentElement.dataset.motiv = novy;
    try {
      if (novy === "system") localStorage.removeItem(KLIC_MOTIVU);
      else localStorage.setItem(KLIC_MOTIVU, novy);
    } catch {
      // Neuložilo se; pro tuhle návštěvu to platí.
    }
  }

  return (
    <fieldset className="border-0 p-0">
      <legend className="text-zaklad text-noc-tlum">Vzhled</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {(["system", "svetly"] as Motiv[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => nastav(m)}
            aria-pressed={motiv === m}
            className={`min-h-[44px] rounded-full px-3.5 text-male ${
              motiv === m ? "bg-noc-text text-noc2 font-semibold" : "text-noc-tlum hover:text-noc-text"
            }`}
          >
            {NAZVY_MOTIVU[m]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
