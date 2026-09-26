"use client";

import Link from "next/link";
import { druh, kdyZjisteno, pachatelPotvrzen, podlePuvodce, podleZemi, pripady, uredniZdroj, vyber, type Zaznam } from "@/lib/agregace";
import { useZiveHodiny } from "@/lib/cas-klient";
import { useT } from "@/lib/i18n";
import { cislem, porovnejSPrumerem, prumerNaOkno } from "@/lib/porovnani";
import type { HybridniTlak, Kampan } from "@/lib/typy";
import { NadpisSekce } from "./nadpisy";
import { PavucinaHrozeb } from "./pavucina";
import { TabulkaZemi, type RadekTabulkyZemi } from "./tabulka-zemi";
import { Odznak, Tlacitko } from "./ui";
import { Otaznik } from "./zaklad";
import { sklon, Vlajka } from "./zeme";

/*
  Typy evidovaných událostí a čísla „kolik, kde, kdo“.

  Dřív na úvodní straně; teď první sekce Analýz. Úvod má odpovídat na
  „děje se něco?“ a nabídnout tři cesty dál; rozbor dat patří tam, kde
  člověk rozbor hledá. Výpočty jsou stejné jako dřív a běží z živého času.
*/

function Cislo({ n, slovo }: { n: number; slovo: string }) {
  return (
    <span className="flex flex-col rounded-[18px] bg-plocha px-3 py-2">
      <span className="cislice text-cislo font-bold leading-none text-inkoust">{n}</span>
      <span className="mt-1 text-mikro leading-tight text-tlum">{slovo}</span>
    </span>
  );
}

function Pruh({ nazev, n, max, barva, odkaz }: { nazev: React.ReactNode; n: number; max: number; barva: string; odkaz?: string }) {
  const telo = (
    <>
      <span className="flex w-[118px] shrink-0 items-center gap-1.5 truncate text-drobne text-inkoust">{nazev}</span>
      <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-linka2"><span className={`block h-full ${barva}`} style={{ width: `${max ? (n / max) * 100 : 0}%` }} /></span>
      <span className="cislice w-6 shrink-0 text-right text-male font-bold text-inkoust">{n}</span>
    </>
  );
  return odkaz ? <Link href={odkaz} className="flex min-h-[36px] items-center gap-2 hover:bg-plocha">{telo}</Link> : <span className="flex min-h-[36px] items-center gap-2">{telo}</span>;
}

export function TypyUdalosti({ tlakEvropa, tabulka }: { tlakEvropa: HybridniTlak; tabulka: RadekTabulkyZemi[] }) {
  const t = useT();
  return (
    <section className="nalet">
      <NadpisSekce
        stitek="Typy událostí"
        nadpis={t("Typy evidovaných událostí")}
        popis="Nejvyšší doložená úroveň v každé oblasti od roku 2014. Prázdné pole = odtud žádný doložený záznam."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-x-16">
        <PavucinaHrozeb
          nadpis="Evropa jako celek"
          popis={t("Všechny sledované země od roku 2014.")}
          tlak={tlakEvropa}
          odkaz={{ href: "/metodika/", text: "jak se hodnotí →" }}
          velikostObrazce={260}
          sPopisky
        />
        <TabulkaZemi zeme={tabulka} />
      </div>
    </section>
  );
}

export function CislaKdeKdo({ vse, kampane, ted }: { vse: Zaznam[]; kampane: Kampan[]; ted: number }) {
  const t = useT();
  const tedMs = useZiveHodiny(ted);
  const dni90 = pripady(vse, { dni: 90, ted: tedMs });
  const kampaneVOkne = (dni: number) => kampane.filter((k) => tedMs - new Date(k.odhaleno).getTime() <= dni * 86_400_000).length;
  const zapocitatelne90 = dni90.length + kampaneVOkne(90);
  const casyZapocitatelne = [...vse.filter((i) => druh(i) === "pripad").map((i) => kdyZjisteno(i)), ...kampane.map((k) => k.odhaleno)];
  const porovnani90 = porovnejSPrumerem(zapocitatelne90, prumerNaOkno(casyZapocitatelne, 90, tedMs));
  const zemi = new Set(dni90.map((i) => i.kodZeme)).size;
  const cz = dni90.filter((i) => i.kodZeme === "CZ").length;
  const potvrzeno = dni90.filter(pachatelPotvrzen).length;
  const uredni = dni90.filter(uredniZdroj).length;
  const rok = new Date(tedMs).getUTCFullYear();
  const letos = vyber(vse, { odRoku: rok });
  const zeme = podleZemi(letos).filter((z) => z.pripady > 0 || z.kodZeme === "CZ").slice(0, 6);
  const maxZeme = Math.max(1, ...zeme.map((z) => z.pripady));
  const puv = podlePuvodce(letos);
  const maxPuv = Math.max(1, ...puv.skupiny.map((s) => s.pocet));

  return (
    <section className="nalet">
      <NadpisSekce
        stitek={t("Čísla")}
        nadpis={t("Kolik toho je, kde a kdo za tím stojí")}
        popis={t("Počítají se jen skutečné události — ne jejich pokračování, opatření ani prohlášení.")}
      />
      <div className="grid gap-8 md:grid-cols-3">
        <section aria-label={t("Posledních 90 dnů")}>
          <div className="mb-1.5 flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="stitek">{t("Posledních 90 dnů · incidenty")}</span><Otaznik popis={<span className="block">{uredni} z {dni90.length} případů má úřední zdroj. Počítají se případy a operace proti občanům. Aktualizace a prohlášení ne.</span>} /></span><Tlacitko kam="/udalosti/?obdobi=30d" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">detail</Tlacitko></div>
          <div className="grid grid-cols-2 gap-1.5">
            <Cislo n={zapocitatelne90} slovo={`za 90 dní · celkem ${casyZapocitatelne.length} od 2014`} />
            <Cislo n={zemi} slovo={sklon(zemi, "země", "země", "zemí")} />
            <Cislo n={cz + kampane.filter((k) => k.kodyZemi.includes("CZ")).length} slovo="v Česku od 2014" />
            <Cislo n={potvrzeno} slovo="s potvrzeným pachatelem" />
          </div>
          {porovnani90 && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-mikro text-tlum2">
              <Odznak ton={porovnani90.smer === "vyssi" ? "pozor" : porovnani90.smer === "nizsi" ? "klid" : "neutral"} duraz="silny">
                {porovnani90.slovo} než průměr
              </Odznak>
              <span>průměr posledních {porovnani90.zaLet} let je {cislem(porovnani90.prumer)} na čtvrtletí</span>
            </p>
          )}
        </section>
        <section aria-label="Kde">
          <div className="mb-1.5 flex items-center justify-between"><span className="nadpis-boxu">Kde · případy {rok}</span><Tlacitko kam="/zeme/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{t("všechny země")}</Tlacitko></div>
          <ul className="space-y-0.5">
            {zeme.map((z) => (
              <li key={z.kodZeme}><Pruh nazev={<><Vlajka kod={z.kodZeme} /> {z.zeme}</>} n={z.pripady} max={maxZeme} barva={z.kodZeme === "CZ" ? "bg-akcent" : "bg-tlum2/70"} odkaz={`/zeme/${z.kodZeme.toLowerCase()}/`} /></li>
            ))}
          </ul>
        </section>
        <section aria-label="Kdo">
          <div className="mb-1.5 flex items-center gap-1.5"><span className="nadpis-boxu">Kdo · případy {rok}</span><Otaznik popis={<span className="block">První číslo a tmavší část pruhu: případy s potvrzeným původcem. Druhé číslo: všechny případy přisuzované skupině.</span>} /></div>
          <ul className="space-y-0.5">
            {puv.skupiny.map((s) => (
              <li key={s.klic} className="flex min-h-[36px] items-center gap-2">
                <span className="w-[118px] shrink-0 truncate text-drobne text-inkoust">{s.nazev}</span>
                <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-linka2">
                  <span className="block h-full bg-tlum2/70" style={{ width: `${(s.pocet / maxPuv) * 100}%` }}>
                    <span className="block h-full bg-oranz" style={{ width: `${s.pocet ? (s.potvrzeno / s.pocet) * 100 : 0}%` }} />
                  </span>
                </span>
                <span className="cislice w-12 shrink-0 text-right text-male text-inkoust"><b className="font-bold">{s.potvrzeno}</b><span className="text-tlum2"> / {s.pocet}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
