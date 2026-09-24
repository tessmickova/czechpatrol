import seznamyData from "../../data/odolnost/seznamy.json";
import { incidenty, kampane, pravniStav, provoz } from "./data";
import { stavPaliv } from "./palivo";
import { UROVNE } from "./skala";

/*
  „Připravit teď“ — tři věci pro domácnost podle toho, co web právě dokládá.

  Karta na úvodní straně (24. 9. 2026). Nepředpovídá: sčítá doložené věci
  z posledních 30 dnů (záznamy podle oblasti, narušené služby, platná
  opatření, skok cen paliva, operace proti občanům) do tlaku na deset
  hrozeb pro domácnost a k nim vybere položky ze seznamů zásob
  (data/odolnost/seznamy.json). Přepočítává se při každém sestavení webu,
  tedy po každém sběru, který něco změnil.

  Základní tlak (informace, voda) je tu vždycky: bez něj by karta v klidném
  týdnu ukazovala nesmysly z okrajových oblastí.
*/
export type Hrozba = "elektrina" | "voda" | "teplo" | "komunikace" | "informace" | "doprava" | "zdravi" | "hotovost" | "evakuace" | "pozar";

export interface PolozkaSeznamu {
  klic: string;
  nazev: string;
  mnozstvi?: string;
  popis: string;
  hrozby: Hrozba[];
  funkce: string | null;
}
export interface Seznam { klic: KlicSeznamu; nazev: string; popis: string; zdroj: { nazev: string; url: string } | null; polozky: PolozkaSeznamu[] }
export type KlicSeznamu = "72h" | "rozsireny" | "ai";

const DATA = seznamyData as unknown as { verze: string; hrozby: Record<Hrozba, string>; seznamy: Record<KlicSeznamu, Omit<Seznam, "klic">> };

export const NAZVY_HROZEB = DATA.hrozby;
export const VERZE_SEZNAMU = DATA.verze;
export const PORADI_SEZNAMU: KlicSeznamu[] = ["72h", "rozsireny", "ai"];

export function seznamy(): Seznam[] {
  return PORADI_SEZNAMU.map((k) => ({ klic: k, ...DATA.seznamy[k] }));
}

export interface TlakHrozby { klic: Hrozba; skore: number; duvody: string[] }

const DNI = 30;

/* Která oblast záznamu tlačí na kterou hrozbu domácnosti. */
const OBLASTI: Record<string, Hrozba[]> = {
  drony: ["informace"],
  infrastruktura: ["elektrina", "komunikace", "doprava"],
  sabotaz: ["elektrina", "doprava"],
  kyber: ["hotovost", "komunikace", "informace"],
  hranice: ["evakuace", "doprava"],
  hybridni: ["informace"],
  nato: ["informace"],
};

const SLUZBY: Record<string, Hrozba[]> = {
  elektrina: ["elektrina", "teplo"],
  plyn: ["teplo"],
  komunikace: ["komunikace", "informace"],
  banky: ["hotovost"],
  palivo: ["doprava"],
  hranice: ["evakuace"],
  vycestovani: ["evakuace"],
};

export function tlakHrozeb(ted = Date.now()): TlakHrozby[] {
  const skore = new Map<Hrozba, number>();
  /* Důvody s vahou: v kartě se ukáže ten, který k tlaku přispěl nejvíc. */
  const duvody = new Map<Hrozba, Map<string, number>>();
  const pridej = (h: Hrozba, body: number, duvod: string) => {
    skore.set(h, (skore.get(h) ?? 0) + body);
    if (!duvod) return;
    const d = duvody.get(h) ?? new Map<string, number>();
    d.set(duvod, (d.get(duvod) ?? 0) + body);
    duvody.set(h, d);
  };

  // Základ: informace a voda jsou vždycky na řadě.
  pridej("informace", 1.5, "krizové vysílání a ověřování zpráv patří k základu");
  pridej("voda", 1, "zásoba vody je základ na 72 hodin");
  const mesic = new Date(ted).getMonth() + 1;
  if (mesic >= 10 || mesic <= 3) pridej("teplo", 1.5, "topná sezóna");

  // Narušené služby a platná opatření v Česku.
  for (const p of provoz().polozky) {
    if (p.stav === "narusen" || p.stav === "sledujeme") {
      for (const h of SLUZBY[p.klic] ?? []) pridej(h, p.stav === "narusen" ? 4 : 2, `${p.nazev.toLowerCase()}: ${p.stav === "narusen" ? "narušeno" : "sledujeme"}`);
    }
  }
  for (const p of pravniStav().polozky) {
    if (p.plati === true) { pridej("evakuace", 4, `platí: ${p.nazev.toLowerCase()}`); pridej("informace", 2, `platí: ${p.nazev.toLowerCase()}`); }
  }

  // Doložené záznamy za 30 dní: váha podle závažnosti, v Česku dvojnásobná.
  const od = ted - DNI * 86_400_000;
  const pocty = new Map<string, { n: number; vaha: number }>();
  for (const i of incidenty()) {
    const kdy = new Date(i.datumZjisteni ?? i.datumUdalosti).getTime();
    if (kdy < od || i.overeni === "neovereno") continue;
    const vaha = (UROVNE[i.zavaznost].poradi / 10) * (i.kodZeme === "CZ" ? 2 : 1);
    for (const k of i.kategorie) {
      for (const h of OBLASTI[k] ?? []) {
        pridej(h, vaha, "");
        const x = pocty.get(`${h}|${k}`) ?? { n: 0, vaha: 0 };
        pocty.set(`${h}|${k}`, { n: x.n + 1, vaha: x.vaha + vaha });
      }
    }
  }
  const NAZVY_OBLASTI: Record<string, string> = { drony: "drony a vzdušný prostor", infrastruktura: "infrastruktura", sabotaz: "sabotáže", kyber: "kybernetické útoky", hranice: "hranice", hybridni: "hybridní působení", nato: "NATO" };
  for (const [kk, x] of pocty) {
    const [h, k] = kk.split("|") as [Hrozba, string];
    const d = duvody.get(h) ?? new Map<string, number>();
    d.set(`${x.n} ${x.n === 1 ? "záznam" : x.n < 5 ? "záznamy" : "záznamů"}: ${NAZVY_OBLASTI[k] ?? k} za ${DNI} dní`, x.vaha);
    duvody.set(h, d);
  }

  // Operace proti občanům za 90 dní tlačí na informace.
  const kamp = kampane().filter((k) => ted - new Date(k.odhaleno).getTime() <= 90 * 86_400_000).length;
  if (kamp) pridej("informace", Math.min(kamp, 4) * 0.5, `${kamp} ${kamp === 1 ? "rozebraná operace" : kamp < 5 ? "rozebrané operace" : "rozebraných operací"} proti občanům za 90 dní`);

  // Skok cen paliva za týden.
  const skok = stavPaliv().some((p) => p.zaTyden !== null && Math.abs(p.zaTyden) >= 0.5);
  if (skok) pridej("doprava", 2, "cena paliva se za týden pohnula o víc než půl koruny");

  return [...skore.entries()]
    .map(([klic, s]) => ({ klic, skore: Math.round(s * 10) / 10, duvody: [...(duvody.get(klic) ?? new Map<string, number>()).entries()].sort((x, y) => y[1] - x[1]).map(([d]) => d).slice(0, 3) }))
    .sort((a, b) => b.skore - a.skore);
}

export interface PripravitPolozka extends PolozkaSeznamu { seznam: KlicSeznamu; hrozba: Hrozba; duvod: string; skore: number }
export interface PripravitTed { polozky: PripravitPolozka[]; hrozby: TlakHrozby[]; prepocitano: string }

/** Tři položky pro domácnost podle tlaku hrozeb; každá z jiné oblasti (funkce). */
export function pripravitTed(ted = Date.now()): PripravitTed {
  const tlak = tlakHrozeb(ted);
  const podle = new Map(tlak.map((t) => [t.klic, t]));
  const kandidati: PripravitPolozka[] = [];
  for (const s of seznamy()) {
    for (const p of s.polozky) {
      const nej = [...p.hrozby].sort((a, b) => (podle.get(b)?.skore ?? 0) - (podle.get(a)?.skore ?? 0))[0];
      const t = podle.get(nej);
      if (!t) continue;
      /* Součet tlaku přes hrozby položky; základní seznam má přednost, tipy jen s velkým tlakem. */
      const soucet = p.hrozby.reduce((a, h) => a + (podle.get(h)?.skore ?? 0), 0);
      const vaha = s.klic === "72h" ? 1.25 : s.klic === "rozsireny" ? 1 : 0.7;
      kandidati.push({ ...p, seznam: s.klic, hrozba: nej, duvod: t.duvody[0] ?? NAZVY_HROZEB[nej], skore: Math.round(soucet * vaha * 10) / 10 });
    }
  }
  kandidati.sort((a, b) => b.skore - a.skore);
  const vybrane: PripravitPolozka[] = [];
  const funkce = new Set<string>();
  const hrozby = new Set<Hrozba>();
  for (const k of kandidati) {
    const f = k.funkce ?? k.klic;
    // Tři různé oblasti a tři různé hrozby, ať karta neřekne třikrát „voda“.
    if (funkce.has(f) || hrozby.has(k.hrozba)) continue;
    funkce.add(f); hrozby.add(k.hrozba); vybrane.push(k);
    if (vybrane.length === 3) break;
  }
  return { polozky: vybrane, hrozby: tlak.slice(0, 5), prepocitano: new Date(ted).toISOString() };
}
