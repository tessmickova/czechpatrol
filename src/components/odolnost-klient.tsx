"use client";

import Link from "next/link";
import { jeRadio, TipAsa } from "./tip-asa";
import { useEffect, useMemo, useRef, useState } from "react";
import { ESHOP, OBCHODY, SPUSTENO } from "@/config/web";
import { api } from "@/lib/ucet";
import { usePremium } from "@/lib/premium";
import { zaznamejUdalost } from "@/lib/mereni";
import {
  bezpecnostniNalezy, DUVODY_NEMOHU, doporucenaZasobaVody, kraj as krajProfilu, KRAJE_ODOLNOSTI, lidskaDoba, maCestu, nactiProfil, pocty, poznamkaKPoctu, PRAZDNY_PROFIL, souhrn, TRIDY_SRAZEK, ulozProfil, VERZE_KATALOGU, ZAVISLOSTI,
  type Doporuceni, type HodnoceniFunkce, type Horizont, type Kontext, type Nakup, type Profil,
  POTRAVINY, rozpisJidla,
} from "@/lib/odolnost";
import { useDialog } from "./dialog";
import { POLE, Popisek, TLACITKO_TICHE } from "./formulare";
import { SolarniOdhad, VyberSpotrebicu } from "./energie-klient";
import { Ikona, type NazevIkony } from "./ikony";
import { KartaPremium } from "./premium-klient";
import { Sdeleni } from "./ui";
import { Otaznik } from "./zaklad";

/*
  Odolnost domácnosti — audit pro každého, podrobný plán jako Premium.

  Vlevo dotazník jako jeden souvislý formulář: nadpisy, vlasové linky,
  žádná karta kolem každé otázky. Vpravo jeden panel s výsledky, který
  se přepočítává při každém zaškrtnutí.

  Hranice zdarma / Premium (docs/PREMIUM-NAVRH.md, část 3): souhrn
  s počty, stav na 72 hodin, každý bezpečnostní nález a rady za 0 Kč
  jsou zdarma i bez účtu. Za odemknutím jsou podrobnosti: horizonty
  7–60 dní, vydrže, energie a solár, kritické závislosti, nákupní seznam,
  plán ke stažení a uložení na server. Bezpečnostní nálezy jsou vždy nad
  nabídkou, ne za ní.

  Zásady značky: barva jen jako tečka vedle slova, žádné barevné písmo
  ani rámečky, jedna červená pro hlavní věc. Profil zůstává v zařízení;
  na server jde jen s Premium, šifrovaně, a jde smazat.
*/

const SLOVA_REDUNDANCE: Record<0 | 1 | 2 | 3, string> = { 0: "bez cesty", 1: "jediná cesta", 2: "záloha, společné selhání", 3: "nezávislé cesty" };
const TECKA_REDUNDANCE: Record<0 | 1 | 2 | 3, string> = { 0: "bg-akcent", 1: "bg-jantar", 2: "bg-jantar", 3: "bg-klid" };
const SLOVA_HORIZONTU: Record<Horizont["stav"], string> = { pripraveno: "připraveno", castecne: "částečně", slabe: "slabé", nehodnoceno: "nehodnoceno" };
const TECKA_HORIZONTU: Record<Horizont["stav"], string> = { pripraveno: "bg-klid", castecne: "bg-jantar", slabe: "bg-akcent", nehodnoceno: "bg-tlum2" };

function cislo(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const horizontSlovo = (dni: number) => (dni === 3 ? "72 h" : `${dni} dní`);

/** Oddíl dotazníku: nadpis, jedna věta, obsah. Bez rámečku — dělí ho linka. */
function Oddil({ cislo: c, nadpis, veta, children }: { cislo: string; nadpis: string; veta?: string; children: React.ReactNode }) {
  return (
    <section className="pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3">
        <span className="cislice shrink-0 text-drobne text-tlum2">{c}</span>
        <h2 className="text-vetsi font-bold text-inkoust">{nadpis}</h2>
      </div>
      {veta && <p className="mt-1 pl-[2.1rem] text-male text-tlum">{veta}</p>}
      <div className="mt-4 pl-0 sm:pl-[2.1rem]">{children}</div>
    </section>
  );
}

function Prepnuti({ id, nazev, popis, hodnota, onChange }: { id: string; nazev: string; popis?: string; hodnota: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1.5">
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

/** Číslo s desetinnou čárkou (1,5 kg): text se drží lokálně, jinak by „1,“ skočilo zpět na „1“. */
function PocetDesetinny({ id, nazev, hodnota, onChange }: { id: string; nazev: string; hodnota: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(hodnota === null ? "" : String(hodnota).replace(".", ","));
  return (
    <div>
      <Popisek pro={id}>{nazev}</Popisek>
      <input id={id} inputMode="decimal" className={`${POLE} cislice`} value={text} onChange={(e) => { setText(e.target.value); onChange(cislo(e.target.value)); }} placeholder="nemám" />
    </div>
  );
}

export function OdolnostKlient() {
  const { ucet, premium, nacita } = usePremium();
  const [p, setP] = useState<Profil>(PRAZDNY_PROFIL);
  const [nacteno, setNacteno] = useState(false);
  const [ulozisteFunguje, setUlozisteFunguje] = useState(true);
  const [pokrocile, setPokrocile] = useState(false);
  const [zeServeru, setZeServeru] = useState<string | null>(null);
  const casovac = useRef<number | null>(null);
  const { potvrd } = useDialog();

  useEffect(() => {
    const n = nactiProfil();
    if (n) { setP(n); setPokrocile(Boolean(n.kontext.bydleni || n.kontext.sidlo || Object.keys(n.vybaveni).length)); } else setUlozisteFunguje(false);
    setNacteno(true);
  }, []);

  /*
    Kontinuita pro Premium: když je v zařízení prázdný profil (nové
    zařízení, vymazaný prohlížeč), stáhne se poslední uložené hodnocení.
    Nikdy nepřepisuje to, co člověk v zařízení rozpracoval.
  */
  useEffect(() => {
    if (!nacteno || nacita || !premium || !ucet) return;
    const mistni = nactiProfil();
    if (mistni && JSON.stringify(mistni) !== JSON.stringify(PRAZDNY_PROFIL)) return;
    api<{ hodnoceni: { profil: Profil; vytvoreno: string } | null }>("/ja/hodnoceni")
      .then((v) => { if (v.hodnoceni?.profil) { setP({ ...PRAZDNY_PROFIL, ...v.hodnoceni.profil }); ulozProfil({ ...PRAZDNY_PROFIL, ...v.hodnoceni.profil }); setZeServeru(v.hodnoceni.vytvoreno); } })
      .catch(() => { /* bez uložení na serveru se prostě začíná od začátku */ });
  }, [nacteno, nacita, premium, ucet]);

  const uloz = (nove: Profil) => {
    setP(nove);
    if (!ulozProfil(nove)) setUlozisteFunguje(false);
    // Na server jen s Premium, s odstupem, ať každé zaškrtnutí neposílá požadavek.
    if (premium && ucet) {
      if (casovac.current) window.clearTimeout(casovac.current);
      casovac.current = window.setTimeout(() => {
        const sh = souhrn(nove);
        api("/ja/hodnoceni", { method: "PUT", telo: { verzeKatalogu: VERZE_KATALOGU, profil: nove, vysledek: { horizonty: sh.horizonty.map((h) => ({ dni: h.dni, stav: h.stav })), body: sh.body.map((b) => ({ zavislost: b.zavislost, vypne: b.vypne.map((f) => f.klic) })) } } })
          .then(() => setZeServeru(new Date().toISOString()))
          .catch(() => { /* zůstává v zařízení; server to zkusí příště */ });
      }, 2500);
    }
  };
  const s = useMemo(() => souhrn(p), [p]);
  const vyplneno = s.hodnoceni.filter((h) => h.mam.length > 0 || h.nemohu).length;
  const hlaseno = useRef(false);
  useEffect(() => {
    // Jednou za návštěvu: audit má smysl od tří vyplněných oblastí.
    if (vyplneno >= 3 && !hlaseno.current) { hlaseno.current = true; zaznamejUdalost("audit_complete"); }
  }, [vyplneno]);

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

  const pc = pocty(s);
  // Nálezy až po třech vyplněných oblastech: prázdný dotazník není nález, jen prázdný dotazník.
  const nalezy = vyplneno >= 3 ? bezpecnostniNalezy(p, s.hodnoceni) : [];
  const zaridit = s.hodnoceni.filter((h) => h.mam.length > 0 && h.redundance < 3 && !h.nemohu).flatMap((h) => h.funkce.nulaKc.slice(0, 1).map((r) => ({ f: h.funkce.nazev, r }))).slice(0, 5);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12">
      {/* ---------- dotazník ---------- */}
      <div className="min-w-0 space-y-8">
        {!ulozisteFunguje && (
          <Sdeleni ton="pozor" ikona="vykricnik">Úložiště prohlížeče nefunguje (soukromé okno?). Vše se počítá, ale po zavření stránky se to neuloží.</Sdeleni>
        )}
        {/* Začít znovu: nahoře, ať ho člověk najde dřív, než přepisuje dvacet polí. S potvrzením — smaže celý profil. */}
        {vyplneno > 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-male text-tlum">Vyplněno {vyplneno} z {s.hodnoceni.length} oblastí.</p>
            <button
              type="button"
              className={TLACITKO_TICHE}
              onClick={async () => {
                const ano = await potvrd({ nadpis: "Začít znovu?", text: "Smaže se celý vyplněný profil domácnosti v tomto zařízení" + (premium ? " i uložená kopie na serveru" : "") + ". Vrátit to nejde.", potvrdit: "Smazat a začít znovu", zrusit: "Nechat být" });
                if (!ano) return;
                uloz(PRAZDNY_PROFIL);
                setPokrocile(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Ikona nazev="krizek" velikost={13} tah={2.2} /> Začít znovu
            </button>
          </div>
        )}

        <Oddil cislo="01" nadpis="Kdo u vás bydlí" veta="Jen počty. Nic dalšího o lidech se neukládá.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Popisek pro="od-osob">Lidí</Popisek><input id="od-osob" type="number" min={0} className={`${POLE} cislice`} value={p.osob} onChange={(e) => uloz({ ...p, osob: Math.max(0, Number(e.target.value) || 0) })} /></div>
            <div><Popisek pro="od-zvirat">Zvířat, která pijí a jedí s vámi</Popisek><input id="od-zvirat" type="number" min={0} className={`${POLE} cislice`} value={p.zvirat} onChange={(e) => uloz({ ...p, zvirat: Math.max(0, Number(e.target.value) || 0) })} /></div>
          </div>
          <div className="mt-4">
            <Popisek pro="od-kraj">Kraj</Popisek>
            <select id="od-kraj" value={p.kontext.kraj} onChange={(e) => kontext({ kraj: e.target.value })} className={POLE}>
              <option value="">neuvedeno</option>
              {KRAJE_ODOLNOSTI.map((k) => <option key={k.klic} value={k.klic}>{k.nazev}</option>)}
            </select>
            <p className="mt-1 text-drobne text-tlum2">
              {krajProfilu(p)
                ? `${TRIDY_SRAZEK[krajProfilu(p)!.trida].nazev}: ${TRIDY_SRAZEK[krajProfilu(p)!.trida].popis}${krajProfilu(p)!.poznamka ? ` ${krajProfilu(p)!.poznamka}` : ""}`
                : "Podle kraje se upraví doporučená zásoba vody: kde prší méně, je větší."}
            </p>
          </div>
          <div className="mt-3">
            <Prepnuti id="od-rodina" nazev="Rodina nebo blízcí v pěší dostupnosti" popis="počítá se jako cesta u spojení, dopravy a péče" hodnota={p.kontext.rodinaVDosahu} onChange={(v) => kontext({ rodinaVDosahu: v })} />
            <Prepnuti id="od-pece" nazev="Někdo je závislý na péči, léku nebo přístroji" popis="bez podrobností; jen zvýší váhu doporučení" hodnota={p.kontext.zavislyNaPeci} onChange={(v) => kontext({ zavislyNaPeci: v })} />
          </div>
          <button type="button" onClick={() => setPokrocile((x) => !x)} aria-expanded={pokrocile} className="mt-2 flex min-h-[40px] items-center gap-2 text-male font-semibold text-tlum hover:text-inkoust">
            <Ikona nazev="dolu" velikost={13} tah={2} trida={`transition-transform ${pokrocile ? "rotate-180" : ""}`} /> Víc podrobností pro pokročilé
          </button>
          {pokrocile && (
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
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
                <p className="mt-1 text-drobne text-tlum2">Bez adresy. Jen aby rady seděly.</p>
              </div>
              <div><Popisek pro="od-deti">Z toho dětí</Popisek><input id="od-deti" type="number" min={0} className={`${POLE} cislice`} value={p.kontext.deti} onChange={(e) => kontext({ deti: Math.max(0, Number(e.target.value) || 0) })} /></div>
              <div><Popisek pro="od-seniori">Z toho seniorů</Popisek><input id="od-seniori" type="number" min={0} className={`${POLE} cislice`} value={p.kontext.seniori} onChange={(e) => kontext({ seniori: Math.max(0, Number(e.target.value) || 0) })} /></div>
              <Pocet id="od-vysilacky" nazev="Vysílačky (kusů)" hodnota={p.vybaveni.vysilacky ?? null} onChange={(v) => uloz({ ...p, vybaveni: { ...p.vybaveni, vysilacky: v } })} poznamka="Od dvou kusů jsou cesta u spojení; ideálně pro každého, kdo chodí sám." />
              <Pocet id="od-powerbanky" nazev="Powerbanky (kusů)" hodnota={p.vybaveni.powerbanky ?? null} onChange={(v) => uloz({ ...p, vybaveni: { ...p.vybaveni, powerbanky: v } })} poznamka="Kapacitu zadejte níž u energie." />
            </div>
          )}
        </Oddil>

        <Oddil cislo="02" nadpis="Jak u vás fungují základní věci" veta={`Rozklikněte a zaškrtněte, co opravdu máte. Vyplněno ${vyplneno} z ${s.hodnoceni.length}.`}>
          <ul className="border-y border-linka2">
            {s.hodnoceni.map((h) => <RadekFunkce key={h.funkce.klic} h={h} profil={p} naCestu={(c) => prepniCestu(h.funkce.klic, c)} naNemohu={(d) => nastavNemohu(h.funkce.klic, d)} />)}
          </ul>
        </Oddil>

        <Oddil cislo="03" nadpis="Co máte doma" veta="Prázdné pole je „nevím“, ne nula. Předpoklady spotřeby jsou u výsledku.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Pocet id="od-voda" nazev="Pitná voda uložená (litry)" hodnota={p.zasoby.pitnaVodaL} onChange={(v) => uloz({ ...p, zasoby: { ...p.zasoby, pitnaVodaL: v } })} />
            <Pocet id="od-uzitkova" nazev="Užitková voda (litry)" hodnota={p.zasoby.uzitkovaVodaL} onChange={(v) => uloz({ ...p, zasoby: { ...p.zasoby, uzitkovaVodaL: v } })} />
            <Pocet id="od-jidlo" nazev="Jídlo bez nákupu (dny pro všechny)" hodnota={p.zasoby.jidloDni} onChange={(v) => uloz({ ...p, zasoby: { ...p.zasoby, jidloDni: v } })} />
            <Pocet id="od-leky" nazev="Léky a pomůcky (dny, podle lékaře)" hodnota={p.zasoby.lekyDni} onChange={(v) => uloz({ ...p, zasoby: { ...p.zasoby, lekyDni: v } })} />
            <Pocet id="od-kap" nazev="Vlastní zdroj energie (Wh)" hodnota={p.energie.kapacitaWh || null} onChange={(v) => uloz({ ...p, energie: { ...p.energie, kapacitaWh: v ?? 0 } })} poznamka="Powerstation, UPS, powerbanky dohromady. Kapacita je na štítku." />
          </div>
          {/* Jídlo podrobně (26. 9. 2026): z množství zásob se spočítá, kolik dní vydrží energie, bílkoviny, tuky a sacharidy. */}
          <details className="group mt-4 rounded-[16px] border border-linka px-4 py-3" open={Boolean(Object.keys(p.zasoby.potraviny ?? {}).length)}>
            <summary className="flex min-h-[40px] cursor-pointer items-center justify-between gap-3 text-male font-semibold text-inkoust">
              Jídlo podrobně — kolik vydrží bílkoviny, tuky a sacharidy
              <Ikona nazev="dolu" velikost={13} tah={2} trida="shrink-0 text-tlum2 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-1 text-drobne leading-snug text-tlum2">Zadejte, kolik čeho máte doma. Hodnoty na 100 g jsou orientační ({POTRAVINY.zdrojHodnot.nazev}); přesné najdete v tabulce na obalu. Prázdné pole = nemám.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {POTRAVINY.polozky.map((x) => (
                <PocetDesetinny key={x.klic} id={`od-pot-${x.klic}`} nazev={`${x.nazev} (${x.jednotka})`} hodnota={p.zasoby.potraviny?.[x.klic] ?? null}
                  onChange={(v) => { const pot = { ...(p.zasoby.potraviny ?? {}) }; if (v && v > 0) pot[x.klic] = v; else delete pot[x.klic]; uloz({ ...p, zasoby: { ...p.zasoby, potraviny: pot } }); }} />
              ))}
            </div>
          </details>
          <div className="mt-2">
            <Prepnuti id="od-dobijeni" nazev="Umím zdroj dobíjet bez sítě" popis="solár, generátor, auto" hodnota={p.energie.dobijeni} onChange={(v) => uloz({ ...p, energie: { ...p.energie, dobijeni: v } })} />
          </div>
        </Oddil>

        <Oddil cislo="04" nadpis="Co budete potřebovat napájet" veta="Zaškrtněte, co za den bez proudu potřebujete, a u každé věci, jestli bez ní nejde fungovat. Příkon je předvyplněný, štítek má přednost.">
          <VyberSpotrebicu vybrane={p.energie.spotrebice ?? []} onChange={(v) => uloz({ ...p, energie: { ...p.energie, spotrebice: v } })} />
        </Oddil>
      </div>

      {/* ---------- výsledky ---------- */}
      <aside className="min-w-0 lg:sticky lg:top-[84px] lg:self-start">
        <div className="sklo rounded-[26px] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-akcent" />
            <span className="nadpis-boxu">Váš výsledek</span>
            <span className="ml-auto text-drobne text-tlum2">přepočítává se průběžně</span>
          </div>

          {/* zdarma: souhrn s počty a stav na 72 hodin */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5">
              <span className="nadpis-boxu">Souhrn auditu</span>
              <Otaznik popis={<span className="block">Počty oblastí podle zaškrtnutých cest. „V pořádku“ = aspoň dvě nezávislé cesty. Kritická závislost = jedna věc, jejíž výpadek vypne dvě a víc oblastí.</span>} />
            </div>
            {vyplneno === 0 ? (
              <p className="mt-2 text-male text-tlum">Zaškrtněte vlevo, jak u vás fungují základní věci. Souhrn se objeví tady.</p>
            ) : (
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><dt className="stitek">V pořádku</dt><dd className="cislice mt-1 flex items-center gap-1.5 text-cislo font-bold leading-none text-inkoust"><span aria-hidden className="h-[6px] w-[6px] rounded-full bg-klid" />{pc.vPoradku}</dd></div>
                <div><dt className="stitek">Slabin</dt><dd className="cislice mt-1 flex items-center gap-1.5 text-cislo font-bold leading-none text-inkoust"><span aria-hidden className="h-[6px] w-[6px] rounded-full bg-jantar" />{pc.slabin}</dd></div>
                <div><dt className="stitek">Kritických</dt><dd className="cislice mt-1 flex items-center gap-1.5 text-cislo font-bold leading-none text-inkoust"><span aria-hidden className="h-[6px] w-[6px] rounded-full bg-akcent" />{pc.kritickych}</dd></div>
                <div><dt className="stitek">72 h</dt><dd className="mt-1 flex items-center gap-1.5 text-male font-semibold leading-none text-inkoust"><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${TECKA_HORIZONTU[pc.horizont72]}`} />{SLOVA_HORIZONTU[pc.horizont72]}</dd></div>
              </dl>
            )}
            {vyplneno > 0 && pc.nehodnoceno > 0 && <p className="mt-2 text-drobne text-tlum2">{pc.nehodnoceno} {pc.nehodnoceno === 1 ? "oblast zatím bez odpovědi" : pc.nehodnoceno < 5 ? "oblasti zatím bez odpovědi" : "oblastí zatím bez odpovědi"}.</p>}
          </div>

          {/* zdarma, vždy nad nabídkou: bezpečnostní nálezy */}
          {nalezy.length > 0 && (
            <div className="mt-6 pt-5">
              <div className="flex items-center gap-1.5"><span className="nadpis-boxu">Bezpečnostní nálezy</span><Otaznik popis={<span className="block">Věci, které mohou ohrozit zdraví. Jsou zdarma vždy a bez účtu. Web u nich neradí lékařsky ani technicky — odkazuje na oficiální postupy.</span>} /></div>
              <ul className="mt-2 space-y-2">
                {nalezy.map((n) => (
                  <li key={n.klic} className="flex items-start gap-2">
                    <span aria-hidden className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-akcent" />
                    <span className="min-w-0"><span className="block text-male font-semibold text-inkoust">{n.nadpis}</span><span className="block text-drobne text-tlum">{n.proc}</span></span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-drobne text-tlum2"><Link href="/pripravenost/" className="odkaz">Oficiální postupy a tísňová čísla</Link></p>
            </div>
          )}

          {/* zdarma: rady bez nákupu */}
          {zaridit.length > 0 && (
            <div className="mt-6 pt-5">
              <div className="flex items-center gap-1.5">
                <Ikona nazev="fajfka" velikost={14} tah={2.2} trida="text-akcent" />
                <h2 className="text-zaklad font-bold text-inkoust">Zařídit, za 0 Kč</h2>
              </div>
              <ol className="mt-2 space-y-2">
                {zaridit.map((x, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="cislice mt-[2px] w-5 shrink-0 text-drobne text-tlum2">{i + 1}.</span>
                    <span className="text-male text-tlum"><b className="font-semibold text-inkoust">{x.f}:</b> {x.r}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/*
            „Jak dlouho vydrží“ pro všechny, ne jen Premium (26. 9. 2026): je to
            hlavní odpověď kalkulačky a Premium zatím neběží — nikdo ji neviděl.
          */}
          <div className="mt-6 pt-5">
            <div className="flex items-center gap-1.5"><span className="nadpis-boxu">Jak dlouho vydrží</span><Otaznik popis={<span className="block">Předpoklady jsou u každé položky. Číslo je k plánování, ne k uklidnění.</span>} /></div>
            {(() => { const d = doporucenaZasobaVody(p, 7); return (
              <p className="mt-2 flex items-center justify-between gap-3 py-1.5 text-male">
                <span className="flex items-center gap-1.5 text-tlum">Doporučená zásoba pitné vody na 7 dní<Otaznik popis={<span className="block">{d.predpoklad}</span>} /></span>
                <span className="cislice shrink-0 font-semibold text-inkoust">{d.litru} l{d.nasobek !== 1 ? <span className="font-normal text-tlum2"> · {krajProfilu(p)?.nazev}</span> : ""}</span>
              </p>
            ); })()}
            <ul className="mt-1 pt-1">
              {s.vydrze.filter((v) => v.klic !== "energie" || p.energie.kapacitaWh > 0).map((v) => (
                <li key={v.klic} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="flex items-center gap-1.5 text-male text-tlum">{v.nazev}<Otaznik popis={<span className="block">{v.predpoklad}</span>} /></span>
                  <span className="cislice shrink-0 text-male font-semibold text-inkoust">{v.dni === null ? <span className="font-normal text-tlum2">nezadáno</span> : lidskaDoba(v.dni)}</span>
                </li>
              ))}
            </ul>
            {(() => { const r = rozpisJidla(p); if (!r) return null; return (
              <div className="mt-2 rounded-[14px] bg-plocha2/60 px-3 py-2">
                <div className="flex items-center gap-1.5 text-drobne font-semibold text-tlum">Jídlo podle živin<Otaznik popis={<span className="block">Potřeba na osobu a den podle referenční hodnoty EU: {POTRAVINY.potreba.kcal} kcal, bílkoviny {POTRAVINY.potreba.bilkoviny} g, tuky {POTRAVINY.potreba.tuky} g, sacharidy {POTRAVINY.potreba.sacharidy} g ({POTRAVINY.potreba.zdroj.nazev}). Děti počítáme jako dospělé. Hodnoty potravin orientační ({POTRAVINY.zdrojHodnot.nazev}).</span>} /></div>
                <ul>
                  {r.zivin.map((z) => (
                    <li key={z.klic} className="flex items-center justify-between gap-3 py-1 text-male">
                      <span className="text-tlum">{z.nazev} <span className="cislice text-drobne text-tlum2">{Math.round(z.mame).toLocaleString("cs-CZ")} {z.jednotka} · {z.naDen.toLocaleString("cs-CZ")} {z.jednotka}/den</span></span>
                      <span className={`cislice shrink-0 font-semibold ${r.nejdriv?.klic === z.klic ? "text-akcent" : "text-inkoust"}`}>{z.dni === null ? "—" : lidskaDoba(z.dni)}</span>
                    </li>
                  ))}
                </ul>
                {r.nejdriv && r.nejdriv.klic !== "kcal" && <p className="mt-1 text-drobne leading-snug text-tlum2">Nejdřív dojdou {r.nejdriv.nazev.toLowerCase()} — doplňte potraviny, které jich mají víc.</p>}
              </div>
            ); })()}
          </div>

          {premium ? (
            <>
              <div className="mt-6 pt-5">
                <div className="flex items-center gap-1.5">
                  <span className="nadpis-boxu">Na kolik dní jste připraveni</span>
                  <Otaznik popis={<span className="block">Plánovací horizont domácnosti podle zadaných zásob a předpokladů. 72 hodin je základ, ne cíl. Není to předpověď, jak dlouho co vydrží ve státě.</span>} />
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                  {s.horizonty.map((h) => (
                    <li key={h.dni} className="flex items-center gap-2 text-male">
                      <span aria-hidden className={`h-[6px] w-[6px] shrink-0 rounded-full ${TECKA_HORIZONTU[h.stav]}`} />
                      <span className="cislice whitespace-nowrap font-semibold text-inkoust">{horizontSlovo(h.dni)}</span>
                      <span className="text-tlum">{SLOVA_HORIZONTU[h.stav]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {(p.energie.spotrebice?.length ?? 0) > 0 && (
                <div className="mt-6 pt-5">
                  <SolarniOdhad kapacitaWh={p.energie.kapacitaWh} spotrebice={p.energie.spotrebice ?? []} solarWp={p.energie.solarWp ?? null} onSolarWp={(v) => uloz({ ...p, energie: { ...p.energie, solarWp: v } })} />
                </div>
              )}

              <dl className="mt-6 grid grid-cols-3 gap-3 pt-5">
                <div>
                  <dt className="stitek">Nezávislá záloha</dt>
                  <dd className="cislice mt-1 text-cislo font-bold leading-none text-inkoust">{s.vyreseno.n}<span className="text-tlum2"> / {s.vyreseno.z}</span></dd>
                </div>
                <div>
                  <dt className="stitek">Kritické závislosti</dt>
                  <dd className="cislice mt-1 text-cislo font-bold leading-none text-inkoust">{s.body.filter((b) => b.vypne.length >= 2).length}</dd>
                </div>
                <div>
                  <dt className="stitek">Nejslabší</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-male font-semibold text-inkoust">
                    {s.nejslabsi ? <><span aria-hidden className={`h-[6px] w-[6px] shrink-0 rounded-full ${TECKA_REDUNDANCE[s.nejslabsi.redundance]}`} />{s.nejslabsi.funkce.nazev}</> : "—"}
                  </dd>
                </div>
              </dl>

              {s.body.filter((b) => b.vypne.length >= 2).length > 0 && (
                <div className="mt-6 pt-5">
                  <div className="flex items-center gap-1.5"><span className="nadpis-boxu">Co vypne co</span><Otaznik popis={<span className="block">Závislost, jejíž výpadek vypne víc oblastí naráz, protože všechny jejich cesty na ní stojí.</span>} /></div>
                  <ul className="mt-2 space-y-1.5">
                    {s.body.filter((b) => b.vypne.length >= 2).slice(0, 5).map((b) => (
                      <li key={b.zavislost} className="text-male"><b className="font-semibold text-inkoust">{b.nazev}</b> <span className="text-tlum">→ {b.vypne.map((f) => f.nazev.toLowerCase()).join(", ")}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 pt-5">
                <CoUdelat doporuceni={s.doporuceni} nakup={s.nakup} />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2 pt-5">
                <button type="button" onClick={exportuj} className={TLACITKO_TICHE}><Ikona nazev="instalace" velikost={14} tah={2} /> Stáhnout plán</button>
                <button type="button" onClick={() => window.print()} className={TLACITKO_TICHE}><Ikona nazev="dokument" velikost={14} tah={2} /> Tisk</button>
              </div>
              <p className="mt-3 text-drobne text-tlum2">
                {zeServeru ? `Uloženo v zařízení i na serveru (${new Date(zeServeru).toLocaleString("cs-CZ")}), šifrovaně; smazat jde v účtu.` : "Uloženo v tomto zařízení; na server se ukládá po každé změně."} Katalog {VERZE_KATALOGU}. <Link href="/pripravenost/" className="odkaz">Oficiální nástroje a 72h základ</Link>
              </p>
            </>
          ) : (
            <>
              <div className="mt-6">
                {SPUSTENO.premium && <KartaPremium vyplneno={vyplneno} />}
              </div>
              <p className="mt-4 text-drobne text-tlum2">Uloženo jen v tomto zařízení, nikam se neposílá. Katalog {VERZE_KATALOGU}. <Link href="/pripravenost/" className="odkaz">Oficiální nástroje a 72h základ</Link></p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

/*
  Co udělat: nahoře ve výsledku, protože kvůli tomu člověk vyplňuje.
  Dva seznamy úkolů — dokoupit a zařídit (bez peněz) — a pod nimi
  nejvýš tři vysvětlená doporučení. Kdo chce vědět proč, rozklikne.
*/
function CoUdelat({ doporuceni, nakup }: { doporuceni: Doporuceni[]; nakup: Nakup[] }) {
  const obchody = OBCHODY.filter((o) => o.hledani);
  const nic = !nakup.length && !doporuceni.length;
  return (
    <div>
      <h2 className="text-velke font-bold text-inkoust">Co dokoupit</h2>
      {nic ? (
        <p className="mt-2 text-male text-tlum">Podle zaškrtnutého zatím nic. Doplňte zásoby vlevo, seznam se objeví tady.</p>
      ) : (
        <>
          {nakup.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1.5">
                <Ikona nazev="plus" velikost={14} tah={2.2} trida="text-akcent" />
                <h3 className="text-zaklad font-bold text-inkoust">Dokoupit</h3>
                <Otaznik popis={<span className="block">Věci, které zajistí chybějící cestu u funkcí bez nezávislé zálohy. Bez značek a cen; ke každé funkci jedna. Co jste označili jako neřešitelné, tu není.</span>} />
              </div>
              <ol className="mt-2 space-y-2">
                {nakup.map((n, i) => (
                  <li key={n.polozka} className="flex gap-3">
                    <span className="cislice mt-[2px] w-5 shrink-0 text-drobne text-tlum2">{i + 1}.</span>
                    <span className="min-w-0">
                      <span className="block text-zaklad font-semibold text-inkoust">{n.polozka}</span>
                      <span className="block text-drobne text-tlum">{n.proc}</span>
                      {jeRadio(n.polozka) && <TipAsa />}
                      {(ESHOP || obchody.length > 0) && (
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {ESHOP && <a href={ESHOP} target="_blank" rel="nofollow noopener noreferrer" className="rounded-full border border-linka px-3 py-1 text-mikro font-semibold text-inkoust hover:border-akcent">Náš e-shop</a>}
                          {obchody.map((o) => <a key={o.klic} href={o.hledani.replace("{q}", encodeURIComponent(n.polozka))} target="_blank" rel="nofollow noopener noreferrer" className="rounded-full border border-linka px-3 py-1 text-mikro font-semibold text-tlum hover:border-akcent hover:text-inkoust">{o.nazev}</a>)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              {!ESHOP && obchody.length === 0 && <p className="mt-2 text-drobne text-tlum2">Seznam funguje i bez odkazů do obchodů.</p>}
            </div>
          )}

          {doporuceni.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-1.5">
                <Ikona nazev="lupa" velikost={14} tah={2.2} trida="text-akcent" />
                <h3 className="text-zaklad font-bold text-inkoust">Proč právě tohle</h3>
              </div>
              <ul className="mt-2 space-y-2">
                {doporuceni.slice(0, 3).map((d, i) => <RadekDoporuceni key={i} d={d} />)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RadekDoporuceni({ d }: { d: Doporuceni }) {
  const [otevreno, setOtevreno] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => setOtevreno((x) => !x)} aria-expanded={otevreno} className="flex w-full items-start gap-2 text-left">
        <Ikona nazev="dolu" velikost={12} tah={2} trida={`mt-[5px] shrink-0 text-tlum2 transition-transform ${otevreno ? "rotate-180" : ""}`} />
        <span className="text-male font-semibold text-inkoust">{d.nadpis}</span>
      </button>
      {otevreno && (
        <dl className="mt-1.5 space-y-1 pl-5 text-male">
          <div><dt className="stitek inline">Proč:</dt> <dd className="inline text-tlum">{d.proc}</dd></div>
          <div><dt className="stitek inline">Z čeho:</dt> <dd className="inline text-tlum">{d.zaklad}</dd></div>
          {d.alternativy.length > 0 && <div><dt className="stitek">Možnosti:</dt><dd><ul className="mt-0.5 space-y-0.5 text-tlum">{d.alternativy.map((a) => <li key={a}>– {a}</li>)}</ul></dd></div>}
          <div><dt className="stitek inline">Kdy ne:</dt> <dd className="inline text-tlum">{d.kdyNeni}</dd></div>
        </dl>
      )}
    </li>
  );
}

function RadekFunkce({ h, profil, naCestu, naNemohu }: { h: HodnoceniFunkce; profil: Profil; naCestu: (c: string) => void; naNemohu: (d: string) => void }) {
  const [otevreno, setOtevreno] = useState(false);
  const f = h.funkce;
  const vybrane = new Set(profil.cesty[f.klic] ?? []);
  const pocetCest = h.mam.length;
  return (
    <li>
      <button type="button" onClick={() => setOtevreno((x) => !x)} aria-expanded={otevreno} className="flex min-h-[56px] w-full items-center gap-3 py-2.5 text-left hover:bg-plocha2/60">
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
        <div className="pb-4 pl-0 sm:pl-12">
          <p className="text-male text-tlum">Potřeba: {f.potreba}.</p>
          <ul className="mt-2 space-y-1">
            {f.cesty.map((c) => {
              const pevne = Boolean(c.kontext || c.pocet);
              const ma = maCestu(c, f, profil, vybrane);
              const pozn = poznamkaKPoctu(c, profil);
              return (
                <li key={c.klic}>
                  <label className={`flex items-start gap-3 py-1.5 ${pevne ? "" : "cursor-pointer"}`}>
                    <input type="checkbox" checked={ma} disabled={pevne} onChange={() => naCestu(c.klic)} className="mt-1 h-4 w-4 accent-akcent disabled:opacity-60" />
                    <span className="min-w-0">
                      <span className="block text-male text-inkoust">
                        {c.nazev}
                        {c.zadarmo && <span className="ml-1.5 text-mikro text-tlum2">0 Kč</span>}
                        {c.externi && <span className="ml-1.5 text-mikro text-tlum2">externí služba</span>}
                      </span>
                      <span className="block text-drobne text-tlum2">
                        {c.zavislosti.length ? `závisí na: ${c.zavislosti.map((z) => ZAVISLOSTI[z]?.nazev.toLowerCase() ?? z).join(", ")}` : "bez vnější závislosti"}
                        {c.poznamka ? ` · ${c.poznamka}` : ""}
                        {c.kontext ? " · podle přepínače v kroku 01" : ""}
                        {pozn ? ` · ${pozn}` : ""}
                      </span>
                      {jeRadio(c.nazev) && <TipAsa />}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {h.spolecne.length > 0 && h.redundance === 2 && (
            <p className="mt-2 flex items-start gap-2 text-drobne text-tlum"><span aria-hidden className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-jantar" />Vaše zálohy sdílejí závislost: {h.spolecne.map((z) => ZAVISLOSTI[z]?.nazev.toLowerCase() ?? z).join(", ")}. Když vypadne, vypadnou spolu.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-male text-tlum" htmlFor={`nemohu-${f.klic}`}>Tohle nemohu vyřešit:</label>
            <select id={`nemohu-${f.klic}`} value={h.nemohu ?? ""} onChange={(e) => naNemohu(e.target.value)} className={`${POLE} !w-auto`}>
              <option value="">ne, řeším</option>
              {DUVODY_NEMOHU.map((d) => <option key={d.klic} value={d.klic}>{d.nazev}</option>)}
            </select>
          </div>
          {h.nemohu && (
            <ul className="mt-2 space-y-1 border-l-2 border-linka pl-3">
              {f.kompenzace.map((k) => <li key={k} className="text-male text-tlum">{k}</li>)}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
