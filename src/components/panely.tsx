import Link from "next/link";
import { datum, datumCas } from "@/lib/format";
import { tokeny, UROVNE } from "@/lib/skala";
import type {
  HybridniTlak, NatoPolozka, PravniPolozka, Provoz, ProvozniPolozka,
  RuskoStav, Uroven, Watchlist,
} from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { RadarTlaku } from "./mericky";
import { SeznamZdroju } from "./zdroje";
import {
  Karta, Napoveda, Neovereno, OdznakTypu, OdznakUrovne, Otaznik, Tecka, VykladUrovne,
} from "./zaklad";

/* ---------------- právní semafor ČR ---------------- */

function RadekSemaforu({ p }: { p: PravniPolozka }) {
  const neznamo = p.plati === null;
  const hodnota = neznamo ? null : p.plati ? p.hodnota || "ANO" : "NE";
  return (
    <details className="group border-b border-linka last:border-0">
      <summary className="flex items-center gap-4 py-4 transition-colors hover:bg-linka2/40">
        <span
          aria-hidden
          className={`h-[9px] w-[9px] shrink-0 rounded-[2px] ${
            neznamo ? "border border-linka" : p.plati ? "bg-[#c25e18]" : "bg-[#3f8f5c]"
          }`}
        />
        <span className="flex-1 text-[14px] font-medium tracking-[-0.01em]">{p.nazev}</span>
        {hodnota === null ? (
          <Neovereno kratke />
        ) : (
          <span
            className={`cislice text-[14px] font-semibold ${p.plati ? "text-[#94450f]" : "text-[#2f6f47]"}`}
          >
            {hodnota}
          </span>
        )}
        <span className="stitek shrink-0 transition-transform group-open:rotate-180">↓</span>
      </summary>
      <div className="space-y-4 pb-5 pl-[25px] pr-1">
        <p className="max-w-[46rem] text-[13px] leading-relaxed text-tlum">{p.vysvetleni}</p>
        {p.pravniZaklad && (
          <p className="text-[12px] text-tlum2">
            <span className="stitek mr-2">Právní základ</span>
            {p.pravniZaklad}
          </p>
        )}
        <div>
          <div className="stitek mb-2.5">Zdroje</div>
          <SeznamZdroju zdroje={p.zdroje} husty />
        </div>
        {p.overeno && (
          <p className="cislice text-[11.5px] text-tlum2">Ověřeno {datumCas(p.overeno)}</p>
        )}
      </div>
    </details>
  );
}

export function PravniSemafor({
  polozky, overeno, kompaktni = false,
}: { polozky: PravniPolozka[]; overeno: string | null; kompaktni?: boolean }) {
  const vybrane = kompaktni
    ? polozky.filter((p) => p.klic !== "schuze-parlamentu" && p.klic !== "nouzovy-stav")
    : polozky;
  return (
    <Karta className="px-5 py-1 sm:px-6">
      <div>
        {vybrane.map((p) => (
          <RadekSemaforu key={p.klic} p={p} />
        ))}
      </div>
      <p className="stitek border-t border-linka py-4">
        {overeno ? `Ověřeno proti úředním zdrojům ${datumCas(overeno)}` : "Zatím neověřeno automaticky"}
      </p>
    </Karta>
  );
}

/* ---------------- NATO ---------------- */

export function NatoPanel({ polozky, overeno }: { polozky: NatoPolozka[]; overeno: string | null }) {
  return (
    <Karta className="p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="podnadpis text-[16px]">NATO</h3>
        <span className="cislice text-[11.5px] text-tlum2">
          {overeno ? `ověřeno ${datum(overeno)}` : "neověřeno"}
        </span>
      </div>
      <dl className="divide-y divide-linka2">
        {polozky.map((p) => (
          <div key={p.klic} className="flex items-start justify-between gap-4 py-3">
            <dt className="flex items-center gap-1.5 text-[13.5px] font-medium">
              {p.nazev}
              <Otaznik popis={<span className="block">{p.vysvetleni}</span>} />
            </dt>
            <dd className="shrink-0 text-right">
              {p.aktivni === null ? (
                <Neovereno kratke />
              ) : (
                <span className="inline-flex items-center gap-2 text-[12.5px] font-medium">
                  <span
                    aria-hidden
                    className={`h-[7px] w-[7px] rounded-full ${
                      p.aktivni ? "bg-[#c25e18]" : "border border-linka bg-transparent"
                    }`}
                  />
                  {p.hodnota || (p.aktivni ? "aktivní" : "neaktivní")}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </Karta>
  );
}

/* ---------------- hybridní tlak vs přímý střet ---------------- */

function PruhUrovne({ uroven }: { uroven: Uroven | null }) {
  const poradi = uroven ? UROVNE[uroven].poradi : 0;
  const t = uroven ? tokeny(uroven) : null;
  return (
    <span aria-hidden className="flex h-[5px] gap-[2px]">
      {Array.from({ length: 13 }, (_, i) => (
        <span
          key={i}
          className={`w-full rounded-[1px] ${i < poradi && t ? t.pruh : "bg-linka2"}`}
        />
      ))}
    </span>
  );
}

export function HybridniPanel({ tlak }: { tlak: HybridniTlak }) {
  const primy = tlak.podkategorie.find((p) => p.klic === "primy");
  const ostatni = tlak.podkategorie.filter((p) => p.klic !== "primy");
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Karta className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="stitek mb-2">Hybridní tlak v Evropě</div>
            <OdznakUrovne uroven={tlak.celkem} velikost="m" />
          </div>
          <OdznakTypu typ="odhad" vpravo />
        </div>
        <dl className="space-y-4">
          {ostatni.map((p) => (
            <div key={p.klic}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-[13px] font-medium">
                  {p.nazev}
                  <Otaznik popis={<span className="block">{p.poznamka}</span>} />
                </dt>
                <dd className="shrink-0 text-[12px] font-medium text-tlum">
                  {p.uroven ? UROVNE[p.uroven].nazev : "—"}
                </dd>
              </div>
              <PruhUrovne uroven={p.uroven} />
            </div>
          ))}
        </dl>
      </Karta>

      <div className="noc relative flex flex-col justify-between overflow-hidden rounded-[18px] p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div data-vrstva="0.05" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[40%]" />
        </div>
        <div>
          <div className="stitek mb-4 !text-noc-tlum">Rozložení tlaku</div>
          <div className="flex justify-center">
            <RadarTlaku tlak={tlak} velikost={330} />
          </div>
        </div>
        <div className="mt-5 border-t border-white/10 pt-5">
          <div className="stitek mb-2 !text-noc-tlum">Přímý vojenský střet NATO–Rusko</div>
          <OdznakUrovne uroven={primy?.uroven ?? null} velikost="m" naNoci />
          <p className="mt-4 text-[12.5px] leading-relaxed text-noc-tlum">
            „Evropa má hybridní problém“ a „Rusko zaútočí na NATO“ jsou dvě různá
            tvrzení. První může být pravda, aniž by z něj druhé plynulo.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- co to znamená pro člověka v ČR ---------------- */

const STAVY_PROVOZU: Record<
  ProvozniPolozka["stav"],
  { nazev: string; tecka: string; text: string }
> = {
  bezny: { nazev: "Běžný režim", tecka: "bg-[#3f8f5c]", text: "text-[#2f6f47]" },
  sledujeme: { nazev: "Sledujeme", tecka: "bg-[#c9a227]", text: "text-[#8a6d14]" },
  narusen: { nazev: "Narušeno", tecka: "bg-[#c25e18]", text: "text-[#94450f]" },
  "bez-zdroje": { nazev: "Neověřeno", tecka: "border border-linka", text: "text-tlum2" },
};

function KartaProvozu({ p }: { p: ProvozniPolozka }) {
  const s = STAVY_PROVOZU[p.stav];
  return (
    <Karta jako="li" className="flex flex-col p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] border border-linka bg-papir text-tlum">
          <Ikona nazev={(p.ikona as NazevIkony) ?? "radar"} velikost={16} />
        </span>
        <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">{p.nazev}</h3>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-[2px] ${s.tecka}`} />
        <span className={`text-[13px] font-medium ${s.text}`}>
          {p.hodnota || s.nazev}
        </span>
      </div>

      <p className="mb-4 text-[12.5px] leading-relaxed text-tlum">{p.detail}</p>

      <details className="group mt-auto border-t border-linka2 pt-3">
        <summary className="flex items-center justify-between text-[11.5px] font-medium text-tlum">
          Co by mohlo přijít jako první
          <span aria-hidden className="transition-transform group-open:rotate-180">↓</span>
        </summary>
        <ul className="mt-2.5 space-y-1.5">
          {p.coByZmenilo.map((c, i) => (
            <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-tlum">
              <span aria-hidden className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-tlum2" />
              {c}
            </li>
          ))}
        </ul>

      </details>
    </Karta>
  );
}

export function ProvozPanel({ provoz }: { provoz: Provoz }) {
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {provoz.polozky.map((p) => (
          <KartaProvozu key={p.klic} p={p} />
        ))}
      </ul>

    </>
  );
}

/* ---------------- watchlist 72 h ---------------- */

const DOPADY: Record<string, string> = {
  vyznamny: "významný",
  vysoky: "vysoký",
  "velmi-vysoky": "velmi vysoký",
};

export function WatchlistPanel({ watchlist }: { watchlist: Watchlist }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <OdznakTypu typ="scenar" />
          <span className="stitek">Co by hodnocení zvýšilo</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {watchlist.eskalacni.map((p) => (
            <Karta jako="li" key={p.cislo} className="p-4">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <span className="cislice stitek">{p.cislo}</span>
                <span className="stitek-tmavy text-[#94450f]">↑ {DOPADY[p.dopad]}</span>
              </div>
              <h3 className="mb-2 text-[13.5px] font-semibold leading-snug tracking-[-0.01em]">
                {p.nazev}
              </h3>
              <p className="text-[12px] leading-relaxed text-tlum">{p.popis}</p>
            </Karta>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <OdznakTypu typ="scenar" vpravo />
          <span className="stitek">Co by hodnocení uklidnilo</span>
        </div>
        <Karta className="p-5">
          <ul className="space-y-3">
            {watchlist.uklidnujici.map((u, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-tlum">
                <span aria-hidden className="mt-[1px] shrink-0 text-[#3f8f5c]">↓</span>
                {u}
              </li>
            ))}
          </ul>

        </Karta>
      </div>
    </div>
  );
}

/* ---------------- scénářová cesta ---------------- */

const KROKY = [
  { nazev: "Zvýšená hybridní aktivita", popis: "Sabotáže, kybernetické incidenty, průzkumné drony.", ikona: "radar" as NazevIkony },
  { nazev: "Silnější ochrana infrastruktury, kontroly, readiness NATO", popis: "Institucionální reakce států a Aliance.", ikona: "stit" as NazevIkony },
  { nazev: "Mimořádná bezpečnostní opatření", popis: "Opatření na úrovni jednotlivých států, například u dopravy nebo energetiky.", ikona: "vystraha" as NazevIkony },
  { nazev: "Možný stav ohrožení státu", popis: "Vyhlašuje Parlament na návrh vlády. Samostatný ústavní krok s vlastními podmínkami.", ikona: "vaha" as NazevIkony },
  { nazev: "Pouze při zásadním dalším vývoji: válečný stav nebo mobilizace", popis: "Každý z těchto kroků má vlastní právní proces a vlastní úřední vyhlášení.", ikona: "dokument" as NazevIkony },
];

/**
 * Žebřík eskalace.
 *
 * Příčky jsou stejně vysoko od sebe schválně — nemají naznačovat, že cesta
 * nahoru je rovnoměrná ani že je pravděpodobná. Mezi každými dvěma příčkami
 * stojí značka „není automatické“, protože právě to si čtenář domýšlí sám.
 */
export function ScenarovaCesta() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        <OdznakTypu typ="scenar" />
        <p className="text-[12.5px] text-tlum">
          Toto není předpověď. Jde o orientační sled možných institucionálních kroků.
        </p>
      </div>

      <ol className="relative">
        {/* svislice žebříku */}
        <span
          aria-hidden
          className="absolute bottom-8 left-[19px] top-8 w-[2px] rounded-full bg-gradient-to-b from-[#2e8b62]/40 via-[#c9a227]/50 to-[#a32b2b]/45 sm:left-[23px]"
        />
        {KROKY.map((k, i) => (
          <li key={k.nazev}>
            <div className="relative flex items-start gap-4 sm:gap-5">
              <span className="relative z-10 grid h-[40px] w-[40px] shrink-0 place-items-center rounded-[14px] border border-linka bg-plocha text-tlum sm:h-[48px] sm:w-[48px]">
                <Ikona nazev={k.ikona} velikost={18} />
              </span>
              <Karta className="flex-1 p-4 sm:p-5">
                <div className="mb-1.5 flex items-center gap-2.5">
                  <span className="cislice stitek">{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden className="h-px flex-1 bg-linka2" />
                </div>
                <h3 className="text-[13.5px] font-semibold leading-snug tracking-[-0.01em]">
                  {k.nazev}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-tlum">{k.popis}</p>
              </Karta>
            </div>
            {i < KROKY.length - 1 && (
              <div className="flex items-center gap-3 py-2.5 pl-[52px] sm:pl-[68px]">
                <Napoveda
                  popis={
                    <span className="block">
                      Může dojít ke stabilizaci nebo návratu na nižší úroveň. Žádný z kroků
                      nenásleduje automaticky po předchozím.
                    </span>
                  }
                >
                  <span className="stitek-tmavy inline-flex items-center gap-1.5 rounded-full border border-dashed border-linka px-2.5 py-1 text-tlum2">
                    <Ikona nazev="nahoru" velikost={11} tah={1.8} />
                    Není automatické
                  </span>
                </Napoveda>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- Rusko: vnitřní tlak režimu ---------------- */

export function RuskoPanel({ stav }: { stav: RuskoStav }) {
  return (
    <Karta className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="podnadpis text-[16px]">Rusko: vnitřní tlak režimu</h3>
          <p className="mt-1.5 max-w-[34rem] text-[12.5px] leading-relaxed text-tlum">
            Doplňkový ukazatel. Sám o sobě nemění celkové hodnocení — sledujeme ho
            proto, že jeho změny se často promítnou do chování navenek.
          </p>
        </div>
        <OdznakTypu typ="odhad" vpravo />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-[10px] border border-linka bg-papir px-4 py-3">
        <div>
          <div className="stitek mb-2">Časový tlak režimu</div>
          <OdznakUrovne uroven={stav.casovyTlak} />
        </div>
        <p className="flex-1 text-[12px] leading-relaxed text-tlum">
          {stav.dopadNaIndex || "Dopad na celkové hodnocení zatím nebyl vyhodnocen."}
        </p>
      </div>

      <dl className="mb-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {stav.ukazatele.map((u) => (
          <div key={u.nazev} className="flex items-center justify-between gap-3 border-b border-linka2 pb-2.5">
            <dt className="flex items-center gap-1.5 text-[12.5px]">
              {u.nazev}
              <Otaznik popis={<span className="block">{u.poznamka}</span>} />
            </dt>
            <dd className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-tlum">
              <Tecka uroven={u.uroven} />
              {u.uroven ? UROVNE[u.uroven].nazev : "—"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-[10px] border border-[#e6ddc9] bg-[#fbf7ee] px-4 py-3">
        <p className="text-[12px] leading-relaxed text-[#6d5a2a]">{stav.poznamkaZdravi}</p>
      </div>

      <div className="mt-5 border-t border-linka2 pt-4">
        <div className="stitek mb-3">
          {stav.sledujemePo.nadpis}
          {stav.sledujemePo.termin ? ` · ${stav.sledujemePo.termin}` : ""}
        </div>
        <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {stav.sledujemePo.body.map((b, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-tlum">
              <span aria-hidden className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-tlum2" />
              {b}
            </li>
          ))}
        </ul>
        {!stav.sledujemePo.termin && (
          <p className="stitek mt-3">Termín doplníme z primárního zdroje</p>
        )}
      </div>
    </Karta>
  );
}
