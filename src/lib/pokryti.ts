import type { NatoPolozka, Pokryti, PravniPolozka, ProvozniPolozka } from "./typy";

/*
  Co web o úředním stavu smí napsat.

  Sběr rozlišuje dvě různá data: `overeno` je věcné ověření (stav je doložený)
  a `zkontrolovano` je poslední pohled do zdrojů. Dřív to bylo jedno pole a web
  z něj psal „ověřeno, neplatí“ i ve chvíli, kdy jen v tiskové zprávě úřadu
  nebylo hledané slovo.

  Tenhle modul překládá ten rozdíl do vět, které čtenář unese: místo
  kategorického „neplatí“ píše, co v kontrolovaných zdrojích není. Je to slabší
  tvrzení, ale pravdivé — a pořád odpovídá na otázku, kvůli které sem lidé chodí.
*/

/** Jak se o položce mluví, když se nic nenašlo. Rod i sloveso musí sedět. */
const NEVYHLASENO: Record<string, string> = {
  "stav-ohrozeni": "není vyhlášen",
  "valecny-stav": "není vyhlášen",
  mobilizace: "není vyhlášena",
  "nouzovy-stav": "není vyhlášen",
  vycestovani: "bez omezení",
  hranice: "běžný režim",
  "schuze-parlamentu": "není svolána",
  "clanek-4": "není aktivován",
  "clanek-5": "není aktivován",
  readiness: "bez oznámené změny",
  evakuace: "bez oznámené změny",
};

/** Totéž, ale opatrněji — když pokrytí na tvrdý zápor nestačí. */
const NEDOLOZENO: Record<string, string> = {
  "stav-ohrozeni": "vyhlášení nedoloženo",
  "valecny-stav": "vyhlášení nedoloženo",
  mobilizace: "vyhlášení nedoloženo",
  "nouzovy-stav": "vyhlášení nedoloženo",
  vycestovani: "omezení nedoloženo",
  hranice: "omezení nedoloženo",
  "schuze-parlamentu": "svolání nedoloženo",
  "clanek-4": "aktivace nedoložena",
  "clanek-5": "aktivace nedoložena",
  readiness: "změna nedoložena",
  evakuace: "změna nedoložena",
};

export type TonStavu = "plati" | "pozor" | "klid" | "nedolozeno" | "nevime";

export interface StavPolozky {
  /** Krátké slovo na dlaždici. */
  slovo: string;
  ton: TonStavu;
  /** Jedna věta do nápovědy. Vysvětluje, co přesně z dat plyne. */
  vysvetleni: string;
  /** Čas, který se u položky ukazuje, a jak se jmenuje. */
  cas: string | null;
  popisekCasu: "ověřeno" | "kontrolováno" | "bez kontroly";
}

const VETA_POKRYTI: Record<Pokryti, string> = {
  autoritativni: "Doloženo úplným úředním seznamem.",
  /*
    Krátce, ale pořád poctivě: „nenašli jsme" není totéž co „neplatí".
    Delší vysvětlení, proč sledované zdroje nejsou úplný seznam, je na stránce
    Zdroje — u každého z dvaceti stavů by to byl odstavec, který nikdo nečte.
  */
  orientacni: "V kontrolovaných zdrojích jsme vyhlášení nenašli. Není to úplný seznam.",
  nedostupne: "Zdroje se nepodařilo přečíst, takže tenhle údaj nemusí být aktuální. Zůstává poslední známý stav.",
};

function spolecne(
  pokryti: Pokryti,
  overeno: string | null,
  zkontrolovano: string | null | undefined,
): Pick<StavPolozky, "cas" | "popisekCasu"> {
  if (pokryti === "autoritativni" && overeno) return { cas: overeno, popisekCasu: "ověřeno" };
  if (zkontrolovano) return { cas: zkontrolovano, popisekCasu: "kontrolováno" };
  return { cas: null, popisekCasu: "bez kontroly" };
}

/** Stav právní položky nebo položky NATO — obojí má tvar „platí / neplatí / nevíme“. */
export function stavPravni(p: PravniPolozka | NatoPolozka): StavPolozky {
  const aktivni = "plati" in p ? p.plati : p.aktivni;
  const pokryti: Pokryti = p.pokryti ?? "orientacni";
  const cas = spolecne(pokryti, p.overeno, p.zkontrolovano);

  if (aktivni === true) {
    return { slovo: "PLATÍ", ton: "plati", vysvetleni: "Opatření je v platnosti.", ...cas };
  }
  if (aktivni === null) {
    return { slovo: "neověřeno", ton: "nevime", vysvetleni: VETA_POKRYTI[pokryti], ...cas };
  }
  if (pokryti === "autoritativni") {
    return { slovo: NEVYHLASENO[p.klic] ?? "neplatí", ton: "klid", vysvetleni: VETA_POKRYTI.autoritativni, ...cas };
  }
  if (pokryti === "nedostupne") {
    return {
      slovo: NEDOLOZENO[p.klic] ?? "nedoloženo",
      ton: "nevime",
      vysvetleni: VETA_POKRYTI.nedostupne,
      ...cas,
    };
  }
  return { slovo: NEDOLOZENO[p.klic] ?? "nedoloženo", ton: "nedolozeno", vysvetleni: VETA_POKRYTI.orientacni, ...cas };
}

/** Stav provozní položky. Narušení a sledování mají přednost před pokrytím. */
export function stavProvozu(p: ProvozniPolozka): StavPolozky {
  const pokryti: Pokryti = p.pokryti ?? "orientacni";
  const cas = spolecne(pokryti, p.overeno, p.zkontrolovano);

  if (p.stav === "narusen") return { slovo: "NARUŠENO", ton: "plati", vysvetleni: "Hlášené narušení provozu.", ...cas };
  if (p.stav === "sledujeme") {
    return { slovo: "sledujeme", ton: "pozor", vysvetleni: "Ve zdrojích je hlášení, které prověřujeme.", ...cas };
  }
  if (p.stav === "bez-zdroje") {
    return { slovo: "bez zdroje", ton: "nevime", vysvetleni: "Pro tuhle položku nemáme dostupný veřejný zdroj.", ...cas };
  }
  if (pokryti === "autoritativni") return { slovo: p.hodnota || "běžný", ton: "klid", vysvetleni: VETA_POKRYTI.autoritativni, ...cas };
  if (pokryti === "nedostupne") {
    return { slovo: "aktuálnost neověřena", ton: "nevime", vysvetleni: VETA_POKRYTI.nedostupne, ...cas };
  }
  return { slovo: "bez hlášení", ton: "nedolozeno", vysvetleni: VETA_POKRYTI.orientacni, ...cas };
}
