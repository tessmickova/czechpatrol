import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import Link from "next/link";
import { BUY_ME_A_COFFEE_URL, KOMUNITA } from "@/config/web";

export const metadata: Metadata = {
  title: "Podpořit",
  description: "Základní informace jsou zdarma. Provoz jde podpořit dobrovolně.",
};

/*
  Podpora projektu. Žádná falešná pokladna: dokud není nastavená adresa
  pro platbu, stránka to řekne. Náklady ani plány placených vrstev se
  nezveřejňují (rozhodnutí 24. 9. 2026); podklady jsou v docs/naklady.json.
*/
export default function Podporit() {
  return (
    <div className="mx-auto max-w-[860px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="Podpora"
        nadpis="Web zdarma. Provoz ne."
        uvod="Události, opatření i zdroje jsou a zůstanou zdarma. Podpora je dobrovolná a jde na provoz."
      />

      <section className="nalet mt-14">
        <h2 className="titul-mensi">Jak podpořit</h2>
        {BUY_ME_A_COFFEE_URL ? (
          <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="nofollow noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center rounded-[18px] border border-akcent/60 bg-akcent/15 px-5 text-zaklad font-bold text-akcent-svetla hover:bg-akcent/25">
            Jednorázově přispět
          </a>
        ) : (
          <p className="mt-2 text-zaklad leading-relaxed text-tlum">
            Možnost přispět připravujeme. Nejvíc teď pomůže hlášení chyb a chybějících událostí.
          </p>
        )}
      </section>

      <p className="mt-8 text-male text-tlum">Proč to takhle: <Link href="/o-projektu/" className="odkaz">O projektu</Link>.</p>
    </div>
  );
}
