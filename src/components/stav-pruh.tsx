import type { ReactNode } from "react";
import { datumCas } from "@/lib/format";
import { UROVNE } from "@/lib/skala";
import type { HybridniTlak, NatoPolozka, PravniStav, Uroven } from "@/lib/typy";
import { Napoveda, Tecka, VykladUrovne } from "./zaklad";

interface Polozka {
  klic: string;
  stitek: string;
  hodnota: string | null;
  uroven: Uroven | null;
  /** Zelená tečka i tam, kde nejde o úroveň rizika (např. „mobilizace: ne“). */
  klidne?: boolean;
  napoveda: ReactNode;
}

function Bunka({ p }: { p: Polozka }) {
  const neznamo = p.hodnota === null;
  return (
    <div className="min-w-[9.5rem] shrink-0 px-4 py-3 sm:min-w-0 sm:flex-1 sm:px-5">
      <Napoveda popis={p.napoveda} label={`${p.stitek} — co to znamená?`}>
        <span className="block">
          <span className="stitek mb-2 block">{p.stitek}</span>
          <span className="flex items-center gap-2">
            {p.klidne && !neznamo ? (
              <span aria-hidden className="inline-block h-[7px] w-[7px] shrink-0 rounded-[2px] bg-[#3f8f5c]" />
            ) : (
              <Tecka uroven={p.uroven} />
            )}
            <span
              className={`text-[13px] font-semibold leading-tight tracking-[-0.015em] ${
                neznamo ? "text-tlum2" : ""
              }`}
            >
              {p.hodnota ?? "neověřeno"}
            </span>
          </span>
        </span>
      </Napoveda>
    </div>
  );
}

export function StavPruh({
  aktualizovano, uroven, pravni, nato, hybridni,
}: {
  aktualizovano: string | null;
  uroven: Uroven | null;
  pravni: PravniStav;
  nato: { polozky: NatoPolozka[] };
  hybridni: HybridniTlak;
}) {
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

  const polozky: Polozka[] = [
    {
      klic: "celkem",
      stitek: "Celková úroveň",
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
      hodnota: mobilizace?.plati === null ? null : mobilizace?.plati ? mobilizace.hodnota : "ne",
      uroven: null,
      klidne: mobilizace?.plati === false,
      napoveda: <span className="block">{mobilizace?.vysvetleni}</span>,
    },
    {
      klic: "nato",
      stitek: "NATO čl. 4 / 5",
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
      hodnota: hranice?.plati === null ? null : hranice?.plati ? hranice.hodnota : "běžný režim",
      uroven: null,
      klidne: hranice?.plati === false,
      napoveda: <span className="block">{hranice?.vysvetleni}</span>,
    },
    {
      klic: "primy",
      stitek: "Přímý střet",
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

  return (
    <div className="border-b border-linka bg-plocha">
      <div className="mx-auto max-w-[1180px] px-5 pt-3 sm:px-8">
        <div className="stitek flex items-center gap-2">
          <span aria-hidden className="inline-block h-[5px] w-[5px] rounded-full bg-[#3f8f5c]" />
          {aktualizovano ? `Aktualizováno ${datumCas(aktualizovano)}` : "Zatím bez automatické aktualizace"}
        </div>
      </div>
      <div className="mx-auto max-w-[1180px] sm:px-8">
        <div className="pas-scroll -mx-1 flex overflow-x-auto sm:mx-0 sm:divide-x sm:divide-linka2">
          {polozky.map((p) => (
            <Bunka key={p.klic} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
