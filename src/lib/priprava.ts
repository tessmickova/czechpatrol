import seznamyData from "../../data/odolnost/seznamy.json";

/*
  „Připravit teď“ — tři věci pro domácnost podle toho, co web právě dokládá.

  Karta na úvodní straně (24. 9. 2026). Nepředpovídá: sčítá doložené věci
  z posledních 30 dnů (záznamy podle oblasti, narušené služby, platná
  opatření, skok cen paliva, operace proti občanům) do tlaku na deset
  hrozeb pro domácnost a k nim vybere položky ze seznamů zásob
  (data/odolnost/seznamy.json). Přepočítává se při každém sestavení webu,
  tedy po každém sběru, který něco změnil.

  Základní tlak (informace, voda) je tu vždycky: bez něj by karta v klidném
  týdnu ukazovala nesmysly z okrajových oblastí.
*/
export type Hrozba = "elektrina" | "voda" | "teplo" | "komunikace" | "informace" | "doprava" | "zdravi" | "hotovost" | "evakuace" | "pozar";

export interface PolozkaSeznamu {
  klic: string;
  nazev: string;
  mnozstvi?: string;
  popis: string;
  hrozby: Hrozba[];
  funkce: string | null;
  /** Zdroj jednotlivé položky, když se liší od zdroje seznamu (26. 9. 2026). */
  zdroj?: { nazev: string; url: string };
}
export interface Seznam { klic: KlicSeznamu; nazev: string; popis: string; zdroj: { nazev: string; url: string } | null; polozky: PolozkaSeznamu[] }
export type KlicSeznamu = "72h" | "rozsireny" | "ai";

const DATA = seznamyData as unknown as { verze: string; hrozby: Record<Hrozba, string>; seznamy: Record<KlicSeznamu, Omit<Seznam, "klic">> };

export const NAZVY_HROZEB = DATA.hrozby;
export const VERZE_SEZNAMU = DATA.verze;
export const PORADI_SEZNAMU: KlicSeznamu[] = ["72h", "rozsireny", "ai"];

export function seznamy(): Seznam[] {
  return PORADI_SEZNAMU.map((k) => ({ klic: k, ...DATA.seznamy[k] }));
}

/*
  Výpočet tlaku hrozeb a karty „Připravit teď“ je v priprava-ted.ts
  (26. 9. 2026): čte záznamy webu, a dokud byl tady, táhl celý datový
  modul i do komponent v prohlížeči, které potřebují jen seznamy zásob.
*/
export type { PripravitPolozka, PripravitTed, TlakHrozby } from "./priprava-ted";
