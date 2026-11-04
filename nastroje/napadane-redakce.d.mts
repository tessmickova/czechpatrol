/* Typy k nastroje/napadane-redakce.mjs (prostý JS kvůli nástrojům bez překladu). */
export interface NapadenaRedakce { nazev: string; domena: string | null; duvod: string; kampan: string; od: string; do: string | null }
export interface FalesnaRedakce { domena: string; napodobuje: string; kampan: string }
export interface DataNapadanych { redakce: NapadenaRedakce[]; falesne: FalesnaRedakce[] }
type Zdroj = { nazev?: string; url?: string };
export function nactiNapadane(soubor?: string): DataNapadanych;
export function domenaZdroje(url: string | null | undefined): string | null;
export function jeFalesnaRedakce(zdroj: Zdroj | null | undefined, data?: DataNapadanych): boolean;
export function jeNapadenaRedakce(zdroj: Zdroj | null | undefined, data?: DataNapadanych, ted?: number): boolean;
export function potrebnychRedakci(zdroje: readonly Zdroj[] | null | undefined, data?: DataNapadanych, ted?: number): 2 | 3;
export function nezavisleRedakce(zdroje: readonly Zdroj[] | null | undefined, data?: DataNapadanych): number;
export function dostRedakci(zdroje: readonly Zdroj[] | null | undefined, data?: DataNapadanych, ted?: number): boolean;
