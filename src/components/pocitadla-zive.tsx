"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/*
  Kolik případů přibylo dnes, za týden a za měsíc.

  Počítá se v prohlížeči podle hodin návštěvníka, ne při sestavení webu.
  Bez toho by číslo „dnes“ zůstalo viset na stavu z posledního sestavení
  a po půlnoci ukazovalo včerejšek. Server vykreslí čísla ke svému času,
  prohlížeč je hned po načtení přepočítá — proto se obojí musí shodovat
  ve vstupních datech.

  Počítají se jen případy, tedy skutečné události. Pokračování případu,
  úřední opatření ani prohlášení číslo nezvyšují.
*/

export interface PolozkaPoctu {
  /** Datum zjištění v ISO. Podle něj se událost započítává do dne. */
  kdy: string;
  cz: boolean;
}

function denPraha(cas: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(cas));
}

export function spocitejOkna(polozky: PolozkaPoctu[], ted: number) {
  const dnes = denPraha(ted);
  const rok = dnes.slice(0, 4);
  const vOkne = (dni: number) => polozky.filter((p) => ted - new Date(p.kdy).getTime() <= dni * 86_400_000).length;
  return {
    dnes: polozky.filter((p) => denPraha(new Date(p.kdy).getTime()) === dnes).length,
    tyden: vOkne(7),
    mesic: vOkne(30),
    rok: polozky.filter((p) => p.kdy.startsWith(rok)).length,
    celkem: polozky.length,
    cesko30: polozky.filter((p) => p.cz && ted - new Date(p.kdy).getTime() <= 30 * 86_400_000).length,
    nazevRoku: rok,
  };
}

function Cislo({ n, popis, odkaz, zvyraznit = false }: { n: number; popis: string; odkaz: string; zvyraznit?: boolean }) {
  return (
    <Link
      href={odkaz}
      className="group flex min-w-0 flex-1 flex-col gap-1 rounded-[18px] border border-linka2 bg-plocha px-4 py-4 transition-colors hover:border-akcent sm:px-5 sm:py-5"
    >
      <span className={`cislice text-[34px] font-bold leading-none sm:text-[44px] ${zvyraznit && n > 0 ? "text-akcent" : "text-inkoust"}`}>{n}</span>
      <span className="text-[13px] leading-tight text-tlum">{popis}</span>
    </Link>
  );
}

/** Velká počítadla pod hlavičkou: kolik případů přibylo a za jak dlouho. */
export function PocitadlaEvropa({ polozky, ted }: { polozky: PolozkaPoctu[]; ted: number }) {
  const [cas, setCas] = useState(ted);
  useEffect(() => {
    setCas(Date.now());
    // Přepočet po minutě stačí; číslo se mění nanejvýš jednou za hodinu.
    const t = setInterval(() => setCas(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const o = spocitejOkna(polozky, cas);
  return (
    <section aria-label="Kolik případů přibylo" className="mt-4">
      <div className="flex flex-wrap gap-2.5 sm:gap-3">
        <Cislo n={o.dnes} popis="dnes" odkaz="/udalosti/?obdobi=7d" zvyraznit />
        <Cislo n={o.tyden} popis="za 7 dní" odkaz="/udalosti/?obdobi=7d" />
        <Cislo n={o.mesic} popis="za 30 dní" odkaz="/udalosti/?obdobi=30d" />
        <Cislo n={o.rok} popis={`v roce ${o.nazevRoku}`} odkaz="/udalosti/?obdobi=letos" />
        <Cislo n={o.cesko30} popis="v Česku za 30 dní" odkaz="/udalosti/?zeme=CZ&obdobi=30d" />
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-tlum2">
        Případy v Evropě podle dne, kdy vyšly najevo. Počítá se v prohlížeči, takže „dnes“ platí i mezi
        sestaveními webu. Nula znamená, že dosud nic neprošlo ověřením — ne že se nic nestalo.
      </p>
    </section>
  );
}

/** Táž počítadla pro jednu zemi. „V Česku“ tu nedává smysl, proto vlastní sada. */
export function PocitadlaZeme({ polozky, ted, nazev }: { polozky: PolozkaPoctu[]; ted: number; nazev: string }) {
  const [cas, setCas] = useState(ted);
  useEffect(() => {
    setCas(Date.now());
    const t = setInterval(() => setCas(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const o = spocitejOkna(polozky, cas);
  return (
    <section aria-label={`Kolik případů přibylo — ${nazev}`} className="mt-10">
      <div className="flex flex-wrap gap-2.5 sm:gap-3">
        <Cislo n={o.dnes} popis="dnes" odkaz="#zaznamy" zvyraznit />
        <Cislo n={o.tyden} popis="za 7 dní" odkaz="#zaznamy" />
        <Cislo n={o.mesic} popis="za 30 dní" odkaz="#zaznamy" />
        <Cislo n={o.rok} popis={`v roce ${o.nazevRoku}`} odkaz="#zaznamy" />
        <Cislo n={o.celkem} popis="od roku 2014" odkaz="#zaznamy" />
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-tlum2">
        Případy podle dne, kdy vyšly najevo. Počítá se v prohlížeči, takže „dnes“ platí i mezi sestaveními webu.
      </p>
    </section>
  );
}
