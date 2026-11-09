/* Typy k nastroje/redakce-pravidla.mjs (prostý JS kvůli nástrojům bez překladu). */
import type { DataNapadanych } from "./napadane-redakce.mjs";
type Zdroj = { nazev?: string; url?: string };
export function domenaZdroje(url: string | null | undefined): string | null;
export function jeFalesnaRedakce(zdroj: Zdroj | null | undefined, data: DataNapadanych): boolean;
export function jeNapadenaRedakce(zdroj: Zdroj | null | undefined, data: DataNapadanych, ted?: number): boolean;
export function potrebnychRedakci(zdroje: readonly Zdroj[] | null | undefined, data: DataNapadanych, ted?: number): 2 | 3;
export function nezavisleRedakce(zdroje: readonly Zdroj[] | null | undefined, data: DataNapadanych): number;
export function dostRedakci(zdroje: readonly Zdroj[] | null | undefined, data: DataNapadanych, ted?: number): boolean;
