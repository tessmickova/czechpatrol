import type { Metadata } from "next";
import Link from "next/link";
import { BUY_ME_A_COFFEE_URL, KOMUNITA } from "@/config/web";
import naklady from "../../../docs/naklady.json";

export const metadata: Metadata = {
  title: "Podpořit",
  description: "Základní informace jsou zdarma. Provoz jde podpořit dobrovolně; tady je rozepsané, co stojí.",
};

/*
  Podpora projektu. Žádná falešná pokladna: dokud není nastavená adresa
  pro platbu, stránka to řekne. Placená vrstva „Plus“ je jen popsaný záměr
  a je tak i označená — nedá se koupit.
*/
export default function Podporit() {
  const polozky = naklady.polozky as { nazev: string; mesicneKc: number; poznamka: string }[];
  const celkem = polozky.reduce((s, x) => s + x.mesicneKc, 0);
  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Podpořit projekt</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-tlum">
        Všechno, co se týká bezpečí — události, opatření, zdroje — je a zůstane zdarma. Podpora je dobrovolná a platí se z ní provoz, ne inzerce.
      </p>

      <section className="mt-8 border-t border-linka pt-6">
        <h2 className="text-[18px] font-bold">Co provoz stojí</h2>
        <p className="mt-1 text-[13.5px] text-tlum">Odhad podle ceníků služeb k {naklady.aktualizovano}. Skutečné faktury se doplní, až budou.</p>
        <table className="mt-3 w-full text-left text-[14px]">
          <tbody>
            {polozky.map((x) => (
              <tr key={x.nazev} className="border-b border-linka2">
                <td className="py-2 pr-3"><span className="font-semibold text-inkoust">{x.nazev}</span><span className="block text-[12.5px] text-tlum2">{x.poznamka}</span></td>
                <td className="cislice py-2 text-right text-inkoust">{x.mesicneKc} Kč</td>
              </tr>
            ))}
            <tr><td className="py-2 font-semibold text-inkoust">Měsíčně celkem</td><td className="cislice py-2 text-right font-bold text-inkoust">{celkem} Kč</td></tr>
          </tbody>
        </table>
        <p className="mt-2 text-[12.5px] text-tlum2">Lidská práce (ověřování, hodnocení, opravy) v tabulce není — dělá se zdarma. Vstupy jsou v souboru docs/naklady.json.</p>
      </section>

      <section className="mt-8 border-t border-linka pt-6">
        <h2 className="text-[18px] font-bold">Jak podpořit</h2>
        {BUY_ME_A_COFFEE_URL ? (
          <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center rounded-[16px] border border-akcent/60 bg-akcent/15 px-5 text-[14px] font-bold text-akcent-svetla hover:bg-akcent/25">
            Jednorázově přispět
          </a>
        ) : (
          <p className="mt-2 text-[15px] leading-relaxed text-tlum">
            Platební adresa zatím není nastavená, takže tu není žádné tlačítko. Až bude, objeví se tady. Do té doby pomůže nejvíc
            {" "}<a href={KOMUNITA.diskuse} target="_blank" rel="noopener noreferrer" className="odkaz">hlášení chyb a chybějících událostí</a>.
          </p>
        )}
      </section>

      <section className="mt-8 border-t border-linka pt-6">
        <h2 className="text-[18px] font-bold">Co uvažujeme do budoucna</h2>
        <p className="mt-1 text-[13.5px] text-tlum">Záměr, ne nabídka. Nic z toho se teď nedá koupit.</p>
        <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-tlum">
          <li><b className="font-semibold text-inkoust">Plus</b> — pohodlí navíc: upozornění na míru, export, archiv. Pracovní hypotéza ceny {naklady.plus.mesicneKc} Kč měsíčně nebo {naklady.plus.rocneKc} Kč ročně; ověří se až s prvními zájemci. Bezpečnostní informace tam nikdy nebudou zamčené.</li>
          <li><b className="font-semibold text-inkoust">Pilot pro organizace</b> — obce, školy, firmy: společný přehled a kontakt na správce. Až po ověření zájmu.</li>
        </ul>
      </section>

      <p className="mt-8 text-[13.5px] text-tlum">Proč to takhle: <Link href="/o-projektu/" className="odkaz">O projektu</Link>.</p>
    </div>
  );
}
