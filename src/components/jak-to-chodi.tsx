"use client";

import { useState } from "react";
import { SchemaToku } from "./schema-toku";
import { Karta } from "./zaklad";

/*
  Jak se zpráva dostane na web.

  Vzniklo z opakované otázky: „externí ověřovatel něco projel, proč to není
  na webu ani v Telegramu?" Odpověď je pokaždé stejná — mezi zachycením
  a zveřejněním jsou čtyři brány a každá něco zastaví. Když ale není vidět,
  která to byla, vypadá celý řetěz jako porucha.

  Schéma je tu proto s branami, ne s hezkými šipkami: u každé stojí, co jí
  neprojde a kam to spadne.
*/

interface Krok {
  cislo: string;
  nadpis: string;
  kdo: string;
  co: string;
  zastavi?: string;
}

const KROKY: Krok[] = [
  {
    cislo: "1",
    nadpis: "Sběr",
    kdo: "automat, každých 6 hodin",
    co: "Přečte 111 zdrojů — zpravodajství, úřední kanály, agentury. Co projde sítem na slova a místa, uloží se do fronty kandidátů jako holý titulek s odkazem.",
    zastavi: "Zprávy bez vazby na bezpečnost nebo na sledované země se zahodí a důvod se zapíše.",
  },
  {
    cislo: "2",
    nadpis: "Posouzení",
    kdo: "model, nebo externí ověřovatel",
    co: "Rozhodne, co je nová událost a co jen další článek o známé věci. Z nové události připraví návrh záznamu: fakta, co doložené není, závažnost, jistota, zdroje.",
    zastavi: "Bez dvou nezávislých zdrojů návrh nevznikne. Jeden článek, přetisk ani agregátor nestačí.",
  },
  {
    cislo: "3",
    nadpis: "Fronta návrhů",
    kdo: "automaticky",
    co: "Návrh se objeví ve Správě. Má lidskyOvereno: false, nepočítá se do statistik a na webu není vidět.",
    zastavi: "Kontrola dat a testy. Zdroj starší než událost, chybějící fakta nebo druhý zdroj se sem nedostanou.",
  },
  {
    cislo: "4",
    nadpis: "Schválení člověkem",
    kdo: "vy, tlačítkem ve Správě",
    co: "Jediné místo, kde se lidskyOvereno přepne na true. Teprve tím se ze záznamu stane něco, za čím projekt stojí.",
    zastavi: "Zamítnutý návrh jde do koše i s důvodem. Nemaže se, aby šlo poznat, že už jednou posuzován byl.",
  },
];

interface Cil {
  nazev: string;
  podminka: string;
  kdy: string;
}

const KAM: Cil[] = [
  {
    nazev: "Záznamy a počty na webu",
    podminka: "lidskyOvereno = true",
    kdy: "Hned po schválení a nasazení. Tohle je jediný obsah, který se počítá do statistik a hodnocení situace.",
  },
  {
    nazev: "Právě ověřované",
    podminka: "schváleno do „ověřovaných“, dva zdroje, lhůta 7 dní",
    kdy: "Zpráva, která je vážná, ale zatím nepotvrzená. Na webu je zřetelně oddělená a má u sebe, co říkají úřady a co dělat teď. Do počtů nevstupuje.",
  },
  {
    nazev: "Zachyceno, neověřeno (na úvodní straně)",
    podminka: "jen zachyceno sběrem",
    kdy: "Automaticky, bez posouzení. Ukazuje, že se zdroje čtou. Odkazuje ven na zdroj, ne dovnitř na záznam. Do počtů ani do hodnocení nevstupuje.",
  },
  {
    nazev: "Telegram — veřejný kanál",
    podminka: "lidskyOvereno = true",
    kdy: "Vážné případy, opatření a změny úředních stavů odcházejí hned; zbytek v denním souhrnu. Neschválený návrh do kanálu nikdy nejde.",
  },
  {
    nazev: "Telegram — soukromě správci",
    podminka: "porucha provozu",
    kdy: "Výpadek sběru, nefunkční ověřovací model, změna kódu od externího ověřovatele. Provozní věci do veřejného kanálu nepatří.",
  },
];

export function JakToChodi() {
  const [otevreno, setOtevreno] = useState(false);

  return (
    <Karta className="p-6">
      <button
        type="button"
        onClick={() => setOtevreno((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={otevreno}
      >
        <span>
          <span className="stitek mb-1 block">Dokumentace</span>
          <span className="podnadpis text-velke text-inkoust">Jak se zpráva dostane na web</span>
        </span>
        <span aria-hidden className="stitek text-tlum2">{otevreno ? "skrýt" : "ukázat"}</span>
      </button>

      {otevreno && (
        <div className="mt-5 border-t border-linka2 pt-5">
          {/*
            Schéma nahoře, popis pod ním. Opakovaná otázka nebyla „jaké jsou
            kroky", ale „kde to uvázlo" — na to odpovídá tvar, ne seznam.
          */}
          <div className="mb-6 flex justify-center">
            <SchemaToku />
          </div>

          <ol className="space-y-0">
            {KROKY.map((k, i) => (
              <li key={k.cislo} className="relative pb-6 pl-8 last:pb-0">
                {/* Svislice spojuje kroky; u posledního už nepokračuje. */}
                {i < KROKY.length - 1 && (
                  <span aria-hidden className="absolute left-[9px] top-6 h-[calc(100%-1.5rem)] w-px bg-linka2" />
                )}
                <span
                  aria-hidden
                  className="cislice absolute left-0 top-0 flex h-[19px] w-[19px] items-center justify-center rounded-full border border-linka text-mikro text-tlum"
                >
                  {k.cislo}
                </span>
                <div className="stitek mb-1">{k.kdo}</div>
                <h3 className="text-zaklad leading-snug text-inkoust">{k.nadpis}</h3>
                <p className="mt-1 text-male leading-snug text-tlum">{k.co}</p>
                {k.zastavi && (
                  <p className="mt-2 border-l border-linka pl-3 text-male leading-snug text-tlum2">
                    <span className="text-inkoust">Co tu skončí:</span> {k.zastavi}
                  </p>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-6 border-t border-linka2 pt-5">
            <div className="stitek mb-3">Kam co jde po schválení</div>
            <ul className="space-y-3">
              {KAM.map((c) => (
                <li key={c.nazev} className="rounded-[18px] border border-linka p-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h4 className="text-male text-inkoust">{c.nazev}</h4>
                    <span className="cislice text-mikro text-tlum2">{c.podminka}</span>
                  </div>
                  <p className="mt-1 text-male leading-snug text-tlum">{c.kdy}</p>
                </li>
              ))}
            </ul>
          </div>

          {/*
            Nejčastější nedorozumění: „ověřovatel to projel, proč to není
            vidět?“ Patří sem, ne do e-mailu.
          */}
          <div className="mt-6 border-t border-linka2 pt-5">
            <div className="stitek mb-2">Když něco není vidět</div>
            <ul className="space-y-2 text-male leading-snug text-tlum">
              <li>
                <span className="text-inkoust">Ověřovatel něco poslal, ale ve Správě to není.</span>{" "}
                Data z jeho větve se přebírají automaticky, ale jen soubory s daty. Když změnil i kód,
                ten se nepřenese a přijde o tom zpráva správci.
              </li>
              <li>
                <span className="text-inkoust">Ve frontě to je, ale na webu ne.</span>{" "}
                To je správně. Bez schválení se nezveřejňuje nic — ani do počtů, ani do Telegramu.
              </li>
              <li>
                <span className="text-inkoust">Schválil jsem to a pořád nic.</span>{" "}
                Mezi schválením a webem běží kontrola dat, testy a nasazení. Jsou to minuty, ne vteřiny.
              </li>
              <li>
                <span className="text-inkoust">Fronta je prázdná a nic nepřibývá.</span>{" "}
                Zkontrolujte výše, jestli není vypnuté posuzování modelem. Sběr běží nezávisle na něm.
              </li>
            </ul>
          </div>
        </div>
      )}
    </Karta>
  );
}
