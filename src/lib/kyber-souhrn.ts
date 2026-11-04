import snimekData from "../../data/kyber.json";
import archivData from "../../data/kyber-archiv.json";
import { radkyInternetu, stavKyber, type RadekInternetu, type SnimekKyber, type StavKyber, type ZpravaKyber } from "./kyber";

/*
  Souhrn pro box Internet v Česku — jen na serveru (při sestavení).

  Snímek (kyber.json) nese jen to, co zrovna vrací kanály; archiv drží
  posledních tisíc zpráv. Box tak bere zprávy za 72 h z obojího a do
  prohlížeče jde jen hotový souhrn, ne archiv.
*/
export interface SouhrnInternetu {
  /** Snímek mladší než den. Bez něj box říká „bez údaje“, nikdy „klid“. */
  cerstve: boolean;
  stav: StavKyber | null;
  pocet72: number;
  radky: RadekInternetu[];
  /** Do nápovědy: nejnovější zprávy s odkazem. */
  posledni: ZpravaKyber[];
}

const MAX_STARI_H = 24;

export function sestavSouhrnInternetu(snimek: SnimekKyber, archiv: readonly ZpravaKyber[], ted: number): SouhrnInternetu {
  const cerstve = Boolean(snimek.nacteno && ted - new Date(snimek.nacteno).getTime() <= MAX_STARI_H * 3_600_000);
  if (!cerstve) return { cerstve, stav: null, pocet72: 0, radky: [], posledni: [] };
  const videno = new Set<string>();
  const za72 = [...snimek.zpravy, ...archiv]
    .filter((z) => { if (videno.has(z.id)) return false; videno.add(z.id); return ted - new Date(z.kdy).getTime() <= 72 * 3_600_000 && new Date(z.kdy).getTime() <= ted + 3_600_000; })
    .sort((a, b) => b.kdy.localeCompare(a.kdy));
  return { cerstve, stav: stavKyber(snimek.zpravy, ted), pocet72: za72.length, radky: radkyInternetu(za72), posledni: za72.slice(0, 4) };
}

export function souhrnInternetu(ted = Date.now()): SouhrnInternetu {
  return sestavSouhrnInternetu(snimekData as SnimekKyber, archivData as ZpravaKyber[], ted);
}
