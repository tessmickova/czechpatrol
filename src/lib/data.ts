import { JE_UKAZKA } from "@/config/web";
import type {
  Odmitnuty,
  Archiv, CelkovyStav, HybridniTlak, Incident, Kampan, Kandidat, Kategorie, NatoPolozka, Oprava, PravniStav,
  Nepotvrzene, Overovana, Provoz, Puvodce, RuskoStav, Svet, Tip, TydenniHodnoceni, Uroven, Vystraha, VystrahaSoubor, Watchlist,
} from "./typy";
import { PORADI_KATEGORII } from "./kategorie";
import { UROVNE } from "./skala";

import ostreIncidenty from "../../data/incidenty.json";
import ostryStav from "../../data/stav.json";
import ostryPravni from "../../data/pravni-stav.json";
import ostreNato from "../../data/nato.json";
import ostryProvoz from "../../data/provoz.json";
import souborVystrahy from "../../data/vystraha.json";
import ostreTipy from "../../data/tipy.json";
import ostryHybridni from "../../data/hybridni-tlak.json";
import ostreTydny from "../../data/tydny.json";
import ostreRusko from "../../data/rusko.json";
import ostryWatchlist from "../../data/watchlist.json";
import ostryArchiv from "../../data/historie.json";
import ostreNepotvrzene from "../../data/nepotvrzeno.json";
import mesiceData from "../../data/mesice.json";
import ostreOpravy from "../../data/opravy.json";
import ostriKandidati from "../../data/kandidati.json";
import ostrySvet from "../../data/svet.json";
import ostreKampane from "../../data/kampane.json";
import ostreOverujeme from "../../data/overujeme.json";
import ostreOdmitnute from "../../data/fronta/odmitnute.json";
import ostreNavrhy from "../../data/navrhy.json";

import ukazkoveIncidenty from "../../data/ukazka/incidenty.json";
import ukazkovyStav from "../../data/ukazka/stav.json";
import ukazkovyPravni from "../../data/ukazka/pravni-stav.json";
import ukazkoveNato from "../../data/ukazka/nato.json";
import ukazkovyProvoz from "../../data/ukazka/provoz.json";
import ukazkovyHybridni from "../../data/ukazka/hybridni-tlak.json";
import ukazkoveTydny from "../../data/ukazka/tydny.json";
import ukazkoveRusko from "../../data/ukazka/rusko.json";
import ukazkovyArchiv from "../../data/ukazka/historie.json";
import ukazkoveOverujeme from "../../data/ukazka/overujeme.json";

/**
 * Vrstva mezi daty a UI.
 *
 * JSON se importuje staticky, ne přes `fs` — díky tomu běží tenhle modul
 * i v prohlížeči, takže z týchž komponent jde postavit statický web
 * i klikací náhled. Až přibude databáze, mění se jen tenhle soubor.
 *
 * Ukázková data se přimíchávají jen v režimu „ukazka“ a každý takový záznam
 * si nese příznak `ukazka`. Podmínka stojí na proměnné, kterou build nahradí
 * konstantou, takže se do produkčního balíčku ukázková data vůbec nedostanou.
 */

export type SUkazkou<T> = T & { ukazka?: boolean };

/** Zúžení typu z JSONu: struktura je hlídaná testy nad daty. */
const jako = <T,>(x: unknown): T => x as T;

export function incidenty(): SUkazkou<Incident>[] {
  // Na produkci se zobrazují jen záznamy, které prošly lidskou kontrolou.
  /* Zveřejněné je to, co prošlo člověkem, nebo co je doložené dvěma zdroji včetně úředního. */
  const ostre = jako<Incident[]>(ostreIncidenty).filter((i) => i.lidskyOvereno || i.overeni === "automaticke");
  const ukazkove = JE_UKAZKA
    ? jako<Incident[]>(ukazkoveIncidenty).map((i) => ({ ...i, ukazka: true }))
    : [];
  return [...ostre, ...ukazkove].sort((a, b) =>
    (b.datumZjisteni ?? b.datumUdalosti).localeCompare(a.datumZjisteni ?? a.datumUdalosti),
  );
}

export function incident(slug: string): SUkazkou<Incident> | undefined {
  return incidenty().find((i) => i.slug === slug);
}

export function celkovyStav(): SUkazkou<CelkovyStav> {
  if (JE_UKAZKA) return { ...jako<CelkovyStav>(ukazkovyStav), ukazka: true };
  return jako<CelkovyStav>(ostryStav);
}

export function pravniStav(): PravniStav {
  const ostry = jako<PravniStav>(ostryPravni);
  if (!JE_UKAZKA) return ostry;
  // Ukázka doplňuje jen hodnoty, definice a zdroje zůstávají skutečné.
  const u = jako<PravniStav>(ukazkovyPravni);
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const n = u.polozky.find((x) => x.klic === p.klic);
      return n ? { ...p, plati: n.plati, hodnota: n.hodnota, overeno: n.overeno } : p;
    }),
  };
}

export function nato(): { overeno: string | null; polozky: NatoPolozka[] } {
  const ostry = jako<{ overeno: string | null; polozky: NatoPolozka[] }>(ostreNato);
  if (!JE_UKAZKA) return ostry;
  const u = jako<{ overeno: string | null; polozky: NatoPolozka[] }>(ukazkoveNato);
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const n = u.polozky.find((x) => x.klic === p.klic);
      return n ? { ...p, aktivni: n.aktivni, hodnota: n.hodnota, overeno: n.overeno } : p;
    }),
  };
}

export function provoz(): Provoz {
  const ostry = jako<Provoz>(ostryProvoz);
  if (!JE_UKAZKA) return ostry;
  const u = jako<Provoz>(ukazkovyProvoz);
  return {
    overeno: u.overeno,
    polozky: ostry.polozky.map((p) => {
      const n = u.polozky.find((x) => x.klic === p.klic);
      return n ? { ...p, stav: n.stav, hodnota: n.hodnota, overeno: n.overeno } : p;
    }),
  };
}

/**
 * Mimořádná výstraha do pruhu přes celou šířku.
 *
 * Vrací ji, jen když je v datech ověřená člověkem a má aspoň dva zdroje.
 * Rozhodovat se o tom až tady, a ne jen při zápisu, je schválně: kdyby se
 * do souboru někdy dostal neúplný záznam — ručně, omylem, skriptem — web ho
 * neukáže. Poplašný pruh bez doložení je přesně to, co tenhle web u jiných
 * popisuje jako manipulaci.
 *
 * Ukázkový režim výstrahu nikdy nezapíná: v ukázce by vypadala jako
 * skutečná a nikdo by nepoznal rozdíl.
 */
export function vystraha(): Vystraha | null {
  if (JE_UKAZKA) return null;
  const v = jako<VystrahaSoubor>(souborVystrahy).aktivni;
  if (!v) return null;
  const maZdroje = (v.zdroje ?? []).filter((z) => /^https?:\/\//.test(z.url ?? "")).length >= 2;
  if (!v.overeno || !v.overil || !maZdroje) return null;
  if (v.platiDo && new Date(v.platiDo).getTime() < Date.now()) return null;
  return v;
}

/**
 * Tipy k přípravě. Ven jde jen tip s doloženým zdrojem a s platností —
 * stejné pravidlo jako u záznamů. Nejnovější první.
 */
export function tipy(ted = Date.now()): Tip[] {
  return jako<Tip[]>(ostreTipy)
    .filter((t) => (t.zdroje ?? []).some((z) => /^https?:\/\//.test(z.url ?? "")))
    .filter((t) => !t.platiDo || new Date(t.platiDo).getTime() > ted)
    .sort((a, b) => b.kdy.localeCompare(a.kdy));
}

export function hybridniTlak(): HybridniTlak {
  const ostry = jako<HybridniTlak>(ostryHybridni);
  if (!JE_UKAZKA) return ostry;
  const u = jako<HybridniTlak>(ukazkovyHybridni);
  return {
    overeno: u.overeno,
    celkem: u.celkem,
    podkategorie: ostry.podkategorie.map((p) => {
      const n = u.podkategorie.find((x) => x.klic === p.klic);
      return n ? { ...p, uroven: n.uroven } : p;
    }),
  };
}

export function tydny(): TydenniHodnoceni[] {
  const zdroj = JE_UKAZKA ? jako<TydenniHodnoceni[]>(ukazkoveTydny) : jako<TydenniHodnoceni[]>(ostreTydny);
  return zdroj.slice().sort((a, b) => a.zacatek.localeCompare(b.zacatek));
}

export function rusko(): RuskoStav {
  const ostry = jako<RuskoStav>(ostreRusko);
  if (!JE_UKAZKA) return ostry;
  const u = jako<RuskoStav>(ukazkoveRusko);
  return {
    ...ostry,
    overeno: u.overeno,
    casovyTlak: u.casovyTlak,
    dopadNaIndex: u.dopadNaIndex,
    ukazatele: ostry.ukazatele.map((p) => {
      const n = u.ukazatele.find((x) => x.nazev === p.nazev);
      return n ? { ...p, uroven: n.uroven } : p;
    }),
  };
}

/**
 * Záznamy, které ověřením neprošly. Do žádného počtu ani hodnocení nevstupují.
 */
export function nepotvrzene(): Nepotvrzene[] {
  return jako<Nepotvrzene[]>(ostreNepotvrzene);
}

/**
 * Rozložení incidentů podle toho, co se ví o původci.
 *
 * Samostatný ukazatel. Do celkové úrovně nevstupuje — ta stojí na závažnosti
 * a kumulaci, ne na tom, kolik případů má potvrzené státní řízení.
 */
/**
 * Kdo za činy stojí — rozpad podle původce.
 *
 * Počítají se jen fyzické incidenty s polem `puvodce`; prohlášení, varování
 * a reakce států původce nemají. „Potvrzeno“ znamená oficiální závěr nebo
 * prokázaný domácí pachatel. Do celkové úrovně tenhle rozpad nevstupuje.
 */
export function puvodce(odRoku = new Date().getUTCFullYear()) {
  const letos = incidenty().filter((i) => new Date(i.datumZjisteni ?? i.datumUdalosti).getUTCFullYear() >= odRoku);
  const vse = letos.filter((i) => i.puvodce);
  const skupiny: { klic: Puvodce; nazev: string }[] = [
    { klic: "rusko", nazev: "Rusko" },
    { klic: "ukrajina", nazev: "Ukrajina" },
    { klic: "jiny-stat", nazev: "Jiný stát" },
    { klic: "neni-stat", nazev: "Nestátní skupina" },
    { klic: "domaci", nazev: "Domácí pachatel" },
    { klic: "neznamy", nazev: "Neznámý" },
  ];
  return {
    celkem: vse.length,
    bezPuvodce: letos.length - vse.length,
    odRoku,
    skupiny: skupiny.map((s) => {
      const z = vse.filter((i) => i.puvodce === s.klic);
      return {
        ...s,
        pocet: z.length,
        potvrzeno: z.filter((i) => i.atribuce === "oficialni" || i.atribuce === "domaci").length,
        vysetruje: z.filter((i) => i.atribuce === "vysetrovana").length,
      };
    }),
  };
}

/** Dopad po zemích: kolik záznamů, nejvyšší závažnost, oblasti. ČR vždy první. */
export function zemeDopad(odRoku = new Date().getUTCFullYear()) {
  const mapa = new Map<string, { kodZeme: string; zeme: string; zaznamy: Incident[] }>();
  for (const i of incidenty()) {
    if (new Date(i.datumZjisteni ?? i.datumUdalosti).getUTCFullYear() < odRoku) continue;
    const z = mapa.get(i.kodZeme) ?? { kodZeme: i.kodZeme, zeme: i.zeme, zaznamy: [] };
    z.zaznamy.push(i);
    mapa.set(i.kodZeme, z);
  }
  if (!mapa.has("CZ")) mapa.set("CZ", { kodZeme: "CZ", zeme: "Česko", zaznamy: [] });
  const radky = [...mapa.values()].map((z) => {
    const serazene = [...z.zaznamy].sort((a, b) => UROVNE[b.zavaznost].poradi - UROVNE[a.zavaznost].poradi);
    const kategorie = new Set<Kategorie>();
    for (const i of z.zaznamy) for (const k of i.kategorie) kategorie.add(k);
    const ciny = z.zaznamy.filter((i) => i.puvodce);
    return {
      kodZeme: z.kodZeme,
      zeme: z.kodZeme === "CZ" ? "Česko" : z.zeme,
      pocet: z.zaznamy.length,
      nejvyssi: serazene[0]?.zavaznost ?? null,
      /** Činy s potvrzeným pachatelem — počítá se jen mezi činy, ne mezi prohlášeními. */
      potvrzenych: ciny.filter((i) => i.atribuce === "oficialni" || i.atribuce === "domaci").length,
      cinu: ciny.length,
      /** Prohlášení, varování, reakce států — záznamy bez původce. */
      prohlaseni: z.zaznamy.length - ciny.length,
      kategorie: PORADI_KATEGORII.filter((k) => kategorie.has(k)),
      posledni: z.zaznamy.map((i) => i.datumZjisteni ?? i.datumUdalosti).sort().at(-1) ?? null,
      nejzavaznejsi: serazene[0] ?? null,
    };
  });
  return radky.sort((a, b) => {
    if (a.kodZeme === "CZ") return -1;
    if (b.kodZeme === "CZ") return 1;
    return b.pocet - a.pocet || (UROVNE[b.nejvyssi ?? "G1"].poradi - UROVNE[a.nejvyssi ?? "G1"].poradi);
  });
}

/**
 * Radar pro jednu zemi odvozený jen ze zveřejněných záznamů s jejím kódem.
 * Osa bez záznamu je null — web nic nedopočítává.
 */
export function tlakZeme(kodZeme: string): HybridniTlak {
  const cz = incidenty().filter((i) => i.kodZeme === kodZeme);
  const max = (f: (i: Incident) => boolean): Uroven | null => {
    const z = cz.filter(f);
    if (!z.length) return null;
    return z.reduce((m, i) => (UROVNE[i.zavaznost].poradi > UROVNE[m].poradi ? i.zavaznost : m), z[0].zavaznost);
  };
  const osy: { klic: string; nazev: string; kat: Kategorie | null }[] = [
    { klic: "sabotaze", nazev: "Sabotáže", kat: "sabotaz" },
    { klic: "atribuce", nazev: "Kdo to byl — vyšetřovací posuny", kat: "vysetrovani" },
    { klic: "kyber", nazev: "Kybernetické operace", kat: "kyber" },
    { klic: "drony", nazev: "Drony a vzdušný prostor", kat: "drony" },
    { klic: "infrastruktura", nazev: "Kritická infrastruktura", kat: "infrastruktura" },
    { klic: "primy", nazev: "Přímé vojenské riziko", kat: null },
  ];
  return {
    overeno: null,
    celkem: max(() => true),
    podkategorie: osy.map((o) => ({
      klic: o.klic,
      nazev: o.nazev,
      uroven: o.kat ? max((i) => i.kategorie.includes(o.kat!)) : null,
      poznamka: o.kat ? `Podle zveřejněných záznamů se zemí ${kodZeme}.` : "Přímé vojenské riziko se pro jednotlivou zemi samostatně nehodnotí.",
    })),
  };
}

/** Radar pro Česko. Zkratka nad `tlakZeme`, protože ji volá půlka webu. */
export function tlakCr(): HybridniTlak {
  return tlakZeme("CZ");
}

/**
 * Kampaně přepočtené na započitatelné položky.
 *
 * Kampaň není incident v tom smyslu, že by měla jedno místo a jeden
 * okamžik. Útok to ale je — a útok na to, čemu lidé věří, se do počtů
 * musí dostat stejně jako sabotáž na rozvodně. Jinak by budík hlásil
 * „bez záznamu“ ve chvíli, kdy proti občanům běží doložená operace.
 */
export function kampaneJakoPolozky(): { slug: string; kdy: string; kodyZemi: string[]; zavaznost: Uroven }[] {
  return kampane().map((k) => ({ slug: k.slug, kdy: k.odhaleno, kodyZemi: k.kodyZemi, zavaznost: k.zavaznost }));
}

/**
 * Všechno, co se počítá jako incident: případy i manipulační operace.
 *
 * Jediné místo, odkud se berou počty. Kdyby si každá sekce sestavovala
 * vlastní množinu, dřív nebo později by se rozešly a web by si odporoval.
 */
export function zapocitatelne(): { kdy: string; cz: boolean; kampan: boolean }[] {
  return [
    ...incidenty()
      .filter((i) => (i.druh ?? "pripad") === "pripad")
      .map((i) => ({ kdy: i.datumZjisteni ?? i.datumUdalosti, cz: i.kodZeme === "CZ", kampan: false })),
    ...kampane().map((k) => ({ kdy: k.odhaleno, cz: k.kodyZemi.includes("CZ"), kampan: true })),
  ];
}

/** Kampaně mířící na zemi, v okně posledních `dni` dnů. */
function kampaneZemeObdobi(kodZeme: string, dni: number, ted = Date.now()) {
  const hranice = ted - dni * 86_400_000;
  return kampaneJakoPolozky().filter(
    (k) => k.kodyZemi.includes(kodZeme.toUpperCase()) && new Date(k.kdy).getTime() >= hranice,
  );
}

/**
 * Nejvyšší závažnost země za poslední období.
 *
 * Radar `tlakZeme` bere celou historii od roku 2014 — to je správně pro otázku
 * „čím vším si země prošla“, ale ne pro otázku „jak je na tom teď“. Budík
 * v hlavičce potřebuje druhou z nich, jinak by vedle sebe stálo „vysoká“
 * a „0 případů za 90 dní“ a vypadalo to jako rozpor.
 *
 * null znamená, že za dané období nemáme ani jeden ověřený případ. Nula se
 * nedopočítává na „nízkou“ — o období bez záznamu prostě nic netvrdíme.
 */
export function urovenZemeObdobi(kodZeme: string, dni = 90): Uroven | null {
  const hranice = Date.now() - dni * 86_400_000;
  const z = incidenty().filter(
    (i) =>
      i.kodZeme === kodZeme &&
      (i.druh ?? "pripad") === "pripad" &&
      new Date(i.datumZjisteni ?? i.datumUdalosti).getTime() >= hranice,
  );
  // Manipulační operace se počítá jako incident — viz kampaneJakoPolozky.
  const urovne: Uroven[] = [...z.map((i) => i.zavaznost), ...kampaneZemeObdobi(kodZeme, dni).map((k) => k.zavaznost)];
  if (!urovne.length) return null;
  return urovne.reduce((m, u) => (UROVNE[u].poradi > UROVNE[m].poradi ? u : m), urovne[0]);
}

/** Kolik započitatelných věcí se v zemi stalo za dané období. */
export function pocetZemeObdobi(kodZeme: string, dni = 90): { pripadu: number; kampani: number } {
  const hranice = Date.now() - dni * 86_400_000;
  const pripadu = incidenty().filter(
    (i) =>
      i.kodZeme === kodZeme &&
      (i.druh ?? "pripad") === "pripad" &&
      new Date(i.datumZjisteni ?? i.datumUdalosti).getTime() >= hranice,
  ).length;
  return { pripadu, kampani: kampaneZemeObdobi(kodZeme, dni).length };
}

/**
 * Dopad na občany ČR: jediná úroveň odvozená z toho, co dnes platí.
 * Mimořádný právní stav = vážná; narušená služba = vysoká; sledovaná = střední;
 * nic z toho = nízká. Neověřené položky do výsledku nevstupují, ale hlásí se.
 */
export function urovenObcanu(): { uroven: Uroven; popis: string; neovereno: number } {
  const pr = pravniStav().polozky;
  const pv = provoz().polozky;
  const neovereno = pr.filter((p) => p.plati === null).length + pv.filter((p) => p.stav === "bez-zdroje").length;
  const plati = pr.filter((p) => p.plati === true);
  if (plati.length) return { uroven: "R1", popis: `platí: ${plati.map((p) => p.nazev.toLowerCase()).join(", ")}`, neovereno };
  const narusene = pv.filter((p) => p.stav === "narusen");
  if (narusene.length) return { uroven: "O1", popis: `narušeno: ${narusene.map((p) => p.nazev.toLowerCase()).join(", ")}`, neovereno };
  const sledovane = pv.filter((p) => p.stav === "sledujeme");
  if (sledovane.length) return { uroven: "Y1", popis: `sledujeme: ${sledovane.map((p) => p.nazev.toLowerCase()).join(", ")}`, neovereno };
  return { uroven: "G1", popis: "bez omezení, bez mobilizace, bez mimořádných nařízení", neovereno };
}

/** Měsíční řada od roku 2013. Měsíce bez doloženého záznamu jsou prázdné. */
export function mesice(): { zacatek: string; mesice: { mesic: string; uroven: Uroven | null; zaznamu: number; nejvyssi: Uroven | null }[] } {
  const d = jako<{ zacatek: string; mesice: { mesic: string; uroven: Uroven }[] }>(mesiceData);
  const mapa = new Map(d.mesice.map((m) => [m.mesic, m.uroven]));
  const pocty = new Map<string, Incident[]>();
  for (const i of incidenty()) {
    const k = (i.datumZjisteni ?? i.datumUdalosti).slice(0, 7);
    pocty.set(k, [...(pocty.get(k) ?? []), i]);
  }
  const [ry, rm] = d.zacatek.split("-").map(Number);
  const konec = new Date();
  const vse: { mesic: string; uroven: Uroven | null; zaznamu: number; nejvyssi: Uroven | null }[] = [];
  for (let y = ry, m = rm; y < konec.getUTCFullYear() || (y === konec.getUTCFullYear() && m <= konec.getUTCMonth() + 1); ) {
    const klic = `${y}-${String(m).padStart(2, "0")}`;
    const z = pocty.get(klic) ?? [];
    const nejvyssi = z.reduce<Uroven | null>((max, i) => (!max || UROVNE[i.zavaznost].poradi > UROVNE[max].poradi ? i.zavaznost : max), null);
    vse.push({ mesic: klic, uroven: mapa.get(klic) ?? null, zaznamu: z.length, nejvyssi });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return { zacatek: d.zacatek, mesice: vse };
}

/** Archiv stavů v čase. Podklad pro časový posuvník. */
export function archiv(): Archiv {
  const a = JE_UKAZKA ? jako<Archiv>(ukazkovyArchiv) : jako<Archiv>(ostryArchiv);
  return { ...a, snimky: a.snimky.slice().sort((x, y) => x.kdy.localeCompare(y.kdy)) };
}

/**
 * Kdy naposledy proběhlo ověření proti zdrojům.
 *
 * Není to totéž co `stav.aktualizovano` — celkovou úroveň stanovuje člověk,
 * kdežto tohle je čas posledního běhu sběru. Hlavička má ukazovat tenhle.
 */
export function posledniOvereni(): string | null {
  const casy = [pravniStav().overeno, nato().overeno, provoz().overeno].filter(
    (x): x is string => Boolean(x),
  );
  return casy.length ? casy.sort().at(-1)! : null;
}

/**
 * Kdy se sběr naposledy díval do zdrojů.
 *
 * Není to ověření. Je to odpověď na otázku „běží to vůbec?“ — a ta se musí
 * dát zodpovědět i ve chvíli, kdy z kontroly žádný doložený závěr neplyne.
 */
export function posledniKontrola(): string | null {
  const casy = [pravniStav(), nato(), provoz()]
    .flatMap((x) => x.polozky.map((p) => p.zkontrolovano))
    .filter((x): x is string => Boolean(x));
  return casy.length ? casy.slice().sort().at(-1)! : null;
}

/**
 * Jak dlouho se nezměnil právní stav ČR ani stav NATO.
 *
 * Klid je taky informace — bez něj by web ukazoval jen to, co se pokazilo.
 * Rozlišujeme ale dvě různé věci: „od poslední změny“ a „od začátku archivu“.
 * Když archiv žádnou změnu nezachytil, nesmíme tvrdit, že žádná nenastala —
 * jen že o žádné nevíme.
 */
export function dnyBezZmeny(): { dnu: number; odZacatkuArchivu: boolean } | null {
  const s = archiv().snimky;
  if (s.length < 2) return null;
  const posledni = s[s.length - 1];
  const zmena = [...s]
    .reverse()
    .find((x) => x.zmeny.some((z) => z.startsWith("právní") || z.startsWith("NATO")));
  const od = zmena ? zmena.kdy : s[0].kdy;
  const dnu = Math.max(
    0,
    Math.floor((new Date(posledni.kdy).getTime() - new Date(od).getTime()) / 86_400_000),
  );
  // Pod jeden celý den nemá smysl o „dnech beze změny“ mluvit.
  if (dnu < 1) return null;
  return { dnu, odZacatkuArchivu: !zmena };
}

/**
 * Automaticky zachycené zprávy čekající na ověření. Nejnovější první.
 * Nikdy se nemíchají do incidentů — jsou to kandidáti, ne záznamy.
 */
/**
 * Zprávy, které síto nepustilo. Jen pro stránku ve správě.
 *
 * Soubor je součástí statického buildu, takže to není tajemství — je to
 * materiál držený stranou, ne skrytý. Kdo ho najde, uvidí veřejné titulky
 * a odkazy, nic víc.
 */
export function odmitnute(): Odmitnuty[] {
  return ostreOdmitnute as Odmitnuty[];
}

/**
 * Zachycené zprávy, které na něco čekají. Nejnovější první.
 *
 * Vyřízené se nevracejí. Zachycený článek není událost — je to jeden doklad.
 * Jakmile se ví, ke které události patří (nebo že k žádné), nemá se dál
 * tvářit, že čeká: patřil by do počtu „čeká na ověření" a na titulce by stál
 * mezi novinkami, přestože o něm je rozhodnuto.
 */
export function kandidati(): Kandidat[] {
  return jako<Kandidat[]>(ostriKandidati)
    .filter((k) => k.stav !== "vyrizen")
    .slice()
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno));
}

/**
 * Nepotvrzené záznamy — připravené, ale ještě neschválené člověkem.
 *
 * Proč jsou na webu: zpráva, která čeká na schválení, se ve světě už stala.
 * Dokud byla vidět jen ve Správě, vypadal web během čekání jako by se nic
 * nedělo — a to je zavádějící jinak, ale stejně jako zveřejnit neověřené
 * tvrzení. Ukazuje se proto obojí, jen zřetelně oddělené.
 *
 * Co nepotvrzený záznam NENÍ: tvrzení projektu. Nevstupuje do počtů, do
 * hodnocení situace ani do upozornění a nemá vlastní stránku — odkazuje
 * ven na zdroje, ze kterých se o věci ví.
 *
 * Potvrdí se dvěma cestami: schválením ve Správě, nebo doložením druhým
 * nezávislým zdrojem, z nichž aspoň jeden je úřední — pak se zveřejní sám
 * a je označený jako nečtený.
 */
export function nepotvrzeneZaznamy(): Incident[] {
  return jako<Incident[]>(ostreNavrhy)
    .filter((n) => (n as Incident & { kam?: string }).kam === "zaznam" && !n.lidskyOvereno)
    .slice()
    .sort((a, b) => (b.datumZjisteni ?? b.datumUdalosti).localeCompare(a.datumZjisteni ?? a.datumUdalosti));
}

/** Všechny zachycené zprávy včetně vyřízených — pro přehledy a statistiku. */
export function vsichniKandidati(): Kandidat[] {
  return jako<Kandidat[]>(ostriKandidati);
}

/**
 * Manipulační kampaně, které prošly lidskou kontrolou. Nejnovější první.
 *
 * Do počtu případů nevstupují. Kampaň není událost: nemá jedno místo ani
 * jeden okamžik a obvykle míří na víc zemí naráz.
 */
export function kampane(): Kampan[] {
  return jako<Kampan[]>(ostreKampane)
    .filter((k) => k.lidskyOvereno)
    .slice()
    .sort((a, b) => b.odhaleno.localeCompare(a.odhaleno));
}

export function kampan(slug: string): Kampan | undefined {
  return kampane().find((k) => k.slug === slug);
}

/** Kampaně mířící na danou zemi. Jedna kampaň se objeví u každé z nich. */
export function kampaneZeme(kodZeme: string): Kampan[] {
  return kampane().filter((k) => k.kodyZemi.includes(kodZeme.toUpperCase()));
}

/**
 * Kolik zpracovaných kampaní míří na kterou zemi.
 *
 * Počítají se jen kampaně, které prošly ověřením — ne všechno, co kde
 * koluje. Součet přes země je proto vyšší než počet kampaní: jedna kampaň
 * může mířit na několik zemí naráz a u každé se počítá.
 */
export function kampanePodleZemi(): { kodZeme: string; pocet: number; posledni: string }[] {
  const mapa = new Map<string, { kodZeme: string; pocet: number; posledni: string }>();
  for (const k of kampane()) {
    for (const kod of k.kodyZemi) {
      const z = mapa.get(kod) ?? { kodZeme: kod, pocet: 0, posledni: k.odhaleno };
      z.pocet += 1;
      if (k.odhaleno > z.posledni) z.posledni = k.odhaleno;
      mapa.set(kod, z);
    }
  }
  return [...mapa.values()].sort((a, b) => {
    if (a.kodZeme === "CZ") return -1;
    if (b.kodZeme === "CZ") return 1;
    return b.pocet - a.pocet || a.kodZeme.localeCompare(b.kodZeme);
  });
}

/*
  Právě ověřované zprávy.

  Zveřejňuje se nejvýš pár položek naráz. Kdyby jich mohlo být libovolně
  mnoho, stal by se z klidného přehledu proud fám — a to je přesně to,
  proti čemu projekt stojí.
*/
export const NEJVYS_OVEROVANYCH = 3;

/** Všechny ověřované zprávy, které prošly lidskou kontrolou. Nejnovější první. */
export function overujeme(): Overovana[] {
  const ostre = jako<Overovana[]>(ostreOverujeme).filter((o) => o.lidskyOvereno);
  const ukazkove = JE_UKAZKA ? jako<Overovana[]>(ukazkoveOverujeme).filter((o) => o.lidskyOvereno) : [];
  return [...ostre, ...ukazkove].sort((a, b) => b.zacalo.localeCompare(a.zacalo));
}

/**
 * Co se právě ověřuje.
 *
 * Po uplynutí lhůty se položka z přehledu stáhne, i kdyby ji nikdo
 * neuzavřel. Viset tam donekonečna by znamenalo držet nahoře tvrzení,
 * které nikdo nepotvrdil — tedy přesně to, co se tímhle řešit nemá.
 */
export function overovaneAktivni(ted = Date.now()): Overovana[] {
  return overujeme()
    .filter((o) => o.stav === "overujeme" && new Date(o.uzavritDo).getTime() > ted)
    .slice(0, NEJVYS_OVEROVANYCH);
}

/**
 * Jak dopadly starší ověřované zprávy.
 *
 * Uzavřené i ty, kterým vypršela lhůta. Nic nemizí potichu: čtenář musí
 * mít možnost zpětně zjistit, co z toho, co se tu kdy objevilo, se
 * nakonec potvrdilo a co ne.
 */
export function overovaneUzavrene(ted = Date.now()): Overovana[] {
  return overujeme().filter((o) => o.stav !== "overujeme" || new Date(o.uzavritDo).getTime() <= ted);
}

/** Kód země → český název podle záznamů. Neznámý kód zůstane kódem, nic se nedomýšlí. */
export function nazvyZemi(): Record<string, string> {
  const m: Record<string, string> = { CZ: "Česko" };
  for (const i of incidenty()) if (!m[i.kodZeme]) m[i.kodZeme] = i.zeme;
  return m;
}

/** Cíle mocností a míra jejich naplnění — analytická stránka, verzovaná a datovaná. */
export function svet(): Svet {
  return jako<Svet>(ostrySvet);
}

/** Veřejné opravy, nejnovější první. */
export function opravy(): Oprava[] {
  return jako<Oprava[]>(ostreOpravy).slice().sort((a, b) => b.datum.localeCompare(a.datum));
}

/** Opravy k jednomu záznamu. */
export function opravyK(slug: string): Oprava[] {
  return opravy().filter((o) => o.tykaSe === slug);
}

export function watchlist(): Watchlist {
  return jako<Watchlist>(ostryWatchlist);
}

/** Všechny zdroje použité na webu, bez duplicit — pro stránku /zdroje. */
export function vsechnyZdroje() {
  const vse = [
    ...incidenty().flatMap((i) => i.zdroje),
    ...pravniStav().polozky.flatMap((p) => p.zdroje),
    ...nato().polozky.flatMap((p) => p.zdroje),
    ...provoz().polozky.flatMap((p) => p.zdroje),
  ];
  const podleUrl = new Map<string, (typeof vse)[number]>();
  for (const z of vse) if (!podleUrl.has(z.url)) podleUrl.set(z.url, z);
  return [...podleUrl.values()].sort((a, b) => a.nazev.localeCompare(b.nazev, "cs"));
}

/**
 * Ověřené uklidňující body — co se (zatím) nestalo.
 *
 * Uvádíme jen položky skutečně ověřené proti primárnímu zdroji. Neověřenou
 * hodnotu sem nepíšeme: uklidňovat bez podkladu je stejná chyba jako strašit.
 */
export function klidoveBody(): string[] {
  const p = pravniStav();
  const a = nato();
  const h = hybridniTlak();
  const pr = (k: string) => p.polozky.find((x) => x.klic === k);
  const na = (k: string) => a.polozky.find((x) => x.klic === k);
  const primy = h.podkategorie.find((x) => x.klic === "primy");
  const nizke = primy?.uroven ? jeZelena(primy.uroven) : false;

  return [
    pr("mobilizace")?.plati === false && "V ČR nebyla vyhlášena mobilizace.",
    pr("vycestovani")?.plati === false && "Vycestování z ČR není obecně omezeno.",
    pr("stav-ohrozeni")?.plati === false && "Nebyl vyhlášen stav ohrožení státu.",
    na("clanek-5")?.aktivni === false && "Článek 5 NATO nebyl aktivován.",
    nizke && "Riziko přímého vojenského střetu NATO–Rusko zůstává nízké.",
  ].filter(Boolean) as string[];
}

/** Vyhýbáme se kruhovému importu stupnice do datové vrstvy. */
function jeZelena(u: Uroven): boolean {
  return u === "G1" || u === "G2" || u === "G3";
}
