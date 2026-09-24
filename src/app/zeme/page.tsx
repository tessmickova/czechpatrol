import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { SidebarWebu } from "@/components/sidebar-webu";
import { ZemePrepinac } from "@/components/zeme-prepinac";
import { kdyZjisteno, podleZemi } from "@/lib/agregace";
import { incidenty } from "@/lib/data";
import { KATEGORIE } from "@/lib/kategorie";

export const metadata: Metadata = {
  title: "Země",
  description: "Přehled sledovaných zemí: kolik ověřených případů v každé evidujeme, jaká je nejvyšší úroveň a kdy naposledy něco přibylo.",
};

export default function Zeme() {
  const vse = incidenty();
  const radky = podleZemi(vse);
  const celkem = radky.reduce((s, z) => s + z.pripady, 0);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Země"
        nadpis="Kde se to děje"
        uvod={`Klepnutím na zemi se přepne přehled: počty, nejvyšší úroveň, poslední záznamy. Celkem ${celkem} případů. Česko je vždy první.`}
      />

      <div className="nalet mt-16 grid gap-10 sm:mt-24 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-16">
        <div className="min-w-0">
          <ZemePrepinac radky={radky.map((z) => ({
            kodZeme: z.kodZeme, zeme: z.zeme, pripady: z.pripady, opatreni: z.opatreni, reakce: z.reakce, nejvyssi: z.nejvyssi, posledni: z.posledni,
            kategorie: z.kategorie.map((k) => KATEGORIE[k]?.nazev ?? k),
            posledniZaznamy: vse.filter((i) => i.kodZeme === z.kodZeme).sort((x, y) => kdyZjisteno(y).localeCompare(kdyZjisteno(x))).slice(0, 4).map((i) => ({ slug: i.slug, titulek: i.kratkyTitulek || i.titulek, kdy: kdyZjisteno(i), zavaznost: i.zavaznost })),
          }))} />
          <p className="mt-6 text-male leading-relaxed text-tlum2">
            Počítají se jen skutečné události. Pokračování, opatření a prohlášení ne. Země bez záznamu neznamená klid, jen odtud zatím není doložený záznam.
          </p>
        </div>
        <SidebarWebu />
      </div>
    </div>
  );
}
