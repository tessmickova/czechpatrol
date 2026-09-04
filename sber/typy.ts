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
