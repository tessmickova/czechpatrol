"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cislem, porovnejSPrumerem, prumerNaOkno, type Porovnani } from "@/lib/porovnani";
import { Odznak } from "./ui";
import { sklon } from "./zeme";

/*
  Kolik toho přibylo dnes, za týden, za měsíc a za čtvrtletí.

  Počítá se v prohlížeči podle hodin návštěvníka, ne při sestavení webu.
  Bez toho by číslo „dnes“ zůstalo viset na stavu z posledního sestavení
  a po půlnoci ukazovalo včerejšek.

  Počítají se případy A manipulační operace. Útok na to, čemu lidé věří,
  je útok — a když se nepočítá, ukazuje web klid ve chvíli, kdy proti
  občanům běží doložená kampaň. Pokračování případu, úřední opatření ani
  prohlášení číslo nezvyšují.

  U čtvrtletí stojí navíc porovnání s průměrem. Samotné „14 za 90 dní“
  totiž neřekne, jestli je to klid, nebo nejhorší čtvrtletí za dva roky.
*/

export interface PolozkaPoctu {
  /** Datum zjištění v ISO. Podle něj se položka započítává do dne. */
  kdy: string;
  cz: boolean;
  /** Kampaň se počítá taky, ale musí jít poznat, kolik jich je. */
  kampan?: boolean;
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
  const prumer = prumerNaOkno(polozky.map((p) => p.kdy), 90, ted);
  return {
    dnes: polozky.filter((p) => denPraha(new Date(p.kdy).getTime()) === dnes).length,
    tyden: vOkne(7),
    mesic: vOkne(30),
    ctvrtleti: vOkne(90),
    rok: polozky.filter((p) => p.kdy.startsWith(rok)).length,
    celkem: polozky.length,
    kampani: polozky.filter((p) => p.kampan).length,
    cesko90: polozky.filter((p) => p.cz && ted - new Date(p.kdy).getTime() <= 90 * 86_400_000).length,
    ceskoCelkem: polozky.filter((p) => p.cz).length,
    porovnani: porovnejSPrumerem(vOkne(90), prumer),
    nazevRoku: rok,
  };
}

/** Slovní porovnání jako odznak. Barva jen tam, kde je odchylka skutečná. */
function OdznakPorovnani({ p }: { p: Porovnani | null }) {
  if (!p) return null;
  return (
    <Odznak ton={p.smer === "vyssi" ? "pozor" : p.smer === "nizsi" ? "klid" : "neutral"} duraz="silny" trida="mt-1.5 self-start">
      {p.slovo} než průměr
    </Odznak>
  );
}

function Cislo({
  n, popis, odkaz, zvyraznit = false, podtext, odznak,
}: {
  n: number; popis: string; odkaz: string; zvyraznit?: boolean; podtext?: string; odznak?: React.ReactNode;
}) {
  return (
    <Link
      href={odkaz}
      className="group flex min-w-0 flex-1 flex-col gap-1 rounded-[18px] border border-linka2 bg-plocha px-4 py-4 transition-colors hover:border-akcent sm:px-5 sm:py-5"
    >
      <span className={`cislice text-[34px] font-bold leading-none sm:text-[44px] ${zvyraznit && n > 0 ? "text-akcent" : "text-inkoust"}`}>{n}</span>
      <span className="text-[13px] leading-tight text-tlum">{popis}</span>
      {podtext && <span className="text-[11.5px] leading-tight text-tlum2">{podtext}</span>}
      {odznak}
    </Link>
  );
}

function useZiveHodiny(ted: number) {
  const [cas, setCas] = useState(ted);
  useEffect(() => {
    setCas(Date.now());
    // Přepočet po minutě stačí; číslo se mění nanejvýš jednou za hodinu.
    const t = setInterval(() => setCas(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return cas;
}

/** Velká počítadla pod hlavičkou: kolik toho přibylo a za jak dlouho. */
export function PocitadlaEvropa({ polozky, ted }: { polozky: PolozkaPoctu[]; ted: number }) {
  const o = spocitejOkna(polozky, useZiveHodiny(ted));
  return (
    <section aria-label="Kolik incidentů přibylo" className="mt-4">
      <div className="flex flex-wrap gap-2.5 sm:gap-3">
        <Cislo n={o.dnes} popis="dnes" odkaz="/udalosti/?obdobi=7d" zvyraznit />
        <Cislo n={o.tyden} popis="za 7 dní" odkaz="/udalosti/?obdobi=7d" />
        <Cislo n={o.mesic} popis="za 30 dní" odkaz="/udalosti/?obdobi=30d" />
        <Cislo n={o.ctvrtleti} popis="za 90 dní" odkaz="/udalosti/?obdobi=30d" odznak={<OdznakPorovnani p={o.porovnani} />} />
        <Cislo n={o.celkem} popis="celkem od roku 2014" odkaz="/udalosti/" podtext={`z toho ${o.kampani} ${sklon(o.kampani, "operace", "operace", "operací")} proti občanům`} />
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-tlum2">
        Případy a manipulační operace v Evropě podle dne, kdy vyšly najevo. V Česku {o.cesko90} za 90 dní,
        {" "}{o.ceskoCelkem} celkem. Počítá se v prohlížeči, takže „dnes“ platí i mezi sestaveními webu.
        {o.porovnani && (
          <> Průměr za poslední dva roky je {cislem(o.porovnani.prumer)} na čtvrtletí.</>
        )}{" "}
        Nula znamená, že dosud nic neprošlo ověřením — ne že se nic nestalo.
      </p>
    </section>
  );
}

/** Táž počítadla pro jednu zemi. „V Česku“ tu nedává smysl, proto vlastní sada. */
export function PocitadlaZeme({ polozky, ted, nazev }: { polozky: PolozkaPoctu[]; ted: number; nazev: string }) {
  const o = spocitejOkna(polozky, useZiveHodiny(ted));
  return (
    <section aria-label={`Kolik incidentů přibylo — ${nazev}`} className="mt-10">
      <div className="flex flex-wrap gap-2.5 sm:gap-3">
        <Cislo n={o.dnes} popis="dnes" odkaz="#zaznamy" zvyraznit />
        <Cislo n={o.tyden} popis="za 7 dní" odkaz="#zaznamy" />
        <Cislo n={o.mesic} popis="za 30 dní" odkaz="#zaznamy" />
        <Cislo n={o.ctvrtleti} popis="za 90 dní" odkaz="#zaznamy" odznak={<OdznakPorovnani p={o.porovnani} />} />
        <Cislo
          n={o.celkem}
          popis="celkem od roku 2014"
          odkaz="#zaznamy"
          podtext={o.kampani ? `z toho ${o.kampani} ${sklon(o.kampani, "operace", "operace", "operací")} proti občanům` : undefined}
        />
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-tlum2">
        Případy a manipulační operace podle dne, kdy vyšly najevo. Počítá se v prohlížeči, takže „dnes“ platí
        i mezi sestaveními webu.
        {o.porovnani && <> Průměr za poslední dva roky je {cislem(o.porovnani.prumer)} na čtvrtletí.</>}
      </p>
    </section>
  );
}
