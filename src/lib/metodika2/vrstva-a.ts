import type { Incident } from "../typy";
import { odvodUdalost, znamoKe } from "./odvozeni";
import { type IdPravidla, type KvalitaPodkladu, NAZVY_PASEM, type Pasmo, poradiPasma, type UdalostV2, VERZE_METODIKY, type VstupKvality, vyssi, type VyjimkaV2 } from "./typy";

/*
  Vrstva A — Bezpečnostní vývoj pro Česko. Rozhodovací tabulka
  z docs/metodika-v2/02-SPECIFIKACE.md § 6, deterministicky.

  Pásmo je nejvyšší pásmo ze splněných pravidel; každá událost se počítá
  jednou, svým nejvyšším pravidlem. Žádný průměr ani medián: malá událost
  nezředí závažnou, duplikát nic nepřidá a počet sám nic nezvýší.
*/
const DEN = 86_400_000;

export interface PlatnePravidlo { id: IdPravidla; pasmo: Pasmo }

export interface PolozkaVysvetleni {
  slug: string;
  titulek: string;
  zeme: string;
  pravidlo: IdPravidla | null;
  duvod: string;
  /** Co u události posoudil jen algoritmus, ne redakce. */
  odvozeno: string[];
}

export interface VysledekA {
  verze: string;
  /** null = aktuální hodnocení není k dispozici. */
  pasmo: Pasmo | null;
  /** Pásmo bez ruční výjimky (vždy uvedené). */
  pasmoBezVyjimky: Pasmo | null;
  /** Podklady nejsou úplné; doložené události přesto splňují uvedené pásmo. */
  spodniOdhad: boolean;
  pravidla: IdPravidla[];
  rozhodujici: PolozkaVysvetleni[];
  kontext: PolozkaVysvetleni[];
  nezapocteno: PolozkaVysvetleni[];
  neaktualni: PolozkaVysvetleni[];
  /** Nová zjištění za 14 dní: aktualizace starších událostí, odvrácené a ukončené. Pásmo samy nezvedají. */
  noveZjisteni: PolozkaVysvetleni[];
  coByZmenilo: string[];
  kvalita: KvalitaPodkladu;
  zmena: { predtim: Pasmo | null; smer: "vyssi" | "nizsi" | "beze-zmeny" | "nelze" };
  vyjimka: { pouzita: boolean; duvod: string } | null;
  /**
   * Vysoké a mimořádné pásmo se jako vlastní závěr vydává až po redakčním
   * posouzení rozhodujících událostí (zadání § 11). Do té doby je předběžné
   * a tady jsou události, které na posouzení čekají. Úřední stav (A-M2)
   * posouzení nepotřebuje.
   */
  cekaNaPosouzeni: string[];
  predbezne: boolean;
  vysvetleni: string;
}

export interface VstupA {
  zaznamy: readonly Incident[];
  ted: number;
  kvalita: VstupKvality;
  /** Úředně platné stavy v ČR (vrstva C). */
  uredni: { stavOhrozeni: boolean; valecnyStav: boolean };
  vyjimky?: readonly VyjimkaV2[];
}

/** Smí událost do tabulky? Vrací důvod, proč ne. */
export function procNevstupuje(u: UdalostV2): string | null {
  if (u.druh !== "pripad") return u.aktivita.duvod;
  if (u.historicka) return "historický nebo archivní záznam";
  if (u.povaha === "nehoda-porucha") return "příčinou je nehoda nebo porucha, ne bezpečnostní událost (dopad patří do vrstvy B)";
  if (u.dolozeni.hodnota === "vyvraceno") return "tvrzení o události bylo vyvráceno";
  if (u.dolozeni.hodnota === "sporne") return "zdroje si odporují; čeká na posouzení";
  if (u.dolozeni.hodnota === "nepotvrzeno") return "událost není potvrzená";
  if (!u.overena) return "neověřeno úředně ani člověkem; do hodnocení nevstupuje";
  return null;
}

/** Nejvyšší pravidlo, které událost splní, jako by byla aktivní. Bez série (ta se hodnotí zvlášť). */
export function pravidloUdalosti(u: UdalostV2): PlatnePravidlo | null {
  const vazba = u.vazba.hodnota.typ;
  const plne = u.dolozeni.hodnota === "dolozeno";
  const tezka = u.barva === "oranzova" || u.barva === "cervena";
  const sirsi = u.rozsah === "regionalni" || u.rozsah === "celostatni";
  if (u.barva === "cervena" && plne && (vazba === "prime-cr" || vazba === "spojenci")) return { id: "A-M1", pasmo: "mimoradny" };
  if (u.barva === "oranzova" && plne && vazba === "prime-cr" && (sirsi || u.zasahFunkci === true)) return { id: "A-V1", pasmo: "vysoky" };
  if (u.barva === "oranzova" && plne && vazba === "spojenci" && u.zasahFunkci === true) return { id: "A-V2", pasmo: "vysoky" };
  if (u.barva === "cervena" && plne && vazba === "zavislost") return { id: "A-V4", pasmo: "vysoky" };
  if (tezka && vazba === "prime-cr") return { id: "A-Z1", pasmo: "zvyseny" };
  if (tezka && vazba === "spojenci") return { id: "A-Z2", pasmo: "zvyseny" };
  if (tezka && vazba === "zavislost") return { id: "A-Z3", pasmo: "zvyseny" };
  if (u.barva === "zluta" && plne && vazba === "prime-cr" && sirsi) return { id: "A-Z4", pasmo: "zvyseny" };
  return null;
}

function odvozenaPole(u: UdalostV2): string[] {
  return [u.vazba.odvozeno ? `vazba (${u.vazba.duvod})` : null, u.aktivita.odvozeno ? `aktivita (${u.aktivita.duvod})` : null, u.dolozeni.odvozeno ? `doložení (${u.dolozeni.duvod})` : null].filter((x): x is string => Boolean(x));
}

const polozka = (u: UdalostV2, pravidlo: IdPravidla | null, duvod: string): PolozkaVysvetleni => ({ slug: u.slug, titulek: u.titulek, zeme: u.zeme, pravidlo, duvod, odvozeno: odvozenaPole(u) });

export function kvalitaPodkladu(k: VstupKvality, ted: number): KvalitaPodkladu {
  const duvody: string[] = [];
  const duvodyInterni: string[] = [];
  let stav: KvalitaPodkladu["stav"] = "dostatecna";
  const horsi = (s: KvalitaPodkladu["stav"]) => { if (s === "nedostatecna" || (s === "omezena" && stav === "dostatecna")) stav = s; };
  const sber = k.posledniSber ? ted - new Date(k.posledniSber).getTime() : Infinity;
  if (sber > DEN) { horsi("nedostatecna"); duvody.push(k.posledniSber ? `zdroje naposledy přečteny ${k.posledniSber.slice(0, 16).replace("T", " ")} UTC, déle než 24 h` : "čas posledního čtení zdrojů neznámý"); }
  if (k.podkladyNeuplne) { horsi("nedostatecna"); duvody.push("podklady pro hodnocení nejsou úplné"); duvodyInterni.push(k.podkladyNeuplnePoznamka ?? "zpracování zachycených zpráv je neúplné"); }
  const podil = k.zdrojuCelkem ? k.zdrojuPrecteno / k.zdrojuCelkem : 0;
  if (podil < 0.5) { horsi("nedostatecna"); duvody.push(`přečteno ${k.zdrojuPrecteno} z ${k.zdrojuCelkem} zdrojů`); }
  else if (podil < 0.8) { horsi("omezena"); duvody.push(`přečteno ${k.zdrojuPrecteno} z ${k.zdrojuCelkem} zdrojů`); }
  return { stav, duvody, duvodyInterni };
}

interface Vyhodnoceni { pasmo: Pasmo | null; rozhodujici: { u: UdalostV2; p: PlatnePravidlo }[]; pravidla: IdPravidla[] }

/** Jádro tabulky nad událostmi k danému dni — bez kvality a výjimek (použije se i pro srovnání). */
function vyhodnot(udalosti: UdalostV2[], uredni: VstupA["uredni"]): Vyhodnoceni {
  const rozhodujici: { u: UdalostV2; p: PlatnePravidlo }[] = [];
  for (const u of udalosti) {
    if (procNevstupuje(u) || u.aktivita.hodnota !== "aktivni") continue;
    const p = pravidloUdalosti(u);
    if (p) rozhodujici.push({ u, p });
  }
  /* A-V3: doložená koordinace série. Bez doložené koordinace je každá událost sama za sebe. */
  const serie = new Map<string, UdalostV2[]>();
  for (const u of udalosti) if (u.serie && u.serie.koordinace === "dolozeno" && !procNevstupuje(u) && u.aktivita.hodnota === "aktivni") serie.set(u.serie.id, [...(serie.get(u.serie.id) ?? []), u]);
  for (const cleni of serie.values()) {
    for (const u of cleni) {
      if ((u.barva === "oranzova" || u.barva === "cervena") && (u.vazba.hodnota.typ === "prime-cr" || u.vazba.hodnota.typ === "spojenci")) {
        const dosavadni = rozhodujici.find((r) => r.u.slug === u.slug);
        if (!dosavadni) rozhodujici.push({ u, p: { id: "A-V3", pasmo: "vysoky" } });
        else if (poradiPasma(dosavadni.p.pasmo) < poradiPasma("vysoky")) dosavadni.p = { id: "A-V3", pasmo: "vysoky" };
      }
    }
  }
  const pravidla = new Set<IdPravidla>(rozhodujici.map((r) => r.p.id));
  let pasmo: Pasmo | null = rozhodujici.reduce<Pasmo | null>((m, r) => (m ? vyssi(m, r.p.pasmo) : r.p.pasmo), null);
  if (uredni.stavOhrozeni || uredni.valecnyStav) { pasmo = "mimoradny"; pravidla.add("A-M2"); }
  return { pasmo, rozhodujici, pravidla: [...pravidla] };
}

export function vrstvaA(vstup: VstupA): VysledekA {
  const { ted } = vstup;
  const udalosti = vstup.zaznamy.map((i) => odvodUdalost(i, ted));
  const kvalita = kvalitaPodkladu(vstup.kvalita, ted);
  const zaklad = vyhodnot(udalosti, vstup.uredni);
  const rozhodujiciSlugy = new Set(zaklad.rozhodujici.map((r) => r.u.slug));

  /* Neaktuální události: kdyby výsledek změnily, stav nelze předpokládat (A-N2). */
  const neaktualni = udalosti.filter((u) => !procNevstupuje(u) && u.aktivita.hodnota === "neaktualni");
  const zmenilyBy = neaktualni.filter((u) => {
    const p = pravidloUdalosti(u);
    return p && (!zaklad.pasmo || poradiPasma(p.pasmo) > poradiPasma(zaklad.pasmo));
  });

  const pravidla = [...zaklad.pravidla];
  let pasmo: Pasmo | null;
  let spodniOdhad = false;
  if (zmenilyBy.length) {
    pasmo = null;
    pravidla.push("A-N2");
  } else if (kvalita.stav === "nedostatecna") {
    if (zaklad.pasmo && poradiPasma(zaklad.pasmo) >= poradiPasma("zvyseny")) { pasmo = zaklad.pasmo; spodniOdhad = true; }
    else { pasmo = null; pravidla.push("A-N1"); }
  } else {
    pasmo = zaklad.pasmo ?? "omezeny";
    if (!zaklad.pasmo) pravidla.push("A-O1");
  }

  /* Rozhodující událost s odvozenou vazbou nebo aktivitou: podklady jsou omezené. */
  const kvalitaVysledna: KvalitaPodkladu = { ...kvalita, duvody: [...kvalita.duvody], duvodyInterni: [...kvalita.duvodyInterni] };
  const odvozeneRozhodujici = zaklad.rozhodujici.filter((r) => r.u.vazba.odvozeno || r.u.aktivita.odvozeno);
  if (odvozeneRozhodujici.length && kvalitaVysledna.stav === "dostatecna") kvalitaVysledna.stav = "omezena";
  if (odvozeneRozhodujici.length) kvalitaVysledna.duvody.push(`u ${odvozeneRozhodujici.length === 1 ? "rozhodující události" : `${odvozeneRozhodujici.length} rozhodujících událostí`} vazbu nebo aktivitu určilo pravidlo, ne redakce`);

  /* Výjimka: nejvýš o jedno pásmo, jen úplná a platná. */
  let vyjimka: VysledekA["vyjimka"] = null;
  const pasmoBezVyjimky = pasmo;
  const platna = (vstup.vyjimky ?? []).find((v) => new Date(v.vyhodnoceno).getTime() <= ted && ted <= new Date(v.platiDo).getTime());
  if (platna) {
    const uplna = Boolean(platna.schvalil && platna.revize && platna.podklady.length) && new Date(platna.platiDo).getTime() - new Date(platna.vyhodnoceno).getTime() <= 14 * DEN;
    if (!uplna) vyjimka = { pouzita: false, duvod: `výjimka ${platna.id} nemá schvalující roli, datum revize, podklady nebo platí déle než 14 dní; nepoužita` };
    else if (!pasmo) vyjimka = { pouzita: false, duvod: `výjimka ${platna.id} nemůže nahradit chybějící hodnocení` };
    else {
      const dalsi = ["omezeny", "zvyseny", "vysoky", "mimoradny"][Math.min(3, poradiPasma(pasmo) + 1)] as Pasmo;
      vyjimka = { pouzita: true, duvod: `${platna.duvod} (schválil: ${platna.schvalil}; revize ${platna.revize}); bez výjimky ${NAZVY_PASEM[pasmo]}` };
      pasmo = dalsi;
    }
  }

  const kontext: PolozkaVysvetleni[] = [];
  const nezapocteno: PolozkaVysvetleni[] = [];
  const noveZjisteni: PolozkaVysvetleni[] = [];
  const nedavno = (u: UdalostV2) => ted - new Date(u.datumZjisteni).getTime() <= 14 * DEN && new Date(u.datumZjisteni).getTime() <= ted;
  for (const u of udalosti) {
    if (rozhodujiciSlugy.has(u.slug) || u.historicka) continue;
    if (u.druh === "aktualizace") { if (nedavno(u)) noveZjisteni.push(polozka(u, null, u.navazujeNa ? `nové zjištění k „${u.navazujeNa}“; nová událost to není` : "nové zjištění; nová událost to není")); continue; }
    const proc = procNevstupuje(u);
    if (proc) { if (u.druh === "pripad") nezapocteno.push(polozka(u, null, proc)); continue; }
    if (u.aktivita.hodnota === "neaktivni") { if (!u.aktivita.odvozeno && nedavno(u)) noveZjisteni.push(polozka(u, null, `${u.aktivita.duvod}; probíhající hrozba to není`)); continue; }
    if (u.aktivita.hodnota === "neaktualni") continue;
    const p = pravidloUdalosti(u);
    if (!p) kontext.push(polozka(u, null, u.vazba.hodnota.typ === "kontext" ? "širší kontext bez doložené vazby na ČR" : `${u.barva === "zluta" ? "nižší závažnost" : "závažnost"} pro vazbu „${u.vazba.hodnota.typ}“ pásmo nezvedá`));
  }

  /* Co by pásmo změnilo — nahoru: závažné, ale jen předběžně doložené nebo neověřené; dolů: konec rozhodujících. */
  const coByZmenilo: string[] = [];
  for (const u of udalosti) {
    if (u.druh !== "pripad" || u.historicka || u.aktivita.hodnota !== "aktivni" || u.povaha === "nehoda-porucha") continue;
    if (u.barva !== "cervena" && u.barva !== "oranzova") continue;
    if (u.dolozeni.hodnota === "dolozeno" && u.overena) continue;
    const kdyby = pravidloUdalosti({ ...u, dolozeni: { ...u.dolozeni, hodnota: "dolozeno" }, overena: true });
    if (kdyby && (!pasmo || poradiPasma(kdyby.pasmo) > poradiPasma(pasmo))) coByZmenilo.push(`Kdyby se doložilo „${u.titulek}“ (${u.zeme}), splní pravidlo ${kdyby.id}: ${NAZVY_PASEM[kdyby.pasmo]}.`);
  }
  for (const r of zaklad.rozhodujici) {
    const konec = r.u.aktivita.odvozeno ? new Date(new Date(r.u.datumUdalosti).getTime() + 14 * DEN).toISOString().slice(0, 10) : null;
    coByZmenilo.push(`Pásmo klesne, až „${r.u.titulek}“ přestane být aktivní${konec ? ` (bez ověřeného stavu hrozby ${konec})` : " (ověřený konec nebo odvrácení)"} nebo bude vyvráceno.`);
  }

  /* Změna proti 7 dnům: stejná pravidla nad tím, co se tehdy vědělo. */
  const tehdy = ted - 7 * DEN;
  const predtim = vyhodnot(znamoKe(vstup.zaznamy, tehdy).map((i) => odvodUdalost(i, tehdy)), vstup.uredni).pasmo ?? "omezeny";
  const zmena: VysledekA["zmena"] = !pasmoBezVyjimky || kvalita.stav === "nedostatecna"
    ? { predtim, smer: "nelze" }
    : { predtim, smer: poradiPasma(pasmoBezVyjimky) > poradiPasma(predtim) ? "vyssi" : poradiPasma(pasmoBezVyjimky) < poradiPasma(predtim) ? "nizsi" : "beze-zmeny" };

  const rozhodujici = zaklad.rozhodujici.map((r) => polozka(r.u, r.p.id, `splnila ${r.p.id}: ${NAZVY_PASEM[r.p.pasmo]}`));
  const vysokaPravidla = zaklad.rozhodujici.filter((r) => poradiPasma(r.p.pasmo) >= poradiPasma("vysoky"));
  const cekaNaPosouzeni = pasmoBezVyjimky && poradiPasma(pasmoBezVyjimky) >= poradiPasma("vysoky") && !zaklad.pravidla.includes("A-M2")
    ? vysokaPravidla.filter((r) => !r.u.posouzeno).map((r) => r.u.slug)
    : [];
  const predbezne = cekaNaPosouzeni.length > 0 && vysokaPravidla.every((r) => !r.u.posouzeno);
  const neakt = neaktualni.map((u) => polozka(u, pravidloUdalosti(u)?.id ?? null, u.aktivita.duvod));
  return {
    verze: VERZE_METODIKY,
    pasmo,
    pasmoBezVyjimky,
    spodniOdhad,
    pravidla,
    rozhodujici,
    kontext,
    nezapocteno,
    neaktualni: neakt,
    noveZjisteni,
    coByZmenilo,
    kvalita: kvalitaVysledna,
    zmena,
    vyjimka,
    cekaNaPosouzeni,
    predbezne,
    vysvetleni: vetaVysvetleni(pasmo, spodniOdhad, rozhodujici, kontext, pravidla, kvalitaVysledna, zmenilyBy.map((u) => u.titulek)) + (predbezne ? " Vysoké a mimořádné pásmo vydáváme jako vlastní závěr až po redakčním posouzení; do té doby je předběžné." : ""),
  };
}

/** „Záznamy A a B splnily pravidlo R; C je pouze kontext; proto pásmo X.“ */
export function vetaVysvetleni(pasmo: Pasmo | null, spodniOdhad: boolean, rozhodujici: PolozkaVysvetleni[], kontext: PolozkaVysvetleni[], pravidla: IdPravidla[], kvalita: KvalitaPodkladu, neaktualni: string[]): string {
  const jmena = (xs: PolozkaVysvetleni[]) => xs.slice(0, 3).map((x) => `„${x.titulek}“`).join(", ") + (xs.length > 3 ? ` a ${xs.length - 3} další` : "");
  if (pravidla.includes("A-N2")) return `Aktuální hodnocení není k dispozici: stav ${neaktualni.map((t) => `„${t}“`).join(", ")} nebyl včas znovu ověřen a výsledek by změnil (A-N2).`;
  if (!pasmo) return `Aktuální hodnocení není k dispozici: ${kvalita.duvody.join("; ")} (A-N1).`;
  const casti: string[] = [];
  if (rozhodujici.length) {
    const podle = new Map<string, PolozkaVysvetleni[]>();
    for (const r of rozhodujici) podle.set(r.pravidlo!, [...(podle.get(r.pravidlo!) ?? []), r]);
    for (const [id, xs] of podle) casti.push(`${xs.length === 1 ? "Událost" : "Události"} ${jmena(xs)} ${xs.length === 1 ? "splnila" : "splnily"} pravidlo ${id}`);
  }
  if (pravidla.includes("A-M2")) casti.push("úředně platí krizový stav podle pravidla A-M2");
  if (!casti.length) casti.push("Žádná aktivní doložená událost nesplnila pravidlo vyšší než A-O1");
  if (kontext.length) casti.push(`${jmena(kontext)} ${kontext.length === 1 ? "je" : "jsou"} pouze kontext`);
  return `${casti.join("; ")}; proto pásmo ${NAZVY_PASEM[pasmo]}${spodniOdhad ? " jako spodní odhad, protože podklady nejsou úplné" : ""}.`;
}
