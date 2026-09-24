/*
  Jazyky, ve kterých web nabízí přehled.

  Proč zrovna tyhle: web sleduje incidenty v Evropě a nejvíc jich připadá na
  země kolem Ruska a na naše sousedy. Čtenář v Rize nebo Helsinkách má mít
  šanci přečíst si, co se u nich stalo, aniž by uměl česky.

  Co se ale nepřekládá: podmínky užití a zásady soukromí zůstávají česky.
  Strojový překlad právního textu by vytvořil druhé znění, které by si s tím
  českým mohlo odporovat — a u právního textu to není kosmetická vada.
  Stejně tak se nepřekládají fakta u jednotlivých záznamů; překládají se
  číselníky (země, oblast, závažnost, stav, původce), ze kterých se dá
  událost přečíst i bez znalosti češtiny, a u detailu se odkazuje na české
  znění. Nepřeložený údaj se nikdy nenahrazuje domněnkou.
*/

export interface Jazyk {
  /** Kód podle BCP 47 — jde i do atributu lang a do hreflang. */
  kod: string;
  /** Jak se jazyk jmenuje sám v sobě. Tohle vidí návštěvník v přepínači. */
  nazev: string;
  /** Jak se jmenuje česky — pro naše vlastní texty a dokumentaci. */
  cesky: string;
  /** Proč je v seznamu: země, kvůli kterým jsme ho přidali. */
  duvod: string;
}

/*
  Od 24. 9. 2026 jen čeština (rozhodnutí provozovatelky). Seznam je prázdný,
  cizojazyčné větve se nesestavují; staré adresy /en/… vedou přes _redirects
  na české znění. Typ a pomocné funkce zůstávají, ať se dá jazyk vrátit.
*/
export const JAZYKY: Jazyk[] = [];

export const KODY_JAZYKU = JAZYKY.map((j) => j.kod);

export function jazyk(kod: string): Jazyk | undefined {
  return JAZYKY.find((j) => j.kod === kod);
}

/*
  Názvy zemí se nepřekládají ručně. Každá země má kód podle ISO 3166-1 a
  název si vyžádáme od Intl.DisplayNames — je to přesnější než patnáct ručních
  seznamů a nemůže se to rozejít, když v datech přibude další země.
*/
export const KODY_ZEMI: Record<string, string> = {
  Česko: "CZ", Slovensko: "SK", Polsko: "PL", Německo: "DE", Rakousko: "AT",
  Maďarsko: "HU", Rumunsko: "RO", Bulharsko: "BG", Moldavsko: "MD", Ukrajina: "UA",
  Bělorusko: "BY", Rusko: "RU", Litva: "LT", Lotyšsko: "LV", Estonsko: "EE",
  Finsko: "FI", Švédsko: "SE", Norsko: "NO", Dánsko: "DK", Island: "IS",
  Nizozemsko: "NL", Belgie: "BE", Lucembursko: "LU", Francie: "FR", Itálie: "IT",
  Španělsko: "ES", Portugalsko: "PT", Irsko: "IE", "Spojené království": "GB",
  Švýcarsko: "CH", Slovinsko: "SI", Chorvatsko: "HR", Srbsko: "RS", "Černá Hora": "ME",
  "Bosna a Hercegovina": "BA", Albánie: "AL", "Severní Makedonie": "MK", Řecko: "GR",
  Turecko: "TR", Kypr: "CY", Malta: "MT", Gruzie: "GE", Arménie: "AM", Ázerbájdžán: "AZ",
  Kazachstán: "KZ", "Spojené státy": "US", Kanada: "CA",
  "Saúdská Arábie": "SA", Irák: "IQ", Írán: "IR", Izrael: "IL", Egypt: "EG",
};

/**
 * Název země v daném jazyce.
 *
 * Co není stát — „Evropa", „NATO", „Středomoří (mezinárodní vody)" — nebo co
 * v číselníku chybí, zůstane česky. Radši nepřeložený údaj než vymyšlený.
 */
export function nazevZeme(zeme: string, kodJazyka: string, zvlastni: Record<string, string> = {}): string {
  if (zvlastni[zeme]) return zvlastni[zeme];

  const iso = KODY_ZEMI[zeme];
  if (!iso) return zeme;

  try {
    const jmena = new Intl.DisplayNames([kodJazyka], { type: "region" });
    return jmena.of(iso) ?? zeme;
  } catch {
    // Prostředí bez plné sady jazykových dat. Česky je pořád lepší než nic.
    return zeme;
  }
}
