"use client";

import { useRef, useState } from "react";
import {
  bateriePro, nejvetsiSpotrebitele, panelyWp, PRIORITY, PVGIS_URL, REZIMY, SLUNECNE_HODINY, SPOTREBICE, spickaW, spotrebaPoRezimech,
  UCINNOST_SOLARU_VYCHOZI, vydrzHodin, zPredvolby, ZTRATY_VYCHOZI, type Priorita, type Rezim, type Sezona, type VybranySpotrebic,
} from "@/lib/energie";
import { POLE, Popisek } from "./formulare";
import { Ikona } from "./ikony";
import { Otaznik } from "./zaklad";

/*
  Výběr spotřebičů místo watthodin.

  Člověk zaškrtne, co bude za den potřebovat, a u každé věci řekne, jestli
  bez ní nejde fungovat. Příkon a hodiny jsou předvyplněné orientační
  hodnoty a jdou přepsat podle štítku. Součet po režimech je hned vidět.
*/

const REZIM_VYCHOZI: Rezim = "nutne";

export function VyberSpotrebicu({ vybrane, onChange }: { vybrane: VybranySpotrebic[]; onChange: (v: VybranySpotrebic[]) => void }) {
  const [vlastni, setVlastni] = useState("");
  const mapa = new Map(vybrane.map((s) => [s.klic, s]));
  const prepni = (klic: string) => {
    if (mapa.has(klic)) onChange(vybrane.filter((s) => s.klic !== klic));
    else { const p = SPOTREBICE.find((s) => s.klic === klic); if (p) onChange([...vybrane, zPredvolby(p)]); }
  };
  const uprav = (klic: string, z: Partial<VybranySpotrebic>) => onChange(vybrane.map((s) => (s.klic === klic ? { ...s, ...z } : s)));
  const poleVlastni = useRef<HTMLInputElement>(null);
  const pridejVlastni = () => {
    const nazev = vlastni.trim();
    // Bez názvu dřív tlačítko tiše nic neudělalo (mrtvý klik); teď aspoň ukáže, co chybí.
    if (!nazev) { poleVlastni.current?.focus(); return; }
    onChange([...vybrane, { klic: `vlastni-${Date.now().toString(36)}`, nazev, w: 0, hodin: 1, priorita: "nutne" }]);
    setVlastni("");
  };
  const spotreba = spotrebaPoRezimech(vybrane);
  const vlastniPolozky = vybrane.filter((s) => s.klic.startsWith("vlastni-"));

  return (
    <div>
      <ul className="border-y border-linka2">
        {SPOTREBICE.map((p) => {
          const s = mapa.get(p.klic);
          return (
            <li key={p.klic} className="py-2">
              <label className="flex min-h-[40px] cursor-pointer items-start gap-3">
                <input type="checkbox" checked={Boolean(s)} onChange={() => prepni(p.klic)} className="mt-1 h-4 w-4 shrink-0 accent-akcent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-male text-inkoust">{p.nazev}</span>
                  <span className="block text-drobne text-tlum2">obvykle {p.w} W · {p.hodin} h denně{p.poznamka ? ` · ${p.poznamka}` : ""}</span>
                </span>
              </label>
              {s && <RadekHodnot s={s} uprav={(z) => uprav(p.klic, z)} />}
            </li>
          );
        })}
        {vlastniPolozky.map((s) => (
          <li key={s.klic} className="py-2">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => onChange(vybrane.filter((x) => x.klic !== s.klic))} className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-tlum2 hover:bg-plocha2 hover:text-inkoust" aria-label={`Odebrat ${s.nazev}`}><Ikona nazev="krizek" velikost={12} tah={2} /></button>
              <span className="min-w-0 flex-1"><span className="block text-male text-inkoust">{s.nazev}</span><span className="block text-drobne text-tlum2">vlastní položka, doplňte příkon ze štítku</span></span>
            </div>
            <RadekHodnot s={s} uprav={(z) => uprav(s.klic, z)} />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Popisek pro="en-vlastni">Něco jiného</Popisek>
          <input ref={poleVlastni} id="en-vlastni" className={POLE} value={vlastni} onChange={(e) => setVlastni(e.target.value)} placeholder="název spotřebiče" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); pridejVlastni(); } }} />
        </div>
        <button type="button" onClick={pridejVlastni} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-linka px-4 text-male font-semibold text-inkoust hover:border-akcent"><Ikona nazev="plus" velikost={13} tah={2.2} /> Přidat</button>
      </div>

      {vybrane.length > 0 && (
        <dl className="mt-4 grid grid-cols-3 gap-3 pt-4">
          {(Object.keys(REZIMY) as Rezim[]).map((r) => (
            <div key={r}>
              <dt className="stitek">{REZIMY[r]}</dt>
              <dd className="cislice mt-1 text-vetsi font-bold leading-none text-inkoust">{spotreba[r]} <span className="text-male font-normal text-tlum2">Wh/den</span></dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 text-drobne text-tlum2">Předvolby jsou orientační. Rozhoduje štítek na zařízení: příkon ve W, u lednice průměr přes den. Do výpočtu vydrže jde režim „{REZIMY[REZIM_VYCHOZI]}“.</p>
    </div>
  );
}

function RadekHodnot({ s, uprav }: { s: VybranySpotrebic; uprav: (z: Partial<VybranySpotrebic>) => void }) {
  return (
    <div className="mt-2 grid grid-cols-[1fr_1fr_1.6fr] gap-2 pl-7">
      <label className="block">
        <span className="stitek block">W</span>
        <input inputMode="decimal" className={`${POLE} cislice`} value={s.w} onChange={(e) => uprav({ w: Math.max(0, Number(e.target.value.replace(",", ".")) || 0) })} />
      </label>
      <label className="block">
        <span className="stitek block">h denně</span>
        <input inputMode="decimal" className={`${POLE} cislice`} value={s.hodin} onChange={(e) => uprav({ hodin: Math.max(0, Number(e.target.value.replace(",", ".")) || 0) })} />
      </label>
      <label className="block">
        <span className="stitek block">Jak moc</span>
        <select value={s.priorita} onChange={(e) => uprav({ priorita: e.target.value as Priorita })} className={POLE}>
          {(Object.keys(PRIORITY) as Priorita[]).map((p) => <option key={p} value={p}>{PRIORITY[p]}</option>)}
        </select>
      </label>
    </div>
  );
}

/*
  Solár k powerstation: kolik Wp panelů pokryje denní potřebu v každém
  režimu, a jak velká baterie překlene dny bez slunce. Bez značek:
  výsledek se porovnává s údajem „max. solární vstup“ a „kapacita“ na
  štítku zařízení, ať je od kohokoli.
*/
export function SolarniOdhad({ kapacitaWh, spotrebice, solarWp, onSolarWp }: { kapacitaWh: number; spotrebice: VybranySpotrebic[]; solarWp: number | null; onSolarWp: (v: number | null) => void }) {
  const [sezona, setSezona] = useState<Sezona>("prechod");
  const [ucinnost, setUcinnost] = useState(UCINNOST_SOLARU_VYCHOZI);
  const [dniBezSlunce, setDniBezSlunce] = useState(2);
  if (!spotrebice.length) return null;
  const spotreba = spotrebaPoRezimech(spotrebice);
  const hodin = SLUNECNE_HODINY[sezona].hodin;
  const vydrz = vydrzHodin(kapacitaWh, spotreba, ZTRATY_VYCHOZI);
  const top = nejvetsiSpotrebitele(spotrebice, 3);
  const rezimy = Object.keys(REZIMY) as Rezim[];
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="nadpis-boxu">Energie a solár</span>
        <Otaznik popis={<span className="block">Panely: denní potřeba ÷ (slunečné hodiny × účinnost). Slunečné hodiny jsou orientační pro střední Evropu; přesné pro vaše místo dá nástroj PVGIS Evropské komise. Účinnost {Math.round(ucinnost * 100)} % zahrnuje sklon, teplotu a regulátor. Výsledek porovnejte s údaji „max. solární vstup“ a „kapacita“ na štítku powerstation.</span>} />
      </div>

      {kapacitaWh > 0 && (
        <ul className="mt-2">
          {rezimy.map((r) => (
            <li key={r} className="flex items-center justify-between gap-3 py-1">
              <span className="text-male text-tlum">Vydrž · {REZIMY[r]}</span>
              <span className="cislice text-male font-semibold text-inkoust">{vydrz[r] === null ? <span className="font-normal text-tlum2">nic k napájení</span> : vydrz[r]! >= 48 ? `${Math.round(vydrz[r]! / 24)} d` : `${vydrz[r]} h`}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-1">
            <span className="text-male text-tlum">Špička naráz · vše</span>
            <span className="cislice text-male font-semibold text-inkoust">{spickaW(spotrebice, "vse")} W</span>
          </li>
        </ul>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="stitek block">Roční doba</span>
          <select value={sezona} onChange={(e) => setSezona(e.target.value as Sezona)} className={POLE}>
            {(Object.keys(SLUNECNE_HODINY) as Sezona[]).map((s) => <option key={s} value={s}>{SLUNECNE_HODINY[s].nazev} · {SLUNECNE_HODINY[s].hodin} h</option>)}
          </select>
        </label>
        <label className="block">
          <span className="stitek block">Účinnost</span>
          <select value={ucinnost} onChange={(e) => setUcinnost(Number(e.target.value))} className={POLE}>
            <option value={0.8}>80 % · ideální sklon</option><option value={0.7}>70 % · běžně</option><option value={0.5}>50 % · balkon, stín</option>
          </select>
        </label>
      </div>

      <ul className="mt-3">
        {rezimy.map((r) => {
          const wp = panelyWp(spotreba[r], hodin, ucinnost);
          return (
            <li key={r} className="flex items-center justify-between gap-3 py-1">
              <span className="text-male text-tlum">Panely · {REZIMY[r]}</span>
              <span className="cislice text-male font-semibold text-inkoust">{wp === null ? <span className="font-normal text-tlum2">—</span> : `${wp} Wp`}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="stitek block">Dny bez slunce</span>
          <input inputMode="numeric" className={`${POLE} cislice`} value={dniBezSlunce} onChange={(e) => setDniBezSlunce(Math.max(0, Number(e.target.value) || 0))} />
        </label>
        <label className="block">
          <span className="stitek block">Mám panely (Wp)</span>
          <input inputMode="numeric" className={`${POLE} cislice`} value={solarWp ?? ""} onChange={(e) => onSolarWp(e.target.value.trim() === "" ? null : Math.max(0, Number(e.target.value) || 0))} placeholder="nemám" />
        </label>
      </div>
      <p className="mt-2 text-male text-tlum">
        Na {dniBezSlunce} {dniBezSlunce === 1 ? "den" : dniBezSlunce < 5 ? "dny" : "dní"} bez slunce v režimu „{REZIMY["nutne"]}“ je potřeba baterie asi <b className="cislice font-semibold text-inkoust">{bateriePro(dniBezSlunce, spotreba.nutne) ?? "—"} Wh</b>
        {kapacitaWh > 0 && bateriePro(dniBezSlunce, spotreba.nutne) !== null && (kapacitaWh >= bateriePro(dniBezSlunce, spotreba.nutne)! ? "; vaše kapacita stačí." : `; máte ${kapacitaWh} Wh.`)}
        {solarWp !== null && solarWp > 0 && (() => { const wp = panelyWp(spotreba.nutne, hodin, ucinnost); return wp === null ? "" : solarWp >= wp ? ` Vaše panely (${solarWp} Wp) pokryjí nutný režim v ${SLUNECNE_HODINY[sezona].nazev}.` : ` Vaše panely (${solarWp} Wp) v ${SLUNECNE_HODINY[sezona].nazev} nutný režim nepokryjí; chybí asi ${wp - solarWp} Wp.`; })()}
      </p>
      {top.length > 0 && <p className="mt-2 text-drobne text-tlum2">Nejvíc berou: {top.map((t) => `${t.nazev.toLowerCase()} ${t.wh} Wh`).join(", ")}. Přesné slunečné hodiny pro vaše místo: <a href={PVGIS_URL} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">PVGIS</a>.</p>}
    </div>
  );
}
