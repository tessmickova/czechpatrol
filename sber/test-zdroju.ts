import { ctiHtml, stahni } from "./nacti";
import { MIN_ZNAKU_OBSAHU } from "./rozhodovani";
import { ZDROJE } from "./zdroje";
import { SLEDOVANE_PROFILY } from "./socialni";
import nastroje from "../data/oficialni-nastroje.json";
import { OFFLINE_MAPY, PIZZA_INDEX } from "../src/config/odkazy-ven";

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

  await zkusVystrahyChmi();

  await zkusPizzaIndex();

  // Doporučené odkazy ven (src/config/odkazy-ven.ts): vedou pořád tam, kam tvrdíme?
  console.log("\nOdkazy ven (offline mapy, Pizza index):");
  for (const u of [...OFFLINE_MAPY.flatMap((m) => [m.android, m.ios]), PIZZA_INDEX.url]) {
    const v = await zkusAdresu(u);
    console.log(`${v.znacka.padEnd(8)}${String(v.stav ?? "---").padEnd(5)}${String(v.znaku).padStart(7)} znaků  ${u}${v.duvod ? `  (${v.duvod})` : ""}`);
  }

  console.log(`\nZdrojů ${ZDROJE.length}, čitelných ${citelnych}.`);
  if (prazdne.length) console.log(`Odpovídají, ale nejde z nich číst: ${prazdne.join(", ")}.`);
  if (nedostupne.length) console.log(`Nedostupné: ${nedostupne.join(", ")}.`);
  console.log("Zdroj, ze kterého nejde číst, se nesmí počítat do pokrytí položky.");
  if (!citelnych) process.exit(1);
}

main();

/*
  Kandidátní adresy strojově čitelných výstrah ČHMÚ (formát CAP).

  Z vývojového prostředí nejsou dosažitelné (26. 9. 2026), proto se
  ověřují tady, ze sítě sběru, dřív než je začne sběr číst. Výpis ukáže
  stav, typ obsahu, počet bloků <info>/<area> a druhy geokódů — podle
  toho se píše parser, ne podle paměti.
*/
const KANDIDATI_CAP = [
  "https://www.chmi.cz/files/portal/docs/meteo/om/bulletiny/XOCZ50_OKPR.xml",
  "https://vystrahy-cr.chmi.cz/data/XOCZ50_OKPR.xml",
  "https://www.chmi.cz/files/portal/docs/meteo/om/vystrahy/XOCZ50_OKPR.xml",
];

async function zkusVystrahyChmi() {
  console.log("\nVýstrahy ČHMÚ (CAP) — kandidátní adresy:");
  for (const url of KANDIDATI_CAP) {
    try {
      const { stav, telo } = await stahni(url, 1);
      const pocet = (re: RegExp) => (telo.match(re) ?? []).length;
      const geokody = [...new Set([...telo.matchAll(/<valueName>([^<]+)<\/valueName>/g)].map((m) => m[1]))].slice(0, 8);
      console.log(`${String(stav).padEnd(5)}${String(telo.length).padStart(8)} B  alert:${pocet(/<alert\b/g)} info:${pocet(/<info>/g)} area:${pocet(/<area>/g)} geokódy:[${geokody.join(", ")}]  ${url}`);
      if (stav < 400 && /<alert\b/.test(telo)) console.log(telo.slice(0, 2500).replace(/\s+/g, " "));
    } catch (e) {
      console.log(`CHYBA ${url}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

/*
  Pizza index: nabízí web strojově čitelná data a dovoluje je číst?
  Sonda jen vypíše, co v HTML je (odkazy na /api/, JSON v datech stránky)
  a co říká robots.txt. Čtení se do sběru přidá až podle výsledku.
*/
async function zkusPizzaIndex() {
  console.log("\nPizza index — sonda:");
  try {
    const { stav, telo } = await stahni(PIZZA_INDEX.url, 1);
    const titul = telo.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "";
    const api = [...new Set([...telo.matchAll(/["'(](\/api\/[A-Za-z0-9_\-/?=&.]+)/g)].map((m) => m[1]))].slice(0, 15);
    const json = [...new Set([...telo.matchAll(/https?:\/\/[^"'\s)]+\.json[^"'\s)]*/g)].map((m) => m[0]))].slice(0, 10);
    console.log(`HTML ${stav}, ${telo.length} B, titul: ${titul}`);
    console.log(`api cesty: ${api.join(" | ") || "žádné"}`);
    console.log(`json adresy: ${json.join(" | ") || "žádné"}`);
    console.log(`__NEXT_DATA__: ${/__NEXT_DATA__/.test(telo)}, klíčová slova: ${["index", "busy", "doughcon", "level", "score"].filter((k) => new RegExp(k, "i").test(telo)).join(",")}`);
    const vyrez = telo.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 900);
    console.log(`text: ${vyrez}`);
    for (const cesta of api.slice(0, 4)) {
      try {
        const r = await stahni(new URL(cesta, PIZZA_INDEX.url).toString(), 1);
        console.log(`  ${cesta} → ${r.stav}, ${r.telo.length} B: ${r.telo.slice(0, 400).replace(/\s+/g, " ")}`);
      } catch (e) { console.log(`  ${cesta} → chyba ${e instanceof Error ? e.message : e}`); }
    }
    const robots = await stahni(new URL("/robots.txt", PIZZA_INDEX.url).toString(), 1).catch(() => ({ stav: 0, telo: "" }));
    console.log(`robots.txt ${robots.stav}: ${robots.telo.slice(0, 500).replace(/\s+/g, " ")}`);
  } catch (e) {
    console.log(`CHYBA: ${e instanceof Error ? e.message : e}`);
  }
}
