import type { NazevIkony } from "@/components/ikony";
import data from "../../data/zkusenosti.json";

/*
  Zkušenosti z války na Ukrajině (28. 9. 2026, přání provozovatelky).

  Ne fronta, ale všední život: co se stalo, co následovalo a jak si lidé
  poradili. Příručky říkají, jak to má být; útržky ukazují, jak to bylo.

  Každý útržek stojí na zveřejněném zdroji (reportáž, úřad, organizace)
  a přebírá fakta, ne znění. Nic se nedomýšlí: co zdroj neříká, tu není.
  Hlídá to testy/zkusenosti.test.ts.
*/

export type TemaZkusenosti = "elektrina" | "voda-teplo" | "penize-zasoby" | "doprava-palivo" | "poplach-kryt" | "evakuace" | "informace";

export const TEMATA: Record<TemaZkusenosti, { nazev: string; ikona: NazevIkony; popis: string }> = {
  elektrina: { nazev: "Elektřina a spojení", ikona: "elektrina", popis: "Výpadky proudu, mobilní síť, internet, nabíjení" },
  "voda-teplo": { nazev: "Voda a teplo", ikona: "voda", popis: "Když přestanou jet čerpadla a topení" },
  "penize-zasoby": { nazev: "Peníze, jídlo, léky", ikona: "jidlo", popis: "Bankomaty, platby, obchody, lékárny" },
  "doprava-palivo": { nazev: "Doprava a palivo", ikona: "palivo", popis: "Fronty u pump, limity, cesty" },
  "poplach-kryt": { nazev: "Poplach a úkryt", ikona: "sirena", popis: "Sirény, aplikace, kryty, únava z poplachů" },
  evakuace: { nazev: "Odchod z domova", ikona: "mapa", popis: "Vlaky, zácpy, zvířata, co si vzít" },
  informace: { nazev: "Informace a lidé", ikona: "bublina", popis: "Fámy, ověřování, sousedé, děti, spánek" },
};

export const PORADI_TEMAT = Object.keys(TEMATA) as TemaZkusenosti[];

export interface ZdrojZkusenosti {
  nazev: string;
  url: string;
  datum?: string | null;
}

export interface Zkusenost {
  id: string;
  tema: TemaZkusenosti;
  nadpis: string;
  coSeStalo: string;
  kdyKde: string;
  coNasledovalo: string;
  jakToLideResili: string;
  pouceni: string;
  zdroje: ZdrojZkusenosti[];
}

export const zkusenosti = (): Zkusenost[] => (data as { polozky: Zkusenost[] }).polozky;
export const aktualizovanoZkusenosti = (): string => (data as { aktualizovano: string }).aktualizovano;
