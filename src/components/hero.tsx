import type { ReactNode } from "react";
import { WEB } from "@/config/web";
import { datumCas } from "@/lib/format";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, HybridniTlak, NatoPolozka, PravniStav, Uroven } from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Napoveda, VykladUrovne } from "./zaklad";

const TRENDY = {
  nahoru: { ikona: "nahoru" as NazevIkony, nazev: "zhoršení", tridy: "text-[#f4a67c]" },
  dolu: { ikona: "dolu" as NazevIkony, nazev: "uklidnění", tridy: "text-[#7fdcac]" },
  "beze-zmeny": { ikona: "fajfka" as NazevIkony, nazev: "beze změny", tridy: "text-noc-tlum" },
} as const;

/* ---------------- horní pruh stavů ---------------- */

interface Bunka {
  klic: string;
  stitek: string;
  hodnota: string | null;
  uroven: Uroven | null;
  klidne?: boolean;
  ikona: NazevIkony;
  napoveda: ReactNode;
}

function Kontrolka({ b }: { b: Bunka }) {
  const neznamo = b.hodnota === null;
  const t = b.uroven ? PASMA[UROVNE[b.uroven].pasmo] : null;
  const barva = neznamo
    ? "bg-white/20"
    : b.klidne
      ? "bg-[#4fbe86]"
      : t
        ? t.teckaNoc
        : "bg-white/30";

  return (
    <div className="min-w-[10.5rem] shrink-0 sm:min-w-0 sm:flex-1">
      <Napoveda popis={b.napoveda} label={`${b.stitek} — co to znamená?`}>
        <span className="block px-4 py-3.5 sm:px-5">
          <span className="mb-2.5 flex items-center gap-1.5 text-noc-tlum">
            <Ikona nazev={b.ikona} velikost={13} tah={1.5} />
            <span className="stitek !text-noc-tlum">{b.stitek}</span>
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-[2px] ${barva}`} />
            <span
              className={`text-[13px] font-semibold leading-tight tracking-[-0.015em] ${
                neznamo ? "text-noc-tlum" : "text-noc-text"
              }`}
            >
              {b.hodnota ?? "neověřeno"}
            </span>
          </span>
        </span>
      </Napoveda>
    </div>
  );
}

function bunky(
  uroven: Uroven | null,
  pravni: PravniStav,
  nato: { polozky: NatoPolozka[] },
  hybridni: HybridniTlak,
): Bunka[] {
  const pr = (k: string) => pravni.polozky.find((x) => x.klic === k);
  const na = (k: string) => nato.polozky.find((x) => x.klic === k);
  const primy = hybridni.podkategorie.find((x) => x.klic === "primy");

  const vycestovani = pr("vycestovani");
  const mobilizace = pr("mobilizace");
  const hranice = pr("hranice");
  const cl4 = na("clanek-4");
  const cl5 = na("clanek-5");

  const clHodnota =
    cl4?.aktivni === null || cl5?.aktivni === null
      ? null
      : cl4?.aktivni || cl5?.aktivni
        ? [cl4?.aktivni && "čl. 4 aktivován", cl5?.aktivni && "čl. 5 aktivován"].filter(Boolean).join(" · ")
        : "neaktivován";

  return [
    {
      klic: "celkem",
      stitek: "Celková úroveň",
      ikona: "radar",
      hodnota: uroven ? UROVNE[uroven].nazev : null,
      uroven,
      napoveda: uroven ? (
        <VykladUrovne uroven={uroven} />
      ) : (
        <span className="block">
          Celkové hodnocení zatím nebylo stanoveno. Web nedopočítává úroveň z neúplných dat.
        </span>
      ),
    },
    {
      klic: "vycestovani",
      stitek: "Vycestování z ČR",
      ikona: "pas",
      hodnota: vycestovani?.plati === null ? null : vycestovani?.plati ? vycestovani.hodnota : "bez mimořádného omezení",
      uroven: null,
      klidne: vycestovani?.plati === false,
      napoveda: (
        <span className="block space-y-1.5">
          <span className="block">{vycestovani?.vysvetleni}</span>
          <span className="block opacity-80">
            Kontrola na hranici není zákaz vycestování. Obojí sledujeme odděleně.
          </span>
        </span>
      ),
    },
    {
      klic: "mobilizace",
      stitek: "Mobilizace ČR",
      ikona: "vlajka",
      hodnota: mobilizace?.plati === null ? null : mobilizace?.plati ? mobilizace.hodnota : "ne",
      uroven: null,
      klidne: mobilizace?.plati === false,
      napoveda: <span className="block">{mobilizace?.vysvetleni}</span>,
    },
    {
      klic: "nato",
      stitek: "NATO čl. 4 / 5",
      ikona: "stit",
      hodnota: clHodnota,
      uroven: null,
      klidne: clHodnota === "neaktivován",
      napoveda: (
        <span className="block space-y-1.5">
          <span className="block">{cl4?.vysvetleni}</span>
          <span className="block opacity-80">{cl5?.vysvetleni}</span>
        </span>
      ),
    },
    {
      klic: "hranice",
      stitek: "Hranice",
      ikona: "hranice",
      hodnota: hranice?.plati === null ? null : hranice?.plati ? hranice.hodnota : "běžný režim",
      uroven: null,
      klidne: hranice?.plati === false,
      napoveda: <span className="block">{hranice?.vysvetleni}</span>,
    },
    {
      klic: "primy",
      stitek: "Přímý střet",
      ikona: "terc",
      hodnota: primy?.uroven ? UROVNE[primy.uroven].nazev.toLowerCase() : null,
      uroven: primy?.uroven ?? null,
      napoveda: (
        <span className="block space-y-1.5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.09em] opacity-60">
            Přímý vojenský střet NATO–Rusko
          </span>
          <span className="block">{primy?.poznamka}</span>
          <span className="block opacity-80">
            Hybridní tlak a přímé vojenské riziko se nesmí směšovat. Vysoký hybridní tlak
            sám o sobě neznamená blížící se vojenský útok.
          </span>
        </span>
      ),
    },
  ];
}

/* ---------------- celý situační panel ---------------- */

export function SituacniPanel({
  stav, pravni, nato, hybridni, klidove = [],
}: {
  stav: CelkovyStav;
  pravni: PravniStav;
  nato: { polozky: NatoPolozka[] };
  hybridni: HybridniTlak;
  klidove?: string[];
}) {
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const t = stav.uroven ? PASMA[stav.uroven ? UROVNE[stav.uroven].pasmo : "zelena"] : null;
  const trend = stav.trend ? TRENDY[stav.trend] : null;

  return (
    <section className="noc relative overflow-hidden">
      {/* Parallaxové vrstvy. Posouvají se pomaleji než stránka — mřížka nejméně. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div data-vrstva="0.06" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[25%]" />
        <div data-vrstva="0.16" className="vrstva vzor-zare absolute inset-x-0 -inset-y-[35%]" />
      </div>

      {/* pruh stavů */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-[1180px] px-5 pt-4 sm:px-8">
          <div className="flex items-center gap-2">
            <span aria-hidden className="relative flex h-[6px] w-[6px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4fbe86] opacity-60" />
              <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-[#4fbe86]" />
            </span>
            <span className="stitek !text-noc-tlum">
              {stav.aktualizovano
                ? `Aktualizováno ${datumCas(stav.aktualizovano)}`
                : "Zatím bez automatické aktualizace"}
            </span>
          </div>
        </div>
        <div className="mx-auto max-w-[1180px] sm:px-8">
          <div className="pas-scroll flex overflow-x-auto sm:divide-x sm:divide-white/10">
            {bunky(stav.uroven, pravni, nato, hybridni).map((b) => (
              <Kontrolka key={b.klic} b={b} />
            ))}
          </div>
        </div>
      </div>

      {/* hero */}
      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
              <Ikona nazev="radar" velikost={13} tah={1.6} trida="text-akcent-svetla" />
              <span className="stitek !text-noc-tlum">{WEB.podtitul}</span>
            </div>

            <h1 className="nadpis max-w-[15ch] text-[42px] text-noc-text sm:text-[58px] lg:text-[66px]">
              Co se skutečně mění?
            </h1>

            <p className="mt-6 max-w-[34rem] text-[15.5px] leading-relaxed text-noc-tlum sm:text-[16.5px]">
              {WEB.popis}
            </p>

            {klidove.length > 0 && (
              <div className="mt-10">
                <div className="stitek mb-4 !text-noc-tlum">Co se zatím nestalo</div>
                <ul className="grid max-w-[38rem] gap-2.5 sm:grid-cols-2">
                  {klidove.map((k) => (
                    <li
                      key={k}
                      className="sklo-noc-slabe flex items-start gap-2.5 rounded-[14px] px-3 py-2.5 text-[12.5px] leading-snug text-noc-text"
                    >
                      <span className="mt-[1px] text-[#4fbe86]">
                        <Ikona nazev="stit-ok" velikost={15} tah={1.5} />
                      </span>
                      {k}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 max-w-[34rem] text-[11.5px] leading-relaxed text-noc-tlum/75">
                  Uvádíme jen body ověřené proti primárnímu zdroji. Neověřenou položku sem
                  nepíšeme — uklidňovat bez podkladu je stejná chyba jako strašit.
                </p>
              </div>
            )}
          </div>

          {/* měřák */}
          <div className="flex flex-col justify-center">
            <div className="sklo-noc rounded-[18px] p-6 sm:p-7">
              <div className="stitek mb-2 !text-noc-tlum">Celková úroveň</div>

              <div className="flex justify-center">
                {stav.uroven ? (
                  <Napoveda popis={<VykladUrovne uroven={stav.uroven} />}>
                    <ObloukovyMerak uroven={stav.uroven} naNoci velikost={260} />
                  </Napoveda>
                ) : (
                  <ObloukovyMerak uroven={null} naNoci velikost={260} />
                )}
              </div>

              {trend ? (
                <p className={`mt-4 flex items-center justify-center gap-2 text-[13px] font-medium ${trend.tridy}`}>
                  <Ikona nazev={trend.ikona} velikost={14} tah={1.7} />
                  Trend: {trend.nazev} během posledních 7 dní
                </p>
              ) : (
                <p className="mt-4 text-center text-[12.5px] text-noc-tlum">
                  Trend bude k dispozici po prvním úplném týdnu měření.
                </p>
              )}

              <p className="mt-5 border-t border-white/10 pt-5 text-[13px] leading-relaxed text-noc-tlum">
                {stav.shrnuti ||
                  "Hodnocení zatím nebylo stanoveno. Web nedopočítává úroveň z neúplných dat — dokud nejsou ověřená data, přizná to."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Souhrn „co se změnilo od poslední aktualizace“. */
export function CoSeZmenilo({ stav }: { stav: CelkovyStav }) {
  const s = stav.noveSignaly;
  const polozky = [
    { stitek: "Nových signálů", hodnota: s.celkem, ikona: "radar" as NazevIkony, zvyraznit: true },
    { stitek: "Vysokých", hodnota: s.vysoke, ikona: "vystraha" as NazevIkony },
    { stitek: "Středních", hodnota: s.stredni, ikona: "oko" as NazevIkony },
    { stitek: "Kritických", hodnota: s.kriticke, ikona: "terc" as NazevIkony },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {polozky.map((p) => (
        <div
          key={p.stitek}
          className={`rounded-[14px] border bg-plocha px-4 py-4 sm:px-5 ${
            p.zvyraznit ? "border-inkoust/15 shadow-[0_1px_0_rgb(11_21_36/0.04)]" : "border-linka"
          }`}
        >
          <div className="mb-3 flex items-center gap-1.5 text-tlum2">
            <Ikona nazev={p.ikona} velikost={13} tah={1.5} />
            <span className="stitek">{p.stitek}</span>
          </div>
          <div
            className={`cislice font-semibold tracking-[-0.035em] ${
              p.zvyraznit ? "text-[32px]" : "text-[25px]"
            } ${p.hodnota === 0 ? "text-tlum2" : ""}`}
          >
            {p.hodnota}
          </div>
        </div>
      ))}
    </div>
  );
}
