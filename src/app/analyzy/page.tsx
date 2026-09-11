import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky } from "@/components/nadpisy";
import { Ikona, type NazevIkony } from "@/components/ikony";
import { incidenty, kampane, svet, tydny } from "@/lib/data";
import { sklon } from "@/components/zeme";

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

  const karty: { href: string; stitek: string; nadpis: string; popis: string; cislo: string; ikona: NazevIkony }[] = [
    {
      href: "/vyvoj/",
      stitek: "Vývoj",
      nadpis: "Jak se to měnilo v čase",
      popis: "Kolik případů přibývalo měsíc po měsíci a jak se měnilo hodnocení po týdnech. Objem a závažnost zvlášť — rostoucí počet záznamů může znamenat i to, že jsme začali lépe hledat.",
      cislo: `${tydnu} ${sklon(tydnu, "hodnocený týden", "hodnocené týdny", "hodnocených týdnů")} · ${zaznamu} ${sklon(zaznamu, "záznam", "záznamy", "záznamů")}`,
      ikona: "graf",
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
      nadpis: "Kampaně, které šíří nepravdu",
      popis: "Podvržené dokumenty, falešné weby a profily. U každé kampaně zvlášť: je manipulace doložená, a víme, kdo za ní stojí?",
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
    <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="Analýzy"
        nadpis="Co z toho plyne"
        uvod="Přehled a Události ukazují, co se stalo. Tady jsou rozbory nad týmiž daty: vývoj v čase, cíle aktérů a manipulační kampaně. Hodnocení projektu je všude označené jako hodnocení, ne jako fakt."
      />

      <ul className="nalet mt-12 grid gap-3 sm:mt-16 sm:grid-cols-2">
        {karty.map((k) => (
          <li key={k.href}>
            <Link href={k.href} className="flex h-full flex-col gap-3 rounded-[26px] border border-linka2 bg-plocha p-6 transition-colors hover:border-akcent">
              <span className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev={k.ikona} velikost={19} tah={1.8} /></span>
                <span className="stitek-znacky">{k.stitek}</span>
              </span>
              <span className="text-[20px] font-bold leading-snug text-inkoust">{k.nadpis}</span>
              <span className="text-[14.5px] leading-relaxed text-tlum">{k.popis}</span>
              <span className="mt-auto flex items-center gap-2 pt-1 text-[12.5px] text-tlum2">
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
