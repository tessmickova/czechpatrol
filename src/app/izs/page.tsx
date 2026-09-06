import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Ikona, type NazevIkony } from "@/components/ikony";
import { IzsKlient } from "@/components/izs-klient";
import { Karta } from "@/components/zaklad";
import { IZS_KONTAKT } from "@/config/web";

export const metadata: Metadata = {
  title: "Partner IZS",
  description: "Ověřené záchranné složky mohou přes CzechPatrol poslat čtenářům zprávu. Jak to funguje a jaká má pravidla.",
};

const KROKY: { ikona: NazevIkony; nadpis: string; popis: string }[] = [
  { ikona: "zamek", nadpis: "Ověření složky", popis: "Roli partnera přiděluje správce až po ověření, že za účtem stojí skutečná složka IZS. Sama se zapnout nedá." },
  { ikona: "dokument", nadpis: "Návrh zprávy", popis: "Partner napíše věcnou zprávu: co, kde, co mají lidé udělat, odkaz na úřední zdroj. Vybere kraj nebo celou ČR." },
  { ikona: "oko", nadpis: "Schválení", popis: "Správce zprávu přečte a schválí nebo vrátí s poznámkou. Nic neodchází bez lidského rozhodnutí." },
  { ikona: "odeslat", nadpis: "Doručení", popis: "Zpráva odejde čtenářům v dané oblasti, kteří mají zprávy partnerů zapnuté. Vždy s označením „zpráva partnera IZS“." },
];

export default function IzsStranka() {
  return (
    <>
      <HlavickaStranky
        stitek="Partner IZS"
        ikona="sirena"
        nadpis="Zprávy záchranných složek přímo čtenářům"
        popis="CzechPatrol umí doručit zprávu ověřené složky integrovaného záchranného systému lidem, kteří o ni stojí. Není to náhrada úředního varování — je to jeden kanál navíc."
      />
      <Obsah>
        <div className="mb-10">
          <IzsKlient />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KROKY.map((k, i) => (
            <Karta key={k.nadpis} odstin="modra" className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-[18px] border border-akcent/40 bg-akcent/10 text-akcent">
                  <Ikona nazev={k.ikona} velikost={18} />
                </span>
                <span className="cislice stitek">0{i + 1}</span>
              </div>
              <h2 className="text-[17px] font-bold uppercase tracking-[0.02em]">{k.nadpis}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-tlum">{k.popis}</p>
            </Karta>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Karta odstin="pisek" className="p-6">
            <div className="stitek mb-2 !text-jantar">Co to není</div>
            <h2 className="podnadpis text-[20px]">Ne úřední varování</h2>
            <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-tlum">
              <li>Oficiální varování obyvatel běží přes jednotný systém varování a vyrozumění (sirény, státní SMS, veřejnoprávní média). CzechPatrol ho nenahrazuje a nikdy se za něj nevydává.</li>
              <li>Zpráva partnera nese jméno složky a označení „zpráva partnera IZS“. Neobsahuje hodnocení situace ani rady typu „odjet / neodjet“.</li>
              <li>Šíření poplašné zprávy je trestný čin. Proto každou zprávu před odesláním čte člověk.</li>
            </ul>
          </Karta>
          <Karta className="p-6">
            <div className="stitek mb-2">Pro složky</div>
            <h2 className="podnadpis text-[20px]">Jak získat roli partnera</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-tlum">
              Založte si anonymní účet a napište nám z úřední adresy vaší složky. Ověříme, že
              adresa patří složce, a roli přidělíme k účtu, jehož identifikátor nám pošlete.
            </p>
            {IZS_KONTAKT ? (
              <a href={`mailto:${IZS_KONTAKT}`} className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-akcent hover:text-akcent-svetla">
                <Ikona nazev="odeslat" velikost={15} tah={1.9} /> {IZS_KONTAKT}
              </a>
            ) : (
              <p className="mt-4 text-[14px] text-tlum2">Kontakt pro ověření zveřejníme se spuštěním účtů.</p>
            )}
            <p className="mt-4 text-[14px] text-tlum">
              <Link href="/ucet/" className="odkaz text-inkoust">Založit účet</Link>
            </p>
          </Karta>
        </div>
      </Obsah>
    </>
  );
}
