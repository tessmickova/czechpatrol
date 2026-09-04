import Link from "next/link";
import { datumCas } from "@/lib/format";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, HybridniTlak, NatoPolozka, PravniStav } from "@/lib/typy";
import { StavoveDlazdice, type Dlazdice, type Ton } from "./dlazdice";
import { Ikona, type NazevIkony } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Napoveda, VykladUrovne } from "./zaklad";

const TRENDY = {
  nahoru: { ikona: "nahoru" as NazevIkony, text: "zhoršení za 7 dní", tridy: "text-[#f4a67c]" },
  dolu: { ikona: "dolu" as NazevIkony, text: "uklidnění za 7 dní", tridy: "text-[#7fdcac]" },
  "beze-zmeny": { ikona: "fajfka" as NazevIkony, text: "beze změny za 7 dní", tridy: "text-noc-tlum" },
} as const;

function stavoveDlazdice(
  pravni: PravniStav,
  nato: { polozky: NatoPolozka[] },
  hybridni: HybridniTlak,
): Dlazdice[] {
  const pr = (k: string) => pravni.polozky.find((x) => x.klic === k);
  const na = (k: string) => nato.polozky.find((x) => x.klic === k);
  const primy = hybridni.podkategorie.find((x) => x.klic === "primy");

  const ton = (plati: boolean | null | undefined): Ton =>
    plati === null || plati === undefined ? "neznamo" : plati ? "poplach" : "klid";

  const cl4 = na("clanek-4");
  const cl5 = na("clanek-5");
  const clNeznamo = cl4?.aktivni == null || cl5?.aktivni == null;
  const clAktivni = Boolean(cl4?.aktivni || cl5?.aktivni);

  return [
    {
      klic: "vycestovani",
      stitek: "Vycestování z ČR",
      ikona: "pas",
      ton: ton(pr("vycestovani")?.plati),
      hodnota:
        pr("vycestovani")?.plati == null
          ? "Zatím neověřeno"
          : pr("vycestovani")!.plati
            ? "Omezeno"
            : "Bez omezení",
      napoveda: (
        <span className="block space-y-1.5">
          <span className="block">{pr("vycestovani")?.vysvetleni}</span>
          <span className="block opacity-80">Kontrola na hranici není zákaz vycestování.</span>
        </span>
      ),
    },
    {
      klic: "mobilizace",
      stitek: "Mobilizace",
      ikona: "vlajka",
      ton: ton(pr("mobilizace")?.plati),
      hodnota:
        pr("mobilizace")?.plati == null ? "Zatím neověřeno" : pr("mobilizace")!.plati ? "Vyhlášena" : "Nevyhlášena",
      napoveda: <span className="block">{pr("mobilizace")?.vysvetleni}</span>,
    },
    {
      klic: "nato",
      stitek: "NATO čl. 4 / 5",
      ikona: "stit",
      ton: clNeznamo ? "neznamo" : clAktivni ? "poplach" : "klid",
      hodnota: clNeznamo
        ? "Zatím neověřeno"
        : clAktivni
          ? [cl4?.aktivni && "čl. 4", cl5?.aktivni && "čl. 5"].filter(Boolean).join(" + ") + " aktivován"
          : "Neaktivován",
      napoveda: (
        <span className="block space-y-1.5">
          <span className="block">{cl4?.vysvetleni}</span>
          <span className="block opacity-80">{cl5?.vysvetleni}</span>
        </span>
      ),
    },
    {
      klic: "primy",
      stitek: "Přímý střet NATO–Rusko",
      ikona: "terc",
      ton: !primy?.uroven
        ? "neznamo"
        : UROVNE[primy.uroven].pasmo === "zelena"
          ? "klid"
          : UROVNE[primy.uroven].pasmo === "cervena"
            ? "poplach"
            : "pozor",
      hodnota: primy?.uroven ? UROVNE[primy.uroven].nazev : "Zatím nevyhodnoceno",
      napoveda: (
        <span className="block space-y-1.5">
          <span className="block">{primy?.poznamka}</span>
          <span className="block opacity-80">
            Hybridní tlak a přímé vojenské riziko jsou dvě různé věci.
          </span>
        </span>
      ),
    },
  ];
}

/**
 * Stav před prvním během sběru. Čtyři prázdné dlaždice by vypadaly jako
 * rozbitá stránka; tohle říká rovnou, na čem to je.
 */
function PrvniSber() {
  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-[#cddcf7] bg-mycka p-6 sm:flex-row sm:items-center sm:p-7">
      <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[16px] border border-white/70 bg-white/70">
        <Ikona nazev="radar" velikost={22} />
      </span>
      <div className="flex-1">
        <p className="text-[18px] font-semibold tracking-[-0.025em]">Sběr zatím neproběhl</p>
        <p className="mt-1.5 max-w-[46rem] text-[14px] leading-relaxed text-tlum">
          Stav mobilizace, vycestování, hranic i článků NATO se ověřuje proti úředním
          registrům. Dokud první běh neproběhne, web žádnou hodnotu netvrdí.
        </p>
      </div>
      <Link
        href="/metodika/"
        className="shrink-0 rounded-full border border-white/80 bg-white/70 px-4 py-2.5 text-[13px] font-medium transition-colors hover:border-inkoust/30"
      >
        Jak to ověřujeme
      </Link>
    </div>
  );
}

export function SituacniPanel({
  stav, pravni, nato, hybridni, dnyBezZmeny = null, overeno = null,
}: {
  stav: CelkovyStav;
  pravni: PravniStav;
  nato: { polozky: NatoPolozka[] };
  hybridni: HybridniTlak;
  dnyBezZmeny?: { dnu: number; odZacatkuArchivu: boolean } | null;
  /** Čas posledního ověření proti zdrojům. */
  overeno?: string | null;
}) {
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const t = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  const trend = stav.trend ? TRENDY[stav.trend] : null;
  const dlazdice = stavoveDlazdice(pravni, nato, hybridni);

  return (
    <>
      <section className="noc relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div data-vrstva="0.06" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[25%]" />
          <div data-vrstva="0.16" className="vrstva vzor-zare absolute inset-x-0 -inset-y-[35%]" />
        </div>

        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-2">
              <span aria-hidden className="relative flex h-[7px] w-[7px]">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4fbe86] opacity-60" />
                <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[#4fbe86]" />
              </span>
              <span className="stitek !text-noc-tlum">
                {overeno ? `ověřeno ${datumCas(overeno)}` : "sběr zatím neproběhl"}
              </span>
            </span>
            {dnyBezZmeny && (
              <Napoveda
                popis={
                  <span className="block">
                    {dnyBezZmeny.odZacatkuArchivu
                      ? "Archiv za celou dobu běhu nezachytil změnu právního stavu ČR ani stavu NATO."
                      : "Tolik dní od poslední změny právního stavu ČR nebo stavu NATO."}
                  </span>
                }
              >
                <span className="stitek-tmavy inline-flex items-center gap-1.5 rounded-full border border-[#2a5f47] bg-[#0e2a20] px-2.5 py-1 text-[#7fdcac]">
                  <Ikona nazev="hodiny" velikost={11} tah={1.7} />
                  {dnyBezZmeny.odZacatkuArchivu
                    ? "za celý archiv beze změny"
                    : `beze změny ${dnyBezZmeny.dnu} dní`}
                </span>
              </Napoveda>
            )}
          </div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16">
            <div>
              <h1 className="nadpis text-[52px] text-noc-text sm:text-[74px] lg:text-[86px]">
                Co se děje.
                <br />
                A co ne.
              </h1>
              <p className="mt-7 max-w-[30rem] text-[17px] leading-relaxed text-noc-tlum sm:text-[19px]">
                Bezpečnostní situace Česka a Evropy. Ověřené události, jasné zdroje,
                žádné strašení.
              </p>
            </div>

            <div className="sklo-noc rounded-[22px] p-6 sm:p-8">
              <div className="stitek mb-3 !text-noc-tlum">Celková úroveň</div>
              <div className="flex justify-center">
                {stav.uroven ? (
                  <Napoveda popis={<VykladUrovne uroven={stav.uroven} />}>
                    <ObloukovyMerak uroven={stav.uroven} naNoci velikost={280} />
                  </Napoveda>
                ) : (
                  <ObloukovyMerak uroven={null} naNoci velikost={280} />
                )}
              </div>
              {trend ? (
                <p className={`mt-5 flex items-center justify-center gap-2 text-[13.5px] font-medium ${trend.tridy}`}>
                  <Ikona nazev={trend.ikona} velikost={15} tah={1.7} />
                  {trend.text}
                </p>
              ) : (
                <p className="mt-5 text-center text-[13px] text-noc-tlum">
                  Trend naskočí po prvním úplném týdnu měření.
                </p>
              )}
              {(stav.shrnuti || !d) && (
                <p className="mt-6 border-t border-white/10 pt-5 text-[13.5px] leading-relaxed text-noc-tlum">
                  {stav.shrnuti || "Hodnocení zatím nebylo stanoveno."}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-linka bg-papir">
        <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-10">
          {dlazdice.every((d) => d.ton === "neznamo") ? <PrvniSber /> : <StavoveDlazdice dlazdice={dlazdice} />}
        </div>
      </section>
    </>
  );
}
