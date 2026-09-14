import { stahni } from "./nacti";

/*
  Výřez ze zdrojového článku.

  Proč to vzniklo: ověřovací rutina běží v sandboxu, kde jsou zpravodajské
  domény blokované agentní proxy. Její zadání přitom zní „otevři zdroj a ověř,
  co se stalo; když se zdroj nepodaří otevřít, kandidáta nepřebírej“. Rutina
  tedy dělala přesně to, co měla — a nepřevzala nikdy nic. Od 6. 9. do 14. 9.
  2026 nepublikovala jediný záznam, přestože hlásila úspěch.

  Sběr běží na GitHub Actions, kde blokace není. Stáhne proto kus textu článku
  a uloží ho do repozitáře; rutina pak ověřuje z repozitáře místo ze sítě —
  přesně podle pravidla č. 4b v CLAUDE.md.

  AUTORSKÉ PRÁVO: ukládá se krátký výřez na začátku článku, ne článek. Je to
  citace pro ověření, ne náhrada zdroje, a vždycky stojí vedle odkazu na
  originál. Strop je proto nízký a tvrdý.
*/

/** Kolik znaků textu se ukládá. Citace pro ověření, ne kopie článku. */
export const ZNAKU_VYREZU = 1200;

export interface VyrezZdroje {
  /** Začátek článku jako prostý text. Krácený, vždy s odkazem na originál. */
  text: string;
  /** Kdy se stahovalo. Rutina podle toho pozná, jak je výřez starý. */
  stazeno: string;
  /** HTTP stav. Rutina musí poznat rozdíl mezi „nepovedlo se“ a „prázdné“. */
  stav: number;
  /** Proč výřez chybí, když chybí. Prázdné pole je horší než přiznaný důvod. */
  chyba?: string;
}

/*
  Co z HTML zahodit úplně. Skripty a styly nesou kód, hlavička navigaci —
  nic z toho není text článku a jen by ředilo výřez.
*/
const BALAST = /<(script|style|noscript|svg|nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi;

/** HTML na prostý text. Bez knihovny — je to pár náhrad a závislost navíc by byla riziko. */
export function naText(html: string): string {
  return html
    .replace(BALAST, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Odstavce a konce řádků drží větnou hranici, ať se věty neslepí.
    .replace(/<\/(p|div|li|h[1-6]|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCharCode(Number(c)))
    .replace(/[ \t]+/g, " ")
    // Mezery kolem konce řádku: otvírací značka po </p> nechává mezeru navíc.
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n+/g, "\n")
    .trim();
}

/**
 * Stáhne začátek článku a vrátí ho jako prostý text.
 *
 * Nikdy nevyhazuje: když se stáhnout nepodaří, vrátí důvod. Rutina pak ví,
 * že zdroj neověřila — a to není totéž jako že na zdroji nic nebylo.
 */
export async function vyrezZeStranky(url: string): Promise<VyrezZdroje> {
  const kdy = new Date().toISOString();
  try {
    const { stav, telo } = await stahni(url, 2);
    if (stav >= 400) return { text: "", stazeno: kdy, stav, chyba: `HTTP ${stav}` };

    const text = naText(telo);
    if (!text) return { text: "", stazeno: kdy, stav, chyba: "stránka neobsahuje čitelný text" };

    // Krátí se na hranici slova, ne uprostřed — useknuté slovo vypadá jako chyba dat.
    const orez = text.slice(0, ZNAKU_VYREZU);
    const mezera = orez.lastIndexOf(" ");
    const vysledek = text.length > ZNAKU_VYREZU && mezera > ZNAKU_VYREZU * 0.6 ? `${orez.slice(0, mezera)}…` : orez;

    return { text: vysledek, stazeno: kdy, stav };
  } catch (e) {
    return { text: "", stazeno: kdy, stav: 0, chyba: e instanceof Error ? e.message : String(e) };
  }
}
