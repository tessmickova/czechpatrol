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
   * Klíčová slova, jejichž výskyt znamená POTENCIÁLNÍ signál.
   * Nález nikdy nic nevyhlašuje — jen zakládá položku do fronty ke kontrole.
   */
  klicova?: string[];
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
