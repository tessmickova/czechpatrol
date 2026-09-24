import type { ReactNode } from "react";
import { Ikona, type NazevIkony } from "./ikony";
import { Otaznik } from "./zaklad";

/*
  Widgety — jednotná stavebnice karet (revize 24. 9. 2026).

  Každý blok s daty na webu má stejnou kostru: plocha se zaoblením 22 px
  bez rámečku a bez oddělovacích čar (od 24. 9. 2026), hlavička s ikonou
  v kroužku, nadpisem stejným písmem jako ostatní nadpisy a údajem
  vpravo, tělo, volitelná patička. Dřív měla každá karta vlastní hlavičku (tečka, ikona, nic),
  vlastní rádius (18/20/22/28) a vlastní odsazení. Tady je to na jednom
  místě; komponenty jen dodávají obsah.

  Tón nese ikona, ne plocha: akcent = data projektu, klid = v pořádku,
  pozor = neověřené nebo sledované, neutral = pomocné.
*/
export type TonWidgetu = "akcent" | "klid" | "pozor" | "neutral";

const TON: Record<TonWidgetu, { kruh: string; ramecek: string }> = {
  akcent: { kruh: "bg-akcent/15 text-akcent", ramecek: "border-transparent bg-plocha" },
  klid: { kruh: "bg-klid/15 text-klid-text", ramecek: "border-transparent bg-plocha" },
  pozor: { kruh: "bg-jantar/20 text-jantar", ramecek: "border-dashed border-jantar/55 bg-jantar/[0.06]" },
  neutral: { kruh: "bg-plocha2 text-tlum", ramecek: "border-transparent bg-plocha" },
};

/** Rámeček karty. Vždy 22 px, vždy stejná linka; tón jen u neověřeného. */
export function Widget({ children, ton = "akcent", trida = "", jako: Jako = "section", ...dal }: { children: ReactNode; ton?: TonWidgetu; trida?: string; jako?: "section" | "aside" | "div"; "aria-label"?: string; "aria-labelledby"?: string; id?: string }) {
  return <Jako className={`relative flex flex-col overflow-hidden rounded-[22px] border ${TON[ton].ramecek} ${trida}`} {...dal}>{children}</Jako>;
}

/** Hlavička: ikona v kroužku, štítek, vysvětlivka; vpravo údaj nebo akce. Druhý řádek pro souhrn skupiny. */
export function HlavickaWidgetu({ ikona, nazev, id, jako: Jako = "h3", napoveda, meta, akce, podtitul, ton = "akcent" }: {
  ikona: NazevIkony; nazev: ReactNode; id?: string; jako?: "h2" | "h3" | "span"; napoveda?: ReactNode; meta?: ReactNode; akce?: ReactNode; podtitul?: ReactNode; ton?: TonWidgetu;
}) {
  return (
    <div className="px-4 pb-1 pt-3">
      {/* Štítek se nikdy nezkracuje; údaj vpravo se zalomí, když je místa málo. */}
      <div className="flex min-h-[28px] items-center justify-between gap-3">
        <span className="flex shrink-0 items-center gap-2">
          <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${TON[ton].kruh}`}><Ikona nazev={ikona} velikost={13} tah={2} /></span>
          <Jako id={id} className="nadpis-boxu whitespace-nowrap">{nazev}</Jako>
          {napoveda && <Otaznik popis={napoveda} />}
        </span>
        {(meta || akce) && (
          <span className="flex min-w-0 items-center justify-end gap-3 text-right text-mikro leading-snug text-tlum2">
            {meta}
            {akce}
          </span>
        )}
      </div>
      {podtitul && <span className="mt-1 block text-male font-semibold leading-snug text-inkoust">{podtitul}</span>}
    </div>
  );
}

/** Patička: drobný text vlevo, odkaz vpravo. */
export function PatickaWidgetu({ children, akce }: { children?: ReactNode; akce?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pb-3 pt-1 text-mikro text-tlum2">
      <span>{children}</span>
      {akce}
    </div>
  );
}

/** Ikona v kroužku pro sekční nadpisy a řádky — stejná velikost všude. */
export function IkonaKruh({ ikona, ton = "akcent", velikost = "m" }: { ikona: NazevIkony; ton?: TonWidgetu; velikost?: "s" | "m" | "l" }) {
  const v = velikost === "s" ? "h-6 w-6" : velikost === "m" ? "h-8 w-8" : "h-10 w-10";
  const i = velikost === "s" ? 13 : velikost === "m" ? 16 : 18;
  return <span aria-hidden className={`grid shrink-0 place-items-center rounded-full ${v} ${TON[ton].kruh}`}><Ikona nazev={ikona} velikost={i} tah={1.9} /></span>;
}
