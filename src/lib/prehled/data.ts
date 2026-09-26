import posledniBeh from "../../../data/fronta/posledni-beh.json";
import stavZdroju from "../../../data/fronta/zdroje-stav.json";
import sluzby from "../../../data/sluzby.json";
import palivo from "../../../data/palivo.json";
import souborVystrahy from "../../../data/vystraha.json";
import konfigurace from "../../../data/cerstvost-zdroju.json";
import { JE_UKAZKA } from "@/config/web";
import { celkovyStav, incidenty, nepotvrzene, pravniStav, vsichniKandidati } from "../data";
import type { VystrahaSoubor } from "../typy";
import type { KonfiguraceCerstvosti } from "./model";
import { sestavSnimek } from "./snimek";
import type { SnimekPrehledu, ZaznamZdroje } from "./typy";

/** Meze čerstvosti z data/cerstvost-zdroju.json. */
export const KONFIGURACE_CERSTVOSTI = konfigurace as unknown as KonfiguraceCerstvosti;

/** Snímek pro Rychlý přehled z dat tohoto buildu. */
export function snimekPrehledu(generovano = new Date().toISOString()): SnimekPrehledu {
  return sestavSnimek({
    generovano,
    posledniBeh: posledniBeh as never,
    stavZdroju: stavZdroju as Record<string, ZaznamZdroje>,
    sluzby: sluzby as never,
    palivo: palivo as never,
    // Ukázkový režim výstrahu nikdy neukazuje (shodně s data.ts vystraha()).
    vystraha: JE_UKAZKA ? null : (souborVystrahy as unknown as VystrahaSoubor),
    pravni: pravniStav().polozky,
    incidenty: incidenty(),
    celkovy: celkovyStav(),
    kandidati: vsichniKandidati(),
    nepotvrzene: nepotvrzene(),
  });
}
