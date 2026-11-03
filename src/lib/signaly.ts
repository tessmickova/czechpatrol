import { jeJenProjev } from "../../nastroje/zasady-textu.mjs";
import { jeCesky } from "./jazyk";

/*
  Které zachycené zprávy patří do sloupce „Signály z médií“ na úvodu.

  Jedno pravidlo pro celý web (3. 11. 2026, provozovatelka: „mělo by to být
  synchronizované napříč webem“). Do té doby sloupec bral jen česky psané
  titulky, zatímco Souhrn situace vpravo počítal naléhavé zprávy ve všech
  jazycích — ráno 3. 11. tak Souhrn hlásil zprávu z Lotyšska (anglicky),
  která ve sloupci vedle nebyla.

  Naléhavá zpráva (sítem označená k okamžité kontrole) jde do sloupce vždy,
  i v cizím jazyce. Ostatní cizojazyčné zůstávají jen ve frontě: na úvod patří
  to, co si čtenář přečte bez překladu.
*/
type Zachycena = { titulek: string; kodZeme: string | null; naliehave?: unknown };

export function jeSignal(k: Zachycena): boolean {
  if (k.naliehave) return true;
  if (!jeCesky(k.titulek) || jeJenProjev(k.titulek)) return false;
  /*
    Údery uvnitř Ukrajiny a Ruska bez doloženého následku pro sledované země
    jsou mimo rozsah (CLAUDE.md, rozsah války). Zbytek posoudí ověřovatel ve frontě.
  */
  return k.kodZeme !== "UA" && k.kodZeme !== "RU";
}

/** Cizojazyčné, které se do sloupce nedostaly — na úvodu jen jako počet s odkazem do fronty. */
export const jeCiziVeFronte = (k: Zachycena): boolean => !k.naliehave && !jeCesky(k.titulek);
