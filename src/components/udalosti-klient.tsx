"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { druh, jistotaZobrazena, kdyZjisteno, pachatelPotvrzen, uredniZdroj, type Zaznam } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import { KATEGORIE, PORADI_KATEGORII } from "@/lib/kategorie";
import { zaznamejUdalost } from "@/lib/mereni";
import { JISTOTY, PASMA, tokeny, UROVNE } from "@/lib/skala";
import type { DruhZaznamu, Kandidat, Kategorie, Nepotvrzene, Pasmo } from "@/lib/typy";
import { ctiDotaz, sledujDotaz, zapisDotaz } from "@/lib/url-stav";
import { DetailObsah, HlavickaDetailu } from "./detail-obsah";
import { Ikona } from "./ikony";
import { Nahlaseni } from "./nahlaseni";
import { RadaUdaju, Udaj, UdajZavaznosti } from "./udaje";
import { Odznak, OdznakZavaznosti, RadekSeznamu, Sdeleni, TeckaZavaznosti, Tlacitko } from "./ui";
import { SeznamZdroju } from "./zdroje";
import { Prazdno } from "./zaklad";
import { sklon, Vlajka } from "./zeme";

/*
  Události: jeden seznam, filtry v adrese, detail vedle seznamu.

  Filtry žijí v adrese (?zeme=CZ&tema=drony&obdobi=30d&overeni=uredni),
  takže jde výběr sdílet a Zpět funguje. Základní filtry jsou vidět pořád,
  pokročilé jsou schované. Na širokém displeji se detail otevře v panelu
  vedle seznamu (?u=slug), na úzkém se jde na samostatnou stránku.
*/

const OBDOBI = [
  { klic: "7d", nazev: "7 dní", dni: 7 },
  { klic: "30d", nazev: "30 dní", dni: 30 },
  // Počítadlo „za 90 dní" v liště sem vede; bez tohohle okna vedlo na 30 dní.
  { klic: "90d", nazev: "90 dní", dni: 90 },
  { klic: "letos", nazev: "Letos", dni: null },
  { klic: "vse", nazev: "Vše", dni: null },
] as const;
type Obdobi = (typeof OBDOBI)[number]["klic"];

/*
  Tři záložky místo jednoho společného seznamu.

  Dřív se ověřené záznamy, automatický sběr i vyvrácené zprávy míchaly do
  jednoho výpisu. Čtenář pak nemohl poznat, co web doopravdy tvrdí — a to je
  přesně to, na čem projekt stojí. Výchozí je vždy „ověřené“; ostatní dvě
  záložky se musí otevřít vědomě.
*/
const ZALOZKY = [
  { klic: "overene", nazev: "Ověřené záznamy", popis: "prošly lidskou kontrolou a počítají se" },
  /*
    Nepotvrzené stojí mezi ověřenými a zachycenými schválně. Je to zpracovaná
    zpráva se zdroji — víc než holý titulek ze sběru, míň než záznam, za
    kterým projekt stojí. Kdyby se schovala k jednomu z obou sousedů, jeden
    by se tím nafoukl a druhý zlehčil.
  */
  { klic: "nepotvrzene", nazev: "Nepotvrzené", popis: "zpracované, čekají na schválení nebo úřední zdroj" },
  { klic: "cekajici", nazev: "Čeká na ověření", popis: "automatický sběr; do žádného počtu nevstupuje" },
  { klic: "neproslo", nazev: "Neprošlo ověřením", popis: "vyvráceno nebo nedoloženo" },
] as const;
type Zalozka = (typeof ZALOZKY)[number]["klic"];

const OVERENI = [
  { klic: "vse", nazev: "Vše" },
  { klic: "uredni", nazev: "Jen s úředním zdrojem" },
  { klic: "potvrzeny-pachatel", nazev: "Jen s potvrzeným pachatelem" },
] as const;
type Overeni = (typeof OVERENI)[number]["klic"];

const DRUHY_FILTR: { klic: DruhZaznamu; nazev: string }[] = [
  { klic: "pripad", nazev: "Případy" },
  { klic: "aktualizace", nazev: "Aktualizace" },
  { klic: "opatreni", nazev: "Opatření" },
  { klic: "reakce", nazev: "Prohlášení a reakce" },
];

const ZAVAZNOSTI: { klic: string; nazev: string; pasma: Pasmo[] }[] = [
  { klic: "nizka", nazev: "Nízká", pasma: ["zelena"] },
  { klic: "stredni", nazev: "Střední a zvýšená", pasma: ["zluta", "prechod"] },
  { klic: "vysoka", nazev: "Vysoká", pasma: ["oranzova"] },
  { klic: "vazna", nazev: "Vážná", pasma: ["cervena"] },
];

const PUVODCE_NAZVY: Record<string, string> = {
  rusko: "Rusko", ukrajina: "Ukrajina", "jiny-stat": "jiný stát", "neni-stat": "nestátní skupina", domaci: "domácí", neznamy: "neznámý",
};

interface Filtr {
  zalozka: Zalozka;
  zeme: string | null;
  tema: Kategorie | null;
  obdobi: Obdobi;
  overeni: Overeni;
  druhy: DruhZaznamu[];
  zavaznost: string[];
  detail: string | null;
}

const VYCHOZI: Filtr = { zalozka: "overene", zeme: null, tema: null, obdobi: "vse", overeni: "vse", druhy: [], zavaznost: [], detail: null };

function zAdresy(p: URLSearchParams): Filtr {
  const obdobi = p.get("obdobi");
  const overeni = p.get("overeni");
  const tema = p.get("tema");
  const tab = p.get("tab");
  // Starší odkazy vedly na ?overeni=neprosle / =automaticke. Zůstávají funkční.
  const zalozka: Zalozka = ZALOZKY.some((z) => z.klic === tab)
    ? (tab as Zalozka)
    : overeni === "neprosle" ? "neproslo" : overeni === "automaticke" ? "cekajici" : "overene";
  return {
    zalozka,
    zeme: p.get("zeme")?.toUpperCase() || null,
    tema: tema && (PORADI_KATEGORII as string[]).includes(tema) ? (tema as Kategorie) : null,
    obdobi: OBDOBI.some((o) => o.klic === obdobi) ? (obdobi as Obdobi) : "vse",
    overeni: OVERENI.some((o) => o.klic === overeni) ? (overeni as Overeni) : "vse",
    druhy: (p.get("druh")?.split(",") ?? []).filter((d): d is DruhZaznamu => DRUHY_FILTR.some((x) => x.klic === d)),
    zavaznost: (p.get("zavaznost")?.split(",") ?? []).filter((z) => ZAVAZNOSTI.some((x) => x.klic === z)),
    detail: p.get("u") || null,
  };
}

function doAdresy(f: Filtr): URLSearchParams {
  const p = new URLSearchParams();
  if (f.zalozka !== "overene") p.set("tab", f.zalozka);
  if (f.zeme) p.set("zeme", f.zeme);
  if (f.tema) p.set("tema", f.tema);
  if (f.obdobi !== "vse") p.set("obdobi", f.obdobi);
  if (f.overeni !== "vse") p.set("overeni", f.overeni);
  if (f.druhy.length) p.set("druh", f.druhy.join(","));
  if (f.zavaznost.length) p.set("zavaznost", f.zavaznost.join(","));
  if (f.detail) p.set("u", f.detail);
  return p;
}

/** Filtr v adrese jako stav komponenty. Adresa je zdroj pravdy. */
function useFiltrVAdrese() {
  const [f, setF] = useState<Filtr>(VYCHOZI);
  useEffect(() => {
    const nacti = () => setF(zAdresy(ctiDotaz()));
    nacti();
    return sledujDotaz(nacti);
  }, []);
  const zmen = useCallback((zmena: Partial<Filtr>, zpusob: "replace" | "push" = "replace") => {
    setF((stary) => {
      const novy = { ...stary, ...zmena };
      zapisDotaz(doAdresy(novy), zpusob);
      return novy;
    });
  }, []);
  return [f, zmen] as const;
}

/** Široký displej: detail se vejde vedle seznamu. */
function useSiroky() {
  const [siroky, setSiroky] = useState(false);
  useEffect(() => {
    const m = matchMedia("(min-width: 1024px)");
    const f = () => setSiroky(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return siroky;
}

function Cip({ aktivni, onClick, children, title }: { aktivni: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktivni}
      title={title}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-male font-semibold transition-colors ${
        aktivni ? "border border-akcent/60 bg-akcent/15 text-akcent-svetla" : "border border-transparent text-tlum hover:bg-plocha2 hover:text-inkoust"
      }`}
    >
      {children}
    </button>
  );
}

type Radek =
  | { typ: "zaznam"; kdy: string; z: Zaznam }
  | { typ: "nepotvrzeny"; kdy: string; z: Zaznam }
  | { typ: "neproslo"; kdy: string; n: Nepotvrzene }
  | { typ: "kandidat"; kdy: string; k: Kandidat };

export function UdalostiKlient({ zaznamy, neprosle, kandidati = [], nepotvrzene = [] }: { zaznamy: Zaznam[]; neprosle: Nepotvrzene[]; kandidati?: Kandidat[]; nepotvrzene?: Zaznam[] }) {
  const [f, zmen] = useFiltrVAdrese();
  const siroky = useSiroky();
  const [pokrocile, setPokrocile] = useState(false);
  const [vsechnyZeme, setVsechnyZeme] = useState(false);
  const [limit, setLimit] = useState(10);

  const zeme = useMemo(() => {
    const m = new Map<string, { nazev: string; pocet: number }>();
    for (const z of zaznamy) m.set(z.kodZeme, { nazev: z.kodZeme === "CZ" ? "Česko" : z.zeme, pocet: (m.get(z.kodZeme)?.pocet ?? 0) + 1 });
    for (const n of neprosle) m.set(n.kodZeme, { nazev: n.kodZeme === "CZ" ? "Česko" : n.zeme, pocet: (m.get(n.kodZeme)?.pocet ?? 0) + 1 });
    return [...m.entries()].sort((a, b) => (a[0] === "CZ" ? -1 : b[0] === "CZ" ? 1 : b[1].pocet - a[1].pocet));
  }, [zaznamy, neprosle]);
  const temata = useMemo(() => {
    const s = new Set<Kategorie>();
    for (const z of zaznamy) for (const k of z.kategorie) s.add(k);
    return PORADI_KATEGORII.filter((k) => s.has(k));
  }, [zaznamy]);

  const vysledek = useMemo<Radek[]>(() => {
    const ted = Date.now();
    const rok = new Date().getUTCFullYear();
    const o = OBDOBI.find((x) => x.klic === f.obdobi)!;
    const vObdobi = (kdy: string) => {
      const t = new Date(kdy).getTime();
      if (o.dni && ted - t > o.dni * 86_400_000) return false;
      if (f.obdobi === "letos" && new Date(kdy).getUTCFullYear() !== rok) return false;
      return true;
    };
    const a: Radek[] = f.zalozka !== "overene" ? [] : zaznamy
      .filter((z) => {
        if (f.zeme && z.kodZeme !== f.zeme) return false;
        if (f.tema && !z.kategorie.includes(f.tema)) return false;
        if (!vObdobi(kdyZjisteno(z))) return false;
        if (f.overeni === "uredni" && !uredniZdroj(z)) return false;
        if (f.overeni === "potvrzeny-pachatel" && !(druh(z) === "pripad" && pachatelPotvrzen(z))) return false;
        if (f.druhy.length && !f.druhy.includes(druh(z))) return false;
        if (f.zavaznost.length) {
          const p = UROVNE[z.zavaznost].pasmo;
          if (!ZAVAZNOSTI.filter((x) => f.zavaznost.includes(x.klic)).some((x) => x.pasma.includes(p))) return false;
        }
        return true;
      })
      .map((z) => ({ typ: "zaznam", kdy: kdyZjisteno(z), z }));
    const b: Radek[] = f.zalozka === "neproslo" ? neprosle
      .filter((n) => (!f.zeme || n.kodZeme === f.zeme) && vObdobi(n.datum))
      .map((n) => ({ typ: "neproslo", kdy: n.datum, n })) : [];
    const np: Radek[] = f.zalozka === "nepotvrzene" ? nepotvrzene
      .filter((z) => {
        if (f.zeme && z.kodZeme !== f.zeme) return false;
        if (f.tema && !z.kategorie.includes(f.tema)) return false;
        return vObdobi(kdyZjisteno(z));
      })
      .map((z) => ({ typ: "nepotvrzeny" as const, kdy: kdyZjisteno(z), z })) : [];
    const c: Radek[] = f.zalozka === "cekajici" ? kandidati
      .filter((k) => (!f.zeme || k.kodZeme === f.zeme) && (!f.tema || k.kategorie.includes(f.tema)) && vObdobi(k.publikovano ?? k.zachyceno))
      .map((k) => ({ typ: "kandidat", kdy: k.publikovano ?? k.zachyceno, k })) : [];
    /*
      Řadí se podle času, s jednou výjimkou: naléhavý kandidát jde nahoru.
      Vyhlášená mobilizace v Rusku nemá čekat na svoje místo v chronologii
      mezi zprávami o kabelech.
    */
    const naliehave = (r: Radek) => (r.typ === "kandidat" && r.k.naliehave ? 1 : 0);
    return [...a, ...np, ...b, ...c].sort(
      (x, y) => naliehave(y) - naliehave(x) || y.kdy.localeCompare(x.kdy),
    );
  }, [zaznamy, neprosle, kandidati, nepotvrzene, f]);

  useEffect(() => { setLimit(10); }, [f.zalozka, f.zeme, f.tema, f.obdobi, f.overeni, f.druhy, f.zavaznost]);

  const otevreny = f.detail ? zaznamy.find((z) => z.slug === f.detail) ?? null : null;
  const otevri = (slug: string) => {
    zaznamejUdalost("event_open", { slug });
    zmen({ detail: slug }, "push");
  };
  const zavri = () => zmen({ detail: null }, "push");

  useEffect(() => {
    if (!otevreny) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otevreny]);

  const aktivni: { text: string; zrus: () => void }[] = [];
  if (f.zeme) aktivni.push({ text: zeme.find((z) => z[0] === f.zeme)?.[1].nazev ?? f.zeme, zrus: () => zmen({ zeme: null }) });
  if (f.tema) aktivni.push({ text: KATEGORIE[f.tema].nazev, zrus: () => zmen({ tema: null }) });
  if (f.obdobi !== "vse") aktivni.push({ text: OBDOBI.find((o) => o.klic === f.obdobi)!.nazev, zrus: () => zmen({ obdobi: "vse" }) });
  if (f.overeni !== "vse") aktivni.push({ text: OVERENI.find((o) => o.klic === f.overeni)!.nazev, zrus: () => zmen({ overeni: "vse" }) });
  for (const d of f.druhy) aktivni.push({ text: DRUHY_FILTR.find((x) => x.klic === d)!.nazev, zrus: () => zmen({ druhy: f.druhy.filter((x) => x !== d) }) });
  for (const z of f.zavaznost) aktivni.push({ text: `závažnost: ${ZAVAZNOSTI.find((x) => x.klic === z)!.nazev.toLowerCase()}`, zrus: () => zmen({ zavaznost: f.zavaznost.filter((x) => x !== z) }) });
  // Upřesnění = všechno, co je schované pod tlačítkem. Číslo na tlačítku říká,
  // kolik toho je — jinak by schovaný filtr tiše měnil výsledek.
  const pocetUpresneni = (f.zeme ? 1 : 0) + (f.tema ? 1 : 0) + (f.overeni !== "vse" ? 1 : 0) + f.druhy.length + f.zavaznost.length;
  const maPokrocile = pocetUpresneni > 0;

  const zobrazene = vysledek.slice(0, limit);
  const pripadu = vysledek.filter((r) => r.typ === "zaznam" && druh(r.z) === "pripad").length;

  return (
    <div className={`grid gap-8 ${siroky && otevreny ? "lg:grid-cols-[minmax(0,1fr)_minmax(380px,44%)]" : ""}`}>
      <div className="min-w-0">
        {/* záložky — co se vlastně ukazuje */}
        <div role="tablist" aria-label="Co zobrazit" className="flex flex-wrap gap-1.5">
          {ZALOZKY.map((z) => {
            const n = z.klic === "overene" ? zaznamy.length
              : z.klic === "nepotvrzene" ? nepotvrzene.length
              : z.klic === "cekajici" ? kandidati.length
              : neprosle.length;
            const akt = f.zalozka === z.klic;
            return (
              <button
                key={z.klic}
                type="button"
                role="tab"
                aria-selected={akt}
                onClick={() => zmen({ zalozka: z.klic })}
                className={`flex min-h-[46px] flex-col justify-center rounded-[18px] border px-3.5 py-1.5 text-left transition-colors ${
                  akt ? "border-akcent/60 bg-akcent/15 text-inkoust" : "border-transparent text-tlum hover:bg-plocha2 hover:text-inkoust"
                }`}
              >
                <span className="flex items-center gap-2 text-male font-bold leading-tight">
                  {z.nazev}
                  <span className={`cislice rounded-full px-1.5 py-[1px] text-mikro ${akt ? "bg-akcent/25 text-akcent-svetla" : "bg-plocha2 text-tlum2"}`}>{n}</span>
                </span>
                <span className="text-mikro leading-tight text-tlum2">{z.popis}</span>
              </button>
            );
          })}
        </div>

        {f.zalozka === "nepotvrzene" && (
          <Sdeleni ton="akcent" ikona="otaznik" carkovane nadpis="Stalo se to, ale my za to zatím neručíme." trida="mt-3">
            Zpracované zprávy se zdroji, které ještě neprošly člověkem. Ukazujeme je proto, aby na webu bylo vidět,
            co se ve světě děje, i když schválení chvíli trvá. Do počtů, hodnocení situace ani upozornění nevstupují.
            Potvrdí se schválením — nebo samy, jakmile je doloží druhý nezávislý zdroj a aspoň jeden z nich je úřední.
          </Sdeleni>
        )}
        {f.zalozka === "cekajici" && (
          <Sdeleni ton="akcent" ikona="otaznik" carkovane nadpis="Tohle CzechPatrol netvrdí." trida="mt-3">
            Jsou to zprávy, které hodinový sběr zachytil ve zdrojích a člověk je zatím neověřil. Do žádného počtu,
            hodnocení ani upozornění nevstupují.
          </Sdeleni>
        )}
        {f.zalozka === "neproslo" && (
          <Sdeleni ikona="krizek" nadpis="Co ověřením neprošlo." trida="mt-3">
            Vedeme to schválně: bez toho by web ukazoval jen to, co vyšlo, a nešlo by poznat, kolik věcí padlo.
          </Sdeleni>
        )}

        {/* filtry — kompaktně; na jedné řádce to, co lidé mění nejčastěji */}
        <div className="mt-3 space-y-1.5 border-b border-linka2 pb-3" role="group" aria-label="Filtry">
          <div className="flex flex-wrap items-center gap-1">
            <span className="stitek mr-1 w-[62px] shrink-0">Období</span>
            {OBDOBI.map((o) => <Cip key={o.klic} aktivni={f.obdobi === o.klic} onClick={() => zmen({ obdobi: o.klic })}>{o.nazev}</Cip>)}
            <button
              type="button"
              onClick={() => setPokrocile((x) => !x)}
              aria-expanded={pokrocile || maPokrocile}
              className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-linka px-3 text-male font-semibold text-tlum transition-colors hover:border-akcent hover:text-inkoust"
            >
              <Ikona nazev="lupa" velikost={13} tah={2} />
              Země, téma a další
              {pocetUpresneni > 0 && <span className="cislice rounded-full bg-akcent/20 px-1.5 text-mikro text-akcent-svetla">{pocetUpresneni}</span>}
              <Ikona nazev="dolu" velikost={12} tah={2} trida={`transition-transform ${pokrocile || maPokrocile ? "rotate-180" : ""}`} />
            </button>
          </div>

          {(pokrocile || maPokrocile) && (
            <div className="space-y-1.5 border-t border-linka2 pt-2">
              <div className="flex flex-wrap items-center gap-1">
                <span className="stitek mr-1 w-[62px] shrink-0">Země</span>
                <Cip aktivni={f.zeme === null} onClick={() => zmen({ zeme: null })}>Vše</Cip>
                {(vsechnyZeme ? zeme : zeme.slice(0, 8)).map(([kod, z]) => (
                  <Cip key={kod} aktivni={f.zeme === kod} onClick={() => zmen({ zeme: f.zeme === kod ? null : kod })} title={z.nazev}>
                    <Vlajka kod={kod} /> <span className="cislice">{kod}</span> <span className="text-tlum2">{z.pocet}</span>
                  </Cip>
                ))}
                {zeme.length > 8 && (
                  <button type="button" onClick={() => setVsechnyZeme((x) => !x)} className="min-h-[36px] px-2 text-male text-tlum underline underline-offset-4 hover:text-inkoust">
                    {vsechnyZeme ? "méně zemí" : `+ ${zeme.length - 8} ${sklon(zeme.length - 8, "země", "země", "zemí")}`}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="stitek mr-1 w-[62px] shrink-0">Téma</span>
                <Cip aktivni={f.tema === null} onClick={() => zmen({ tema: null })}>Vše</Cip>
                {temata.map((k) => (
                  <Cip key={k} aktivni={f.tema === k} onClick={() => zmen({ tema: f.tema === k ? null : k })}>{KATEGORIE[k].nazev}</Cip>
                ))}
              </div>
              {(f.zalozka === "overene" || f.zalozka === "nepotvrzene") && (
                <>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="stitek mr-1 w-[62px] shrink-0">Zdroj</span>
                    {OVERENI.map((o) => <Cip key={o.klic} aktivni={f.overeni === o.klic} onClick={() => zmen({ overeni: o.klic })}>{o.nazev}</Cip>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="stitek mr-1 w-[62px] shrink-0">Druh</span>
                    {DRUHY_FILTR.map((d) => (
                      <Cip key={d.klic} aktivni={f.druhy.includes(d.klic)} onClick={() => zmen({ druhy: f.druhy.includes(d.klic) ? f.druhy.filter((x) => x !== d.klic) : [...f.druhy, d.klic] })}>{d.nazev}</Cip>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="stitek mr-1 w-[62px] shrink-0">Závažnost</span>
                    {ZAVAZNOSTI.map((z) => (
                      <Cip key={z.klic} aktivni={f.zavaznost.includes(z.klic)} onClick={() => zmen({ zavaznost: f.zavaznost.includes(z.klic) ? f.zavaznost.filter((x) => x !== z.klic) : [...f.zavaznost, z.klic] })}>
                        <span aria-hidden className={`h-[8px] w-[8px] rounded-full ${PASMA[z.pasma[0]].pruh}`} /> {z.nazev}
                      </Cip>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* aktivní filtry */}
        {aktivni.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Aktivní filtry">
            {aktivni.map((a) => (
              <button key={a.text} type="button" onClick={a.zrus} className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-linka px-2.5 text-drobne text-inkoust transition-colors hover:border-akcent">
                {a.text} <Ikona nazev="krizek" velikost={10} tah={2.4} /><span className="sr-only">zrušit filtr</span>
              </button>
            ))}
            <button type="button" onClick={() => zmen({ ...VYCHOZI, detail: f.detail })} className="ml-1 min-h-[32px] text-male text-tlum underline underline-offset-4 hover:text-inkoust">
              Zrušit vše
            </button>
          </div>
        )}

        <p aria-live="polite" className="mt-3 mb-2 text-male text-tlum">
          {vysledek.length === 0
            ? "Žádný záznam neodpovídá filtru."
            : f.zalozka === "overene"
              ? `${vysledek.length} ${sklon(vysledek.length, "ověřený záznam", "ověřené záznamy", "ověřených záznamů")} · z toho ${pripadu} ${sklon(pripadu, "případ", "případy", "případů")} · řazeno podle data zjištění`
              : f.zalozka === "nepotvrzene"
                ? `${vysledek.length} ${sklon(vysledek.length, "nepotvrzený záznam", "nepotvrzené záznamy", "nepotvrzených záznamů")} · do počtů nevstupují · řazeno podle data`
                : `${vysledek.length} ${sklon(vysledek.length, "položka", "položky", "položek")} · řazeno podle data`}
        </p>

        {vysledek.length ? (
          <ol>
            {zobrazene.map((r, i) => {
              const rok = r.kdy.slice(0, 4);
              const novyRok = i === 0 || zobrazene[i - 1].kdy.slice(0, 4) !== rok;
              return (
                /*
                  Fragment, ne <li>. RadekSeznamu si vlastní <li> vykresluje
                  sám, takže obal z něj dělal <li> uvnitř <li>. Prohlížeč to
                  po svém přeskládá, React pak hlásí neshodu vykreslení
                  (chyba #418) a celý strom pod tím překreslí — na úvodní
                  straně, v událostech i v jazykových variantách.
                */
                <Fragment key={r.typ === "zaznam" ? r.z.id : r.typ === "nepotvrzeny" ? `np-${r.z.id}` : r.typ === "neproslo" ? `n-${r.n.id}` : r.k.id}>
                  {novyRok && (
                    <li className="mt-3 mb-1 flex items-center gap-3">
                      <span className="cislice text-zaklad font-bold text-inkoust">{rok}</span>
                      <span className="stitek">{vysledek.filter((x) => x.kdy.slice(0, 4) === rok).length} {sklon(vysledek.filter((x) => x.kdy.slice(0, 4) === rok).length, "záznam", "záznamy", "záznamů")}</span>
                    </li>
                  )}
                  {r.typ === "zaznam"
                    ? <RadekZaznamu z={r.z} otevreny={otevreny?.slug === r.z.slug} onOtevri={() => (siroky ? otevri(r.z.slug) : undefined)} siroky={siroky} />
                    : r.typ === "nepotvrzeny" ? <RadekNepotvrzeneho z={r.z} />
                    : r.typ === "neproslo" ? <RadekNeprosle n={r.n} /> : <RadekKandidata k={r.k} />}
                </Fragment>
              );
            })}
          </ol>
        ) : (
          <Prazdno nadpis="Nic neodpovídá zvolenému filtru" popis="Zkuste rozšířit období nebo zrušit omezení." />
        )}

        {vysledek.length > limit && (
          <div className="mt-4 flex justify-center">
            <Tlacitko onKlik={() => setLimit((l) => l + 10)} ikonaVpravo="dolu">
              Zobrazit dalších {Math.min(10, vysledek.length - limit)} · zbývá {vysledek.length - limit}
            </Tlacitko>
          </div>
        )}

        <Nahlaseni />
      </div>

      {siroky && otevreny && (
        <aside aria-label="Detail události" className="lg:sticky lg:top-[88px] lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto rounded-[22px] border border-linka bg-plocha p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Tlacitko kam={`/incident/${otevreny.slug}/`} varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-45">Samostatná stránka</Tlacitko>
            <button type="button" onClick={zavri} className="grid h-11 w-11 place-items-center rounded-[12px] text-tlum hover:bg-plocha2 hover:text-inkoust" aria-label="Zavřít detail">
              <Ikona nazev="krizek" velikost={16} tah={2} />
            </button>
          </div>
          <HlavickaDetailu i={otevreny} />
          <div className="mt-5"><DetailObsah i={otevreny} /></div>
        </aside>
      )}
    </div>
  );
}

/*
  Tři druhy řádku, jedna stavebnice.

  Ověřený záznam, vyvrácená zpráva i automaticky zachycená zpráva mají
  stejné sloupce ve stejném pořadí: datum, značka, země a druh, titulek.
  Liší se jen tím, co ve značkách svítí — a to je přesně ten rozdíl, který
  má čtenář vidět. Kdyby se lišilo i rozvržení, musel by si každý druh
  pokaždé přečíst znovu.
*/

function RadekZaznamu({ z, otevreny, onOtevri, siroky }: { z: Zaznam; otevreny: boolean; onOtevri: () => void; siroky: boolean }) {
  const dr = druh(z);
  const jistota = jistotaZobrazena(z);
  const dobraInfo = jistota === "potvrzeno" || jistota === "vysoka";
  const pachatel = pachatelPotvrzen(z);
  const jeZjisteni = Boolean(z.datumZjisteni && z.datumZjisteni.slice(0, 10) !== z.datumUdalosti.slice(0, 10));
  return (
    <RadekSeznamu
      varianta="holy"
      aktivni={otevreny}
      kam={siroky ? undefined : `/incident/${z.slug}/`}
      onKlik={siroky ? onOtevri : undefined}
      o={{
        datum: kdyZjisteno(z),
        tecka: <TeckaZavaznosti uroven={z.zavaznost} plna={dr === "pripad"} velikost={10} />,
        kodZeme: z.kodZeme,
        zeme: z.zeme,
        meta: [
          dr === "pripad"
            ? <OdznakZavaznosti key="u" uroven={z.zavaznost} />
            : <span key="u">{dr === "aktualizace" ? "nové zjištění" : dr === "opatreni" ? "opatření" : "prohlášení"}</span>,
          jeZjisteni ? <span key="s" className="text-tlum2">stalo se {datumPraha(z.datumUdalosti)}</span> : null,
          z.historicky ? <span key="h" className="text-tlum2">doplněno zpětně</span> : null,
        ].filter(Boolean),
        cerstvost: kdyZjisteno(z),
        titulek: <span className={otevreny ? "text-akcent-svetla" : undefined}>{z.titulek}</span>,
        znacky: (
          /*
            Čtyři údaje, podle kterých se pozná, jestli se dá záznamu věřit.
            Dřív to byly stejně vypadající pilulky v řadě a splývaly.
          */
          <RadaUdaju>
            {dr === "pripad" && <UdajZavaznosti uroven={z.zavaznost} />}
            <Udaj popisek="Jistota informace" hodnota={JISTOTY[jistota].nazev} ton={dobraInfo ? "dobry" : "neutral"} />
            {dr === "pripad" && (
              <Udaj
                popisek="Původce"
                ton={pachatel ? "dobry" : z.puvodce ? "pozor" : "neutral"}
                hodnota={
                  <>
                    {z.puvodce ? PUVODCE_NAZVY[z.puvodce] : "neznámý"}
                    {z.puvodce && !pachatel && <span className="font-normal text-tlum"> — dosud nepotvrzeno</span>}
                  </>
                }
              />
            )}
            <Udaj
              popisek="Zdroj"
              hodnota={uredniZdroj(z) ? "úřední" : "média"}
              ton={uredniZdroj(z) ? "dobry" : "neutral"}
            />
          </RadaUdaju>
        ),
      }}
    />
  );
}

function RadekNeprosle({ n }: { n: Nepotvrzene }) {
  return (
    <RadekSeznamu
      varianta="holy"
      o={{
        datum: n.datum,
        tecka: <TeckaZavaznosti plna velikost={10} />,
        kodZeme: n.kodZeme,
        zeme: n.zeme,
        meta: [<Odznak key="s" ton="klid" ikona="krizek">{n.stav === "vyvraceno" ? "vyvráceno" : "nepotvrzeno"}</Odznak>],
        titulek: <span className="text-tlum">{n.nazev}</span>,
      }}
      detail={
        <div className="space-y-3 pt-1 text-zaklad leading-relaxed">
          <div><div className="stitek mb-1">Co se původně zdálo</div><p className="text-tlum">{n.puvodne}</p></div>
          <div><div className="stitek mb-1">Co ověření ukázalo</div><p className="text-inkoust">{n.overeni}</p></div>
          <p className="text-drobne text-tlum2">Do žádného počtu ani hodnocení nevstupuje.</p>
          <SeznamZdroju zdroje={n.zdroje} husty />
        </div>
      }
    />
  );
}

/** Automaticky zachycená zpráva. Tentýž řádek, jen bez závažnosti a s odkazem na zdroj. */
/*
  Nepotvrzený záznam.

  Je to zpracovaná zpráva: má titulek, zemi, závažnost a doložené zdroje.
  Chybí jediné — že si to někdo přečetl a postavil se za to. Řádek proto
  vypadá jako záznam, ale nikam nevede: klepnutí na něj by otevřelo stránku,
  která neexistuje, a i kdyby existovala, tvářila by se jako hotová věc.

  Místo toho jsou v rozbalení zdroje ven a věta o tom, co konkrétně chybí.
  „Chybí úřední zdroj" je užitečnější než „čeká na schválení": říká to,
  co by stav změnilo.
*/
function RadekNepotvrzeneho({ z }: { z: Zaznam }) {
  const uredni = z.zdroje.filter((x) => x.typ === "primary" && Boolean(x.url));
  const dost = z.zdroje.length >= 2;
  return (
    <RadekSeznamu
      varianta="holy"
      /*
        Vede na vlastní stránku, ne na /incident/. Adresa je součást sdělení:
        záznam, za kterým projekt stojí, a zpráva, kterou nikdo nepotvrdil,
        nemají bydlet na stejné ulici.
      */
      kam={`/nepotvrzeno/${z.id}/`}
      o={{
        datum: kdyZjisteno(z),
        tecka: <span aria-hidden className={`mt-[6px] h-[10px] w-[10px] shrink-0 rounded-full border border-dashed ${PASMA[UROVNE[z.zavaznost].pasmo].pruh.replace("bg-", "border-")}`} />,
        kodZeme: z.kodZeme,
        zeme: z.zeme,
        meta: [
          <Odznak key="n" ton="akcent" ikona="otaznik">nepotvrzeno</Odznak>,
          <span key="z" className="text-tlum2">{UROVNE[z.zavaznost].nazev.toLowerCase()}</span>,
        ],
        titulek: z.titulek,
        znacky: (
          <span className="text-drobne text-tlum2">
            {z.zdroje.length} {sklon(z.zdroje.length, "zdroj", "zdroje", "zdrojů")}
            {uredni.length ? ` · ${uredni.length} úřední` : " · žádný úřední"}
            {z.kategorie.length ? ` · ${z.kategorie.map((x) => KATEGORIE[x as Kategorie]?.nazev ?? x).join(", ")}` : ""}
          </span>
        ),
      }}
      detail={
        <div className="space-y-2 pt-1 text-zaklad leading-relaxed">
          {z.fakta.length > 0 && (
            <ul className="space-y-1 text-tlum">
              {z.fakta.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
          {z.neznameho.length > 0 && (
            <div className="border-l border-linka pl-3 text-male text-tlum2">
              <span className="text-inkoust">Co doložené není:</span>
              <ul className="mt-1 space-y-1">{z.neznameho.map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          )}
          <ul className="space-y-1 text-drobne">
            {z.zdroje.map((x) => (
              <li key={x.url}>
                <a href={x.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz break-all">{x.nazev}</a>
                {x.typ === "primary" ? <span className="text-tlum2"> (úřední)</span> : null}
              </li>
            ))}
          </ul>
          <p className="text-drobne text-tlum2">
            {!dost
              ? "Chybí druhý nezávislý zdroj. Bez něj se záznam nezveřejní ani po schválení."
              : uredni.length
                ? "Doloženo dvěma zdroji včetně úředního — zveřejní se samo při nejbližším běhu."
                : "Doloženo jen médii. Zveřejní se, až to schválí člověk, nebo až přibude úřední zdroj."}
          </p>
        </div>
      }
    />
  );
}

function RadekKandidata({ k }: { k: Kandidat }) {
  return (
    <RadekSeznamu
      varianta="holy"
      o={{
        datum: k.publikovano ?? k.zachyceno,
        tecka: <span aria-hidden className="mt-[6px] h-[10px] w-[10px] shrink-0 rounded-full border border-dashed border-akcent" />,
        kodZeme: k.kodZeme ?? undefined,
        zeme: k.zeme ?? undefined,
        meta: [
          <Odznak key="c" ton="akcent" ikona="otaznik">čeká na ověření</Odznak>,
          /*
            Naléhavé je pořadí ve frontě, ne tvrzení. Odznak proto říká, čeho
            se to týká, a vedle něj zůstává „čeká na ověření“ — ať je vidět,
            že tahle zpráva potvrzená NENÍ, i když je nahoře.
          */
          k.naliehave
            ? <Odznak key="n" ton="vazne" ikona="sirena">
                {k.naliehave.druh === "mobilizace-rusko" ? "k okamžité kontrole: mobilizace" : "k okamžité kontrole: krizové vysílání"}
              </Odznak>
            : null,
          k.klasifikace === "model" ? <span key="m" className="text-tlum2">přeloženo modelem</span> : null,
          // Ručně vytažené proti sítu: čtenář má vědět, že tohle nevybral automat.
          k.klasifikace === "clovek" ? <span key="r" className="text-tlum2">vybráno ručně</span> : null,
        ].filter(Boolean),
        titulek: k.titulek,
        znacky: (
          <span className="text-drobne text-tlum2">
            zdroj: {k.zdroj.nazev}{k.zdroj.primarni ? " (úřední)" : ""}
            {k.kategorie.length ? ` · ${k.kategorie.map((x) => KATEGORIE[x as Kategorie]?.nazev ?? x).join(", ")}` : ""}
          </span>
        ),
      }}
      detail={
        <div className="space-y-2 pt-1 text-zaklad leading-relaxed">
          {k.shrnuti && <p className="text-tlum">{k.shrnuti}</p>}
          {k.titulek !== k.titulekPuvodni && <p className="text-drobne text-tlum2">Původní titulek: {k.titulekPuvodni}</p>}
          <p><a href={k.zdroj.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz break-all">{k.zdroj.url}</a></p>
          <p className="text-drobne text-tlum2">Zachyceno {datumPraha(k.zachyceno)} hodinovým sběrem. Není to ověřený záznam: závažnost ani jistota nejsou stanovené a do počtů nevstupuje. Po lidské kontrole se buď stane záznamem, nebo po třech týdnech zmizí.</p>
        </div>
      }
    />
  );
}
