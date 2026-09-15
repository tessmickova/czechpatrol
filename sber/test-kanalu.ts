import { ctiRss, polozkyZeStranky, stahni } from "./nacti";
import { KATALOG, ZDROJE_UDALOSTI } from "./zdroje-udalosti";

/**
 * Zkusí každý kanál z katalogu a vypíše, kolik položek vrátil.
 * Spouštět po každé změně katalogu: `npm run sber:kanaly`
 *
 * Kanál, který nic nevrací, vypadá zvenčí úplně stejně jako klid — a přesně
 * tak tenhle projekt jednou přišel o celý sběr událostí, aniž si toho kdokoli
 * všiml. Proto se to měří, a měří se to ze sítě Actions: z vývojového
 * prostředí jsou zpravodajské domény nedosažitelné, takže by „nedostupný"
 * znamenalo jen „nedosáhnu na něj já".
 */

const NARAZ = 6;

async function zkus(z: (typeof ZDROJE_UDALOSTI)[number]) {
  try {
    const { stav, telo } = await stahni(z.url, 1);
    if (stav >= 400) return { z, stav, polozek: 0 };
    const rss = ctiRss(telo).length;
    /* Stejný nouzový režim jako ve sběru, ať test měří to, co sběr doopravdy dělá. */
    if (rss) return { z, stav, polozek: rss, jak: "rss" };
    const ze = polozkyZeStranky(telo, z.url).length;
    return { z, stav, polozek: ze, jak: ze ? "ze stránky" : "nic" };
  } catch (e) {
    return { z, stav: null, polozek: 0, duvod: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  console.log(
    `Katalog: ${KATALOG.pocty.celkem} kanálů — ${KATALOG.pocty.prime} redakcí a úřadů, ` +
      `${KATALOG.pocty.obecne} obecných dotazů, ${KATALOG.pocty.poZemich} po zemích ` +
      `(${KATALOG.TEMATA.length} témat, ${KATALOG.ZEME.filter((z) => z.blizke).length} blízkých zemí)\n`,
  );

  const vysledky: Awaited<ReturnType<typeof zkus>>[] = [];
  for (let i = 0; i < ZDROJE_UDALOSTI.length; i += NARAZ) {
    vysledky.push(...(await Promise.all(ZDROJE_UDALOSTI.slice(i, i + NARAZ).map(zkus))));
  }

  const prazdne: string[] = [];
  for (const v of vysledky) {
    const znacka = v.polozek > 0 ? "OK   " : "PRÁZDNÝ";
    if (!v.polozek) prazdne.push(v.z.klic);
    console.log(
      `${znacka.padEnd(8)}${String(v.stav ?? "---").padEnd(5)}${String(v.polozek).padStart(4)} položek  ${v.z.klic.padEnd(24)} ${v.z.nazev}${
        "duvod" in v && v.duvod ? `  (${v.duvod})` : ""
      }${"jak" in v && v.jak === "ze stránky" ? "  (čteno ze stránky, ne z RSS)" : ""}`,
    );
  }

  const zivych = vysledky.length - prazdne.length;
  console.log(`\nKanálů ${vysledky.length}, s položkami ${zivych}.`);
  if (prazdne.length) console.log(`Nic nevrátily: ${prazdne.join(", ")}.`);
  /*
    Celý katalog naprázdno znamená poruchu, ne klid — a to musí běh ohlásit
    jako chybu, ne skončit tiše s nulou.
  */
  if (!zivych) {
    console.log("ŽÁDNÝ kanál nevrátil položku — to není klid, to je porucha sběru.");
    process.exit(1);
  }
}

main();
