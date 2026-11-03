/* Typy k nastroje/podobna-udalost.mjs (prostý JS kvůli nástrojům bez překladu). */
export function kmenyTitulku(text: string | null | undefined): Set<string>;
export function podobnaUdalost<T extends { id?: string; slug?: string; kodZeme?: string | null; titulek?: string; druh?: string; datumUdalosti?: string | null; datumZjisteni?: string | null; zdroje?: { url?: string }[] }>(navrh: T, zverejnene: readonly T[]): T | null;
