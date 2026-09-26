import { JE_UKAZKA } from "@/config/web";
import type { Tip, Vystraha, VystrahaSoubor } from "./typy";
import souborVystrahy from "../../data/vystraha.json";
import ostreTipy from "../../data/tipy.json";

/*
  Lehká data pro klientské komponenty (26. 9. 2026).

  Výstrahu a tipy čtou komponenty, které běží v prohlížeči (urgentni.tsx,
  dashboard.tsx). Dokud je braly z data.ts, přibalil se k nim celý datový
  modul — 155 záznamů, archiv, kampaně — a telefon stahoval 437 kB skriptu
  na každé stránce (LCP 2,8 s, INP 300 ms). Sem patří jen malé soubory.
  Test testy/vykon.test.ts hlídá, aby klientská komponenta data.ts
  nenaimportovala znovu.
*/
const jako = <T,>(x: unknown): T => x as T;

export function vystraha(): Vystraha | null {
  if (JE_UKAZKA) return null;
  const v = jako<VystrahaSoubor>(souborVystrahy).aktivni;
  if (!v) return null;
  const maZdroje = (v.zdroje ?? []).filter((z) => /^https?:\/\//.test(z.url ?? "")).length >= 2;
  if (!v.overeno || !v.overil || !maZdroje) return null;
  if (v.platiDo && new Date(v.platiDo).getTime() < Date.now()) return null;
  return v;
}

/**
 * Tipy k přípravě. Ven jde jen tip s doloženým zdrojem a s platností —
 * stejné pravidlo jako u záznamů. Nejnovější první.
 */
export function tipy(ted = Date.now()): Tip[] {
  return jako<Tip[]>(ostreTipy)
    .filter((t) => (t.zdroje ?? []).some((z) => /^https?:\/\//.test(z.url ?? "")))
    .filter((t) => !t.platiDo || new Date(t.platiDo).getTime() > ted)
    .sort((a, b) => b.kdy.localeCompare(a.kdy));
}
