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

/** Běží v <head> před vykreslením. Bez něj by pohyb na okamžik problikl. */
export const SKRIPT_POHYBU = `try{if(localStorage.getItem("${KLIC_POHYBU}")==="zapnuty")document.documentElement.dataset.pohyb="zapnuty"}catch(e){}`;

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
      className="min-h-[44px] text-left text-[14px] text-noc-tlum underline underline-offset-4 hover:text-noc-text"
    >
      Pohyb na stránce: {zapnuty ? "zapnutý" : "vypnutý"}
    </button>
  );
}
