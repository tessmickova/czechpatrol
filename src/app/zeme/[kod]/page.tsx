import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { druh, kdyZjisteno, podleZemi } from "@/lib/agregace";
import { incidenty, kampane, kampaneZeme, nazvyZemi, tlakZeme } from "@/lib/data";
import { UROVNE } from "@/lib/skala";
import { HlavickaStranky } from "@/components/nadpisy";
import type { PolozkaPoctu } from "@/components/pocitadla-zive";
import { ZemePrehled } from "@/components/zeme-prehled";
import { Vlajka } from "@/components/zeme";

export const dynamicParams = false;

/*
  Země, pro které stránka vzniká: každá, o níž máme aspoň jeden záznam nebo
  jednu manipulační operaci, plus vždy Česko.

  Kampaně tu musí být taky — jinak by tabulka „na koho to mířilo“ odkazovala
  na stránky, které neexistují.
*/
function zemeSeZaznamy() {
  const ze = podleZemi(incidenty()).map((z) => ({ kod: z.kodZeme, nazev: z.zeme }));
  const nazvy = nazvyZemi();
  const zname = new Set(ze.map((z) => z.kod));
  for (const k of kampane()) {
    for (const kod of k.kodyZemi) {
      if (zname.has(kod)) continue;
      zname.add(kod);
      ze.push({ kod, nazev: nazvy[kod] ?? kod });
    }
  }
  return ze;
}

export async function generateStaticParams() {
  return zemeSeZaznamy().map((z) => ({ kod: z.kod.toLowerCase() }));
}

function najdi(kod: string) {
  return zemeSeZaznamy().find((z) => z.kod.toLowerCase() === kod.toLowerCase()) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ kod: string }> }): Promise<Metadata> {
  const { kod } = await params;
  const z = najdi(kod);
  if (!z) return { title: "Země nenalezena", robots: { index: false, follow: false } };
  return {
    title: `${z.nazev} — bezpečnostní přehled`,
    description: `Ověřené bezpečnostní události v zemi ${z.nazev}: počty případů, typy hrozeb a posuny ve vyšetřování, vždy se zdrojem.`,
  };
}

export default async function StrankaZeme({ params }: { params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  const z = najdi(kod);
  if (!z) notFound();

  const vse = incidenty().filter((i) => i.kodZeme === z.kod);
  const tlak = tlakZeme(z.kod);
  const kampaneTeto = kampaneZeme(z.kod);
  const polozky: PolozkaPoctu[] = [
    ...vse.filter((i) => druh(i) === "pripad").map((i) => ({ kdy: kdyZjisteno(i), cz: z.kod === "CZ" })),
    ...kampaneTeto.map((k) => ({ kdy: k.odhaleno, cz: z.kod === "CZ", kampan: true })),
  ];
  const uroven = tlak.celkem ? UROVNE[tlak.celkem] : null;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="Země"
        nadpis={<span className="inline-flex flex-wrap items-center gap-3"><Vlajka kod={z.kod} /> {z.nazev}</span>}
        uvod={
          uroven
            ? `Nejvyšší úroveň, kterou tu od roku 2014 evidujeme, je ${uroven.nazev.toLowerCase()}. Není to stav k dnešku — vychází ze všech zveřejněných záznamů této země, ne z odhadu.`
            : "Pro tuhle zemi zatím nemáme žádný ověřený záznam. Neznamená to, že se nic nestalo — jen že jsme nic nedoložili."
        }
      />
      <div id="zaznamy" className="scroll-mt-[84px]" />
      <ZemePrehled
        kodZeme={z.kod}
        nazev={z.nazev}
        zaznamy={vse}
        tlak={tlak}
        polozky={polozky}
        ted={Date.now()}
        kampane={kampaneTeto}
        nazvyZemi={nazvyZemi()}
      />
    </div>
  );
}
