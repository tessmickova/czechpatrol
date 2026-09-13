import { incidenty, kampane } from "./data";
import { druh, kdyZjisteno } from "./agregace";
import { KATEGORIE } from "./kategorie";
import { porovnejSPrumerem, prumerNaOkno, type Porovnani } from "./porovnani";
import { UROVNE } from "./skala";
import type { Kategorie, Uroven } from "./typy";

/*
  Způsoby v užití.

  Čte se to jako odpověď na otázku „čím se to dneska dělá“ — a je potřeba říct
  rovnou, co to NENÍ.

  NENÍ to předpověď. Neříká, co přijde, ani co je „na spadnutí“, ani jak je kdo
  připraven zaútočit. Takové tvrzení by bylo nedoložitelné a podle Pravidla
  č. 0 (a § 357 trestního zákoníku) se nesmí napsat. Vojenskou připravenost
  cizího státu z našich dat spočítat nejde a odhad místo ní by byl výmysl.

  JE to měřidlo. Bere doložené případy, které na webu opravdu jsou, a u každého
  způsobu řekne: kolik jich bylo za devadesát dní, jak je to proti dvouletému
  průměru, kdy to bylo naposledy, ve kterých zemích a kolik z toho je úředně
  přisouzeno Rusku. Všechno dohledatelné, nic dopočítaného.

  Rozdíl je jako mezi srážkoměrem a předpovědí počasí. Srážkoměr umíme.
*/

/** Období, za které se užití měří. Stejné okno jako jinde na webu. */
export const OKNO_DNI = 90;
/** Do kolika dní se způsob považuje za právě probíhající. */
const CERSTVE_DNI = 14;

/** Jak je způsob doložen právě teď. Popis pozorování, ne výhled. */
export type StavUziti = "prave-probiha" | "aktivni" | "utlumene" | "bez-zaznamu";

export const STAVY_UZITI: Record<StavUziti, { nazev: string; popis: string }> = {
  "prave-probiha": {
    nazev: "právě probíhá",
    popis: "Poslední doložený případ je čerstvější než dva týdny.",
  },
  aktivni: {
    nazev: "v užití",
    popis: "Za sledované období máme doložený aspoň jeden případ.",
  },
  utlumene: {
    nazev: "utlumené",
    popis: "Za sledované období nic, ale v posledních dvou letech ano.",
  },
  "bez-zaznamu": {
    nazev: "bez záznamu",
    popis: "Za poslední dva roky nemáme doložený případ. Neznamená to, že se nic nestalo — znamená to, že to nemáme doložené.",
  },
};

export interface ZpusobVUziti {
  klic: string;
  nazev: string;
  /** Doložených případů za sledované období. */
  zaObdobi: number;
  /** Doložených případů za celou dobu, kterou archiv pokrývá. */
  celkem: number;
  /** Průměr na stejně dlouhé okno za poslední dva roky. null = málo historie. */
  prumer: number | null;
  /** Slovní porovnání s průměrem. null, když se průměr nedá spočítat. */
  porovnani: Porovnani | null;
  stav: StavUziti;
  naposledy: string | null;
  dniOdPosledniho: number | null;
  /** Kódy zemí, kde se to za období doloženě stalo. */
  zeme: string[];
  /** Z případů za období: kolik má ÚŘEDNÍ atribuci Rusku. */
  prisouzenoRusku: number;
  /** Nejvyšší závažnost, která se u tohoto způsobu za období objevila. */
  nejvyssiZavaznost: Uroven | null;
}

/** Způsoby, které sledujeme jako nepřátelské jednání. Ne všechny kategorie. */
const SLEDOVANE: Kategorie[] = [
  "sabotaz",
  "drony",
  "infrastruktura",
  "kyber",
  "zpravodajske",
  "hranice",
  "hybridni",
];

function stavZeStari(zaObdobi: number, dni: number | null, bylVDvouLetech: boolean): StavUziti {
  if (dni !== null && dni <= CERSTVE_DNI) return "prave-probiha";
  if (zaObdobi > 0) return "aktivni";
  return bylVDvouLetech ? "utlumene" : "bez-zaznamu";
}

/**
 * Spočítá doložené užití jednotlivých způsobů.
 *
 * Počítají se jen skutečné případy (`druh: "pripad"`), ne prohlášení, reakce
 * ani opatření — ta o užití způsobu nic neříkají.
 */
export function zpusobyVUziti(ted = Date.now()): ZpusobVUziti[] {
  const hranice = ted - OKNO_DNI * 86_400_000;
  const dvaRoky = ted - 2 * 365 * 86_400_000;

  const vsechny = incidenty().filter((i) => druh(i) === "pripad");

  const radky: ZpusobVUziti[] = SLEDOVANE.map((klic) => {
    const moje = vsechny.filter((i) => i.kategorie.includes(klic));
    const casy = moje.map(kdyZjisteno);
    const zaObdobi = moje.filter((i) => new Date(kdyZjisteno(i)).getTime() >= hranice);

    const naposledy = casy.length ? casy.slice().sort().at(-1)! : null;
    const dni = naposledy ? Math.floor((ted - new Date(naposledy).getTime()) / 86_400_000) : null;
    const prumer = prumerNaOkno(casy, OKNO_DNI, ted);

    const urovne = zaObdobi.map((i) => i.zavaznost);
    const nejvyssi = urovne.length
      ? urovne.reduce((m, u) => (UROVNE[u].poradi > UROVNE[m].poradi ? u : m), urovne[0])
      : null;

    return {
      klic,
      nazev: KATEGORIE[klic].nazev,
      zaObdobi: zaObdobi.length,
      celkem: moje.length,
      prumer,
      porovnani: porovnejSPrumerem(zaObdobi.length, prumer),
      stav: stavZeStari(zaObdobi.length, dni, casy.some((c) => new Date(c).getTime() >= dvaRoky)),
      naposledy,
      dniOdPosledniho: dni,
      zeme: [...new Set(zaObdobi.map((i) => i.kodZeme))].sort(),
      // Jen úřední atribuce. Podezření, tvrzení médií ani naše hodnocení sem nepatří.
      prisouzenoRusku: zaObdobi.filter((i) => i.atribuce === "oficialni" && i.puvodce === "rusko").length,
      nejvyssiZavaznost: nejvyssi,
    };
  });

  /*
    Manipulační operace mají vlastní datový typ, ale z pohledu čtenáře jsou
    to tentýž druh jednání jako sabotáž — proto stojí v téže tabulce. Jinak by
    ze seznamu zmizel způsob, kterého je v Česku doloženo nejvíc.
  */
  const k = kampane();
  const casyK = k.map((x) => x.odhaleno);
  const zaObdobiK = k.filter((x) => new Date(x.odhaleno).getTime() >= hranice);
  const naposledyK = casyK.length ? casyK.slice().sort().at(-1)! : null;
  const dniK = naposledyK ? Math.floor((ted - new Date(naposledyK).getTime()) / 86_400_000) : null;
  const prumerK = prumerNaOkno(casyK, OKNO_DNI, ted);
  const urovneK = zaObdobiK.map((x) => x.zavaznost).filter(Boolean) as Uroven[];

  radky.push({
    klic: "manipulace",
    nazev: "Manipulace a útoky na občany",
    zaObdobi: zaObdobiK.length,
    celkem: k.length,
    prumer: prumerK,
    porovnani: porovnejSPrumerem(zaObdobiK.length, prumerK),
    stav: stavZeStari(zaObdobiK.length, dniK, casyK.some((c) => new Date(c).getTime() >= dvaRoky)),
    naposledy: naposledyK,
    dniOdPosledniho: dniK,
    zeme: [...new Set(zaObdobiK.flatMap((x) => x.kodyZemi))].sort(),
    /*
      U kampaní není „úřední atribuce“ pole, ale stupeň jistoty. Za přisouzené
      se bere jen „vysoka“ a „potvrzeno“ — tam stojí úřední akt (sankce Rady EU
      a podobně). Podezření, byť silné, se nepočítá; jinak by číslo tvrdilo víc,
      než je doložené.
    */
    prisouzenoRusku: zaObdobiK.filter(
      (x) => /rusk/i.test(x.puvodce?.koho ?? "") && (x.puvodce?.jistota === "vysoka" || x.puvodce?.jistota === "potvrzeno"),
    ).length,
    nejvyssiZavaznost: urovneK.length
      ? urovneK.reduce((m, u) => (UROVNE[u].poradi > UROVNE[m].poradi ? u : m), urovneK[0])
      : null,
  });

  /*
    Pořadí: co se děje teď a hodně, stojí nahoře. Uvnitř stejného stavu
    rozhoduje počet za období, pak čerstvost. Nikdy ne „jak je to nebezpečné“ —
    to by byl náš odhad vydávaný za pořadí v datech.
  */
  const vaha: Record<StavUziti, number> = { "prave-probiha": 0, aktivni: 1, utlumene: 2, "bez-zaznamu": 3 };
  return radky.sort(
    (a, b) =>
      vaha[a.stav] - vaha[b.stav] ||
      b.zaObdobi - a.zaObdobi ||
      (a.dniOdPosledniho ?? 9e9) - (b.dniOdPosledniho ?? 9e9),
  );
}
