import { ZDROJE } from "../../sber/zdroje";
import type { RegistrZdroj } from "../../sber/typy";
import { nato, pravniStav, provoz } from "./data";
import type { NatoPolozka, Pokryti, PravniPolozka, ProvozniPolozka } from "./typy";

/*
  Kontrola pokrytí: co o kterém stavu vůbec můžeme vědět.

  Web ukazuje dvacet úředních stavů. U každého je poctivá otázka, na kterou
  musí umět odpovědět: z čeho to víme a jak spolehlivě? Tenhle modul tu
  odpověď skládá z registru zdrojů, ne z dojmu.

  Rozlišuje čtyři stupně. Nejvyšší z nich dnes nemá ani jedna položka — a je
  to tím, že tiskové stránky úřadů nejsou úplné seznamy. Dokud se to nezmění,
  web u těchhle stavů nesmí tvrdit „neplatí", jen „nenašli jsme doložené
  vyhlášení". Přehled níž říká, co by k tomu bylo potřeba sehnat.
*/

export type StupenPokryti = "uplne" | "vicezdrojove" | "jednozdrojove" | "chybi";

export const STUPNE: Record<StupenPokryti, { nazev: string; popis: string }> = {
  uplne: {
    nazev: "Úplný seznam",
    popis: "Máme autoritativní registr, ze kterého jde doložit i to, že opatření neplatí.",
  },
  vicezdrojove: {
    nazev: "Více zdrojů, žádný úplný",
    popis: "Sledujeme několik úředních zdrojů. Vyhlášení zachytíme, nevyhlášení z nich ale neplyne.",
  },
  jednozdrojove: {
    nazev: "Jediný zdroj",
    popis: "Položku kryje jediný dostupný zdroj. Když vypadne, nevíme o ní nic.",
  },
  chybi: {
    nazev: "Bez zdroje",
    popis: "Pro tuhle položku zatím nemáme automaticky čitelný veřejný zdroj.",
  },
};

export interface PokrytiPolozky {
  klic: string;
  nazev: string;
  skupina: "Právní stav" | "NATO" | "Běžný život";
  stupen: StupenPokryti;
  /** Zdroje, které se na položku dívají a odpovídají automatu. */
  zdroje: { klic: string; nazev: string; url: string; primarni: boolean }[];
  /** Zdroje, které položku kryjí, ale automatizované dotazy odmítají. */
  blokujici: { klic: string; nazev: string }[];
  /** Co konkrétně chybí, aby šlo doložit i zápor. Prázdné = nic nechybí. */
  chybi: string;
  pokryti: Pokryti;
  zkontrolovano: string | null;
}

/*
  Co by u které skupiny bylo potřeba sehnat. Popisujeme DRUH registru, ne
  konkrétní adresu — vymyslet si URL, které možná neexistuje, by bylo horší
  než přiznat, že ho zatím nemáme.
*/
const CO_CHYBI: Record<string, string> = {
  "stav-ohrozeni": "Strojově čitelný výpis vyhlášených krizových stavů ze Sbírky zákonů (ne titulní stránka).",
  "valecny-stav": "Strojově čitelný výpis usnesení Parlamentu o válečném stavu.",
  mobilizace: "Strojově čitelný výpis rozhodnutí prezidenta o mobilizaci.",
  "nouzovy-stav": "Strojově čitelný výpis usnesení vlády o nouzovém stavu, včetně platnosti a území.",
  vycestovani: "Úřední seznam platných omezení vycestování — dnes se hlídá jen text tiskových stránek.",
  hranice: "Seznam znovuzavedených kontrol na vnitřních hranicích s platností a přechody.",
  "schuze-parlamentu": "Strojově čitelný program schůzí Sněmovny; dnes jen jeden zdroj a jen text stránky.",
  "clanek-4": "Strojový výpis konzultací podle článku 4 z NATO; dnes jen zpravodajská stránka Aliance.",
  "clanek-5": "Strojový výpis rozhodnutí Severoatlantické rady; dnes jen zpravodajská stránka Aliance.",
  readiness: "Úřední přehled stupňů pohotovosti; dnes jen tiskové zprávy.",
  evakuace: "Úřední přehled evakuací personálu; dnes jen stránka MZV.",
  "vychodni-kridlo": "Dlouhodobý stav bez automatického zdroje — vede ho člověk.",
  palivo: "Hlášení o dostupnosti pohonných hmot; SSHR odmítá automatizované dotazy, zbývá jediný zdroj.",
  elektrina: "Výpis vyhlášených stavů nouze v elektroenergetice s územím a platností.",
  plyn: "Výpis vyhlášených stavů nouze v plynárenství s územím a platností.",
  banky: "Úřední přehled omezení platebního styku; dnes jediný zdroj.",
  komunikace: "Přehled výpadků sítí od operátorů nebo ČTÚ; dnes se hlídá jen text stránek.",
  "bezny-zivot": "Přehled celostátních opatření dotýkajících se škol a úřadů.",
};

function proPolozku(klic: string) {
  const vse = ZDROJE.filter((z: RegistrZdroj) => (z.tyka ?? []).includes(klic));
  const dostupne = vse.filter((z) => !z.ocekavaneBlokovani);
  const uplne = vse.filter((z) => z.autoritativni);
  const stupen: StupenPokryti = uplne.length
    ? "uplne"
    : dostupne.length >= 2
      ? "vicezdrojove"
      : dostupne.length === 1
        ? "jednozdrojove"
        : "chybi";
  return {
    stupen,
    zdroje: dostupne.map((z) => ({ klic: z.klic, nazev: z.nazev, url: z.odkaz ?? z.url, primarni: z.primarni })),
    blokujici: vse.filter((z) => z.ocekavaneBlokovani).map((z) => ({ klic: z.klic, nazev: z.nazev })),
  };
}

/** Pokrytí jedné položky — pro rozbalený detail u stavu. */
export function pokrytiPolozky(
  p: PravniPolozka | NatoPolozka | ProvozniPolozka,
  skupina: PokrytiPolozky["skupina"],
): PokrytiPolozky {
  const z = proPolozku(p.klic);
  return {
    klic: p.klic,
    nazev: p.nazev,
    skupina,
    ...z,
    chybi: z.stupen === "uplne" ? "" : (CO_CHYBI[p.klic] ?? "Autoritativní seznam pro tuhle položku zatím nemáme."),
    pokryti: p.pokryti ?? "orientacni",
    zkontrolovano: p.zkontrolovano ?? null,
  };
}

/** Celá kontrola pro stránku Zdroje. Pořadí je stejné jako na přehledu. */
export function kontrolaPokryti(): PokrytiPolozky[] {
  return [
    ...pravniStav().polozky.map((p) => pokrytiPolozky(p, "Právní stav")),
    ...nato().polozky.map((p) => pokrytiPolozky(p, "NATO")),
    ...provoz().polozky.map((p) => pokrytiPolozky(p, "Běžný život")),
  ];
}

/** Souhrn do jedné věty. Čísla, ne dojmy. */
export function souhrnPokryti(radky = kontrolaPokryti()) {
  const podle = (s: StupenPokryti) => radky.filter((r) => r.stupen === s).length;
  return {
    celkem: radky.length,
    uplne: podle("uplne"),
    vicezdrojove: podle("vicezdrojove"),
    jednozdrojove: podle("jednozdrojove"),
    chybi: podle("chybi"),
  };
}
