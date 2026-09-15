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
  Kandidáti na adresu datové sady. Zkoušejí se popořadě a do dat se zapíše ta,
  která opravdu zabrala — nikdy ta, o které si myslíme, že by zabrat měla.
  Poslední v řadě je katalog: když neprojde nic, aspoň se do logu vypíše,
  co úřad nabízí, a adresa se opraví podle skutečnosti.
*/
const ADRESY = [
  "https://data.csu.gov.cz/api/dotaz/v1/data/sady/CENPHMTT01?format=csv",
  "https://data.csu.gov.cz/data/csu/data/CENPHMTT01.csv",
  "https://data.csu.gov.cz/datastat/data/VYBER/CENPHMTT01?format=csv",
  "https://vdb.czso.cz/pll/eweb/lkod_ld.seznam",
];

/** Adresa katalogu — jen do logu, když selže všechno ostatní. */
const KATALOG = "https://data.csu.gov.cz/api/katalog/v1/sady?dotaz=pohonn";

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
 * Stáhne a uloží řadu.
 *
 * Nikdy nevyhazuje a nikdy nemaže data, která už máme: když se stažení
 * nepovede, zůstane stará řada a k ní důvod. Ztratit změřenou historii kvůli
 * výpadku sítě by bylo horší než chvíli neaktualizovat.
 */
export async function sbirejPalivo(): Promise<void> {
  const puvodni = JSON.parse(fs.readFileSync(SOUBOR, "utf-8")) as RadaCen;
  const duvody: string[] = [];

  for (const url of ADRESY) {
    try {
      const { stav, telo } = await stahni(url, 2);
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
        aktualizovano: new Date().toISOString(),
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
  try {
    const { stav, telo } = await stahni(KATALOG, 1);
    console.log(`[palivo] katalog ČSÚ (HTTP ${stav}): ${telo.slice(0, 800)}`);
  } catch (e) {
    console.log(`[palivo] katalog ČSÚ nedostupný: ${e instanceof Error ? e.message : e}`);
  }

  fs.writeFileSync(SOUBOR, JSON.stringify({ ...puvodni, chyba }, null, 2) + "\n", "utf-8");
}
