import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Ikona } from "@/components/ikony";
import { SeznamZdroju } from "@/components/zdroje";
import { Karta, Prazdno } from "@/components/zaklad";
import { nepotvrzene } from "@/lib/data";
import { datum } from "@/lib/format";

export const metadata: Metadata = {
  title: "Nepotvrzeno",
  description: "Záznamy, které se při ověřování nepotvrdily nebo byly vyvráceny. Do hodnocení nevstupují.",
};

const STAVY = {
  vyvraceno: { nazev: "Vyvráceno", tridy: "border-[#2a5f47] bg-list", odznak: "border-[#2a5f47] bg-list2 text-[#7fdcac]" },
  nepotvrzeno: { nazev: "Nepotvrzeno", tridy: "border-[#5e5124] bg-pisek", odznak: "border-[#5e5124] bg-pisek2 text-[#f0d47e]" },
} as const;

export default function Nepotvrzeno() {
  const zaznamy = nepotvrzene();

  return (
    <>
      <HlavickaStranky
        ikona="oko"
        stitek="Nepotvrzeno"
        nadpis="Co jsme prověřili a nepotvrdilo se"
        popis="Tyhle záznamy nevstupují do žádného počtu ani do hodnocení. Vedeme je, aby bylo vidět i to, co neprošlo."
      />
      <Obsah>
        {zaznamy.length ? (
          <ul className="space-y-4">
            {zaznamy.map((z) => {
              const s = STAVY[z.stav];
              return (
                <li key={z.id}>
                  <Karta className={`overflow-hidden ${s.tridy}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-current/10 px-5 py-2.5">
                      <span className="stitek-tmavy rounded-[6px] border border-current/25 px-1.5 py-1 opacity-80">
                        {z.kodZeme}
                      </span>
                      <span className="stitek">{z.zeme}</span>
                      <span aria-hidden className="h-3 w-px bg-current/15" />
                      <span className="cislice stitek">{datum(z.datum)}</span>
                      <span className={`stitek-tmavy ml-auto rounded-full border px-2.5 py-1 ${s.odznak}`}>
                        {s.nazev}
                      </span>
                    </div>

                    <div className="space-y-5 p-5 sm:p-6">
                      <h2 className="podnadpis text-[18px]">{z.nazev}</h2>

                      <div>
                        <div className="stitek mb-2">Jak to původně vypadalo</div>
                        <p className="text-[14px] leading-relaxed text-tlum">{z.puvodne}</p>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[#7fdcac]">
                            <Ikona nazev="fajfka" velikost={14} tah={1.9} />
                          </span>
                          <span className="stitek">Co ukázalo ověření</span>
                        </div>
                        <p className="text-[14px] leading-relaxed">{z.overeni}</p>
                      </div>

                      {z.zdroje.length > 0 && (
                        <div className="border-t border-current/10 pt-4">
                          <div className="stitek mb-3">Zdroje</div>
                          <SeznamZdroju zdroje={z.zdroje} husty />
                        </div>
                      )}
                    </div>
                  </Karta>
                </li>
              );
            })}
          </ul>
        ) : (
          <Prazdno
            nadpis="Zatím tu nic není"
            popis="Sem se zapisují záznamy, které se při ověřování nepotvrdily."
          />
        )}
      </Obsah>
    </>
  );
}
