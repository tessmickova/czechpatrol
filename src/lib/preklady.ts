/*
  Překlady rozhraní a číselníků.

  Zásada, ze které se neustupuje: překládá se jen to, co je ustálené — popisky
  rozhraní a číselníky. Fakta u jednotlivých událostí zůstávají česky a odkazuje
  se na český detail. Tím se nemůže stát, že by cizojazyčná verze tvrdila něco
  jiného než česká, a nemůže zastarat: když přibude událost, cizojazyčná stránka
  ji umí zobrazit hned, protože čte z týchž číselníků.

  Chybějící překlad se nikdy nenahrazuje domněnkou ani strojem za běhu. Kontrola
  dat hlídá, že každý jazyk má všechny klíče; bez nich se jazyk nenabízí.
*/
import type { Kategorie, Puvodce, StavVysetrovani } from "./typy";
import en from "../../data/preklady/en.json";
import de from "../../data/preklady/de.json";
import pl from "../../data/preklady/pl.json";
import sk from "../../data/preklady/sk.json";
import uk from "../../data/preklady/uk.json";
import lt from "../../data/preklady/lt.json";
import lv from "../../data/preklady/lv.json";
import et from "../../data/preklady/et.json";
import fi from "../../data/preklady/fi.json";
import sv from "../../data/preklady/sv.json";
import nb from "../../data/preklady/nb.json";
import da from "../../data/preklady/da.json";
import ro from "../../data/preklady/ro.json";
import bg from "../../data/preklady/bg.json";
import hu from "../../data/preklady/hu.json";

/** Klíče rozhraní. Seznam je zároveň kontrolou úplnosti — viz kontrola-dat. */
export const KLICE_ROZHRANI = [
  "meta.titulek",
  "meta.popis",

  "strojove.upozorneni",
  "strojove.cesky",

  "co.nadpis",
  "co.text",
  "co.neni",

  "nikdy.nadpis",
  "nikdy.zdroj",
  "nikdy.cesta",
  "nikdy.varovani",

  "cisla.nadpis",
  "cisla.za90",
  "cisla.celkem",
  "cisla.od",
  "cisla.oproti",

  "uroven.nadpis",
  "uroven.cesko",
  "uroven.evropa",
  "uroven.hodnoceni",
  "uroven.stupnice",

  "udalosti.nadpis",
  "udalosti.datum",
  "udalosti.zjisteno",
  "udalosti.zavaznost",
  "udalosti.oblast",
  "udalosti.stav",
  "udalosti.puvodce",
  "udalosti.detail",
  "udalosti.vice",
  "udalosti.zadne",

  "overovani.nadpis",
  "overovani.sber",
  "overovani.clovek",
  "overovani.zverejneni",
  "overovani.neovereno",

  "odber.nadpis",
  "odber.telegram",

  "paticka.jazyky",
  "paticka.zpet",
] as const;

export type KlicRozhrani = (typeof KLICE_ROZHRANI)[number];

/** Šest názvů úrovní ze `skala.ts`. Klíčem je český název, ať se nerozejdou. */
export const NAZVY_UROVNI = ["Nízká", "Mírně zvýšená", "Střední", "Zvýšená", "Vysoká", "Vážná"] as const;
export type NazevUrovne = (typeof NAZVY_UROVNI)[number];

export interface Preklad {
  jazyk: string;
  rozhrani: Record<KlicRozhrani, string>;
  kategorie: Record<Kategorie, string>;
  urovne: Record<NazevUrovne, string>;
  stavy: Record<StavVysetrovani, string>;
  puvodci: Record<Puvodce, string>;
  /** Co není stát a nemá kód ISO: „Evropa", „NATO". Zbytek zůstává česky. */
  zvlastniZeme: Record<string, string>;
}

/*
  Překlady se načítají statickým importem, ne dynamickou cestou: sestavení pak
  ví, které soubory do buildu patří, a chybějící soubor zastaví build místo
  toho, aby se projevil až na živém webu.
*/
const SOUBORY: Record<string, unknown> = {
  en,
  de,
  pl,
  sk,
  uk,
  lt,
  lv,
  et,
  fi,
  sv,
  nb,
  da,
  ro,
  bg,
  hu,
};

/**
 * Vrátí překlad, nebo vyhodí chybu.
 *
 * Chyba při sestavení je záměr: raději neprojde build, než aby se na webu
 * objevila poloprázdná stránka v cizím jazyce.
 */
export function nactiPreklad(kod: string): Preklad {
  const data = SOUBORY[kod] as Preklad | undefined;
  if (!data) throw new Error(`Překlad ${kod} neexistuje`);

  const chybi = KLICE_ROZHRANI.filter((k) => !data.rozhrani?.[k]?.trim());
  if (chybi.length) throw new Error(`Překlad ${kod}: chybí klíče ${chybi.join(", ")}`);
  return data;
}
