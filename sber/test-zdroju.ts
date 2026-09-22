import { ctiHtml, stahni } from "./nacti";
import { MIN_ZNAKU_OBSAHU } from "./rozhodovani";
import { ZDROJE } from "./zdroje";
import { SLEDOVANE_PROFILY } from "./socialni";
import nastroje from "../data/oficialni-nastroje.json";

/**
 * Ověří, že adresy v registru skutečně odpovídají — a že z nich jde něco číst.
 * Spouštět po každém přidání zdroje: `npm run sber:zdroje`
 *
 * Samotný stav 200 nestačí. Web postavený na JavaScriptu vrátí prázdnou
 * slupku o kilobajtu, projde jako „OK" a sběr z něj nepřečte ani slovo — web
 * by pak u položky tvrdil dva zdroje, i když čitelný je jeden. Proto se měří
 * text po odstranění značek, a to stejnou hranicí, jakou používá rozhodování
 * o sběru.
 *
 * Zkoušejí se i záložní adresy: sběr je používá, takže výsledek bez nich hlásí
 * poruchu i tam, kde žádná není.
 */

type Vysledek = {
  znacka: "OK" | "PRÁZDNÝ" | "CHYBA";
  stav: number | null;
  znaku: number;
  url: string;
  duvod?: string;
};

async function zkusAdresu(url: string): Promise<Vysledek> {
  try {
    const { stav, telo } = await stahni(url, 1);
    if (stav >= 400) return { znacka: "CHYBA", stav, znaku: 0, url };
    const znaku = ctiHtml(telo).trim().length;
    return { znacka: znaku >= MIN_ZNAKU_OBSAHU ? "OK" : "PRÁZDNÝ", stav, znaku, url };
  } catch (e) {
    return { znacka: "CHYBA", stav: null, znaku: 0, url, duvod: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  let citelnych = 0;
  const prazdne: string[] = [];
  const nedostupne: string[] = [];

  for (const z of ZDROJE) {
    const adresy = [z.url, ...(z.zalozniUrl ?? [])];
    let nejlepsi: Vysledek | null = null;
    for (const a of adresy) {
      const v = await zkusAdresu(a);
      if (!nejlepsi || v.znaku > nejlepsi.znaku) nejlepsi = v;
      if (v.znacka === "OK") break;
    }
    const v = nejlepsi!;
    const poznamka = v.duvod ? `  (${v.duvod})` : v.url !== z.url ? "  (záložní adresa)" : "";
    console.log(
      `${v.znacka.padEnd(8)}${String(v.stav ?? "---").padEnd(5)}${String(v.znaku).padStart(7)} znaků  ${z.klic.padEnd(16)} ${v.url}${poznamka}`,
    );
    if (v.znacka === "OK") citelnych++;
    else if (v.znacka === "PRÁZDNÝ") prazdne.push(z.klic);
    else nedostupne.push(z.klic);
  }

  /*
    Profily na sítích: stačí, že adresa odpovídá a vrací obsah. Pravost
    účtu tím ověřená není — tu dokládá `pravostDolozena` a člověk.
  */
  if (SLEDOVANE_PROFILY.length) {
    console.log("\nProfily na sítích (adresa odpovídá ≠ pravost doložena):");
    for (const p of SLEDOVANE_PROFILY) {
      const v = await zkusAdresu(p.url);
      const poznamka = v.duvod ? `  (${v.duvod})` : "";
      console.log(`${v.znacka.padEnd(8)}${String(v.stav ?? "---").padEnd(5)}${String(v.znaku).padStart(7)} znaků  ${p.klic.padEnd(16)} ${p.url}${p.overenaAdresa ? "" : "  [overenaAdresa: false]"}${poznamka}`);
    }
  }

  /* Katalog oficiálních nástrojů: adresa provozovatele musí odpovídat. Existenci a provozovatele tím ověřenou nemáme — to je na člověku. */
  const adresyNastroju = (nastroje as { id: string; webUrl: string | null; oficialniZdroj: string | null }[]).flatMap((n) => [...new Set([n.webUrl, n.oficialniZdroj].filter((u): u is string => Boolean(u)))].map((u) => ({ id: n.id, u })));
  if (adresyNastroju.length) {
    console.log("\nOficiální nástroje (adresa odpovídá ≠ informace ověřena):");
    for (const { id, u } of adresyNastroju) {
      const v = await zkusAdresu(u);
      console.log(`${v.znacka.padEnd(8)}${String(v.stav ?? "---").padEnd(5)}${String(v.znaku).padStart(7)} znaků  ${id.padEnd(18)} ${u}${v.duvod ? `  (${v.duvod})` : ""}`);
    }
  }

  console.log(`\nZdrojů ${ZDROJE.length}, čitelných ${citelnych}.`);
  if (prazdne.length) console.log(`Odpovídají, ale nejde z nich číst: ${prazdne.join(", ")}.`);
  if (nedostupne.length) console.log(`Nedostupné: ${nedostupne.join(", ")}.`);
  console.log("Zdroj, ze kterého nejde číst, se nesmí počítat do pokrytí položky.");
  if (!citelnych) process.exit(1);
}

main();
