import type { Incident, ProvozniPolozka } from "../typy";
import type { DopadV2, Funkce, Intenzita, V2Zaznam } from "./typy";

/*
  Vrstva B — Dopad na obyvatele a chod země (specifikace § 7).

  Co doloženě nefunguje nebo je ohroženo, kde, od kdy a zda je náhrada —
  bez ohledu na příčinu. Intenzita a územní rozsah se drží zvlášť: místní
  ohrožení života je výrazná místní informace, ne tvrzení o celé zemi.
  „Bez doloženého omezení“ vždy nese čas kontroly a pokrytí; nedostupný
  zdroj je „neznámé“, nikdy klid.
*/
export const NAZVY_FUNKCI: Record<Funkce, string> = {
  /* Přímé ohrožení lidí na místě (výbuch, požár, útok). Systematicky ho nesledujeme, jen z doložených záznamů. */
  "bezpeci-osob": "Bezpečí osob na místě",
  "zdravotni-pece": "Zdravotní péče",
  elektrina: "Elektřina",
  voda: "Voda",
  "teplo-plyn": "Teplo a plyn",
  doprava: "Doprava",
  palivo: "Palivo",
  komunikace: "Mobilní síť a internet",
  platby: "Platby a hotovost",
  "verejne-sluzby": "Školy a veřejné služby",
  hranice: "Hranice a vycestování",
};
export const PORADI_INTENZITY: readonly Intenzita[] = ["ohrozeni-zivota", "vypadek-funkce", "omezeni-s-nahradou", "neprijemnost"];
export const NAZVY_INTENZITY: Record<Intenzita, string> = {
  "ohrozeni-zivota": "ohrožení života",
  "vypadek-funkce": "výpadek zásadní funkce",
  "omezeni-s-nahradou": "omezení s náhradou",
  neprijemnost: "nepříjemnost",
};

/* Položky provozu (data/provoz.json) → funkce. Hranice a doprava jsou v provozu jedna položka. */
const Z_PROVOZU: Record<string, Funkce> = {
  elektrina: "elektrina", plyn: "teplo-plyn", komunikace: "komunikace", banky: "platby", palivo: "palivo",
  hranice: "doprava", vycestovani: "hranice", "bezny-zivot": "verejne-sluzby",
};

export interface DopadVypis {
  funkce: Funkce;
  intenzita: Intenzita | null;
  kde: string;
  rozsah: string | null;
  od: string | null;
  nahrada: boolean | null;
  trva: boolean;
  popis: string;
  zdroj: string;
}

export interface StavFunkce {
  funkce: Funkce;
  nazev: string;
  stav: "omezeni" | "overuje-se" | "bez-dolozeneho-omezeni" | "nezname";
  intenzita: Intenzita | null;
  dopady: DopadVypis[];
  obnoveno: DopadVypis[];
  pokryti: string;
  zkontrolovano: string | null;
}

export interface VysledekB {
  funkce: StavFunkce[];
  /** Ohrožení života nebo výpadek zásadní funkce v místním rozsahu — zobrazit výrazně, s místem. */
  mistni: DopadVypis[];
  souhrn: string;
}

/* Funkce, které plní jen doložené záznamy: bez záznamu se do „bez údaje“ nepíšou, nejsou to služby se sledovaným stavem. */
const JEN_ZE_ZAZNAMU = new Set<Funkce>(["bezpeci-osob"]);
const den = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;

const vCesku = (d: DopadV2, i: Incident) => d.uzemi.toUpperCase().startsWith("CZ") || (i.kodZeme === "CZ" && !/^[A-Z]{2}\b/.test(d.uzemi));
const horsi = (a: Intenzita | null, b: Intenzita | null): Intenzita | null => (a === null ? b : b === null ? a : PORADI_INTENZITY.indexOf(a) <= PORADI_INTENZITY.indexOf(b) ? a : b);

export function vrstvaB({ zaznamy, provoz, ted }: { zaznamy: readonly Incident[]; provoz: readonly ProvozniPolozka[]; ted: number }): VysledekB {
  const mapa = new Map<Funkce, StavFunkce>();
  for (const f of Object.keys(NAZVY_FUNKCI) as Funkce[]) mapa.set(f, { funkce: f, nazev: NAZVY_FUNKCI[f], stav: "nezname", intenzita: null, dopady: [], obnoveno: [], pokryti: "nesledujeme", zkontrolovano: null });

  for (const p of provoz) {
    const f = Z_PROVOZU[p.klic];
    if (!f) continue;
    const s = mapa.get(f)!;
    s.zkontrolovano = p.zkontrolovano ?? p.overeno ?? null;
    s.pokryti = p.pokryti === "nedostupne" ? "zdroj nedostupný" : p.pokryti === "orientacni" ? "orientační (neúplný seznam zdrojů)" : "kontrolované zdroje";
    if (p.stav === "narusen") {
      s.stav = "omezeni";
      s.dopady.push({ funkce: f, intenzita: null, kde: "neuvedeno", rozsah: null, od: s.zkontrolovano, nahrada: null, trva: true, popis: p.hodnota, zdroj: "provoz služeb" });
    } else if (p.stav === "sledujeme") s.stav = s.stav === "omezeni" ? s.stav : "overuje-se";
    else if (p.stav === "bezny" && p.pokryti !== "nedostupne") s.stav = s.stav === "nezname" ? "bez-dolozeneho-omezeni" : s.stav;
  }

  for (const i of zaznamy) {
    for (const d of ((i as Incident & { v2?: V2Zaznam }).v2?.dopad ?? [])) {
      if (!vCesku(d, i) || d.stav === "vyvraceno" || d.stav === "nepotvrzeno" || d.stav === "sporne") continue;
      const trva = !d.do || new Date(d.do).getTime() > ted;
      const v: DopadVypis = { funkce: d.funkce, intenzita: d.intenzita, kde: d.uzemi, rozsah: d.rozsah, od: d.od, nahrada: d.nahrada ?? null, trva, popis: d.popis ?? i.kratkyTitulek ?? i.titulek, zdroj: i.slug };
      const s = mapa.get(d.funkce)!;
      if (!trva) { s.obnoveno.push(v); continue; }
      s.stav = "omezeni";
      s.intenzita = horsi(s.intenzita, d.intenzita);
      s.dopady.push(v);
      if (s.pokryti === "nesledujeme") s.pokryti = "jen z doložených záznamů";
    }
  }

  const funkce = [...mapa.values()];
  const mistni = funkce.flatMap((f) => f.dopady).filter((d) => d.rozsah === "mistni" && (d.intenzita === "ohrozeni-zivota" || d.intenzita === "vypadek-funkce"));
  const omezene = funkce.filter((f) => f.stav === "omezeni");
  const nezname = funkce.filter((f) => f.stav === "nezname" && !JEN_ZE_ZAZNAMU.has(f.funkce));
  const kontrola = funkce.map((f) => f.zkontrolovano).filter((x): x is string => Boolean(x)).sort().at(-1) ?? null;
  const kdy = kontrola ? `${kontrola.slice(8, 10).replace(/^0/, "")}. ${kontrola.slice(5, 7).replace(/^0/, "")}. ${kontrola.slice(11, 16)} UTC` : "čas neznámý";
  const souhrn = omezene.length
    ? `Doložené omezení: ${omezene.map((f) => `${f.nazev.toLowerCase()} (${f.dopady.map((d) => [d.kde !== "neuvedeno" ? d.kde : null, d.intenzita ? NAZVY_INTENZITY[d.intenzita] : null, d.od ? `od ${den(d.od)}` : null].filter(Boolean).join(", ") || "místo a rozsah neuvedeny").join("; ")})`).join("; ")}.`
    : `V kontrolovaných zdrojích bez doloženého celostátního omezení, stav k ${kdy}. Místní situace se může lišit.`;
  return { funkce, mistni, souhrn: nezname.length ? `${souhrn} Bez údaje: ${nezname.map((f) => f.nazev.toLowerCase()).join(", ")}.` : souhrn };
}
