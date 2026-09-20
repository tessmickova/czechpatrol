/*
  Typy k nastroje/uredni-zdroj.mjs.

  Modul je prostý JavaScript schválně: používá ho správce i kontrola dat,
  a to jsou .mjs nástroje bez překladu. Aby se dal volat i z TypeScriptu
  (web a testy), stojí tu jeho tvar zvlášť.
*/
export interface Zdroj {
  url: string;
  typ?: string;
  primarni?: boolean;
}

/** Vede odkaz na úřad? Rozhoduje adresa, ne to, co si zdroj napsal o sobě. */
export function jeUredniZdroj(url: string | null | undefined): boolean;

/** Zdroje, které se tváří jako úřední, ale adresa tomu neodpovídá. */
export function falesneUredni(zdroje?: Zdroj[]): Zdroj[];

/** Má záznam aspoň jeden doopravdy úřední zdroj? */
export function maUredniZdroj(zdroje?: Zdroj[]): boolean;
