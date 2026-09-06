"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  { klic: "letos", nazev: "Letos", dni: null },
  { klic: "vse", nazev: "Vše", dni: null },
] as const;
type Obdobi = (typeof OBDOBI)[number]["klic"];

const OVERENI = [
  { klic: "vse", nazev: "Vše" },
  { klic: "uredni", nazev: "Jen s úředním zdrojem" },
  { klic: "potvrzeny-pachatel", nazev: "Jen s potvrzeným pachatelem" },
  { klic: "neprosle", nazev: "Nepotvrzené a vyvrácené" },
  { klic: "automaticke", nazev: "Automaticky zachycené" },
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
  rusko: "Rusko", ukrajina: "Ukrajina", "jiny-stat": "jiný stát", domaci: "domácí", neznamy: "neznámý",
};

interface Filtr {
  zeme: string | null;
  tema: Kategorie | null;
  obdobi: Obdobi;
  overeni: Overeni;
  druhy: DruhZaznamu[];
  zavaznost: string[];
  detail: string | null;
}

const VYCHOZI: Filtr = { zeme: null, tema: null, obdobi: "vse", overeni: "vse", druhy: [], zavaznost: [], detail: null };

function zAdresy(p: URLSearchParams): Filtr {
  const obdobi = p.get("obdobi");
  const overeni = p.get("overeni");
  const tema = p.get("tema");
  return {
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
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-[12px] px-2.5 text-[13px] font-semibold transition-colors ${
        aktivni ? "bg-akcent/20 text-akcent-svetla" : "text-tlum hover:bg-plocha2 hover:text-inkoust"
      }`}
    >
      {children}
    </button>
  );
}

type Radek =
  | { typ: "zaznam"; kdy: string; z: Zaznam }
  | { typ: "neproslo"; kdy: string; n: Nepotvrzene }
  | { typ: "kandidat"; kdy: string; k: Kandidat };

export function UdalostiKlient({ zaznamy, neprosle, kandidati = [] }: { zaznamy: Zaznam[]; neprosle: Nepotvrzene[]; kandidati?: Kandidat[] }) {
  const [f, zmen] = useFiltrVAdrese();
  const siroky = useSiroky();
  const [pokrocile, setPokrocile] = useState(false);
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
    const a: Radek[] = f.overeni === "neprosle" || f.overeni === "automaticke" ? [] : zaznamy
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
    const b: Radek[] = f.overeni === "vse" || f.overeni === "neprosle" ? neprosle
      .filter((n) => (!f.zeme || n.kodZeme === f.zeme) && !f.tema && !f.druhy.length && !f.zavaznost.length && vObdobi(n.datum))
      .map((n) => ({ typ: "neproslo", kdy: n.datum, n })) : [];
    const c: Radek[] = f.overeni === "vse" || f.overeni === "automaticke" ? kandidati
      .filter((k) => (!f.zeme || k.kodZeme === f.zeme) && (!f.tema || k.kategorie.includes(f.tema)) && !f.druhy.length && !f.zavaznost.length && vObdobi(k.publikovano ?? k.zachyceno))
      .map((k) => ({ typ: "kandidat", kdy: k.publikovano ?? k.zachyceno, k })) : [];
    return [...a, ...b, ...c].sort((x, y) => y.kdy.localeCompare(x.kdy));
  }, [zaznamy, neprosle, kandidati, f]);

  useEffect(() => { setLimit(10); }, [f.zeme, f.tema, f.obdobi, f.overeni, f.druhy, f.zavaznost]);

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
  const maPokrocile = f.druhy.length > 0 || f.zavaznost.length > 0;

  const zobrazene = vysledek.slice(0, limit);
  const pripadu = vysledek.filter((r) => r.typ === "zaznam" && druh(r.z) === "pripad").length;
  const automatickych = vysledek.filter((r) => r.typ === "kandidat").length;

  return (
    <div className={`grid gap-8 ${siroky && otevreny ? "lg:grid-cols-[minmax(0,1fr)_minmax(380px,44%)]" : ""}`}>
      <div className="min-w-0">
        {/* filtry */}
        <div className="space-y-1.5 border-b border-linka2 pb-3" role="group" aria-label="Filtry">
          <div className="flex flex-wrap items-center gap-1">
            <span className="stitek mr-1 w-[62px] shrink-0">Země</span>
            <Cip aktivni={f.zeme === null} onClick={() => zmen({ zeme: null })}>Vše</Cip>
            {zeme.map(([kod, z]) => (
              <Cip key={kod} aktivni={f.zeme === kod} onClick={() => zmen({ zeme: f.zeme === kod ? null : kod })} title={z.nazev}>
                <Vlajka kod={kod} /> <span className="cislice">{kod}</span> <span className="text-tlum2">{z.pocet}</span>
              </Cip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="stitek mr-1 w-[62px] shrink-0">Téma</span>
            <Cip aktivni={f.tema === null} onClick={() => zmen({ tema: null })}>Vše</Cip>
            {temata.map((k) => (
              <Cip key={k} aktivni={f.tema === k} onClick={() => zmen({ tema: f.tema === k ? null : k })}>{KATEGORIE[k].nazev}</Cip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex flex-wrap items-center gap-1">
              <span className="stitek mr-1 w-[62px] shrink-0">Období</span>
              {OBDOBI.map((o) => <Cip key={o.klic} aktivni={f.obdobi === o.klic} onClick={() => zmen({ obdobi: o.klic })}>{o.nazev}</Cip>)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex flex-wrap items-center gap-1">
              <span className="stitek mr-1 w-[62px] shrink-0">Ověření</span>
              {OVERENI.map((o) => <Cip key={o.klic} aktivni={f.overeni === o.klic} onClick={() => zmen({ overeni: o.klic })}>{o.nazev}</Cip>)}
            </div>
            <button
              type="button"
              onClick={() => setPokrocile((x) => !x)}
              aria-expanded={pokrocile || maPokrocile}
              className="ml-auto inline-flex min-h-[36px] items-center gap-1 text-[13px] text-tlum hover:text-inkoust"
            >
              Další filtry <Ikona nazev="dolu" velikost={12} tah={2} trida={`transition-transform ${pokrocile || maPokrocile ? "rotate-180" : ""}`} />
            </button>
          </div>
          {(pokrocile || maPokrocile) && (
            <div className="space-y-1.5 border-t border-linka2 pt-2">
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
                    <span aria-hidden className={`h-[7px] w-[7px] rounded-[2px] ${PASMA[z.pasma[0]].pruh}`} /> {z.nazev}
                  </Cip>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* aktivní filtry */}
        {aktivni.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Aktivní filtry">
            {aktivni.map((a) => (
              <button key={a.text} type="button" onClick={a.zrus} className="inline-flex min-h-[32px] items-center gap-1 rounded-[12px] border border-linka px-2 text-[12.5px] text-inkoust hover:border-akcent">
                {a.text} <Ikona nazev="krizek" velikost={10} tah={2.4} /><span className="sr-only">zrušit filtr</span>
              </button>
            ))}
            <button type="button" onClick={() => zmen({ ...VYCHOZI, detail: f.detail })} className="ml-1 min-h-[32px] text-[13px] text-tlum underline underline-offset-4 hover:text-inkoust">
              Zrušit vše
            </button>
          </div>
        )}

        <p aria-live="polite" className="mt-3 mb-2 text-[13px] text-tlum">
          {vysledek.length === 0
            ? "Žádný záznam neodpovídá filtru."
            : `${vysledek.length} ${sklon(vysledek.length, "záznam", "záznamy", "záznamů")} · z toho ${pripadu} ${sklon(pripadu, "případ", "případy", "případů")}${automatickych ? ` · ${automatickych} automaticky zachycených čeká na ověření` : ""} · řazeno podle data zjištění`}
        </p>

        {vysledek.length ? (
          <ol>
            {zobrazene.map((r, i) => {
              const rok = r.kdy.slice(0, 4);
              const novyRok = i === 0 || zobrazene[i - 1].kdy.slice(0, 4) !== rok;
              return (
                <li key={r.typ === "zaznam" ? r.z.id : r.typ === "neproslo" ? `n-${r.n.id}` : r.k.id} className="contents">
                  {novyRok && (
                    <div className="mt-3 mb-1 flex items-center gap-3">
                      <span className="cislice text-[15px] font-bold text-inkoust">{rok}</span>
                      <span className="stitek">{vysledek.filter((x) => x.kdy.slice(0, 4) === rok).length} {sklon(vysledek.filter((x) => x.kdy.slice(0, 4) === rok).length, "záznam", "záznamy", "záznamů")}</span>
                    </div>
                  )}
                  {r.typ === "zaznam"
                    ? <RadekZaznamu z={r.z} otevreny={otevreny?.slug === r.z.slug} onOtevri={() => (siroky ? otevri(r.z.slug) : undefined)} siroky={siroky} />
                    : r.typ === "neproslo" ? <RadekNeprosle n={r.n} /> : <RadekKandidata k={r.k} />}
                </li>
              );
            })}
          </ol>
        ) : (
          <Prazdno nadpis="Nic neodpovídá zvolenému filtru" popis="Zkuste rozšířit období nebo zrušit omezení." />
        )}

        {vysledek.length > limit && (
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => setLimit((l) => l + 10)} className="inline-flex min-h-[44px] items-center gap-2 rounded-[16px] border border-linka px-5 text-[14px] font-semibold text-inkoust hover:border-akcent">
              Zobrazit dalších {Math.min(10, vysledek.length - limit)} · zbývá {vysledek.length - limit}
            </button>
          </div>
        )}

        <Nahlaseni />
      </div>

      {siroky && otevreny && (
        <aside aria-label="Detail události" className="lg:sticky lg:top-[88px] lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto rounded-[22px] border border-linka bg-plocha p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link href={`/incident/${otevreny.slug}/`} className="text-[13px] font-semibold text-akcent hover:text-akcent-svetla">Samostatná stránka</Link>
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

function Znacka({ hodnota, dobra }: { hodnota: string; dobra: boolean | null }) {
  const tridy = dobra === true ? "text-[#8fd6ae]" : dobra === false ? "text-jantar" : "text-tlum2";
  return <span className={`text-[12px] font-semibold ${tridy}`}>{hodnota}</span>;
}

function RadekZaznamu({ z, otevreny, onOtevri, siroky }: { z: Zaznam; otevreny: boolean; onOtevri: () => void; siroky: boolean }) {
  const t = tokeny(z.zavaznost);
  const dr = druh(z);
  const jistota = jistotaZobrazena(z);
  const dobraInfo = jistota === "potvrzeno" || jistota === "vysoka";
  const pachatel = pachatelPotvrzen(z);
  const jeZjisteni = Boolean(z.datumZjisteni && z.datumZjisteni.slice(0, 10) !== z.datumUdalosti.slice(0, 10));
  const obsah = (
    <>
      <span className="cislice w-[64px] shrink-0 pt-[3px] text-[12.5px] text-tlum">{datumPraha(kdyZjisteno(z)).replace(/ \d{4}$/, "")}</span>
      <span aria-hidden className={`mt-[7px] h-[10px] w-[10px] shrink-0 rounded-[2px] ${dr === "pripad" ? t.pruh : "border border-tlum2 bg-transparent"}`} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-tlum">
          <Vlajka kod={z.kodZeme} />
          <span>{z.kodZeme === "CZ" ? "Česko" : z.zeme}</span>
          <span aria-hidden>·</span>
          <span>{dr === "pripad" ? UROVNE[z.zavaznost].nazev : dr === "aktualizace" ? "aktualizace" : dr === "opatreni" ? "opatření" : "reakce"}</span>
          {jeZjisteni && <span className="text-tlum2">· stalo se {datumPraha(z.datumUdalosti)}</span>}
          {z.historicky && <span className="text-tlum2">· doplněno zpětně</span>}
        </span>
        <span className={`block text-[15px] font-semibold leading-snug ${otevreny ? "text-akcent-svetla" : "text-inkoust"}`}>{z.titulek}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <Znacka hodnota={`informace: ${JISTOTY[jistota].nazev.toLowerCase()}`} dobra={dobraInfo} />
          {dr === "pripad" && <Znacka hodnota={`pachatel: ${z.puvodce ? PUVODCE_NAZVY[z.puvodce] : "neznámý"}${z.puvodce && !pachatel ? " (nepotvrzeno)" : ""}`} dobra={pachatel ? true : z.puvodce ? false : null} />}
          <Znacka hodnota={uredniZdroj(z) ? "úřední zdroj" : "zdroj: média"} dobra={uredniZdroj(z) ? true : null} />
        </span>
      </span>
    </>
  );
  const tridy = `flex w-full items-start gap-3 border-b border-linka2 py-2.5 text-left transition-colors hover:bg-plocha ${otevreny ? "bg-plocha" : ""}`;
  return siroky ? (
    <button type="button" onClick={onOtevri} aria-expanded={otevreny} className={tridy}>{obsah}</button>
  ) : (
    <Link href={`/incident/${z.slug}/`} className={tridy}>{obsah}</Link>
  );
}

function RadekNeprosle({ n }: { n: Nepotvrzene }) {
  return (
    <details className="group border-b border-linka2">
      <summary className="flex cursor-pointer items-start gap-3 py-2.5 hover:bg-plocha">
        <span className="cislice w-[64px] shrink-0 pt-[3px] text-[12.5px] text-tlum">{datumPraha(n.datum).replace(/ \d{4}$/, "")}</span>
        <span aria-hidden className="mt-[7px] h-[10px] w-[10px] shrink-0 rounded-[2px] bg-tlum2" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-tlum">
            <Vlajka kod={n.kodZeme} /> <span>{n.kodZeme === "CZ" ? "Česko" : n.zeme}</span> <span aria-hidden>·</span>
            <span className="font-semibold text-[#8fd6ae]">{n.stav === "vyvraceno" ? "vyvráceno" : "nepotvrzeno"}</span>
          </span>
          <span className="block text-[15px] font-semibold leading-snug text-tlum">{n.nazev}</span>
        </span>
        <Ikona nazev="dolu" velikost={13} tah={2} trida="mt-2 shrink-0 text-tlum2 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pb-4 pl-[88px] text-[14px] leading-relaxed">
        <div><div className="stitek mb-1">Co se původně zdálo</div><p className="text-tlum">{n.puvodne}</p></div>
        <div><div className="stitek mb-1">Co ověření ukázalo</div><p className="text-inkoust">{n.overeni}</p></div>
        <p className="text-[12.5px] text-tlum2">Do žádného počtu ani hodnocení nevstupuje.</p>
        <SeznamZdroju zdroje={n.zdroje} husty />
      </div>
    </details>
  );
}

/** Automaticky zachycená zpráva. Vypadá jinak než záznam: čárkovaně, bez závažnosti, s odkazem na zdroj. */
function RadekKandidata({ k }: { k: Kandidat }) {
  return (
    <details className="group border-b border-dashed border-linka">
      <summary className="flex cursor-pointer items-start gap-3 py-2.5 hover:bg-plocha">
        <span className="cislice w-[64px] shrink-0 pt-[3px] text-[12.5px] text-tlum">{datumPraha(k.publikovano ?? k.zachyceno).replace(/ \d{4}$/, "")}</span>
        <span aria-hidden className="mt-[7px] h-[10px] w-[10px] shrink-0 rounded-[2px] border border-dashed border-akcent" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-tlum">
            {k.kodZeme ? <><Vlajka kod={k.kodZeme} /> <span>{k.kodZeme === "CZ" ? "Česko" : k.zeme}</span></> : <span>země neurčena</span>}
            <span aria-hidden>·</span>
            <span className="font-semibold text-akcent">automaticky zachyceno · čeká na ověření</span>
            {k.klasifikace === "model" && <span className="text-tlum2">· přeloženo modelem</span>}
          </span>
          <span className="block text-[15px] font-semibold leading-snug text-inkoust">{k.titulek}</span>
          <span className="mt-0.5 block text-[12px] text-tlum2">zdroj: {k.zdroj.nazev}{k.zdroj.primarni ? " (úřední)" : ""}{k.kategorie.length ? ` · ${k.kategorie.map((x) => KATEGORIE[x as Kategorie]?.nazev ?? x).join(", ")}` : ""}</span>
        </span>
        <Ikona nazev="dolu" velikost={13} tah={2} trida="mt-2 shrink-0 text-tlum2 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 pb-4 pl-[88px] text-[14px] leading-relaxed">
        {k.shrnuti && <p className="text-tlum">{k.shrnuti}</p>}
        {k.titulek !== k.titulekPuvodni && <p className="text-[12.5px] text-tlum2">Původní titulek: {k.titulekPuvodni}</p>}
        <p><a href={k.zdroj.url} target="_blank" rel="noopener noreferrer" className="odkaz break-all">{k.zdroj.url}</a></p>
        <p className="text-[12.5px] text-tlum2">Zachyceno {datumPraha(k.zachyceno)} hodinovým sběrem. Není to ověřený záznam: závažnost ani jistota nejsou stanovené a do počtů nevstupuje. Po lidské kontrole se buď stane záznamem, nebo po třech týdnech zmizí.</p>
      </div>
    </details>
  );
}
