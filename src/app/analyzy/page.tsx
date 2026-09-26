import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky } from "@/components/nadpisy";
import { Ikona, type NazevIkony } from "@/components/ikony";
import { CislaKdeKdo, TypyUdalosti } from "@/components/cisla-kde-kdo";
import { hybridniTlak, incidenty, kampane, svet, tydny } from "@/lib/data";
import { sklon } from "@/components/zeme";
import { radkyTabulkyZemi } from "@/components/tabulka-zemi-data";
import { proPocty } from "@/lib/odlehci";

export const metadata: Metadata = {
  title: "Analýzy",
  description: "Rozbory nad daty: jak se situace vyvíjela v čase, kdo čeho chce dosáhnout a jaké manipulační kampaně jsme rozebrali.",
};

/*
  Rozcestník analýz.

  V navigaci je jedna položka místo tří, protože Vývoj, Aktéři a Manipulace
  jsou tři odpovědi na jednu otázku: „co z toho plyne?“. Rozcestník u každé
  napíše, na co odpovídá a kolik pod ní stojí dat — bez toho by to byl jen
  seznam odkazů.
*/
export default function Analyzy() {
  const zaznamu = incidenty().length;
  const tydnu = tydny().length;
  const aktoru = svet().aktori.length;
  const kampani = kampane().length;
  const zemi = new Set(incidenty().map((i) => i.kodZeme)).size;

  const karty: { href: string; stitek: string; nadpis: string; popis: string; cislo: string; ikona: NazevIkony }[] = [
    {
      href: "/vyvoj/",
      stitek: "Vývoj",
      nadpis: "Jak se to měnilo v čase",
      popis: "Kolik případů přibylo po měsících a jak se měnilo hodnocení po týdnech. Víc záznamů může znamenat i to, že lépe hledáme.",
      cislo: `${tydnu} ${sklon(tydnu, "hodnocený týden", "hodnocené týdny", "hodnocených týdnů")} · ${zaznamu} ${sklon(zaznamu, "záznam", "záznamy", "záznamů")}`,
      ikona: "graf",
    },
    {
      href: "/zeme/",
      stitek: "Země",
      nadpis: "Kde se to děje",
      popis: "Každá sledovaná země zvlášť: počty, typy hrozeb, vyšetřování a kdy naposledy něco přibylo. Česko je vždy první.",
      cislo: `${zemi} ${sklon(zemi, "sledovaná země", "sledované země", "sledovaných zemí")}`,
      ikona: "mapa",
    },
    {
      href: "/svet/",
      stitek: "Aktéři a cíle",
      nadpis: "Kdo čeho chce dosáhnout",
      popis: "Deklarované cíle mocností se zdroji a hodnocení projektu, jak blízko k nim jsou. Fakt a odhad jsou v textu rozlišené štítkem, ne tónem.",
      cislo: `${aktoru} ${sklon(aktoru, "aktér", "aktéři", "aktérů")}`,
      ikona: "globus",
    },
    {
      href: "/manipulace/",
      stitek: "Manipulace",
      nadpis: "Manipulace a útoky na občany",
      popis: "Podvržené dokumenty, weby a profily vydávající se za někoho jiného. U každé operace zvlášť: co je doložené, a víme, kdo za ní stojí?",
      cislo: `${kampani} ${sklon(kampani, "rozebraná kampaň", "rozebrané kampaně", "rozebraných kampaní")}`,
      ikona: "bublina",
    },
    {
      href: "/metodika/",
      stitek: "Metodika",
      nadpis: "Podle čeho to hodnotíme",
      popis: "Stupnice, pravidla započítávání, co je fakt a co odhad. Bez tohohle je každé číslo na webu jen tvrzení.",
      cislo: "pravidla projektu",
      ikona: "vaha",
    },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Analýzy"
        nadpis="Co z toho plyne"
        uvod="Přehled říká, co se stalo. Tady je, jak se to vyvíjí: v čase, podle aktérů a podle kampaní. Naše hodnocení je vždy označené jako hodnocení."
      />

      {/*
        Nejdřív data, pak rozcestník. Typy událostí a čísla „kolik, kde,
        kdo“ byly na úvodní straně; úvod má odpovídat na „děje se něco?“,
        rozbor patří sem, kde ho člověk hledá.
      */}
      <div className="mt-12 space-y-14 sm:mt-16 sm:space-y-20">
        <TypyUdalosti tlakEvropa={hybridniTlak()} tabulka={radkyTabulkyZemi()} />
        <CislaKdeKdo vse={incidenty().map(proPocty)} kampane={kampane()} ted={Date.now()} />
      </div>

      <div className="mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <h2 className="podnadpis text-velke">Rozbory</h2>
      </div>
      <ul className="nalet mt-6 grid gap-3 sm:grid-cols-2">
        {karty.map((k) => (
          <li key={k.href}>
            <Link href={k.href} className="flex h-full flex-col gap-3 rounded-[28px] bg-plocha p-6 transition-colors hover:border-akcent">
              <span className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev={k.ikona} velikost={19} tah={1.8} /></span>
                <span className="stitek-znacky">{k.stitek}</span>
              </span>
              <span className="text-velke font-bold leading-snug text-inkoust">{k.nadpis}</span>
              <span className="text-zaklad leading-relaxed text-tlum">{k.popis}</span>
              <span className="mt-auto flex items-center gap-2 pt-1 text-drobne text-tlum2">
                <span className="cislice">{k.cislo}</span>
                <Ikona nazev="nahoru" velikost={12} tah={2} trida="rotate-90 text-akcent" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
