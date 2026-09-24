"use client";

import Link from "next/link";
import { useZiveHodiny } from "@/lib/cas-klient";
import { cislem, porovnejSPrumerem, prumerNaOkno, type Porovnani } from "@/lib/porovnani";
import { Odznak } from "./ui";
import { sklon } from "./zeme";
import { Napoveda } from "./zaklad";

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
      {p.slovo}
    </Odznak>
  );
}

/*
  Jedno počítadlo.

  Na úzkém displeji se pět počítadel do jedné řady nevejde — čísla se sice
  udrží, ale popisky se lámou po slabikách a odznak přeteče přes okraj.
  Mřížka je proto na mobilu třísloupcová a teprve od `sm` se dlaždice
  roztáhnou do řady.

  Rámeček má celá skupina, ne každé číslo zvlášť. Pět orámovaných kartiček
  vedle sebe vypadalo jako pět nesouvisejících věcí, přitom je to jedna
  řada téhož údaje v různých oknech.
*/
function Cislo({
  n, popis, odkaz, zvyraznit = false, podtext, odznak,
}: {
  n: number; popis: string; odkaz: string; zvyraznit?: boolean; podtext?: string; odznak?: React.ReactNode;
}) {
  return (
    <Link
      href={odkaz}
      className="dlazdice-stav group flex min-w-0 flex-col gap-1 px-3.5 py-3.5 hover:bg-plocha2 sm:flex-1 sm:px-5 sm:py-5"
    >
      <span className={`cislice text-cislo-l font-bold leading-none sm:text-cislo-xl ${zvyraznit && n > 0 ? "text-akcent" : "text-inkoust"}`}>{n}</span>
      <span className="text-drobne leading-tight text-tlum sm:text-male">{popis}</span>
      {podtext && <span className="text-mikro leading-tight text-tlum2">{podtext}</span>}
      {odznak}
    </Link>
  );
}

/*
  Řádek počítadel v liště pod menu.

  Čísla stála v úvodu pod budíky, s větou o tom, co se do nich počítá.
  Úvod má být čistý — jedna věta, budíky, dvě tlačítka — a pět čísel
  s vysvětlivkou v něm byl další odstavec ke čtení. V liště nad pásem
  zemí sedí lépe: pás říká „kde", tenhle řádek „kolik a za jak dlouho",
  a obojí je na stejném místě na každé návštěvě.

  Jeden řádek, na střed, na mobilu se roluje. Bez vysvětlivky: co se
  počítá a co ne, je na stránce Události, kam každé číslo vede.
*/
export function PasPocitadel({ polozky, ted }: { polozky: PolozkaPoctu[]; ted: number }) {
  const o = spocitejOkna(polozky, useZiveHodiny(ted));
  const okna = [
    { n: o.dnes, popis: "dnes", kam: "/udalosti/?obdobi=7d", zvyraznit: true },
    { n: o.tyden, popis: "za 7 dní", kam: "/udalosti/?obdobi=7d" },
    { n: o.mesic, popis: "za 30 dní", kam: "/udalosti/?obdobi=30d" },
    { n: o.ctvrtleti, popis: "za 90 dní", kam: "/udalosti/?obdobi=90d" },
    { n: o.celkem, popis: "od roku 2014", kam: "/udalosti/" },
  ];
  return (
    <ul className="pas-scroll flex items-baseline gap-x-5 overflow-x-auto sm:justify-center" aria-label="Kolik incidentů přibylo">
      {okna.map((x) => (
        <li key={x.popis} className="shrink-0">
          <Link href={x.kam} className="group flex min-h-[32px] items-baseline gap-1.5 py-1">
            <span className={`cislice text-zaklad font-bold leading-none ${x.zvyraznit && x.n > 0 ? "text-akcent" : "text-inkoust"}`}>{x.n}</span>
            <span className="text-mikro text-tlum2 group-hover:text-inkoust">{x.popis}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Táž počítadla pro jednu zemi. „V Česku“ tu nedává smysl, proto vlastní sada. */
export function PocitadlaZeme({ polozky, ted, nazev }: { polozky: PolozkaPoctu[]; ted: number; nazev: string }) {
  const o = spocitejOkna(polozky, useZiveHodiny(ted));
  return (
    <section aria-label={`Kolik incidentů přibylo — ${nazev}`} className="mt-10">
      <div className="grid grid-cols-3 divide-x overflow-hidden rounded-[20px] bg-plocha sm:flex sm:divide-y-0">
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
      {o.porovnani && (
        <p className="mt-2.5 text-drobne text-tlum2">
          <Napoveda popis={
            <span className="block">
              Případy a operace proti občanům podle dne, kdy vyšly najevo. „Dnes“ počítá váš prohlížeč.
            </span>
          }>
            <span className="odkaz">Průměr za poslední dva roky: {cislem(o.porovnani.prumer)} na čtvrtletí.</span>
          </Napoveda>
        </p>
      )}
    </section>
  );
}
