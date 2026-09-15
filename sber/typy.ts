/** Typy sběrače. Sběrač nikdy nic nezveřejňuje — jen ověřuje a plní frontu. */

export type DruhZdroje =
  | "pravni"      // úřední registr pro ověření právního stavu
  | "instituce"   // NATO, EU, ministerstva
  | "provoz"      // provozovatel infrastruktury, regulátor
  | "agentura"    // zpravodajská agentura
  | "medium";

export interface RegistrZdroj {
  klic: string;
  nazev: string;
  druh: DruhZdroje;
  /** Adresa ke stažení — RSS, JSON nebo HTML. */
  url: string;
  /** Odkaz pro čtenáře, pokud se liší od strojové adresy. */
  /**
   * Náhradní adresy. Zkoušejí se v pořadí, když hlavní neodpoví — weby úřadů
   * se stěhují a jedna mrtvá adresa nemá umlčet celou položku.
   */
  zalozniUrl?: string[];
  odkaz?: string;
  format: "rss" | "html" | "json";
  jazyk: string;
  primarni: boolean;
  /**
   * Fráze, které říkají, že se něco STALO — „vyhlásil nouzový stav“,
   * „invoked article 4“. Nález blokuje potvrzení záporu a jde do fronty.
   *
   * Musí to být sloveso s předmětem, ne téma. Samotné „mobilizace“ nebo
   * „article 5“ je trvale v menu i v archivu každého úředního webu, takže
   * by se zápor nepotvrdil nikdy a web by navždy hlásil „neověřeno“.
   */
  klicova?: string[];
  /**
   * Tematická slova. Nález jen založí položku do fronty ke kontrole,
   * potvrzení záporu neblokuje — jinak by měkký signál umlčel celý web.
   */
  sledovana?: string[];
  /** Ke kterým položkám webu se zdroj vztahuje. */
  tyka?: string[];
  /**
   * Zdroj existuje, ale automat z něj nepřečte nic. Tři důvody, které jsme
   * potkali:
   *   "blokuje"     — vrací 403 na automatizované dotazy (Hrad, SSHR),
   *   "javascript"  — vrátí prázdnou slupku, obsah dokresluje prohlížeč
   *                   (e-Sbírka: 8 znaků textu na hlavní i záložních adresách),
   *   "neodpovida"  — adresa je mrtvá a záložní taky (Dopravní info).
   *
   * Necháváme takový zdroj v registru, aby bylo vidět, že s ním počítáme, ale
   * hlášení o něm nekřičí jako o poruše — a hlavně se NEPOČÍTÁ do pokrytí
   * položky. Pokrytí ze zdroje, ze kterého nejde číst, je pokrytí na papíře.
   * Položka, kterou takový zdroj kryje, musí mít ještě jiný, čitelný.
   */
  ocekavaneBlokovani?: "blokuje" | "javascript" | "neodpovida";
  /**
   * Je tenhle zdroj ÚPLNÝ autoritativní seznam pro území a typ opatření,
   * kterých se týká? Jen takový zdroj smí doložit i zápor — tedy že opatření
   * neplatí.
   *
   * Tisková stránka úřadu, RSS novinek ani rozcestník to nejsou: z toho, že
   * o opatření nepíšou, neplyne, že neexistuje. Aby zdroj mohl mít `true`,
   * musí být jasné, které území a jaký typ opatření pokrývá celý, jak se
   * pozná úplnost načtení a co znamená prázdný výsledek.
   *
   * Dnes tuhle podmínku nesplňuje ani jeden náš zdroj. Je to schválně:
   * radši ať web přizná, že zápor nemá doložený, než aby ho vyrobil
   * z absence klíčového slova.
   */
  autoritativni?: boolean;
  /**
   * Ověřeno živým stažením. Nové zdroje sem přidávejte s false;
   * `npm run sber:zdroje` napíše, které adresy skutečně odpovídají.
   */
  overenaAdresa: boolean;
}

export interface Polozka {
  nadpis: string;
  odkaz: string;
  publikovano: string | null;
  shrnuti: string;
  /**
   * Položka vytažená z obyčejné stránky, ne z RSS. Je mezi nimi i navigace
   * („Prohlášení o přístupnosti“, „Zahrada Strakovy akademie“) a ta nemá co
   * dělat v přehledu odmítnutých zpráv — ten je pracovní seznam pro člověka
   * a musí se dát projít.
   */
  zeStranky?: boolean;
}

export interface Nalez {
  zdroj: string;
  nazev: string;
  polozka: Polozka;
  /** Která klíčová slova se trefila. */
  shody: string[];
  tyka: string[];
}

export interface VysledekZdroje {
  klic: string;
  ok: boolean;
  stav: number | null;
  pocetPolozek: number;
  chyba?: string;
}
