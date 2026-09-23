import { ChybaHttp } from "./pomocne";
import type { Env } from "./typy";

/*
  Pojistka pro osobní údaje (audit P0-13).

  Dokud na webu není vyplněný provozovatel — kdo je správce údajů, kam se
  obrátit, jak dlouho se co drží — nesmíme sbírat e-maily, jména ani
  telefony. Zakázat to jen ve formulářích nestačí: API je veřejné a dá se
  volat přímo. Proto se to hlídá tady, na serveru.

  Zapne se až proměnnou OSOBNI_UDAJE = "ano" ve Workeru, ve stejné chvíli,
  kdy se na web doplní provozovatel.
*/
export function osobniUdajePovoleny(env: Env): boolean {
  return env.OSOBNI_UDAJE === "ano";
}

export function vyzadujOsobniUdaje(env: Env): void {
  if (!osobniUdajePovoleny(env)) {
    throw new ChybaHttp(503, "Kontaktní údaje zatím nepřijímáme — provozovatel ještě není na webu uvedený.");
  }
}
