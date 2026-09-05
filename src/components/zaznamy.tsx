"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ATRIBUCE, KATEGORIE, PORADI_KATEGORII, STAVY } from "@/lib/kategorie";
import { datum } from "@/lib/format";
import { JISTOTY, PASMA, tokeny, UROVNE } from "@/lib/skala";
import type { Incident, Kategorie, Nepotvrzene, Pasmo } from "@/lib/typy";
import type { SUkazkou } from "@/lib/data";
import { Ikona, type NazevIkony } from "./ikony";
import { ObsahUdalosti } from "./karta-udalosti";
import { SeznamZdroju } from "./zdroje";
import { OdznakUkazky } from "./pruhy";
import { Prazdno } from "./zaklad";
import { sklon, Vlajka } from "./zeme";

/*
  Záznamy jako jedna filtrovatelná osa.

  Ověřené události i to, co se nepotvrdilo nebo vyvrátilo, na jedné ose —
  aby bylo vidět obojí vedle sebe. U každého řádku stojí dvě samostatné
  věci: jak je informace potvrzená a jak je potvrzený pachatel.
*/

type Druh = "zaznam" | "nepotvrzeno" | "vyvraceno";

interface Radek {
  id: string;
  druh: Druh;
  kodZeme: string;
  zeme: string;
  kdy: string;
  datumUdalosti: string;
  jeZjisteni: boolean;
  titulek: string;
  zavaznost: Incident["zavaznost"] | null;
  kategorie: Kategorie[];
  jistota: Incident["jistota"] | null;
  atribuce: Incident["atribuce"] | null;
  puvodce: Incident["puvodce"] | null;
  stav: Incident["stav"] | null;
  uredni: boolean;
  slug: string | null;
  incident: SUkazkou<Incident> | null;
  neproslo: Nepotvrzene | null;
}

const OKNA = [
  { klic: "7d", nazev: "7 dní", dni: 7 },
  { klic: "30d", nazev: "30 dní", dni: 30 },
  { klic: "rok", nazev: "Letos", dni: null },
  { klic: "vse", nazev: "Vše", dni: null },
] as const;

/** Závažnost pro filtr: čtyři slova, žádné barvy v názvu. */
const ZAVAZNOSTI: { klic: string; nazev: string; pasma: Pasmo[] }[] = [
  { klic: "nizka", nazev: "Nízká", pasma: ["zelena"] },
  { klic: "stredni", nazev: "Střední", pasma: ["zluta", "prechod"] },
  { klic: "vysoka", nazev: "Vysoká", pasma: ["oranzova"] },
  { klic: "vazna", nazev: "Vážná", pasma: ["cervena"] },
];

const PUVODCE_NAZVY: Record<string, string> = {
  rusko: "Rusko", ukrajina: "Ukrajina", "jiny-stat": "jiný stát", domaci: "domácí", neznamy: "neznámý",
};

function Tlacitko({ aktivni, onClick, children, title }: { aktivni: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktivni}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${
        aktivni
          ? "border-akcent bg-akcent/20 text-akcent-svetla shadow-[0_0_14px_-4px_rgb(56_232_255/0.7)]"
          : "border-linka text-tlum hover:border-akcent/50 hover:text-inkoust"
      }`}
    >
      {children}
    </button>
  );
}

function naRadky(incidenty: SUkazkou<Incident>[], neprosle: Nepotvrzene[]): Radek[] {
  const a: Radek[] = incidenty.map((i) => ({
    id: i.id,
    druh: "zaznam",
    kodZeme: i.kodZeme,
    zeme: i.zeme,
    kdy: i.datumZjisteni ?? i.datumUdalosti,
    datumUdalosti: i.datumUdalosti,
    jeZjisteni: Boolean(i.datumZjisteni && i.datumZjisteni.slice(0, 10) !== i.datumUdalosti.slice(0, 10)),
    titulek: i.titulek,
    zavaznost: i.zavaznost,
    kategorie: i.kategorie,
    jistota: i.jistota,
    atribuce: i.atribuce,
    puvodce: i.puvodce ?? null,
    stav: i.stav,
    uredni: i.zdroje.some((z) => z.typ === "primary"),
    slug: i.slug,
    incident: i,
    neproslo: null,
  }));
  const b: Radek[] = neprosle.map((n) => ({
    id: `n-${n.id}`,
    druh: n.stav,
    kodZeme: n.kodZeme,
    zeme: n.zeme,
    kdy: n.datum,
    datumUdalosti: n.datum,
    jeZjisteni: false,
    titulek: n.nazev,
    zavaznost: null,
    kategorie: [],
    jistota: null,
    atribuce: null,
    puvodce: null,
    stav: null,
    uredni: n.zdroje.some((z) => z.typ === "primary"),
    slug: null,
    incident: null,
    neproslo: n,
  }));
  return [...a, ...b].sort((x, y) => y.kdy.localeCompare(x.kdy));
}

export function Zaznamy({ incidenty, neprosle }: { incidenty: SUkazkou<Incident>[]; neprosle: Nepotvrzene[] }) {
  const radky = useMemo(() => naRadky(incidenty, neprosle), [incidenty, neprosle]);
  const [zeme, setZeme] = useState<string | null>(null);
  const [kategorie, setKategorie] = useState<Kategorie | null>(null);
  const [zavaznost, setZavaznost] = useState<string[]>([]);
  const [okno, setOkno] = useState<(typeof OKNA)[number]["klic"]>("vse");
  const [jenUredni, setJenUredni] = useState(false);
  const [potvrzeni, setPotvrzeni] = useState<"vse" | "potvrzene" | "neprosle">("vse");

  const dostupneZeme = useMemo(() => {
    const m = new Map<string, { zeme: string; pocet: number }>();
    for (const r of radky) m.set(r.kodZeme, { zeme: r.zeme, pocet: (m.get(r.kodZeme)?.pocet ?? 0) + 1 });
    return [...m.entries()].sort((a, b) => (a[0] === "CZ" ? -1 : b[0] === "CZ" ? 1 : b[1].pocet - a[1].pocet));
  }, [radky]);
  const dostupneKategorie = useMemo(() => {
    const s = new Set<Kategorie>();
    for (const r of radky) for (const k of r.kategorie) s.add(k);
    return PORADI_KATEGORII.filter((k) => s.has(k));
  }, [radky]);

  const vysledek = useMemo(() => {
    const ted = Date.now();
    const rok = new Date().getUTCFullYear();
    return radky.filter((r) => {
      if (zeme && r.kodZeme !== zeme) return false;
      if (kategorie && !r.kategorie.includes(kategorie)) return false;
      if (zavaznost.length) {
        if (!r.zavaznost) return false;
        const p = UROVNE[r.zavaznost].pasmo;
        if (!ZAVAZNOSTI.filter((z) => zavaznost.includes(z.klic)).some((z) => z.pasma.includes(p))) return false;
      }
      const o = OKNA.find((x) => x.klic === okno)!;
      const kdy = new Date(r.kdy).getTime();
      if (o.dni && ted - kdy > o.dni * 86_400_000) return false;
      if (okno === "rok" && new Date(r.kdy).getUTCFullYear() !== rok) return false;
      if (jenUredni && !r.uredni) return false;
      if (potvrzeni === "potvrzene" && (r.druh !== "zaznam" || (r.jistota !== "potvrzeno" && r.jistota !== "vysoka"))) return false;
      if (potvrzeni === "neprosle" && r.druh === "zaznam") return false;
      return true;
    });
  }, [radky, zeme, kategorie, zavaznost, okno, jenUredni, potvrzeni]);

  const prepniZavaznost = (k: string) => setZavaznost((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));
  const smazFiltry = () => { setZeme(null); setKategorie(null); setZavaznost([]); setOkno("vse"); setJenUredni(false); setPotvrzeni("vse"); };
  const aktivnichFiltru = [zeme, kategorie, zavaznost.length, okno !== "vse", jenUredni, potvrzeni !== "vse"].filter(Boolean).length;

  return (
    <>
      <div className="mb-5 space-y-3 rounded-[14px] border border-linka bg-noc/40 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="stitek mr-1 w-[70px]">Země</span>
          <Tlacitko aktivni={zeme === null} onClick={() => setZeme(null)}>Vše</Tlacitko>
          {dostupneZeme.map(([kod, z]) => (
            <Tlacitko key={kod} aktivni={zeme === kod} onClick={() => setZeme(zeme === kod ? null : kod)} title={z.zeme}>
              <Vlajka kod={kod} /> <span className="cislice">{kod}</span> <span className="text-tlum2">{z.pocet}</span>
            </Tlacitko>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="stitek mr-1 w-[70px]">Oblast</span>
          <Tlacitko aktivni={kategorie === null} onClick={() => setKategorie(null)}>Vše</Tlacitko>
          {dostupneKategorie.map((k) => (
            <Tlacitko key={k} aktivni={kategorie === k} onClick={() => setKategorie(kategorie === k ? null : k)}>{KATEGORIE[k].nazev}</Tlacitko>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="stitek mr-1 w-[70px]">Závažnost</span>
            {ZAVAZNOSTI.map((z) => (
              <Tlacitko key={z.klic} aktivni={zavaznost.includes(z.klic)} onClick={() => prepniZavaznost(z.klic)}>
                <span aria-hidden className={`h-[7px] w-[7px] rounded-[2px] ${PASMA[z.pasma[0]].pruh}`} /> {z.nazev}
              </Tlacitko>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="stitek mr-1">Období</span>
            {OKNA.map((o) => (
              <Tlacitko key={o.klic} aktivni={okno === o.klic} onClick={() => setOkno(o.klic)}>{o.nazev}</Tlacitko>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="stitek mr-1 w-[70px]">Ověření</span>
            <Tlacitko aktivni={potvrzeni === "vse"} onClick={() => setPotvrzeni("vse")}>Vše</Tlacitko>
            <Tlacitko aktivni={potvrzeni === "potvrzene"} onClick={() => setPotvrzeni("potvrzene")}><Ikona nazev="fajfka" velikost={12} tah={2.2} /> Jen potvrzené</Tlacitko>
            <Tlacitko aktivni={potvrzeni === "neprosle"} onClick={() => setPotvrzeni("neprosle")}><Ikona nazev="krizek" velikost={12} tah={2.2} /> Nepotvrzené a vyvrácené</Tlacitko>
          </div>
          <Tlacitko aktivni={jenUredni} onClick={() => setJenUredni(!jenUredni)} title="Jen záznamy s úředním zdrojem — policie, vláda, NATO, EU">
            <Ikona nazev="stit-ok" velikost={12} tah={2} /> Jen úřední zdroje
          </Tlacitko>
          {aktivnichFiltru > 0 && (
            <button type="button" onClick={smazFiltry} className="ml-auto text-[13px] text-tlum underline underline-offset-4 hover:text-inkoust">
              Zrušit filtry ({aktivnichFiltru})
            </button>
          )}
        </div>
      </div>

      <p aria-live="polite" className="mb-3 flex items-center gap-2 text-[13px] text-tlum">
        <Ikona nazev="osa" velikost={13} />
        {vysledek.length === 0 ? "Žádný záznam neodpovídá filtru." : `${vysledek.length} ${sklon(vysledek.length, "záznam", "záznamy", "záznamů")} · nejnovější nahoře · datum je datum zjištění`}
      </p>

      {vysledek.length ? (
        <ol className="relative">
          <span aria-hidden className="absolute bottom-4 left-[6px] top-4 w-px bg-linka sm:left-[88px]" />
          {vysledek.map((r, i) => {
            const rok = r.kdy.slice(0, 4);
            const novyRok = i === 0 || vysledek[i - 1].kdy.slice(0, 4) !== rok;
            return (
              <li key={r.id} className="contents">
                {novyRok && (
                  <div className="relative z-10 my-2 flex items-center gap-3 sm:pl-[64px]">
                    <span className="velke-cislo svit rounded-[8px] border border-akcent/40 bg-papir px-2.5 py-1 text-[16px] text-akcent-svetla">{rok}</span>
                    <span className="stitek">{vysledek.filter((x) => x.kdy.slice(0, 4) === rok).length} {sklon(vysledek.filter((x) => x.kdy.slice(0, 4) === rok).length, "záznam", "záznamy", "záznamů")}</span>
                  </div>
                )}
                <RadekOsy r={r} />
              </li>
            );
          })}
        </ol>
      ) : radky.length ? (
        <Prazdno nadpis="Nic neodpovídá zvolenému filtru" popis="Zkuste rozšířit období nebo zrušit omezení." />
      ) : (
        <Prazdno nadpis="Zatím nejsou zveřejněné žádné události" popis="Zobrazujeme jen záznamy, které prošly kontrolou a mají uvedený zdroj." />
      )}
    </>
  );
}

const JISTOTA_IKONA: Record<string, NazevIkony> = { potvrzeno: "stit-ok", vysoka: "fajfka", stredni: "oko", nizka: "vykricnik" };

function Stitek({ ikona, nadpis, hodnota, tridy }: { ikona: NazevIkony; nadpis: string; hodnota: string; tridy: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2 py-1 ${tridy}`}>
      <Ikona nazev={ikona} velikost={11} tah={2.2} />
      <span className="stitek !text-[9px] !text-current opacity-70">{nadpis}</span>
      <span className="text-[12px] font-bold uppercase tracking-[0.03em]">{hodnota}</span>
    </span>
  );
}

function RadekOsy({ r }: { r: Radek }) {
  const t = r.zavaznost ? tokeny(r.zavaznost) : null;
  const neproslo = r.druh !== "zaznam";
  return (
    <div className="relative">
      <details className="group">
        <summary className="flex items-start gap-3 py-3 sm:gap-4">
          <span className="cislice hidden w-[72px] shrink-0 pt-[3px] text-right text-[12.5px] font-medium text-tlum sm:block">
            {datum(r.kdy).replace(/ \d{4}$/, "")}
          </span>
          <span
            aria-hidden
            className={`relative z-10 mt-[6px] h-[13px] w-[13px] shrink-0 rounded-[3px] border-2 border-papir ${
              neproslo ? "bg-tlum2" : t!.pruh
            }`}
          />
          <span className="min-w-0 flex-1">
            <span className="mb-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="cislice stitek sm:hidden">{datum(r.kdy)}</span>
              <Vlajka kod={r.kodZeme} />
              <span className="stitek">{r.zeme}</span>
              {r.kategorie[0] && KATEGORIE[r.kategorie[0]].nazev !== r.zeme && KATEGORIE[r.kategorie[0]].nazev !== "ČR" && <span className="stitek !text-tlum2">{KATEGORIE[r.kategorie[0]].nazev}</span>}
              {neproslo ? (
                <span className="stitek-tmavy rounded-full border border-[#4fdd9a]/40 bg-[#4fdd9a]/10 px-2 py-[3px] text-[#8ff0c0]">
                  {r.druh === "vyvraceno" ? "Vyvráceno" : "Nepotvrzeno"}
                </span>
              ) : (
                <span className={`stitek-tmavy ${t!.text}`}>{UROVNE[r.zavaznost!].nazev}</span>
              )}
              {r.jeZjisteni && <span className="stitek-tmavy rounded-[8px] border border-linka px-1.5 py-[2px] text-tlum2">událost {datum(r.datumUdalosti)}</span>}
              {r.incident?.ukazka && <OdznakUkazky />}
              {r.incident?.historicky && <span className="stitek-tmavy rounded-[8px] border border-linka px-1.5 py-[2px] text-tlum2">doplněno zpětně</span>}
            </span>
            <span className="block text-[15.5px] font-semibold leading-snug text-inkoust group-open:text-akcent-svetla">
              {r.titulek}
            </span>
            {!neproslo && (
              <span className="mt-2 flex flex-wrap gap-1.5">
                <Stitek
                  ikona={JISTOTA_IKONA[r.jistota!]}
                  nadpis="informace"
                  hodnota={JISTOTY[r.jistota!].nazev}
                  tridy={r.jistota === "potvrzeno" || r.jistota === "vysoka" ? "border-[#4fdd9a]/40 bg-[#4fdd9a]/10 text-[#8ff0c0]" : "border-jantar/40 bg-jantar/10 text-jantar"}
                />
                {r.puvodce && (
                  <Stitek
                    ikona={r.atribuce === "oficialni" || r.atribuce === "domaci" ? "fajfka" : "lupa"}
                    nadpis="pachatel"
                    hodnota={`${PUVODCE_NAZVY[r.puvodce]} · ${r.atribuce === "oficialni" ? "potvrzen" : r.atribuce === "domaci" ? "prokázán" : r.atribuce === "vysetrovana" ? "vyšetřuje se" : "nepotvrzen"}`}
                    tridy={r.atribuce === "oficialni" || r.atribuce === "domaci" ? "border-[#4fdd9a]/40 bg-[#4fdd9a]/10 text-[#8ff0c0]" : "border-linka text-tlum"}
                  />
                )}
                {!r.puvodce && r.atribuce && r.atribuce !== "neznama" && (
                  <Stitek ikona="oko" nadpis="atribuce" hodnota={ATRIBUCE[r.atribuce].nazev} tridy="border-linka text-tlum" />
                )}
                {r.uredni && <Stitek ikona="stit-ok" nadpis="zdroj" hodnota="úřední" tridy="border-akcent/40 bg-akcent/10 text-akcent-svetla" />}
              </span>
            )}
          </span>
          <span aria-hidden className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-akcent/50 text-akcent transition-transform group-open:rotate-45 group-open:bg-akcent group-open:text-noc">
            <Ikona nazev="plus" velikost={13} tah={2.2} />
          </span>
        </summary>
        <div className="mb-3 ml-[25px] rounded-[14px] border border-linka bg-noc/40 p-4 sm:ml-[106px] sm:p-5">
          {r.incident ? (
            <>
              <ObsahUdalosti incident={r.incident} />
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-linka2 pt-3 text-[13px] text-tlum">
                {r.stav && <span>{STAVY[r.stav]}</span>}
                <Link href={`/incident/${r.slug}/`} className="ml-auto inline-flex items-center gap-1 font-semibold text-akcent hover:text-akcent-svetla">
                  Samostatná stránka <Ikona nazev="nahoru" velikost={12} tah={2} trida="rotate-90" />
                </Link>
              </div>
            </>
          ) : r.neproslo ? (
            <div className="space-y-3 text-[14.5px] leading-relaxed">
              <div>
                <div className="stitek mb-1 !text-jantar">Co se původně zdálo</div>
                <p className="text-tlum">{r.neproslo.puvodne}</p>
              </div>
              <div>
                <div className="stitek mb-1 !text-[#8ff0c0]">Co ověření ukázalo</div>
                <p className="text-inkoust">{r.neproslo.overeni}</p>
              </div>
              <p className="stitek">Do žádného počtu ani hodnocení nevstupuje.</p>
              <SeznamZdroju zdroje={r.neproslo.zdroje} husty />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
