/* Typy k nastroje/souhrn-situace.mjs. */
export interface SouhrnSituace { veta: string | null; aktualizovano: string | null; napsal: "patrol" | null; podklady: string[] | null }
export const NEJDELE_ZNAKU: number;
export const NEJKRATSI_ZNAKU: number;
export const PLATNOST_HODIN: number;
export function chybySouhrnu(s: unknown, ted?: number): string[];
export function jeCerstvy(s: SouhrnSituace | null | undefined, ted?: number): boolean;
export const POKYNY_SOUHRNU: string;
