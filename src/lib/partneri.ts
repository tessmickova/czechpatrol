import soubor from "../../data/partneri.json";

/*
  Partneři webu (banner). Data v data/partneri.json zapisuje jen správce.
  Banner se ukáže jen v době od–do a jen v umístění, které si partner
  koupil; mimo ně zůstane místo s nabídkou „Požádat o banner“.
*/

export type UmisteniPartnera = "paticka" | "uvod";

export interface Partner {
  id: string;
  nazev: string;
  /** Kam banner vede. Odkaz vždy rel="sponsored nofollow". */
  url: string;
  /** Jedna až dvě věty od partnera, věcně, bez poplašného tónu. */
  text: string;
  umisteni: UmisteniPartnera[];
  od: string;
  do: string;
}

export function aktivniPartneri(umisteni: UmisteniPartnera, ted = Date.now(), seznam: Partner[] = (soubor as { partneri: Partner[] }).partneri): Partner[] {
  return seznam.filter((p) => p.umisteni.includes(umisteni) && Date.parse(p.od) <= ted && ted <= Date.parse(p.do));
}
