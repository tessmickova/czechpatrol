import Link from "next/link";
import { KANALY } from "@/config/web";
import { Ikona, type NazevIkony } from "./ikony";

/*
  „Co dál“ na konci důležitých stránek (26. 9. 2026).

  Podle Clarity lidé odcházeli hlavně z úvodu a z Odběru (21 odchodů
  z 29 návštěv) — stránka skončila a nenabídla další krok. Tři karty,
  vždy bez stránky, na které člověk je. Telegram je první: je to jediná
  cesta, jak se dozvědět novinku, aniž by člověk web sám otevíral.
*/
const KROKY: { klic: string; kam: string; ven?: boolean; ikona: NazevIkony; nadpis: string; popis: string }[] = [
  ...(KANALY.telegram ? [{ klic: "telegram", kam: KANALY.telegram, ven: true, ikona: "zvonek" as NazevIkony, nadpis: "Upozornění do Telegramu", popis: "Vážné ověřené zprávy přijdou samy, nemusíte web hlídat." }] : []),
  { klic: "/pripravenost/", kam: "/pripravenost/", ikona: "stit", nadpis: "Jste připraveni?", popis: "Průvodce za pět minut: co si nastavit a mít doma." },
  { klic: "/odolnost/", kam: "/odolnost/", ikona: "terc", nadpis: "Kalkulačka odolnosti", popis: "Jak dlouho vydržíte bez proudu, vody a obchodů." },
  { klic: "/udalosti/", kam: "/udalosti/", ikona: "dokument", nadpis: "Všechny události", popis: "Každý záznam se zdroji, filtry podle země a tématu." },
];

export function CoDal({ bez, trida = "" }: { bez?: string; trida?: string }) {
  const kroky = KROKY.filter((k) => k.klic !== bez).slice(0, 3);
  return (
    <section aria-labelledby="co-dal" className={`mt-14 ${trida}`}>
      <h2 id="co-dal" className="nadpis-boxu mb-3">Co dál</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {kroky.map((k) => {
          const obsah = (
            <>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent"><Ikona nazev={k.ikona} velikost={18} tah={1.9} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-zaklad font-semibold leading-snug text-inkoust">{k.nadpis}{k.ven ? " ↗" : ""}</span>
                <span className="mt-0.5 block text-male leading-snug text-tlum">{k.popis}</span>
              </span>
            </>
          );
          const trida = "flex h-full min-h-[72px] items-start gap-3 rounded-[18px] border border-linka bg-plocha p-4 transition-colors hover:border-akcent";
          return (
            <li key={k.klic}>
              {k.ven
                ? <a href={k.kam} target="_blank" rel="nofollow noopener noreferrer" className={trida}>{obsah}</a>
                : <Link href={k.kam} className={trida}>{obsah}</Link>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
