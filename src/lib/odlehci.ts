import type { Incident } from "./typy";

/*
  Záznamy bez podrobností pro stránky, které je jen počítají (24. 9. 2026).
  Fakta, nejasnosti, historie a hodnocení 140 záznamů dělaly z úvodu 700 kB
  HTML; nic z toho úvod nečte. Typ zůstává, pole se vyprázdní.
*/
export function odlehci<T extends Incident>(i: T): T {
  /* První fakt a první neznámá zůstávají: úvod je ukazuje po rozbalení řádku aktualit. */
  return { ...i, fakta: i.fakta.slice(0, 1), neznameho: i.neznameho.slice(0, 1), historie: [], eskalacniSpousteče: [], deeskalacniSignaly: [], souvisejici: [], vyznam: "" };
}

const PUL_ROKU = 183 * 86_400_000;

/*
  Záznamy pro úvod (26. 9. 2026, výkon: LCP 2,8 s, INP 300 ms). Úvod je
  klientská komponenta, takže každý záznam jde do HTML jako data — 155
  záznamů dělalo 287 kB. U zdroje úvod čte jen název, odkaz, typ a
  „primární“; počet zdrojů musí sedět („+2“), takže se nezahazují, jen
  zeštíhlí. Záznamy, které se půl roku nezměnily, se v seznamech úvodu
  neukazují (ty berou nejnovější) — vstupují jen do počtů, a tak nesou
  jen to, co počty potřebují.
*/
export function odlehciProUvod<T extends Incident>(i: T, ted = Date.now()): T {
  const z = odlehci(i);
  const posledni = Math.max(Date.parse(i.datumZjisteni ?? i.datumUdalosti) || 0, Date.parse(i.aktualizovano ?? "") || 0);
  const stary = ted - posledni > PUL_ROKU;
  return {
    ...z,
    fakta: stary ? [] : z.fakta,
    neznameho: stary ? [] : z.neznameho,
    /*
      Celý se nese jen první zdroj a první úřední (ty úvod ukazuje); ostatní
      jen typ a to, zda mají odkaz — kvůli počtu („+2“) a pravidlům
      doloženo/úřední (agregace.ts). Odkaz „#“ se nikde nevykresluje.
    */
    zdroje: i.zdroje.map((s, n) => {
      const ukazuje = n === 0 || s === i.zdroje.find((x) => x.primarni);
      return (ukazuje
        ? { nazev: stary ? s.nazev.split(" — ")[0] : s.nazev, url: s.url, typ: s.typ, primarni: s.primarni }
        : { nazev: "", url: s.url ? "#" : "", typ: s.typ, primarni: false }) as T["zdroje"][number];
    }),
  };
}

/** Jen pro počty a grafy (Analýzy): bez faktů u všech záznamů, zdroje zeštíhlené, počty sedí. */
export const proPocty = <T extends Incident>(i: T): T => odlehciProUvod(i, Number.POSITIVE_INFINITY);
