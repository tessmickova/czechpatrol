import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky } from "@/components/nadpisy";
import { Vlajka } from "@/components/zeme";
import { podleZemi } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import { incidenty } from "@/lib/data";
import { PASMA, UROVNE, zDeseti } from "@/lib/skala";

export const metadata: Metadata = {
  title: "Země",
  description: "Přehled sledovaných zemí: kolik ověřených případů v každé evidujeme, jaká je nejvyšší úroveň a kdy naposledy něco přibylo.",
};

export default function Zeme() {
  const radky = podleZemi(incidenty());
  const celkem = radky.reduce((s, z) => s + z.pripady, 0);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="Země"
        nadpis="Kde se to děje"
        uvod={`Každá sledovaná země má vlastní přehled: počty případů, typy hrozeb a posuny ve vyšetřování. Dohromady evidujeme ${celkem} případů. Česko uvádíme vždy první, i když v něm nic není.`}
      />

      <ul className="nalet mt-12 grid gap-3 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
        {radky.map((z) => {
          const t = z.nejvyssi ? PASMA[UROVNE[z.nejvyssi].pasmo] : null;
          return (
            <li key={z.kodZeme}>
              <Link
                href={`/zeme/${z.kodZeme.toLowerCase()}/`}
                className="flex h-full flex-col gap-3 rounded-[22px] border border-linka2 bg-plocha p-5 transition-colors hover:border-akcent"
              >
                <span className="flex items-center gap-2.5">
                  <Vlajka kod={z.kodZeme} />
                  <span className="text-[17px] font-bold text-inkoust">{z.zeme}</span>
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="cislice text-[32px] font-bold leading-none text-inkoust">{z.pripady}</span>
                  <span className="text-[13px] text-tlum">{z.pripady === 1 ? "případ" : z.pripady < 5 ? "případy" : "případů"}</span>
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]">
                  {z.nejvyssi && t ? (
                    <>
                      <span aria-hidden className={`h-[8px] w-[8px] rounded-full ${t.tecka}`} />
                      <span className={`font-semibold ${t.text}`}>{UROVNE[z.nejvyssi].nazev} {zDeseti(z.nejvyssi)}/10</span>
                    </>
                  ) : (
                    <span className="text-tlum2">bez záznamu</span>
                  )}
                  {z.posledni && <><span aria-hidden className="text-tlum2">·</span><span className="text-tlum2">naposledy {datumPraha(z.posledni)}</span></>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-[13px] leading-relaxed text-tlum2">
        Počítají se jen případy, tedy skutečné události. Pokračování případu, úřední opatření ani prohlášení
        číslo nezvyšují. Země bez záznamu neznamená klid — znamená, že jsme odtud nic nedoložili.
      </p>
    </div>
  );
}
