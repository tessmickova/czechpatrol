"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ESHOP, OBCHODY } from "@/config/web";
import { useUcet } from "@/lib/ucet";
import { zaznamejUdalost } from "@/lib/mereni";
import {
  DUVODY_NEMOHU, lidskaDoba, maCestu, nactiProfil, poznamkaKPoctu, PRAZDNY_PROFIL, souhrn, ulozProfil, VERZE_KATALOGU, ZAVISLOSTI,
  type Doporuceni, type HodnoceniFunkce, type Horizont, type Kontext, type Nakup, type Profil,
} from "@/lib/odolnost";
import { POLE, Popisek, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Ikona, type NazevIkony } from "./ikony";
import { Zamceno } from "./muj-prehled-klient";
import { Sdeleni } from "./ui";
import { Otaznik } from "./zaklad";

/*
  Odolnost domácnosti — pro přihlášené.

  Všechno se počítá v prohlížeči z katalogu a z toho, co člověk zadal.
  Profil zůstává v zařízení. Základ je 72 hodin; kratší horizont se
  nepočítá, delší jdou až k 60 dnům. Vzhled drží zásady značky: barva
  jen jako tečka vedle slova, žádné barevné písmo ani rámečky, jedna
  červená pro hlavní akci. Žádné skóre v procentech — tři čísla, která
  jdou vysvětlit, a horizonty.
*/

const SLOVA_REDUNDANCE: Record<0 | 1 | 2 | 3, string> = { 0: "bez cesty", 1: "jediná cesta", 2: "záloha, společné selhání", 3: "nezávislé cesty" };
const TECKA_REDUNDANCE: Record<0 | 1 | 2 | 3, string> = { 0: "bg-akcent", 1: "bg-jantar", 2: "bg-jantar", 3: "bg-klid" };
const SLOVA_HORIZONTU: Record<Horizont["stav"], string> = { pripraveno: "připraveno", castecne: "částečně", slabe: "slabé", nehodnoceno: "nehodnoceno" };
const TECKA_HORIZONTU: Record<Horizont["stav"], string> = { pripraveno: "bg-klid", castecne: "bg-jantar", slabe: "bg-akcent", nehodnoceno: "bg-tlum2" };

const KARTA = "rounded-[22px] border border-linka2 bg-plocha";

function cislo(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const horizontSlovo = (dni: number) => (dni === 3 ? "72 h" : `${dni} dní`);

/** Jedna sekce vstupů: číslo kroku, název, jedna věta, obsah. */
function Krok({ cislo: c, nadpis, veta, children }: { cislo: string; nadpis: string; veta: string; children: React.ReactNode }) {
  return (
    <section className={`${KARTA} p-5 sm:p-6`}>
      <div className="flex items-start gap-3">
        <span className="cislice mt-[2px] shrink-0 text-drobne text-tlum2">{c}</span>
        <div className="min-w-0">
          <h2 className="text-vetsi font-bold text-inkoust">{nadpis}</h2>
          <p className="mt-1 text-male text-tlum">{veta}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Přepínač ano/ne s popisem. Větší cíl, žádná barva mimo zaškrtnutí. */
function Prepnuti({ id, nazev, popis, hodnota, onChange }: { id: string; nazev: string; popis?: string; hodnota: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-[52px] cursor-pointer items-start gap-3 rounded-[16px] border border-linka px-3.5 py-3 hover:border-linka2">
      <input id={id} type="checkbox" checked={hodnota} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-akcent" />
      <span className="min-w-0">
        <span className="block text-male font-semibold text-inkoust">{nazev}</span>
        {popis && <span className="block text-drobne text-tlum">{popis}</span>}
      </span>
    </label>
  );
}

function Pocet({ id, nazev, hodnota, onChange, poznamka }: { id: string; nazev: string; hodnota: number | null; onChange: (v: number | null) => void; poznamka?: string }) {
  return (
    <div>
      <Popisek pro={id}>{nazev}</Popisek>
      <input id={id} inputMode="numeric" className={`${POLE} cislice`} value={hodnota ?? ""} onChange={(e) => onChange(cislo(e.target.value))} placeholder="nevím" />
      {poznamka && <p className="mt-1 text-drobne text-tlum2">{poznamka}</p>}
    </div>
  );
}

export function OdolnostKlient() {
  const { ucet, nacita } = useUcet();
  const [p, setP] = useState<Profil>(PRAZDNY_PROFIL);
  const [nacteno, setNacteno] = useState(false);
  const [ulozisteFunguje, setUlozisteFunguje] = useState(true);
  const [ukazDoporuceni, setUkazDoporuceni] = useState(false);
  const [pokrocile, setPokrocile] = useState(false);

  useEffect(() => {
    const n = nactiProfil();
    if (n) { setP(n); setPokrocile(Boolean(n.kontext.bydleni || n.kontext.sidlo || Object.keys(n.vybaveni).length)); } else setUlozisteFunguje(false);
    setNacteno(true);
  }, []);

  const uloz = (nove: Profil) => {
    setP(nove);
    if (!ulozProfil(nove)) setUlozisteFunguje(false);
  };
  const s = useMemo(() => souhrn(p), [p]);

  if (nacita) return <Sdeleni ikona="zamek">Ověřuji přihlášení…</Sdeleni>;
  if (!ucet) return <Zamceno co="Odolnost domácnosti" />;
  if (!nacteno) return null;

  const prepniCestu = (funkce: string, cesta: string) => {
    const dnes = p.cesty[funkce] ?? [];
    uloz({ ...p, cesty: { ...p.cesty, [funkce]: dnes.includes(cesta) ? dnes.filter((c) => c !== cesta) : [...dnes, cesta] } });
  };
  const nastavNemohu = (funkce: string, duvod: string) => {
    const nemohu = { ...p.nemohu };
    if (duvod) nemohu[funkce] = duvod; else delete nemohu[funkce];
    uloz({ ...p, nemohu });
  };
  const kontext = (z: Partial<Kontext>) => uloz({ ...p, kontext: { ...p.kontext, ...z } });

  const exportuj = () => {
    const telo = JSON.stringify({ verzeKatalogu: VERZE_KATALOGU, exportovano: new Date().toISOString(), profil: p, souhrn: { horizonty: s.horizonty.map((h) => ({ dni: h.dni, stav: h.stav })), body: s.body.map((b) => ({ zavislost: b.zavislost, vypne: b.vypne.map((f) => f.klic) })), doporuceni: s.doporuceni, nakup: s.nakup } }, null, 2);
    const url = URL.createObjectURL(new Blob([telo], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = "czechpatrol-odolnost.json"; a.click();
    URL.revokeObjectURL(url);
    zaznamejUdalost("preference_save", { co: "odolnost-export" });
  };

  const kriticke = s.body.filter((b) => b.vypne.length >= 2);

  return (
    <div className="space-y-6">
      {!ulozisteFunguje && (
        <Sdeleni ton="pozor" ikona="vykricnik">Úložiště prohlížeče nefunguje (soukromé okno?). Vše se počítá, ale po zavření stránky se to neuloží.</Sdeleni>
      )}

      {/* ---------- souhrn nahoře: horizonty a tři čísla ---------- */}
      <section aria-label="Souhrn" className={`${KARTA} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="stitek">Horizont domácnosti</span>
            <Otaznik popis={<span className="block">Plánovací horizont domácnosti: na kolik dní vystačí zadané zásoby při uvedených předpokladech. 72 hodin je základ, ne cíl. Není to předpověď, jak dlouho co vydrží ve státě.</span>} />
          </div>
          <span className="text-drobne text-tlum2">podle zadaných údajů</span>
        </div>
        <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {s.horizonty.map((h) => (
            <li key={h.dni} className="rounded-[16px] border border-linka px-3 py-3">
              <span className="cislice block whitespace-nowrap text-vetsi font-bold leading-none text-inkoust sm:text-cislo">{horizontSlovo(h.dni)}</span>
              <span className="mt-2 flex items-center gap-1.5 text-drobne text-tlum">
                <span aria-hidden className={`h-[6px] w-[6px] shrink-0 rounded-full ${TECKA_HORIZONTU[h.stav]}`} />
                {SLOVA_HORIZONTU[h.stav]}
              </span>
            </li>
          ))}
        </ol>
        <dl className="mt-5 grid gap-4 border-t border-linka2 pt-5 sm:grid-cols-3">
          <div>
            <dt className="stitek">Nezávislá záloha</dt>
            <dd className="cislice mt-1 text-cislo font-bold text-inkoust">{s.vyreseno.n} <span className="text-tlum2">/ {s.vyreseno.z}</span></dd>
            <dd className="text-drobne text-tlum">funkcí s dvěma cestami, které nespadnou spolu</dd>
          </div>
          <div>
            <dt className="stitek">Kritické závislosti</dt>
            <dd className="cislice mt-1 text-cislo font-bold text-inkoust">{kriticke.length}</dd>
            <dd className="text-drobne text-tlum">{kriticke.length ? kriticke.map((b) => b.nazev.toLowerCase()).join(", ") : "žádná závislost nevypíná víc funkcí naráz"}</dd>
          </div>
          <div>
            <dt className="stitek">Nejslabší článek</dt>
            <dd className="mt-1 text-vetsi font-bold text-inkoust">{s.nejslabsi ? s.nejslabsi.funkce.nazev : "—"}</dd>
            <dd className="flex items-center gap-1.5 text-drobne text-tlum">{s.nejslabsi && <><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${TECKA_REDUNDANCE[s.nejslabsi.redundance]}`} />{SLOVA_REDUNDANCE[s.nejslabsi.redundance]}</>}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ---------- vstupy ---------- */}
        <div className="min-w-0 space-y-5">
          <Krok cislo="01" nadpis="Vaše domácnost" veta="Počty pro výpočet vody a jídla. Nic dalšího o lidech se neukládá.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Popisek pro="od-osob">Kolik lidí</Popisek><input id="od-osob" type="number" min={0} className={`${POLE} cislice`} value={p.osob} onChange={(e) => uloz({ ...p, osob: Math.max(0, Number(e.target.value) || 0) })} /></div>
              <div><Popisek pro="od-zvirat">Kolik zvířat, která pijí a jedí s vámi</Popisek><input id="od-zvirat" type="number" min={0} className={`${POLE} cislice`} value={p.zvirat} onChange={(e) => uloz({ ...p, zvirat: Math.max(0, Number(e.target.value) || 0) })} /></div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Prepnuti id="od-rodina" nazev="Rodina nebo blízcí v pěší dostupnosti" popis="počítá se jako cesta u spojení, dopravy a péče" hodnota={p.kontext.rodinaVDosahu} onChange={(v) => kontext({ rodinaVDosahu: v })} />
              <Prepnuti id="od-pece" nazev="Někdo je závislý na péči, léku nebo přístroji" popis="bez podrobností; jen zvýší váhu doporučení" hodnota={p.kontext.zavislyNaPeci} onChange={(v) => kontext({ zavislyNaPeci: v })} />
            </div>
            <button type="button" onClick={() => setPokrocile((x) => !x)} aria-expanded={pokrocile} className="mt-4 flex min-h-[40px] items-center gap-2 text-male font-semibold text-tlum hover:text-inkoust">
              <Ikona nazev="dolu" velikost={13} tah={2} trida={`transition-transform ${pokrocile ? "rotate-180" : ""}`} /> Rozšířené vstupy pro pokročilé
            </button>
            {pokrocile && (
              <div className="mt-3 grid gap-4 border-t border-linka2 pt-4 sm:grid-cols-2">
                <div>
                  <Popisek pro="od-bydleni">Bydlení</Popisek>
                  <select id="od-bydleni" value={p.kontext.bydleni} onChange={(e) => kontext({ bydleni: e.target.value as Kontext["bydleni"] })} className={POLE}>
                    <option value="">neuvedeno</option><option value="byt">byt</option><option value="dum">dům</option>
                  </select>
                </div>
                <div>
                  <Popisek pro="od-sidlo">Kde</Popisek>
                  <select id="od-sidlo" value={p.kontext.sidlo} onChange={(e) => kontext({ sidlo: e.target.value as Kontext["sidlo"] })} className={POLE}>
                    <option value="">neuvedeno</option><option value="mesto">město</option><option value="venkov">venkov nebo samota</option>
                  </select>
                  <p className="mt-1 text-drobne text-tlum2">Bez adresy. Jen aby rady seděly na byt, nebo dům, město, nebo venkov.</p>
                </div>
                <div><Popisek pro="od-deti">Z toho dětí</Popisek><input id="od-deti" type="number" min={0} className={`${POLE} cislice`} value={p.kontext.deti} onChange={(e) => kontext({ deti: Math.max(0, Number(e.target.value) || 0) })} /></div>
                <div><Popisek pro="od-seniori">Z toho seniorů</Popisek><input id="od-seniori" type="number" min={0} className={`${POLE} cislice`} value={p.kontext.seniori} onChange={(e) => kontext({ seniori: Math.max(0, Number(e.target.value) || 0) })} /></div>
                <Pocet id="od-vysilacky" nazev="Vysílačky (kusů)" hodnota={p.vybaveni.vysilacky ?? null} onChange={(v) => uloz({ ...p, vybaveni: { ...p.vybaveni, vysilacky: v } })} poznamka="Od dvou kusů se počítají jako cesta u spojení; ideálně pro každého, kdo se pohybuje sám." />
                <Pocet id="od-powerbanky" nazev="Powerbanky (kusů)" hodnota={p.vybaveni.powerbanky ?? null} onChange={(v) => uloz({ ...p, vybaveni: { ...p.vybaveni, powerbanky: v } })} poznamka="Zatím jen evidence; do vydrže energie zadejte jejich kapacitu níž." />
              </div>
            )}
          </Krok>

          <Krok cislo="02" nadpis="Jak u vás fungují základní věci" veta="U každé potřeby zaškrtněte cesty, které opravdu máte. Každá má pevné závislosti; z nich se počítá, co vypadne s čím.">
            <ul className="space-y-2.5">
              {s.hodnoceni.map((h) => <KartaFunkce key={h.funkce.klic} h={h} profil={p} naCestu={(c) => prepniCestu(h.funkce.klic, c)} naNemohu={(d) => nastavNemohu(h.funkce.klic, d)} />)}
            </ul>
          </Krok>

          <Krok cislo="03" nadpis="Zásoby a energie" veta="Prázdné pole je „nevím“, ne nula. Předpoklady spotřeby jsou u výsledku a jdou přečíst.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Pocet id="od-voda" nazev="Pitná voda uložená (litry)" hodnota={p.zasoby.pitnaVodaL} onChange={(v) => uloz({ ...p, zasoby: { ...p.zasoby, pitnaVodaL: v } })} />
              <Pocet id="od-uzitkova" nazev="Užitková voda (litry)" hodnota={p.zasoby.uzitkovaVodaL} onChange={(v) => uloz({ ...p, zasoby: { ...p.zasoby, uzitkovaVodaL: v } })} />
              <Pocet id="od-jidlo" nazev="Jídlo bez nákupu (dny pro celou domácnost)" hodnota={p.zasoby.jidloDni} onChange={(v) => uloz({ ...p, zasoby: { ...p.zasoby, jidloDni: v } })} />
              <Pocet id="od-leky" nazev="Léky a pomůcky (dny, podle lékaře)" hodnota={p.zasoby.lekyDni} onChange={(v) => uloz({ ...p, zasoby: { ...p.zasoby, lekyDni: v } })} poznamka="Web dávky nepočítá." />
              <Pocet id="od-kap" nazev="Vlastní zdroj energie: kapacita (Wh)" hodnota={p.energie.kapacitaWh || null} onChange={(v) => uloz({ ...p, energie: { ...p.energie, kapacitaWh: v ?? 0 } })} poznamka="Powerstation, UPS, powerbanky dohromady. Nemám = nechte prázdné." />
              <Pocet id="od-potreba" nazev="Nouzová spotřeba za den (Wh)" hodnota={p.energie.potrebaDenWh || null} onChange={(v) => uloz({ ...p, energie: { ...p.energie, potrebaDenWh: v ?? 0 } })} poznamka="Ze štítků zařízení: W × hodin denně. Web hodnoty nedosazuje." />
            </div>
            <div className="mt-4">
              <Prepnuti id="od-dobijeni" nazev="Umím zdroj dobíjet bez sítě" popis="solár, generátor, auto" hodnota={p.energie.dobijeni} onChange={(v) => uloz({ ...p, energie: { ...p.energie, dobijeni: v } })} />
            </div>
          </Krok>
        </div>

        {/* ---------- výsledky ---------- */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-[84px] lg:self-start">
          <button type="button" onClick={() => { setUkazDoporuceni(true); zaznamejUdalost("filter_apply", { co: "odolnost-co-chybi" }); }} className={`${TLACITKO_AKCENT} w-full justify-center`}>
            <Ikona nazev="lupa" velikost={15} tah={2} /> Co má teď největší smysl?
          </button>

          {ukazDoporuceni && (
            <section aria-live="polite" className="space-y-3">
              {s.doporuceni.length === 0 ? (
                <Sdeleni ton="klid" ikona="fajfka" nadpis="Nic naléhavého.">Každá důležitá funkce má nezávislou zálohu a zásoby vydrží přes 72 hodin. Další zlepšení má menší přínos než otestovat, co máte.</Sdeleni>
              ) : s.doporuceni.map((d, i) => <KartaDoporuceni key={i} d={d} poradi={i + 1} />)}
            </section>
          )}

          <SeznamNakupu nakup={s.nakup} />

          <section className={`${KARTA} p-5`}>
            <div className="mb-2 flex items-center gap-1.5"><span className="stitek">Jak dlouho vydrží</span><Otaznik popis={<span className="block">Předpoklady jsou u každé položky. Skutečná spotřeba se liší; číslo je k plánování, ne k uklidnění.</span>} /></div>
            <ul className="divide-y divide-linka2">
              {s.vydrze.filter((v) => v.klic !== "energie" || p.energie.kapacitaWh > 0).map((v) => (
                <li key={v.klic} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-male text-inkoust">{v.nazev}<Otaznik popis={<span className="block">{v.predpoklad}</span>} /></span>
                  <span className="cislice shrink-0 text-male font-semibold text-inkoust">{v.dni === null ? <span className="font-normal text-tlum2">nezadáno</span> : lidskaDoba(v.dni)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${KARTA} p-5`}>
            <div className="stitek mb-2">Za 0 Kč</div>
            <p className="text-male text-tlum">Co zvýší odolnost bez nákupu u funkcí, které zatím nemají nezávislou zálohu.</p>
            <ul className="mt-3 space-y-2">
              {s.hodnoceni.filter((h) => h.redundance < 3).flatMap((h) => h.funkce.nulaKc.slice(0, 1).map((r) => ({ f: h.funkce.nazev, r }))).slice(0, 6).map((x, i) => (
                <li key={i} className="flex gap-2 text-male text-tlum"><Ikona nazev="fajfka" velikost={13} tah={2.2} trida="mt-1 shrink-0 text-klid-text" /><span><b className="font-semibold text-inkoust">{x.f}:</b> {x.r}</span></li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={exportuj} className={TLACITKO_TICHE}><Ikona nazev="instalace" velikost={14} tah={2} /> Stáhnout plán (JSON)</button>
            <button type="button" onClick={() => window.print()} className={TLACITKO_TICHE}><Ikona nazev="dokument" velikost={14} tah={2} /> Tisk</button>
          </div>
          <p className="text-drobne text-tlum2">Uloženo jen v tomto zařízení. Plán je váš i bez účtu. Katalog verze {VERZE_KATALOGU}. <Link href="/pripravenost/" className="odkaz">Oficiální nástroje a 72h základ</Link></p>
        </aside>
      </div>
    </div>
  );
}

function KartaFunkce({ h, profil, naCestu, naNemohu }: { h: HodnoceniFunkce; profil: Profil; naCestu: (c: string) => void; naNemohu: (d: string) => void }) {
  const [otevreno, setOtevreno] = useState(false);
  const f = h.funkce;
  const vybrane = new Set(profil.cesty[f.klic] ?? []);
  const pocetCest = h.mam.length;
  return (
    <li className="rounded-[18px] border border-linka bg-plocha">
      <button type="button" onClick={() => setOtevreno((x) => !x)} aria-expanded={otevreno} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 text-akcent"><Ikona nazev={f.ikona as NazevIkony} velikost={17} tah={1.8} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-zaklad font-semibold text-inkoust">{f.nazev}</span>
          <span className="flex items-center gap-1.5 text-drobne text-tlum">
            <span aria-hidden className={`h-[6px] w-[6px] shrink-0 rounded-full ${h.nemohu ? "bg-tlum2" : TECKA_REDUNDANCE[h.redundance]}`} />
            {h.nemohu ? `řešeno jinak · ${DUVODY_NEMOHU.find((d) => d.klic === h.nemohu)?.nazev ?? ""}` : SLOVA_REDUNDANCE[h.redundance]}
            {pocetCest ? ` · ${pocetCest} ${pocetCest === 1 ? "cesta" : pocetCest < 5 ? "cesty" : "cest"}` : ""}
          </span>
        </span>
        <Ikona nazev="dolu" velikost={13} tah={2} trida={`shrink-0 text-tlum2 transition-transform ${otevreno ? "rotate-180" : ""}`} />
      </button>
      {otevreno && (
        <div className="border-t border-linka2 px-4 py-4">
          <p className="text-male text-tlum">Potřeba: {f.potreba}.</p>
          <ul className="mt-3 space-y-1.5">
            {f.cesty.map((c) => {
              const zKontextu = Boolean(c.kontext);
              const zPoctu = Boolean(c.pocet);
              const ma = maCestu(c, f, profil, vybrane);
              const pozn = poznamkaKPoctu(c, profil);
              return (
                <li key={c.klic}>
                  <label className={`flex items-start gap-3 rounded-[12px] px-2 py-2 ${zKontextu || zPoctu ? "" : "cursor-pointer hover:bg-plocha2"}`}>
                    <input type="checkbox" checked={ma} disabled={zKontextu || zPoctu} onChange={() => naCestu(c.klic)} className="mt-1 h-4 w-4 accent-akcent disabled:opacity-60" />
                    <span className="min-w-0">
                      <span className="block text-male text-inkoust">
                        {c.nazev}
                        {c.zadarmo && <span className="ml-1.5 text-mikro text-tlum2">0 Kč</span>}
                        {c.externi && <span className="ml-1.5 text-mikro text-tlum2">externí služba</span>}
                      </span>
                      <span className="block text-drobne text-tlum2">
                        {c.zavislosti.length ? `závisí na: ${c.zavislosti.map((z) => ZAVISLOSTI[z]?.nazev.toLowerCase() ?? z).join(", ")}` : "bez vnější závislosti"}
                        {c.poznamka ? ` · ${c.poznamka}` : ""}
                        {zKontextu ? " · podle přepínače v kroku 01" : ""}
                        {pozn ? ` · ${pozn}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {h.spolecne.length > 0 && h.redundance === 2 && (
            <p className="mt-3 flex items-start gap-2 text-drobne text-tlum"><span aria-hidden className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-jantar" />Vaše zálohy sdílejí závislost: {h.spolecne.map((z) => ZAVISLOSTI[z]?.nazev.toLowerCase() ?? z).join(", ")}. Když vypadne, vypadnou spolu.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linka2 pt-4">
            <label className="text-male text-tlum" htmlFor={`nemohu-${f.klic}`}>Tohle nemohu vyřešit:</label>
            <select id={`nemohu-${f.klic}`} value={h.nemohu ?? ""} onChange={(e) => naNemohu(e.target.value)} className={`${POLE} !w-auto`}>
              <option value="">ne, řeším</option>
              {DUVODY_NEMOHU.map((d) => <option key={d.klic} value={d.klic}>{d.nazev}</option>)}
            </select>
          </div>
          {h.nemohu && (
            <ul className="mt-3 space-y-1.5 rounded-[14px] border border-dashed border-linka px-3.5 py-3">
              {f.kompenzace.map((k) => <li key={k} className="text-male text-tlum">{k}</li>)}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function KartaDoporuceni({ d, poradi }: { d: Doporuceni; poradi: number }) {
  return (
    <article className={`${KARTA} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className="cislice grid h-7 w-7 shrink-0 place-items-center rounded-full bg-plocha2 text-male font-bold text-inkoust">{poradi}</span>
        <div className="min-w-0">
          <h3 className="text-zaklad font-bold text-inkoust">{d.nadpis}</h3>
          <dl className="mt-2 space-y-1.5 text-male">
            <div><dt className="stitek inline">Proč to vidíte:</dt> <dd className="inline text-tlum">{d.proc}</dd></div>
            <div><dt className="stitek inline">Na čem to stojí:</dt> <dd className="inline text-tlum">{d.zaklad}</dd></div>
            {d.alternativy.length > 0 && (
              <div><dt className="stitek">Možnosti:</dt><dd><ul className="mt-1 space-y-1 text-tlum">{d.alternativy.map((a) => <li key={a} className="flex gap-2"><span aria-hidden className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-tlum2" />{a}</li>)}</ul></dd></div>
            )}
            <div><dt className="stitek inline">Kdy to není potřeba:</dt> <dd className="inline text-tlum">{d.kdyNeni}</dd></div>
          </dl>
        </div>
      </div>
    </article>
  );
}

/*
  Co dokoupit: obecné věci bez značky a ceny, ke každé funkci jedna. Odkazy
  do obchodů se ukážou, až budou adresy v konfiguraci; do té doby seznam
  slouží k nákupu kdekoli. Náš e-shop má přednost, cizí obchody jsou pro
  věci, které se u nás nevyplatí držet.
*/
function SeznamNakupu({ nakup }: { nakup: Nakup[] }) {
  const obchody = OBCHODY.filter((o) => o.hledani);
  if (!nakup.length) return null;
  return (
    <section className={`${KARTA} p-5`}>
      <div className="mb-2 flex items-center gap-1.5"><span className="stitek">Co dokoupit</span><Otaznik popis={<span className="block">Věci, které zajistí chybějící cestu u funkcí bez nezávislé zálohy. Bez značek a cen; ke každé funkci jedna. Co jste označili jako neřešitelné, tu není.</span>} /></div>
      <ul className="divide-y divide-linka2">
        {nakup.map((n) => (
          <li key={n.polozka} className="py-2.5">
            <span className="block text-male font-semibold text-inkoust">{n.polozka}</span>
            <span className="block text-drobne text-tlum">{n.proc}</span>
            {(ESHOP || obchody.length > 0) && (
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                {ESHOP && <a href={ESHOP} target="_blank" rel="nofollow noopener noreferrer" className="rounded-full border border-linka px-3 py-1 text-mikro font-semibold text-inkoust hover:border-akcent">Náš e-shop</a>}
                {obchody.map((o) => (
                  <a key={o.klic} href={o.hledani.replace("{q}", encodeURIComponent(n.polozka))} target="_blank" rel="nofollow noopener noreferrer" className="rounded-full border border-linka px-3 py-1 text-mikro font-semibold text-tlum hover:border-akcent hover:text-inkoust">{o.nazev}</a>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      {!ESHOP && obchody.length === 0 && <p className="mt-2 text-drobne text-tlum2">Odkazy do obchodů doplníme, až poběží náš e-shop. Seznam funguje i bez nich.</p>}
    </section>
  );
}
