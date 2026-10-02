import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { LetakNalez, LetakSireny, LetakVystraha } from "@/components/letaky";
import { KvizZaklady } from "@/components/kviz-zaklady";
import { TiskTlacitko } from "@/components/tisk-tlacitko";
import { PRIRUCKY } from "@/lib/letaky";

export const metadata: Metadata = {
  title: "Letáky: co dělat",
  description: "Tóny sirén, co dělat při všeobecné výstraze a při nálezu munice nebo trosek dronu — podle HZS ČR a Policie ČR. K tisku i stažení, s oficiálními příručkami.",
};

export default function Letaky() {
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
      <div className="neni-tisk">
        <HlavickaStranky
          stitek="Letáky k tisku"
          nadpis="Co dělat, když zazní siréna"
          uvod="Tři letáky podle Hasičského záchranného sboru a Policie ČR. Vytiskněte si je na lednici, pro rodiče nebo do školy. Každý se vytiskne na vlastní stránku."
        />
        <div className="mt-8 flex flex-wrap gap-3"><TiskTlacitko /></div>
      </div>
      <div className="mt-10 space-y-8">
        <LetakSireny />
        <LetakVystraha />
        <LetakNalez />
      </div>
      <div className="neni-tisk mt-12 space-y-10">
        <section>
          <h2 className="nadpis-boxu mb-3">Vím to?</h2>
          <KvizZaklady />
        </section>
        <section>
          <h2 className="nadpis-boxu mb-3">Oficiální příručky ke stažení</h2>
          <ul className="divide-y divide-linka2 rounded-[18px] border border-linka">
            {PRIRUCKY.map((p) => (
              <li key={p.url} className="px-4 py-3">
                <a href={p.url} target="_blank" rel="nofollow noopener noreferrer" className="text-zaklad font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-inkoust">{p.nazev} ↗</a>
                <span className="block text-male text-tlum">{p.kdo} · {p.jazyk}{p.poznamka ? ` · ${p.poznamka}` : ""}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-male leading-relaxed text-tlum">Po sítích kolují i neoficiální české překlady polské a švédské příručky. Odkazujeme jen na originály od vydavatelů — u překladů na cizích discích nevíme, kdo a jak je upravil, a pokyny jiné země se u nás nemusí hodit.</p>
        </section>
      </div>
    </div>
  );
}
