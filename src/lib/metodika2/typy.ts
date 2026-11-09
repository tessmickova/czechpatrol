/*
  Metodika v2 — typy (pilot 2.0, 9. 11. 2026). Specifikace:
  docs/metodika-v2/02-SPECIFIKACE.md. Čistý kód bez čtení souborů:
  počítá web, nástroj na porovnání i testy totéž.
*/
export const VERZE_METODIKY = "2.0-pilot";

export type TypVazby = "prime-cr" | "zavislost" | "spojenci" | "kontext";
export type Skupina = "NATO" | "EU";
export type Dolozeni = "dolozeno" | "predbezne" | "nepotvrzeno" | "sporne" | "vyvraceno";
export type StavHrozby = "probiha" | "odvraceno" | "ukonceno" | "neznamo";
export type Rozsah = "mistni" | "regionalni" | "celostatni" | "mezinarodni";
export type Povaha = "bezpecnostni" | "nehoda-porucha" | "neznama";
export type Funkce = "bezpeci-osob" | "zdravotni-pece" | "elektrina" | "voda" | "teplo-plyn" | "doprava" | "palivo" | "komunikace" | "platby" | "verejne-sluzby" | "hranice";
/** Od nejvážnější. */
export type Intenzita = "ohrozeni-zivota" | "vypadek-funkce" | "omezeni-s-nahradou" | "neprijemnost";

export interface TvrzeniV2 {
  o: "udalost" | "pricina" | "puvodce" | "umysl" | "koordinace";
  stav: Dolozeni;
  text: string;
  zdroje: string[];
}

export interface DopadV2 {
  funkce: Funkce;
  intenzita: Intenzita;
  /** Kód země („CZ“) nebo popis místa v ČR („Praha 6“); ČR, když začíná „CZ“ nebo když je záznam z ČR. */
  uzemi: string;
  rozsah: Rozsah;
  od: string;
  /** Konec podle ověření. Bez něj dopad trvá. */
  do?: string | null;
  nahrada?: boolean | null;
  stav: Dolozeni;
  overeno: string;
  popis?: string;
}

export interface PodminenyDopadV2 {
  /** Zdrojový fakt → doložená vazba → podmínka přenosu → možný následek. */
  retezec: { krok: string; jisty: boolean }[];
}

/** Redakčně posouzená pole záznamu. Co chybí, výpočet odvodí a označí jako odvozené. */
export interface V2Zaznam {
  vazba?: { typ: TypVazby; skupiny?: Skupina[]; mechanismus: string; doklad?: string[] };
  stavHrozby?: { stav: StavHrozby; overeno: string };
  povaha?: Povaha;
  rozsah?: Rozsah;
  zasahFunkci?: boolean;
  tvrzeni?: TvrzeniV2[];
  serie?: { id: string; koordinace: Dolozeni };
  dopad?: DopadV2[];
  podminenyDopad?: PodminenyDopadV2[];
  hypotezy?: string[];
  kontrola?: { role: string; kdy: string };
}

export type Pasmo = "omezeny" | "zvyseny" | "vysoky" | "mimoradny";
export const PORADI_PASEM: readonly Pasmo[] = ["omezeny", "zvyseny", "vysoky", "mimoradny"];
export const NAZVY_PASEM: Record<Pasmo, string> = { omezeny: "Omezený", zvyseny: "Zvýšený", vysoky: "Vysoký", mimoradny: "Mimořádný" };
export const vyssi = (a: Pasmo, b: Pasmo): Pasmo => (PORADI_PASEM.indexOf(a) >= PORADI_PASEM.indexOf(b) ? a : b);
export const poradiPasma = (p: Pasmo): number => PORADI_PASEM.indexOf(p);

export type Barva = "zelena" | "zluta" | "oranzova" | "cervena";

export interface Odvozene<T> { hodnota: T; odvozeno: boolean; duvod: string }

/** Záznam převedený do vstupu pravidel. */
export interface UdalostV2 {
  slug: string;
  titulek: string;
  zeme: string;
  kodZeme: string;
  druh: "pripad" | "aktualizace" | "opatreni" | "reakce";
  barva: Barva;
  datumUdalosti: string;
  datumZjisteni: string;
  /** Prošla člověkem nebo úředním zdrojem (ne „neověřeno úředně“). */
  overena: boolean;
  historicka: boolean;
  dolozeni: Odvozene<Dolozeni>;
  vazba: Odvozene<{ typ: TypVazby; skupiny: Skupina[]; mechanismus: string | null }>;
  aktivita: Odvozene<"aktivni" | "neaktivni" | "neaktualni">;
  povaha: Povaha;
  rozsah: Rozsah | null;
  zasahFunkci: boolean | null;
  serie: { id: string; koordinace: Dolozeni } | null;
  navazujeNa: string | null;
  /** Redakce pole `v2` posoudila (`v2.kontrola`). */
  posouzeno: boolean;
}

export type IdPravidla = "A-M1" | "A-M2" | "A-V1" | "A-V2" | "A-V3" | "A-V4" | "A-Z1" | "A-Z2" | "A-Z3" | "A-Z4" | "A-O1" | "A-N1" | "A-N2";

export interface KvalitaPodkladu {
  stav: "dostatecna" | "omezena" | "nedostatecna";
  /** Veřejné důvody. */
  duvody: string[];
  /** Jen pro neveřejné porovnání: provozní příčina, která na web nepatří (rozhodnutí provozovatelky 1. 11. 2026). */
  duvodyInterni: string[];
}

export interface VstupKvality {
  /** Kdy naposledy doběhl sběr (ISO) nebo null. */
  posledniSber: string | null;
  /**
   * Zpracování zachycených zpráv je neúplné (ve frontě čekají zprávy a poslední
   * rozhodnutí je starší než 48 h). Na veřejný web se tahle provozní příčina
   * nepíše (provozovatelka 1. 11. 2026); veřejně jen „podklady nejsou úplné“.
   */
  podkladyNeuplne: boolean;
  /** Podrobnost k neúplnosti pro neveřejné porovnání (např. od kdy). */
  podkladyNeuplnePoznamka?: string;
  zdrojuPrecteno: number;
  zdrojuCelkem: number;
}

/** Ruční výjimka (dnes „mimořádný signál“). Bez schvalující role a revize se nepoužije. */
export interface VyjimkaV2 {
  id: string;
  duvod: string;
  podklady: string[];
  schvalil: string | null;
  revize: string | null;
  vyhodnoceno: string;
  platiDo: string;
}
