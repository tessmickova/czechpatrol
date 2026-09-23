import fs from "node:fs";
import path from "node:path";

/*
  Uzavírání položek „Právě ověřujeme“ po lhůtě.

  Rozhodnutí provozovatelky z 23. 9. 2026: lhůty se nemají hlídat ručně.
  Zařazení dál dělá jen člověk (pravidlo č. 0, bod 4), ale uzavření po lhůtě
  je mechanické: když do lhůty nic nepotvrdil úřad ani projekt, položka
  končí jako „nikdo nepotvrdil“. Je to zápor, a ten automat smí zapsat
  (pravidlo č. 4). Potvrzení nebo vyvrácení automat nezapisuje nikdy — to
  jsou tvrzení a na ta musí být člověk nebo řádný záznam.
*/

interface Overovana {
  stav: "overujeme" | "potvrzeno" | "vyvraceno" | "nikdo-nepotvrdil";
  uzavritDo: string;
  jakDopadlo?: string;
  uzavreno?: string;
}

export function uzavriPropadle<T extends Overovana>(polozky: T[], ted = Date.now()): { polozky: T[]; uzavreno: number } {
  let uzavreno = 0;
  const vysledek = polozky.map((o) => {
    if (o.stav !== "overujeme" || new Date(o.uzavritDo).getTime() > ted) return o;
    uzavreno++;
    return {
      ...o,
      stav: "nikdo-nepotvrdil" as const,
      uzavreno: new Date(ted).toISOString(),
      jakDopadlo: o.jakDopadlo ?? "Do konce lhůty to nepotvrdil žádný úřad a projekt k tomu nenašel doklad. Z přehledu staženo, zápis zůstává.",
    };
  });
  return { polozky: vysledek, uzavreno };
}

export function uzavriOverovane(koren = path.join(process.cwd(), "data")): number {
  const soubor = path.join(koren, "overujeme.json");
  if (!fs.existsSync(soubor)) return 0;
  const polozky = JSON.parse(fs.readFileSync(soubor, "utf-8")) as Overovana[];
  const { polozky: nove, uzavreno } = uzavriPropadle(polozky);
  if (uzavreno) fs.writeFileSync(soubor, `${JSON.stringify(nove, null, 2)}\n`, "utf-8");
  return uzavreno;
}
