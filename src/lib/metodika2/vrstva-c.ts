import type { InformaceVstup } from "../prehled/typy";
import type { PravniPolozka, VystrahaSoubor } from "../typy";

/*
  Vrstva C — Úřední výstrahy a stavy (specifikace § 8). Jen to, co vydal
  úřad, s vydavatelem, datem, platností a územím. Nic se neodvozuje
  z médií ani z vlastního hodnocení. Převzatá výstraha se ukáže hned,
  nečeká na pásmo vrstvy A ani na redakci.
*/
export interface UredniPolozka {
  co: string;
  vydal: string;
  vydano: string | null;
  platiDo: string | null;
  uzemi: string;
  pokyn: string | null;
  odkaz: string | null;
  /** Výstraha převzatá bez redakčního posouzení (zobrazí se samostatně). */
  prevzato: boolean;
}

export interface VysledekC {
  plati: UredniPolozka[];
  /** Úřední stavy, jejichž vyhlášení není doložené (ne „nevyhlášeno“). */
  nedolozeno: string[];
  stavOhrozeni: boolean;
  valecnyStav: boolean;
  poznamky: string[];
}

const uzemiText = (u: InformaceVstup["uzemi"] | undefined): string => {
  if (!u) return "neuvedeno";
  if (u.druh === "cr") return "celá ČR";
  if (u.druh === "kraje") return u.kraje.join(", ");
  if (u.druh === "cast") return u.popis;
  if (u.druh === "zahranici") return u.zeme;
  return u.popis ?? "neuvedeno";
};

export function vrstvaC({ pravni, vystraha, chmi, ted }: { pravni: readonly PravniPolozka[]; vystraha: VystrahaSoubor | null; chmi: readonly InformaceVstup[]; ted: number }): VysledekC {
  const plati: UredniPolozka[] = [];
  for (const p of pravni) {
    if (p.plati === true) plati.push({ co: p.nazev, vydal: p.zdroje[0]?.nazev ?? "úřední zdroj neuveden", vydano: p.overeno, platiDo: null, uzemi: "celá ČR", pokyn: null, odkaz: p.zdroje[0]?.url ?? null, prevzato: false });
  }
  const v = vystraha?.aktivni;
  if (v && (!v.platiDo || new Date(v.platiDo).getTime() > ted)) {
    plati.push({ co: v.nadpis, vydal: v.vydavatel ?? "vydavatel neuveden — nejde o převzatou úřední výstrahu", vydano: v.vydano ?? v.kdy, platiDo: v.platiDo, uzemi: uzemiText(v.uzemi), pokyn: v.pokyn ?? null, odkaz: v.originalUrl ?? v.zdroje[0]?.url ?? null, prevzato: Boolean(v.vydavatel && v.originalUrl) });
  }
  for (const w of chmi) {
    if (w.odvolano) continue;
    if (w.platiDo && new Date(w.platiDo).getTime() < ted) continue;
    plati.push({ co: w.titulek, vydal: w.vydavatel ?? "ČHMÚ", vydano: w.vydano, platiDo: w.platiDo, uzemi: uzemiText(w.uzemi), pokyn: w.pokyn, odkaz: w.odkaz, prevzato: true });
  }
  return {
    plati,
    nedolozeno: pravni.filter((p) => p.plati !== true).map((p) => p.nazev),
    stavOhrozeni: pravni.some((p) => p.klic === "stav-ohrozeni" && p.plati === true),
    valecnyStav: pravni.some((p) => p.klic === "valecny-stav" && p.plati === true),
    poznamky: ["Stupně teroristického ohrožení (A–D) vyhlašuje Ministerstvo vnitra; CzechPatrol je nepřebírá ani neověřuje."],
  };
}
