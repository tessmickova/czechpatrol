import { datumCas } from "@/lib/format";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, HybridniTlak, NatoPolozka, PravniStav } from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { PlacenaVrstva } from "./placena-vrstva";
import { Napoveda, VykladUrovne } from "./zaklad";

const TRENDY = {
  nahoru: { ikona: "nahoru" as NazevIkony, text: "zhoršení / 7 dní", tridy: "text-[#ffa877]" },
  dolu: { ikona: "dolu" as NazevIkony, text: "uklidnění / 7 dní", tridy: "text-[#8ff0c0]" },
  "beze-zmeny": { ikona: "fajfka" as NazevIkony, text: "beze změny / 7 dní", tridy: "text-noc-tlum" },
} as const;

interface Kontrolka {
  klic: string;
  stitek: string;
  hodnota: string;
  ikona: NazevIkony;
  ton: "klid" | "pozor" | "poplach" | "neznamo";
  napoveda: React.ReactNode;
}

const TON = {
  klid: "bg-[#4fdd9a] shadow-[0_0_8px_rgb(79_221_154/0.8)]",
  pozor: "bg-[#ffd166] shadow-[0_0_8px_rgb(255_209_102/0.8)]",
  poplach: "bg-[#ff5c6c] shadow-[0_0_8px_rgb(255_92_108/0.8)]",
  neznamo: "bg-white/20",
};

function kontrolky(
  pravni: PravniStav,
  nato: { polozky: NatoPolozka[] },
  hybridni: HybridniTlak,
): Kontrolka[] {
  const pr = (k: string) => pravni.polozky.find((x) => x.klic === k);
  const na = (k: string) => nato.polozky.find((x) => x.klic === k);
  const primy = hybridni.podkategorie.find((x) => x.klic === "primy");
  const ton = (p: boolean | null | undefined): Kontrolka["ton"] =>
    p == null ? "neznamo" : p ? "poplach" : "klid";

  const cl4 = na("clanek-4");
  const cl5 = na("clanek-5");
  const clNeznamo = cl4?.aktivni == null || cl5?.aktivni == null;
  const clAktivni = Boolean(cl4?.aktivni || cl5?.aktivni);

  return [
    {
      klic: "vycestovani", stitek: "Vycestování", ikona: "pas", ton: ton(pr("vycestovani")?.plati),
      hodnota: pr("vycestovani")?.plati == null ? "neověřeno" : pr("vycestovani")!.plati ? "omezeno" : "bez omezení",
      napoveda: <span className="block">{pr("vycestovani")?.vysvetleni}</span>,
    },
    {
      klic: "mobilizace", stitek: "Mobilizace", ikona: "vlajka", ton: ton(pr("mobilizace")?.plati),
      hodnota: pr("mobilizace")?.plati == null ? "neověřeno" : pr("mobilizace")!.plati ? "vyhlášena" : "nevyhlášena",
      napoveda: <span className="block">{pr("mobilizace")?.vysvetleni}</span>,
    },
    {
      klic: "nato", stitek: "NATO čl. 4 / 5", ikona: "stit",
      ton: clNeznamo ? "neznamo" : clAktivni ? "poplach" : "klid",
      hodnota: clNeznamo ? "neověřeno" : clAktivni ? "aktivován" : "neaktivován",
      napoveda: <span className="block">{cl4?.vysvetleni}</span>,
    },
    {
      klic: "hranice", stitek: "Hranice", ikona: "hranice", ton: ton(pr("hranice")?.plati),
      hodnota: pr("hranice")?.plati == null ? "neověřeno" : pr("hranice")!.plati ? "omezeny" : "běžný režim",
      napoveda: <span className="block">{pr("hranice")?.vysvetleni}</span>,
    },
    {
      klic: "primy", stitek: "Přímý střet", ikona: "terc",
      ton: !primy?.uroven ? "neznamo"
        : UROVNE[primy.uroven].pasmo === "zelena" ? "klid"
        : UROVNE[primy.uroven].pasmo === "cervena" ? "poplach" : "pozor",
      hodnota: primy?.uroven ? UROVNE[primy.uroven].nazev.toLowerCase() : "nevyhodnoceno",
      napoveda: <span className="block">{primy?.poznamka}</span>,
    },
  ];
}

function KontrolkaPolozka({ k }: { k: Kontrolka }) {
  return (
    <Napoveda popis={k.napoveda} label={`${k.stitek} — co to znamená?`}>
      <span className="block">
        <span className="mb-2 flex items-center gap-1.5 text-noc-tlum">
          <Ikona nazev={k.ikona} velikost={13} />
          <span className="stitek !text-[10px] !text-noc-tlum">{k.stitek}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className={`h-[6px] w-[6px] shrink-0 rounded-[2px] ${TON[k.ton]}`} />
          <span className="min-w-0 break-words text-[13.5px] font-bold uppercase leading-tight tracking-[0.02em] text-noc-text">
            {k.hodnota}
          </span>
        </span>
      </span>
    </Napoveda>
  );
}

/**
 * Příkazový pruh.
 *
 * Nahoře nestojí slogan, ale stav: úroveň, trend, čas ověření a pět kontrolek.
 * Kdo web zná, přečte to za dvě vteřiny; kdo ho vidí poprvé, má u každé
 * položky vysvětlivku.
 */
export function SituacniPanel({
  stav, pravni, nato, hybridni, dnyBezZmeny = null, overeno = null,
}: {
  stav: CelkovyStav;
  pravni: PravniStav;
  nato: { polozky: NatoPolozka[] };
  hybridni: HybridniTlak;
  dnyBezZmeny?: { dnu: number; odZacatkuArchivu: boolean } | null;
  overeno?: string | null;
}) {
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const t = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  const trend = stav.trend ? TRENDY[stav.trend] : null;
  const s = stav.noveSignaly;

  return (
    <section className="noc relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div data-vrstva="0.05" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[45%]" />
        <div data-vrstva="0.12" className="vrstva vzor-zare absolute inset-x-0 -inset-y-[60%]" />
      </div>

      <div className="mx-auto max-w-[1320px] px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="sklo sklo-akcent sken relative grid gap-6 overflow-hidden rounded-[22px] px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,auto)_minmax(0,1fr)] lg:items-center lg:gap-10">
          {/* úroveň */}
          <div className="flex items-center gap-5">
            <Napoveda
              popis={
                stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">Hodnocení zatím nebylo stanoveno.</span>
              }
            >
              <span className="block">
                <ObloukovyMerak uroven={stav.uroven} naNoci velikost={184} skrytPopisek />
              </span>
            </Napoveda>

            <div className="min-w-0">
              <div className="stitek mb-2 !text-noc-tlum">Celková úroveň</div>
              <p className={`nadpis svit-silny text-[36px] sm:text-[44px] ${t ? t.textNoc : "text-noc-tlum"}`}>
                {d ? d.nazev : "Nestanoveno"}
              </p>
              {trend && (
                <p className={`mt-2.5 flex items-center gap-1.5 text-[15px] font-semibold ${trend.tridy}`}>
                  <Ikona nazev={trend.ikona} velikost={15} tah={1.8} />
                  {trend.text}
                </p>
              )}
              <p className="stitek mt-3 !text-noc-tlum">
                {overeno ? `ověřeno ${datumCas(overeno)}` : "sběr zatím neproběhl"}
              </p>
            </div>
          </div>

          {/* kontrolky a čísla */}
          <div className="grid gap-4">
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {kontrolky(pravni, nato, hybridni).map((k) => (
                <li key={k.klic} className={k.klic === "hranice" ? "" : "sklo-noc-slabe rounded-[14px] px-3.5 py-3.5"}>
                  {k.klic === "hranice" ? (
                    <PlacenaVrstva co="Hranice" kompaktni>
                      <span className="sklo-noc-slabe block rounded-[14px] px-3.5 py-3.5">
                        <KontrolkaPolozka k={k} />
                      </span>
                    </PlacenaVrstva>
                  ) : (
                    <KontrolkaPolozka k={k} />
                  )}
                </li>
              ))}
            </ul>

            <div className="sklo-noc-slabe flex flex-wrap items-center gap-x-7 gap-y-3 rounded-[14px] px-4 py-3">
              {[
                { s: "Nové signály", h: s.celkem },
                { s: "Vysoké", h: s.vysoke },
                { s: "Kritické", h: s.kriticke },
              ].map((x) => (
                <span key={x.s} className="flex items-baseline gap-2">
                  <span className="velke-cislo svit text-[30px] text-akcent-svetla">{x.h}</span>
                  <span className="stitek !text-noc-tlum">{x.s}</span>
                </span>
              ))}
              {dnyBezZmeny && (
                <span className="stitek-tmavy ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#4fdd9a]/35 bg-[#4fdd9a]/10 px-2.5 py-1.5 text-[#8ff0c0]">
                  <Ikona nazev="hodiny" velikost={11} tah={1.7} />
                  {dnyBezZmeny.odZacatkuArchivu
                    ? "za celý archiv beze změny"
                    : `právní stav beze změny ${dnyBezZmeny.dnu} dní`}
                </span>
              )}
            </div>

            {stav.shrnuti && (
              <p className="max-w-[72ch] text-[15.5px] leading-relaxed text-noc-tlum">{stav.shrnuti}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
