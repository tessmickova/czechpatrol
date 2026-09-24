import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { Otaznik } from "@/components/zaklad";
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
    <div className="mx-auto max-w-[860px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="Podpora"
        nadpis="Web zdarma. Provoz ne."
        uvod="Události, opatření i zdroje jsou a zůstanou zdarma. Podpora je dobrovolná a jde na provoz."
      />

      <section className="nalet mt-16 border-t border-linka pt-12 sm:mt-20">
        <h2 className="titul-mensi">Co provoz stojí{"\u00A0"}<Otaznik popis={<span className="block">Tabulka zatím zachycuje jen služby s veřejným ceníkem. Práce lidí a zpracování zpráv modelem v ní nejsou.</span>} /></h2>
        <p className="mt-1 text-male text-tlum">Odhad podle ceníků služeb k {naklady.aktualizovano}. Skutečné faktury se doplní, až budou.</p>
        <p className="mt-2 rounded-[14px] border border-dashed border-jantar/55 bg-jantar/[0.06] px-4 py-3 text-male leading-relaxed text-tlum">
          <b className="font-semibold text-inkoust">Částka je podhodnocená.</b> Nezahrnuje zpracování zpráv AI modelem (třídění, souhrny, překlady každou hodinu), placené minuty GitHubu ani práci dvou lidí, kteří web spravují. Skutečné měsíční náklady jsou výrazně vyšší; doplníme je, jakmile budou z faktur.
        </p>
        <table className="mt-3 w-full text-left text-zaklad">
          <tbody>
            {polozky.map((x) => (
              <tr key={x.nazev} className="border-b border-linka2">
                <td className="py-2 pr-3"><span className="font-semibold text-inkoust">{x.nazev}</span><span className="block text-drobne text-tlum2">{x.poznamka}</span></td>
                <td className="cislice py-2 text-right text-inkoust">{x.mesicneKc} Kč</td>
              </tr>
            ))}
            <tr><td className="py-2 font-semibold text-inkoust">Měsíčně celkem</td><td className="cislice py-2 text-right font-bold text-inkoust">{celkem} Kč</td></tr>
          </tbody>
        </table>
      </section>

      <section className="nalet mt-14 border-t border-linka pt-10">
        <h2 className="titul-mensi">Jak podpořit</h2>
        {BUY_ME_A_COFFEE_URL ? (
          <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="nofollow noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center rounded-[18px] border border-akcent/60 bg-akcent/15 px-5 text-zaklad font-bold text-akcent-svetla hover:bg-akcent/25">
            Jednorázově přispět
          </a>
        ) : (
          <p className="mt-2 text-zaklad leading-relaxed text-tlum">
            Platba zatím není nastavená, proto tu chybí tlačítko. Nejvíc teď pomůže hlášení chyb a chybějících událostí.
          </p>
        )}
      </section>

      <section className="nalet mt-14 border-t border-linka pt-10">
        <h2 className="titul-mensi">Co uvažujeme do budoucna</h2>
        <p className="mt-1 text-male text-tlum">Záměr, ne nabídka. Nic z toho se teď nedá koupit.</p>
        <ul className="mt-3 space-y-2 text-zaklad leading-relaxed text-tlum">
          <li><b className="font-semibold text-inkoust">Plus</b> — pohodlí navíc: upozornění na míru, export, archiv. Pracovní hypotéza ceny {naklady.plus.mesicneKc} Kč měsíčně nebo {naklady.plus.rocneKc} Kč ročně; ověří se až s prvními zájemci. Bezpečnostní informace tam nikdy nebudou zamčené.</li>
          <li><b className="font-semibold text-inkoust">Pilot pro organizace</b> — obce, školy, firmy: společný přehled a kontakt na správce. Až po ověření zájmu.</li>
        </ul>
      </section>

      <p className="mt-8 text-male text-tlum">Proč to takhle: <Link href="/o-projektu/" className="odkaz">O projektu</Link>.</p>
    </div>
  );
}
