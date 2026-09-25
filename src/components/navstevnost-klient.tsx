"use client";

import { useEffect, useMemo, useState } from "react";
import { api, useUcet } from "@/lib/ucet";
import { WEB } from "@/config/web";
import { Tlacitko } from "./ui";
import { Hlaska } from "./formulare";
import { HlavickaWidgetu } from "./widgety";

/*
  Návštěvnost pro správce (25. 9. 2026): čte /sprava/mereni. Teplotní mapa
  je mřížka 20 × 20 položená přes stránku v rámu; buňky se barví podle
  počtu kliknutí nebo pohybu. Není to přesná poloha, je to „kde se lidé
  zdržují“ — a to stačí, aniž by se ukládal jediný člověk.
*/
interface Souhrn {
  dni: number; od: string; mrizka: number;
  poDnech: { den: string; n: number }[];
  stranky: { cesta: string; zobrazeni: number; kliku: number }[];
  prvky: { cesta: string; prvek: string; n: number }[];
  odkud: { odkud: string; n: number }[];
  zarizeni: { zarizeni: string; n: number }[];
  teplo: { cesta: string; klik: Bunka[]; pohyb: Bunka[] };
}
interface Bunka { zarizeni: string; bx: number; by: number; n: number }

const NAZVY_ODKUD: Record<string, string> = { primo: "přímo / záložka", vyhledavac: "vyhledávač", socialni: "sociální síť", web: "jiný web / vlastní odkaz", odber: "odběr" };
const NAZVY_ZARIZENI: Record<string, string> = { mobil: "mobil", tablet: "tablet", pocitac: "počítač" };

function Pruhy({ radky, popisek }: { radky: { nazev: string; n: number; vedle?: string }[]; popisek: string }) {
  const max = Math.max(1, ...radky.map((r) => r.n));
  return (
    <ul aria-label={popisek} className="space-y-1.5 px-4 pb-4">
      {radky.map((r) => (
        <li key={r.nazev} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-male">
          <span className="min-w-0">
            <span className="block truncate text-inkoust">{r.nazev}</span>
            <span className="mt-0.5 block h-1.5 rounded-full bg-plocha2"><span className="block h-full rounded-full bg-akcent/70" style={{ width: `${Math.round((r.n / max) * 100)}%` }} /></span>
          </span>
          <span className="cislice text-right text-tlum">{r.n}{r.vedle && <span className="block text-mikro text-tlum2">{r.vedle}</span>}</span>
        </li>
      ))}
      {!radky.length && <li className="text-male text-tlum2">Zatím nic.</li>}
    </ul>
  );
}

export function NavstevnostKlient() {
  const { ucet, nacita } = useUcet();
  const nacteno = !nacita;
  const [dni, setDni] = useState(30);
  const [cesta, setCesta] = useState("/");
  const [druh, setDruh] = useState<"klik" | "pohyb">("klik");
  const [zar, setZar] = useState<"pocitac" | "mobil" | "tablet">("pocitac");
  const [data, setData] = useState<Souhrn | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    if (!nacteno || ucet?.role !== "admin") return;
    api<Souhrn>(`/sprava/mereni?dni=${dni}&cesta=${encodeURIComponent(cesta)}`).then(setData).catch((e) => setChyba(e instanceof Error ? e.message : "Nepodařilo se načíst."));
  }, [nacteno, ucet, dni, cesta]);

  const mapa = useMemo(() => {
    if (!data) return null;
    const m = data.mrizka;
    const bunky = new Array<number>(m * m).fill(0);
    for (const b of data.teplo[druh]) if (b.zarizeni === zar) bunky[b.by * m + b.bx] += b.n;
    const max = Math.max(1, ...bunky);
    return { m, bunky, max, celkem: bunky.reduce((a, b) => a + b, 0) };
  }, [data, druh, zar]);

  if (!nacteno) return <p className="text-male text-tlum">Načítám…</p>;
  if (ucet?.role !== "admin") return <Hlaska typ="info">Tahle stránka je jen pro správce. Přihlaste se účtem s rolí správce.</Hlaska>;
  if (chyba) return <Hlaska typ="chyba">{chyba}</Hlaska>;
  if (!data) return <p className="text-male text-tlum">Načítám…</p>;

  const zobrazeniCelkem = data.poDnech.reduce((a, d) => a + d.n, 0);
  const klikuCelkem = data.stranky.reduce((a, s) => a + s.kliku, 0);
  const maxDen = Math.max(1, ...data.poDnech.map((d) => d.n));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => <Tlacitko key={d} onKlik={() => setDni(d)} varianta={dni === d ? "plny" : "obrys"} velikost="s">{d} dní</Tlacitko>)}
        <span className="ml-auto text-mikro text-tlum2">od {data.od} · bez identifikace, jen součty po dnech</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["zobrazení stránek", zobrazeniCelkem], ["kliknutí na prvky", klikuCelkem], ["stránek s návštěvou", data.stranky.length]].map(([n, v]) => (
          <div key={n} className="rounded-[22px] bg-plocha px-4 py-3"><span className="cislice block text-cislo font-bold leading-none text-inkoust">{v}</span><span className="mt-1 block text-mikro text-tlum2">{n}</span></div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[22px] bg-plocha">
        <HlavickaWidgetu ikona="graf" nazev="Zobrazení po dnech" meta={<span className="cislice">{data.poDnech.length} dní s návštěvou</span>} />
        <div className="flex h-[120px] items-end gap-[3px] px-4 pb-3" aria-label="Zobrazení po dnech">
          {data.poDnech.map((d) => <span key={d.den} title={`${d.den}: ${d.n}`} className="flex-1 rounded-t bg-akcent/70" style={{ height: `${Math.max(3, Math.round((d.n / maxDen) * 100))}%` }} />)}
          {!data.poDnech.length && <span className="text-male text-tlum2">Zatím nic.</span>}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[22px] bg-plocha">
          <HlavickaWidgetu ikona="dokument" nazev="Stránky a prokliky" napoveda={<span className="block">Zobrazení stránky a kolik kliknutí na odkazy či tlačítka na ní proběhlo.</span>} />
          <Pruhy popisek="Stránky" radky={data.stranky.map((s) => ({ nazev: s.cesta, n: s.zobrazeni, vedle: `${s.kliku} kliků` }))} />
        </section>
        <section className="overflow-hidden rounded-[22px] bg-plocha">
          <HlavickaWidgetu ikona="terc" nazev="Nejklikanější prvky" />
          <Pruhy popisek="Prvky" radky={data.prvky.map((p) => ({ nazev: `${p.prvek} · ${p.cesta}`, n: p.n }))} />
        </section>
        <section className="overflow-hidden rounded-[22px] bg-plocha">
          <HlavickaWidgetu ikona="globus" nazev="Odkud lidé přišli" />
          <Pruhy popisek="Původ" radky={data.odkud.map((o) => ({ nazev: NAZVY_ODKUD[o.odkud] ?? o.odkud, n: o.n }))} />
        </section>
        <section className="overflow-hidden rounded-[22px] bg-plocha">
          <HlavickaWidgetu ikona="telefon" nazev="Zařízení" />
          <Pruhy popisek="Zařízení" radky={data.zarizeni.map((z) => ({ nazev: NAZVY_ZARIZENI[z.zarizeni] ?? z.zarizeni, n: z.n }))} />
        </section>
      </div>

      <section className="overflow-hidden rounded-[22px] bg-plocha">
        <HlavickaWidgetu ikona="oko" nazev="Teplotní mapa" meta={<span className="cislice">{mapa?.celkem ?? 0} bodů</span>} napoveda={<span className="block">Mřížka 20 × 20 přes celou stránku: vodorovně šířka okna, svisle výška stránky. Rám pod ní je živá stránka pro orientaci; poloha je přibližná.</span>} />
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <select value={cesta} onChange={(e) => setCesta(e.target.value)} className="min-h-[36px] rounded-full border border-linka bg-plocha px-3 text-male text-inkoust">
            {[...new Set(["/", ...data.stranky.map((s) => s.cesta)])].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {(["klik", "pohyb"] as const).map((d) => <Tlacitko key={d} onKlik={() => setDruh(d)} varianta={druh === d ? "plny" : "obrys"} velikost="s">{d === "klik" ? "kliknutí" : "pohyb myši"}</Tlacitko>)}
          {(["pocitac", "tablet", "mobil"] as const).map((z) => <Tlacitko key={z} onKlik={() => setZar(z)} varianta={zar === z ? "plny" : "obrys"} velikost="s">{NAZVY_ZARIZENI[z]}</Tlacitko>)}
        </div>
        {mapa && (
          <div className="relative mx-4 mb-4 overflow-hidden rounded-[14px] border border-linka2" style={{ height: 1400 }}>
            <iframe title={`Náhled ${cesta}`} src={`${WEB.url}${cesta}`} className="absolute inset-0 h-full w-full opacity-60" style={{ pointerEvents: "none" }} tabIndex={-1} />
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${mapa.m}, 1fr)`, gridTemplateRows: `repeat(${mapa.m}, 1fr)` }} aria-hidden>
              {mapa.bunky.map((n, i) => <span key={i} title={n ? String(n) : undefined} style={{ background: n ? `rgba(232, 72, 79, ${0.15 + 0.7 * (n / mapa.max)})` : "transparent" }} />)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
