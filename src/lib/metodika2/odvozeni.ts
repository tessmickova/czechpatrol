import { UROVNE } from "../skala";
import type { Incident } from "../typy";
import type { Barva, Dolozeni, Odvozene, Skupina, TypVazby, UdalostV2, V2Zaznam } from "./typy";

/*
  Převod záznamu na vstup pravidel. Co redakce v bloku `v2` zapsala, se
  bere, jak je. Co chybí, odvodí pravidlo a výsledek nese `odvozeno: true`
  s důvodem — na webu i v porovnání musí být vidět, co posoudil člověk
  a co jen pravidlo (docs/metodika-v2/02-SPECIFIKACE.md, § 4).
*/
const DEN = 86_400_000;
/** Bez stavu hrozby je událost aktivní 14 dní od data události. */
export const OKNO_AKTIVITY_DNI = 14;
/** Stav „probíhá“ musí být ověřený nejvýš před 7 dny, jinak je neaktuální. */
export const OVERENI_STAVU_DNI = 7;

export const CLENOVE_NATO = new Set(["AL", "BE", "BG", "CA", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IT", "LV", "LT", "LU", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "TR", "GB", "US"]);
export const CLENOVE_EU = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]);
/* Kategorie, u nichž se u spojence dá předběžně mluvit o bezpečnosti, ne o kriminalitě nebo diplomacii. */
const BEZPECNOSTNI_KATEGORIE = new Set(["drony", "sabotaz", "infrastruktura", "kyber", "hranice", "nato", "hybridni"]);

const v2 = (i: Incident): V2Zaznam => (i as Incident & { v2?: V2Zaznam }).v2 ?? {};
const cas = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);

export function barvaZavaznosti(i: Pick<Incident, "zavaznost">): Barva {
  const p = UROVNE[i.zavaznost]?.pasmo;
  /* Přechodný stupeň YO se pro pravidla počítá jako žlutý: výš ho zvedne až doložení. */
  return p === "cervena" ? "cervena" : p === "oranzova" ? "oranzova" : p === "zelena" ? "zelena" : "zluta";
}

export function dolozeniUdalosti(i: Incident): Odvozene<Dolozeni> {
  const t = (v2(i).tvrzeni ?? []).find((x) => x.o === "udalost");
  if (t) return { hodnota: t.stav, odvozeno: false, duvod: "tvrzení o události posoudila redakce" };
  if (i.overeni === "neovereno") return { hodnota: "predbezne", odvozeno: true, duvod: "dvě nezávislé redakce, bez úředního zdroje" };
  if (i.jistota === "potvrzeno" || i.jistota === "vysoka") return { hodnota: "dolozeno", odvozeno: true, duvod: `ověřený záznam s jistotou ${i.jistota}` };
  if (i.jistota === "stredni") return { hodnota: "predbezne", odvozeno: true, duvod: "ověřený záznam s jistotou střední" };
  return { hodnota: "nepotvrzeno", odvozeno: true, duvod: "jistota nízká" };
}

export function vazbaUdalosti(i: Incident): Odvozene<{ typ: TypVazby; skupiny: Skupina[]; mechanismus: string | null }> {
  const z = v2(i).vazba;
  const skupiny = (kod: string): Skupina[] => [...(CLENOVE_NATO.has(kod) ? (["NATO"] as const) : []), ...(CLENOVE_EU.has(kod) || kod === "EU" ? (["EU"] as const) : [])];
  if (z) return { hodnota: { typ: z.typ, skupiny: z.skupiny ?? (z.typ === "spojenci" ? skupiny(i.kodZeme) : []), mechanismus: z.mechanismus }, odvozeno: false, duvod: "vazbu posoudila redakce" };
  if (i.kodZeme === "CZ") return { hodnota: { typ: "prime-cr", skupiny: [], mechanismus: "událost na území ČR" }, odvozeno: true, duvod: "země události je Česko" };
  if (i.dopadNaCr?.stav === "potvrzeny") return { hodnota: { typ: "zavislost", skupiny: [], mechanismus: i.dopadNaCr.procRelevantni || null }, odvozeno: true, duvod: "u záznamu je potvrzený dopad na ČR" };
  const sk = skupiny(i.kodZeme);
  if (sk.length && i.kategorie.some((k) => BEZPECNOSTNI_KATEGORIE.has(k))) {
    return { hodnota: { typ: "spojenci", skupiny: sk, mechanismus: null }, odvozeno: true, duvod: `členská země (${sk.join(", ")}) a bezpečnostní kategorie; konkrétní zásah do společné bezpečnosti neposouzen` };
  }
  return { hodnota: { typ: "kontext", skupiny: sk, mechanismus: null }, odvozeno: true, duvod: sk.length ? "členská země, ale bez bezpečnostní kategorie" : "mimo NATO a EU, bez doložené vazby na ČR" };
}

export function aktivitaUdalosti(i: Incident, ted: number): Odvozene<"aktivni" | "neaktivni" | "neaktualni"> {
  const druh = i.druh ?? "pripad";
  if (druh !== "pripad") return { hodnota: "neaktivni", odvozeno: false, duvod: druh === "aktualizace" ? "nové zjištění k jiné události, ne nová událost" : `druh „${druh}“ není událost` };
  const s = v2(i).stavHrozby;
  if (s && s.stav !== "neznamo") {
    if (s.stav === "probiha") {
      return ted - cas(s.overeno) <= OVERENI_STAVU_DNI * DEN
        ? { hodnota: "aktivni", odvozeno: false, duvod: `probíhá, ověřeno ${s.overeno.slice(0, 10)}` }
        : { hodnota: "neaktualni", odvozeno: false, duvod: `„probíhá“ naposledy ověřeno ${s.overeno.slice(0, 10)}, déle než ${OVERENI_STAVU_DNI} dní` };
    }
    return { hodnota: "neaktivni", odvozeno: false, duvod: s.stav === "odvraceno" ? "odvráceno" : "ukončeno" };
  }
  const t = cas(i.datumUdalosti);
  if (Number.isNaN(t) || t > ted) return { hodnota: "neaktivni", odvozeno: true, duvod: "datum události chybí nebo je v budoucnosti" };
  return ted - t <= OKNO_AKTIVITY_DNI * DEN
    ? { hodnota: "aktivni", odvozeno: true, duvod: `stav hrozby neposouzen; událost z ${i.datumUdalosti.slice(0, 10)}, do ${OKNO_AKTIVITY_DNI} dní` }
    : { hodnota: "neaktivni", odvozeno: true, duvod: `stav hrozby neposouzen; událost starší než ${OKNO_AKTIVITY_DNI} dní` };
}

export function odvodUdalost(i: Incident, ted: number): UdalostV2 {
  const z = v2(i);
  return {
    slug: i.slug,
    titulek: i.kratkyTitulek || i.titulek,
    zeme: i.zeme,
    kodZeme: i.kodZeme,
    druh: i.druh ?? "pripad",
    barva: barvaZavaznosti(i),
    datumUdalosti: i.datumUdalosti,
    datumZjisteni: i.datumZjisteni ?? i.datumUdalosti,
    overena: i.overeni === "lidske" || i.overeni === "automaticke" || (i.overeni === undefined && i.lidskyOvereno === true),
    historicka: Boolean(i.historicky || i.archivniZaznam),
    dolozeni: dolozeniUdalosti(i),
    vazba: vazbaUdalosti(i),
    aktivita: aktivitaUdalosti(i, ted),
    povaha: z.povaha ?? "bezpecnostni",
    rozsah: z.rozsah ?? null,
    zasahFunkci: z.zasahFunkci ?? null,
    serie: z.serie ?? null,
    navazujeNa: i.navazujeNa ?? null,
    posouzeno: Boolean(z.kontrola),
  };
}

/** Záznamy, o kterých se ke dni `ted` dalo vědět (zjištěné nejpozději toho dne). */
export const znamoKe = (zaznamy: readonly Incident[], ted: number): Incident[] => zaznamy.filter((i) => cas(i.datumZjisteni ?? i.datumUdalosti) <= ted);
