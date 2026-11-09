import type { InformaceVstup } from "../prehled/typy";
import type { Incident, PravniPolozka, ProvozniPolozka, VystrahaSoubor } from "../typy";
import { BEZ_DOPORUCENI_Z_PASMA, NENI_K_DISPOZICI, OBECNA_PRIPRAVENOST } from "./texty";
import { NAZVY_PASEM, VERZE_METODIKY, type VstupKvality, type VyjimkaV2 } from "./typy";
import { type VysledekA, vrstvaA } from "./vrstva-a";
import { type VysledekB, vrstvaB } from "./vrstva-b";
import { type VysledekC, vrstvaC } from "./vrstva-c";

export * from "./typy";
export { vrstvaA, vrstvaB, vrstvaC };

export interface VstupV2 {
  zaznamy: readonly Incident[];
  provoz: readonly ProvozniPolozka[];
  pravni: readonly PravniPolozka[];
  vystraha: VystrahaSoubor | null;
  chmi: readonly InformaceVstup[];
  kvalita: VstupKvality;
  vyjimky?: readonly VyjimkaV2[];
  ted: number;
}

/** Odpovědi hlavního souhrnu (zadání § 9): co se změnilo, proč je to důležité, jaký dopad, co dělat, co nevíme. */
export interface SouhrnV2 {
  coSeZmenilo: string;
  procDulezite: string;
  dopad: string;
  coDelat: string;
  coNevime: string[];
}

export interface HodnoceniV2 { verze: string; spocteno: string; a: VysledekA; b: VysledekB; c: VysledekC; souhrn: SouhrnV2 }

const den = (iso: string) => `${Number(iso.slice(8, 10))}. ${Number(iso.slice(5, 7))}.`;

export function hodnoceniV2(v: VstupV2): HodnoceniV2 {
  const c = vrstvaC({ pravni: v.pravni, vystraha: v.vystraha, chmi: v.chmi, ted: v.ted });
  const a = vrstvaA({ zaznamy: v.zaznamy, ted: v.ted, kvalita: v.kvalita, uredni: { stavOhrozeni: c.stavOhrozeni, valecnyStav: c.valecnyStav }, vyjimky: v.vyjimky });
  const b = vrstvaB({ zaznamy: v.zaznamy, provoz: v.provoz, ted: v.ted });
  const pred = new Date(v.ted - 7 * 86_400_000).toISOString();

  const coSeZmenilo = a.pasmo === null
    ? `${NENI_K_DISPOZICI}; změnu proti ${den(pred)} proto neuvádíme.`
    : a.zmena.smer === "nelze"
      ? `Změnu proti ${den(pred)} nelze spolehlivě určit.`
      : a.zmena.smer === "beze-zmeny"
        ? `Proti ${den(pred)} beze změny pásma (${NAZVY_PASEM[a.pasmo]}). Beze změny neznamená bezpečno.`
        : `Proti ${den(pred)} pásmo ${a.zmena.smer === "vyssi" ? "vyšší" : "nižší"}: z ${NAZVY_PASEM[a.zmena.predtim!]} na ${NAZVY_PASEM[a.pasmo]}.`;
  const procDulezite = a.rozhodujici.length
    ? a.rozhodujici.slice(0, 3).map((r) => `${r.titulek} (${r.zeme}): ${r.duvod}`).join("; ")
    : a.pasmo ? "Žádná aktivní doložená událost nesplnila pravidlo vyššího pásma." : a.vysvetleni;
  const pokyny = c.plati.filter((x) => x.pokyn);
  const coDelat = pokyny.length
    ? pokyny.map((x) => `${x.vydal} (${x.uzemi}): ${x.pokyn}`).join(" ")
    : `${BEZ_DOPORUCENI_Z_PASMA} ${OBECNA_PRIPRAVENOST}`;
  const coNevime = [
    ...a.kvalita.duvody,
    ...(a.nezapocteno.length ? [`${a.nezapocteno.length} ${a.nezapocteno.length === 1 ? "událost nevstupuje" : "událostí nevstupuje"} do pásma, protože není ověřená, potvrzená nebo je sporná či vyvrácená`] : []),
    ...(a.neaktualni.length ? [`u ${a.neaktualni.length} probíhajících událostí chybí včasné znovuověření stavu`] : []),
    ...b.funkce.filter((f) => f.stav === "nezname").map((f) => `${f.nazev}: bez údaje (${f.pokryti})`),
  ];
  return { verze: VERZE_METODIKY, spocteno: new Date(v.ted).toISOString(), a, b, c, souhrn: { coSeZmenilo, procDulezite, dopad: b.souhrn, coDelat, coNevime } };
}
