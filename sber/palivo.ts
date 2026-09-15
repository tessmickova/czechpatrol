import fs from "node:fs";
import path from "node:path";
import { stahni } from "./nacti";
import { zpravaOPalivu, type RadaCen, type TydenCeny } from "../src/lib/palivo";

/*
  Stažení týdenních cen pohonných hmot.

  Proč to běží tady a ne v ověřovací rutině: úřední domény jsou v sandboxu
  rutiny blokované agentní proxy (csu.gov.cz i data.gov.cz vracejí 000).
  Sběr běží na GitHub Actions, kde blokace není — stejný důvod jako
  u `text-zdroje.ts`.

  Proč je čtení tak tolerantní: přesný tvar úřední datové sady neumíme
  ověřit odsud a hádat názvy sloupců by znamenalo napsat parser, který
  jednoho dne tiše přestane číst. Místo toho se sloupce hledají podle obsahu
  a když se nenajdou, zapíše se DŮVOD i s ukázkou toho, co přišlo. Prázdná
  řada bez důvodu je horší než chyba — to je přesně ta porucha, kterou jsme
  osm dní hledali u sběru událostí.
*/

const SOUBOR = path.join(process.cwd(), "data", "palivo.json");

/** Kolik let řady se drží. Starší data už na nic neodpovídají a jen nafukují web. */
const LET_ZPET = 8;

/*
  Jak často se sahá na úřad.

  Šetření je TÝDENNÍ — stahovat ho každou půlhodinu spolu se zbytkem sběru
  nemá co přinést a jen to zdržuje hodinový běh o desítky sekund na časových
  limitech. Po úspěchu se tedy čeká půl dne, po neúspěchu dvě hodiny: chybu
  má smysl zkusit znovu dřív, ale taky ne pořád dokola.
*/
const HODIN_PO_USPECHU = 12;
const HODIN_PO_CHYBE = 2;

function jeCerstve(kdy: string | null | undefined, hodin: number): boolean {
  if (!kdy) return false;
  const t = new Date(kdy).getTime();
  return Number.isFinite(t) && Date.now() - t < hodin * 3_600_000;
}

/*
  Kandidáti na adresu datové sady. Zkoušejí se popořadě a do dat se zapíše ta,
  která opravdu zabrala — nikdy ta, o které si myslíme, že by zabrat měla.
  Když neprojde žádná, hledá se dál v katalogu (níž).
*/
const ADRESY = [
  "https://data.csu.gov.cz/api/dotaz/v1/data/sady/CENPHMTT01?format=csv",
  "https://data.csu.gov.cz/data/csu/data/CENPHMTT01.csv",
  "https://data.csu.gov.cz/datastat/data/VYBER/CENPHMTT01?format=csv",
];

/*
  Lokální katalog otevřených dat ČSÚ — strojově čitelný seznam všech sad
  úřadu. Běh 2026-09-15 02:00 UTC ukázal, že tahle adresa odpovídá a vrací
  CSV se sloupci dataset_iri, dataset_id, title, provider, description,
  spatial, modified, page, periodicity, start, end, keywords_all.

  Proto se adresa datové sady nehádá: nejdřív se zkusí adresy, které známe,
  a když neprojdou, dohledá se v katalogu ta skutečná. Když úřad sadu
  přestěhuje, sběr ji najde sám místo aby tiše přestal.
*/
const KATALOG = "https://vdb.czso.cz/pll/eweb/lkod_ld.seznam";

/** Podle čeho se sada v katalogu pozná. Hledá se v názvu, popisu i klíčových slovech. */
const HLEDANE = /pohonn|nafta|benzin/;

/* ---------- čtení CSV ---------- */

/** Rozdělí řádek CSV a respektuje uvozovky. Bez knihovny — je to dvacet řádků. */
export function rozdelRadek(radek: string, oddelovac: string): string[] {
  const pole: string[] = [];
  let bunka = "";
  let vUvozovkach = false;
  for (let i = 0; i < radek.length; i++) {
    const z = radek[i];
    if (z === '"') {
      if (vUvozovkach && radek[i + 1] === '"') {
        bunka += '"';
        i++;
      } else vUvozovkach = !vUvozovkach;
    } else if (z === oddelovac && !vUvozovkach) {
      pole.push(bunka);
      bunka = "";
    } else bunka += z;
  }
  pole.push(bunka);
  return pole.map((b) => b.trim());
}

function odhadniOddelovac(hlavicka: string): string {
  const pocty = [",", ";", "\t", "|"].map((o) => [o, hlavicka.split(o).length] as const);
  return pocty.sort((a, b) => b[1] - a[1])[0][0];
}

/* ---------- rozpoznání paliva a data ---------- */

function bezDiakritiky(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Které palivo řádek popisuje.
 *
 * Hledá se v celém řádku, ne v konkrétním sloupci: úřad může číselník
 * přejmenovat, ale „motorová nafta" v něm zůstane.
 */
export function druhZRadku(text: string): "nafta" | "benzin95" | null {
  const t = bezDiakritiky(text);
  if (/\bnafta\b|motorova nafta/.test(t)) return "nafta";
  if (/benzin/.test(t) && /\b95\b|natural/.test(t)) return "benzin95";
  return null;
}

/** Datum v buňce na YYYY-MM-DD. Vrací null, když to datum není. */
export function naDatum(hodnota: string): string | null {
  const s = hodnota.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Český tvar 7. 9. 2026 i 07.09.2026.
  m = s.match(/^(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Číslo z buňky. Bere desetinnou čárku i mezery v tisících. */
export function naCislo(hodnota: string): number | null {
  const s = hodnota.replace(/\s| /g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Týden podle ISO 8601 z data konce šetření, například 2026-W37. */
export function isoTyden(datum: string): string {
  const d = new Date(`${datum}T00:00:00Z`);
  const den = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - den);
  const zacatekRoku = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const cislo = Math.ceil(((d.getTime() - zacatekRoku.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(cislo).padStart(2, "0")}`;
}

/* ---------- převod tabulky na řadu ---------- */

export interface Vysledek {
  rada: TydenCeny[];
  chyba: string | null;
  /** Kolik řádků se podařilo přečíst — do logu, ať je poznat tiché selhání. */
  prectenoRadku: number;
}

/**
 * Z CSV udělá týdenní řadu.
 *
 * Sloupce se nehádají podle názvu, ale poznávají podle obsahu: datum je
 * sloupec, kde se nejčastěji čte datum, cena sloupec, kde se nejčastěji čte
 * číslo v rozsahu ceny paliva. Když některý chybí, vrátí se důvod a ukázka
 * hlavičky — ne prázdná řada.
 */
export function zCsv(csv: string): Vysledek {
  const radky = csv.split(/\r?\n/).filter((r) => r.trim());
  if (radky.length < 2) return { rada: [], chyba: "soubor má méně než dva řádky", prectenoRadku: 0 };

  const oddelovac = odhadniOddelovac(radky[0]);
  const hlavicka = rozdelRadek(radky[0], oddelovac);
  const data = radky.slice(1).map((r) => rozdelRadek(r, oddelovac));

  // Kandidáti na sloupec s datem a s cenou. Rozhoduje, co v nich opravdu je.
  const vzorek = data.slice(0, 200);
  const skoreData = hlavicka.map((_, i) => vzorek.filter((r) => naDatum(r[i] ?? "")).length);
  /* Cena paliva v Kč za litr se pohybuje v jednotkách až desítkách korun.
     Rozsah odfiltruje sloupce s kódy, roky a identifikátory. */
  const skoreCeny = hlavicka.map((_, i) =>
    vzorek.filter((r) => {
      const n = naCislo(r[i] ?? "");
      return n !== null && n > 5 && n < 200 && !Number.isInteger(n);
    }).length,
  );

  const sloupecData = skoreData.indexOf(Math.max(...skoreData));
  const sloupecCeny = skoreCeny.indexOf(Math.max(...skoreCeny));
  const ukazka = `hlavička: ${hlavicka.slice(0, 20).join(" | ")}`;

  if (skoreData[sloupecData] === 0) return { rada: [], chyba: `nenašel se sloupec s datem (${ukazka})`, prectenoRadku: 0 };
  if (skoreCeny[sloupecCeny] === 0) return { rada: [], chyba: `nenašel se sloupec s cenou (${ukazka})`, prectenoRadku: 0 };

  /*
    Územní členění: pokud sada obsahuje kraje, bereme jen celostátní řádky.
    Jinak by se pro jeden týden sešlo čtrnáct různých cen a „poslední cena"
    by byla náhodná.
  */
  const maCr = data.some((r) => /ceska republika/.test(bezDiakritiky(r.join(" "))));

  const podleTydne = new Map<string, TydenCeny>();
  const sporne = new Set<string>();
  let precteno = 0;

  for (const r of data) {
    const celyRadek = r.join(" ");
    const druh = druhZRadku(celyRadek);
    if (!druh) continue;
    if (maCr && !/ceska republika/.test(bezDiakritiky(celyRadek))) continue;

    const konec = naDatum(r[sloupecData] ?? "");
    const cena = naCislo(r[sloupecCeny] ?? "");
    if (!konec || cena === null) continue;

    precteno++;
    const zaznam = podleTydne.get(konec) ?? { tyden: isoTyden(konec), konec, nafta: null, benzin95: null };
    const stavajici = zaznam[druh];
    // Dvě různé ceny pro týž týden a palivo znamenají, že sadě nerozumíme.
    if (stavajici !== null && stavajici !== cena) sporne.add(`${konec}/${druh}`);
    zaznam[druh] = cena;
    podleTydne.set(konec, zaznam);
  }

  if (!podleTydne.size) return { rada: [], chyba: `v sadě se nenašla nafta ani benzin (${ukazka})`, prectenoRadku: 0 };
  if (sporne.size) {
    return {
      rada: [],
      chyba: `pro týž týden vyšly různé ceny (${[...sporne].slice(0, 3).join(", ")}) — sadě nerozumíme, raději nic než špatně`,
      prectenoRadku: precteno,
    };
  }

  const hranice = new Date(Date.now() - LET_ZPET * 365 * 86_400_000).toISOString().slice(0, 10);
  const rada = [...podleTydne.values()].filter((t) => t.konec >= hranice).sort((a, b) => a.konec.localeCompare(b.konec));

  return { rada, chyba: null, prectenoRadku: precteno };
}

/* ---------- běh ---------- */

/**
 * Dohledá adresy datových souborů v katalogu ČSÚ.
 *
 * Katalog je seznam sad, ne dat — u každé sady vede odkaz na její záznam
 * a na stránku. V obojím hledáme adresu souboru .csv. Nic se nedomýšlí:
 * když se v katalogu nic nenajde, vrátí se prázdno a řekne se to.
 *
 * Nalezené sady se vypisují do logu vždycky. Bez toho by se při změně na
 * straně úřadu nedalo zjistit, co vlastně katalog nabízí.
 */
export async function zKatalogu(): Promise<string[]> {
  try {
    const { stav, telo } = await stahni(KATALOG, 1);
    if (stav >= 400) {
      console.log(`[palivo] katalog ČSÚ: HTTP ${stav}`);
      return [];
    }

    const radky = telo.split(/\r?\n/).filter((r) => r.trim());
    if (radky.length < 2) return [];
    const oddelovac = odhadniOddelovac(radky[0]);
    const hlavicka = rozdelRadek(radky[0], oddelovac).map((h) => h.toLowerCase());
    const sloupec = (jmeno: string) => hlavicka.indexOf(jmeno);

    const iIri = sloupec("dataset_iri");
    const iNazev = sloupec("title");
    const iStranka = sloupec("page");
    const iOpakovani = sloupec("periodicity");

    const nalezene = radky
      .slice(1)
      .map((r) => rozdelRadek(r, oddelovac))
      .filter((r) => HLEDANE.test(bezDiakritiky(r.join(" "))));

    if (!nalezene.length) {
      console.log(`[palivo] v katalogu ČSÚ (${radky.length - 1} sad) není žádná s pohonnými hmotami`);
      return [];
    }

    console.log(`[palivo] katalog ČSÚ: ${nalezene.length} sad k pohonným hmotám`);
    for (const r of nalezene.slice(0, 10)) {
      console.log(`  - ${r[iNazev] ?? "?"} [${r[iOpakovani] ?? "?"}] ${r[iIri] ?? ""} ${r[iStranka] ?? ""}`);
    }

    /*
      Týdenní sada má přednost před měsíční a roční — sledujeme týdenní
      šetření. Když opakování v katalogu není, pořadí se nemění.
      Záznam sady i její stránka se prohledají na odkaz na soubor .csv.
    */
    const tydenni = nalezene.filter((r) => /tyden|week|W$|P1W/.test(bezDiakritiky(r[iOpakovani] ?? "")));
    const poradi = [...tydenni, ...nalezene.filter((r) => !tydenni.includes(r))];

    /*
      Ze záznamu sady i z její stránky vytáhneme VŠECHNY odkazy, ne jen ty
      končící na .csv. Běh v 02:05 UTC ukázal proč: katalog vedl na správnou
      sadu („Průměrné spotřebitelské ceny pohonných hmot – týdenní šetření",
      opakování R/P1W), ale jediný odkaz s příponou .csv na té stránce byl
      číselník statistických proměnných, ne data.

      Pořadí rozhoduje podle toho, co je v adrese: nejdřív odkazy, které nesou
      název sady, pak ostatní. Každá se zkusí přečíst — sada, která se nepřečte,
      se jen přeskočí a řekne se to.
    */
    const odkazy: string[] = [];
    let ukazkaStranky = "";
    for (const r of poradi.slice(0, 5)) {
      for (const kam of [r[iIri], r[iStranka]].filter(Boolean)) {
        try {
          const { stav: s2, telo: t2 } = await stahni(kam, 1);
          if (s2 >= 400) continue;
          if (!ukazkaStranky) ukazkaStranky = t2.slice(0, 500).replace(/\s+/g, " ");
          for (const m of t2.matchAll(/https?:\/\/[^"'\s<>\\)]+/g)) {
            const a = m[0].replace(/[.,;]+$/, "");
            if (!odkazy.includes(a)) odkazy.push(a);
          }
        } catch {
          // Jedna nedosažitelná stránka katalog neshazuje.
        }
      }
      if (odkazy.length) break;
    }

    const nazevSady = bezDiakritiky((poradi[0]?.[iNazev] ?? "").replace(/\s+/g, "_"));
    const skore = (a: string) => {
      const t = bezDiakritiky(a);
      if (/ceny_phm|cenyphm/.test(t)) return 0;
      if (/kestazeni|download|\.csv/.test(t)) return 1;
      if (nazevSady && t.includes(nazevSady.slice(0, 10))) return 2;
      return 3;
    };
    const adresy = odkazy
      .filter((a) => !/\.(pdf|xlsx?|docx?|zip|png|jpe?g|js|css)$/i.test(a) && !/dokumentace$/i.test(a))
      .sort((a, b) => skore(a) - skore(b));

    if (!adresy.length && ukazkaStranky) {
      // Bez ukázky by se nedalo poznat, jestli stránka odkazy nemá, nebo jsme je nepoznali.
      console.log(`[palivo] záznam sady bez použitelných odkazů, začátek stránky: ${ukazkaStranky}`);
    }

    /*
      Strop na čtyřech adresách. Každá nedosažitelná stojí dvacet sekund
      časového limitu a hodinový sběr je společný běh — pátá adresa už by
      zdržovala víc, než kolik má naději přinést.
    */
    if (adresy.length) console.log(`[palivo] z katalogu vyšly adresy: ${adresy.slice(0, 4).join(", ")}`);
    return adresy.slice(0, 4);
  } catch (e) {
    console.log(`[palivo] katalog ČSÚ nedostupný: ${e instanceof Error ? e.message : e}`);
    return [];
  }
}

/**
 * Stáhne a uloží řadu.
 *
 * Nikdy nevyhazuje a nikdy nemaže data, která už máme: když se stažení
 * nepovede, zůstane stará řada a k ní důvod. Ztratit změřenou historii kvůli
 * výpadku sítě by bylo horší než chvíli neaktualizovat.
 */
export async function sbirejPalivo(): Promise<void> {
  const puvodni = JSON.parse(fs.readFileSync(SOUBOR, "utf-8")) as RadaCen;

  const cerstve = puvodni.chyba
    ? jeCerstve(puvodni.pokus, HODIN_PO_CHYBE)
    : jeCerstve(puvodni.aktualizovano, HODIN_PO_USPECHU);
  if (cerstve) {
    console.log(`[palivo] přeskočeno, poslední pokus ${puvodni.pokus ?? puvodni.aktualizovano}`);
    return;
  }

  const ted = new Date().toISOString();
  const duvody: string[] = [];

  /*
    Nejdřív adresy, které známe, pak to, co vydá katalog. Pořadí je schválně
    takové: známá adresa je rychlá, katalog stojí dvě další stažení.
  */
  const adresy = [...ADRESY, ...(await zKatalogu())];

  for (const url of adresy) {
    try {
      const { stav, telo } = await stahni(url, 1);
      if (stav >= 400) {
        duvody.push(`${url}: HTTP ${stav}`);
        continue;
      }

      const v = zCsv(telo);
      if (v.chyba) {
        duvody.push(`${url}: ${v.chyba}`);
        continue;
      }

      const data: RadaCen = {
        ...puvodni,
        aktualizovano: ted,
        pokus: ted,
        zdroj: { ...puvodni.zdroj, url },
        chyba: null,
        rada: v.rada,
        /*
          Zprávu skládáme tady, protože jen tady je čerstvá řada. Rozhlas ji
          jen odešle — a neodešle vůbec nic, pokud tu není. Rozhodnutí „tohle
          je skok" tak má jedno místo, ne dvě, která by se mohla rozejít.
        */
        zprava: null,
      };
      data.zprava = zpravaOPalivu(data);
      fs.writeFileSync(SOUBOR, JSON.stringify(data, null, 2) + "\n", "utf-8");
      console.log(
        `[palivo] ${url}: ${v.rada.length} týdnů, poslední ${v.rada.at(-1)?.konec ?? "—"}` +
          (data.zprava ? `, skok ke zprávě za ${data.zprava.tyden}` : ""),
      );
      return;
    } catch (e) {
      duvody.push(`${url}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Nepovedlo se nic. Důvod se zapíše do dat, aby o něm web i rutina věděly.
  const chyba = duvody.join(" | ").slice(0, 600);
  console.log(`[palivo] řadu se nepodařilo stáhnout: ${chyba}`);
  fs.writeFileSync(SOUBOR, JSON.stringify({ ...puvodni, chyba, pokus: ted }, null, 2) + "\n", "utf-8");
}
