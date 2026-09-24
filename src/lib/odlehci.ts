import type { Incident } from "./typy";

/*
  Záznamy bez podrobností pro stránky, které je jen počítají (24. 9. 2026).
  Fakta, nejasnosti, historie a hodnocení 140 záznamů dělaly z úvodu 700 kB
  HTML; nic z toho úvod nečte. Typ zůstává, pole se vyprázdní.
*/
export function odlehci<T extends Incident>(i: T): T {
  /* První fakt a první neznámá zůstávají: úvod je ukazuje po rozbalení řádku aktualit. */
  return { ...i, fakta: i.fakta.slice(0, 1), neznameho: i.neznameho.slice(0, 1), historie: [], eskalacniSpousteče: [], deeskalacniSignaly: [], souvisejici: [], vyznam: "" };
}
