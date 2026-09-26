"use client";

import { HlavickaWidgetu } from "./widgety";
import { jeRadio, TipAsa } from "./tip-asa";
import { useEffect, useState } from "react";
import { datumPraha } from "@/lib/cas";
import { BEZ_SIGNALU, LEKARNICKA, ODBERY, NAZVY_KATEGORII, PORADI_KATEGORII, UDALOSTI, ZMINKY, nactiOdpovedi, nastrojeDoPruvodce, skorePripravenosti, souhrnOtazek, ulozOdpovedi, vetaKeSkore, type Odpoved, type Odpovedi, type OtazkaDotazniku } from "@/lib/pripravenost";
import type { OficialniNastroj } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Sdeleni, Tlacitko } from "./ui";
import { Napoveda, Otaznik } from "./zaklad";
import type { OfflineMapa } from "@/config/odkazy-ven";

/*
  Odkazy ven jsou rel="nofollow": web neručí za cizí stránky a nepřenáší
  jim váhu. Instalace v nejméně krocích: tlačítko do obchodu je hned
  u názvu, a to nejdřív pro zařízení, ze kterého člověk čte.
*/
const VEN = "nofollow noopener noreferrer";

function platforma(): "ios" | "android" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null;
}

/*
  „Jsem připraven/a?" — průvodce oficiálními nástroji.

  Ne prepper checklist. Seznam toho, co stát a veřejné instituce už
  provozují, a co si má člověk nastavit dřív, než se něco stane. U každé
  položky: kdo to provozuje, k čemu je, kdy pomůže, co nastavit, kdy jsme
  informaci naposledy ověřili a odkaz na provozovatele.

  Odpovědi mám / nemám / nevím zůstávají v prohlížeči. Nikam se
  neposílají — CzechPatrol nemá vědět, kdo nemá Záchranku.
*/


function Stav({ n }: { n: OficialniNastroj }) {
  if (n.stav === "overeno" && n.overeno) return <span className="text-mikro text-tlum2">ověřeno {datumPraha(`${n.overeno}T12:00:00Z`)}</span>;
  if (n.stav === "obecne") return <span className="text-mikro text-tlum2">obecná rada</span>;
  /* Dvě různé věci, dvě různá slova: adresa odpovídá ≠ informace ověřena. */
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-mikro text-tlum2">
      {n.adresaOverena && <span>adresa odpovídá {datumPraha(`${n.adresaOverena}T12:00:00Z`)}</span>}
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-pozor" />
        informace čeká na ověření
      </span>
    </span>
  );
}

/*
  Zaškrtávací kolečko (26. 9. 2026): místo tří voleb mám / nemám / nevím
  jedno klepnutí. Zaškrtnuto = mám; odškrtnutí uloží „nemám“. Dotyková
  plocha 44 px, vidět je kolečko 28 px.
*/
function Kolecko({ id, nazev, odpovedi, odpovez }: { id: string; nazev: string; odpovedi: Odpovedi; odpovez: (id: string, o: Odpoved) => void }) {
  const mam = odpovedi[id] === "mam";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mam}
      aria-label={nazev}
      onClick={() => odpovez(id, mam ? "nemam" : "mam")}
      className="-m-2 grid shrink-0 place-items-center p-2"
    >
      <span aria-hidden className={`grid h-7 w-7 place-items-center rounded-full border-2 transition-colors ${mam ? "pop border-klid bg-klid text-papir" : "border-linka hover:border-klid/70"}`}>
        {mam && <Ikona nazev="fajfka" velikost={14} tah={3} />}
      </span>
    </button>
  );
}

/** Odkazy do obchodů u doporučené aplikace; důvod po najetí nebo klepnutí na název. */
function Aplikace({ a }: { a: OfflineMapa[] }) {
  return (
    <span className="mt-1.5 flex flex-col gap-1">
      {a.map((m) => (
        <span key={m.nazev} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-drobne">
          <Napoveda popis={<span className="block">{m.proc}</span>} label={`Proč ${m.nazev}`}>
            <span className="cursor-help font-semibold text-inkoust underline decoration-dotted underline-offset-4">{m.nazev}{m.alternativa && <span className="ml-1 font-normal text-tlum2">alternativa</span>}</span>
          </Napoveda>
          <a href={m.android} target="_blank" rel={VEN} className="odkaz text-tlum2">Android ↗</a>
          <a href={m.ios} target="_blank" rel={VEN} className="odkaz text-tlum2">iPhone ↗</a>
        </span>
      ))}
    </span>
  );
}

function SeznamOtazek({ otazky, odpovedi, odpovez }: { otazky: OtazkaDotazniku[]; odpovedi: Odpovedi; odpovez: (id: string, o: Odpoved) => void }) {
  return (
    <ul className="bez-stropu divide-y divide-linka/60">
      {otazky.map((q) => (
        <li key={q.id} className="flex items-start gap-3 py-2.5">
          <Kolecko id={q.id} nazev={q.nazev} odpovedi={odpovedi} odpovez={odpovez} />
          <span className="min-w-0 pt-0.5">
            <span className={`block text-male font-semibold leading-snug ${odpovedi[q.id] === "mam" ? "text-tlum" : "text-inkoust"}`}>{q.nazev}</span>
            {q.upresneni && <span className="block text-drobne leading-snug text-tlum2">{q.upresneni}</span>}
            {q.aplikace && <Aplikace a={q.aplikace} />}
            {jeRadio(q.nazev) && <TipAsa />}
            {q.odkaz && (q.odkaz.url.startsWith("/")
              ? <a href={q.odkaz.url} className="odkaz mt-0.5 inline-block text-drobne text-tlum2">{q.odkaz.nazev} →</a>
              : <a href={q.odkaz.url} target="_blank" rel={VEN} className="odkaz mt-0.5 inline-block text-drobne text-tlum2">Zdroj: {q.odkaz.nazev} ↗</a>)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/*
  Průvodce po krocích (24. 9. 2026, podle zadání): místo částí pod sebou
  jeden krok na obrazovce — šest oblastí oficiálních nástrojů, lékárnička,
  události, výsledek. Nahoře pruh postupu s tečkami, dole Zpět / Další.
  Odpovědi se ukládají po každém klepnutí, takže se dá kdykoli odejít
  a vrátit; průvodce otevře první nedokončený krok.
*/
type Krok =
  | { klic: string; nazev: string; druh: "nastroje"; polozky: OficialniNastroj[]; ids: string[] }
  | { klic: string; nazev: string; druh: "otazky"; otazky: OtazkaDotazniku[]; ids: string[]; uvod: React.ReactNode }
  | { klic: "vysledek"; nazev: string; druh: "vysledek"; ids: string[] };

function RadekNastroje({ n, odpovedi, odpovez, zarizeni }: { n: OficialniNastroj; odpovedi: Odpovedi; odpovez: (id: string, o: Odpoved) => void; zarizeni: "ios" | "android" | null }) {
  const mam = odpovedi[n.id] === "mam";
  const obchody = (zarizeni === "android" ? [["android", n.androidUrl, "Android"], ["ios", n.iosUrl, "iPhone"]] : [["ios", n.iosUrl, "iPhone"], ["android", n.androidUrl, "Android"]]).filter(([, u]) => u) as [string, string, string][];
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Kolecko id={n.id} nazev={n.nazev} odpovedi={odpovedi} odpovez={odpovez} />
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={`text-male font-semibold leading-snug ${mam ? "text-tlum" : "text-inkoust"}`}>{n.nazev}</p>
        <p className="text-drobne leading-snug text-tlum2">{n.kratce}</p>
        {/* Instalace a podrobnosti až na klepnutí — v kroku má být vidět jen co a jestli to mám. */}
        <details className="group mt-1">
          <summary className="inline-flex min-h-[32px] cursor-pointer list-none items-center gap-1 text-drobne font-semibold text-tlum hover:text-inkoust">
            Jak nastavit <Ikona nazev="dolu" velikost={11} tah={2} trida="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-1 space-y-2 text-drobne leading-relaxed text-tlum">
            {obchody.length > 0 && (
              <p className="flex flex-wrap gap-2">
                {obchody.map(([k, u, t], i) => (
                  <a key={k} href={u} target="_blank" rel={VEN} className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 font-semibold ${i === 0 ? "bg-akcent text-papir hover:bg-akcent-svetla" : "border border-linka text-inkoust hover:border-akcent"}`}>
                    <Ikona nazev="instalace" velikost={13} tah={2} />{t}
                  </a>
                ))}
              </p>
            )}
            <p>{n.kCemu}</p>
            <ul className="list-disc pl-4">{n.coNastavit.map((c) => <li key={c}>{c}</li>)}</ul>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {n.webUrl && <a href={n.webUrl} target="_blank" rel={VEN} className="odkaz">Web provozovatele ↗</a>}
              {n.oficialniZdroj && n.oficialniZdroj !== n.webUrl && <a href={n.oficialniZdroj} target="_blank" rel={VEN} className="odkaz">Oficiální informace ↗</a>}
              <Stav n={n} />
            </p>
          </div>
        </details>
      </div>
    </li>
  );
}

export function PripravenostKlient({ nastroje }: { nastroje: OficialniNastroj[] }) {
  const [odpovedi, setOdpovedi] = useState<Odpovedi>({});
  const [nacteno, setNacteno] = useState(false);
  const [ulozisteFunguje, setUlozisteFunguje] = useState(true);
  const [zarizeni, setZarizeni] = useState<"ios" | "android" | null>(null);
  const [krok, setKrok] = useState(0);

  const kroky: Krok[] = [
    ...PORADI_KATEGORII.flatMap((kat): Krok[] => {
      const polozky = nastrojeDoPruvodce(nastroje).filter((n) => n.kategorie === kat);
      const krok: Krok[] = polozky.length ? [{ klic: kat, nazev: NAZVY_KATEGORII[kat], druh: "nastroje", polozky, ids: polozky.map((n) => n.id) }] : [];
      // Odběry a rádio hned za krizovými informacemi — tam je člověk hledá.
      return kat === "krizove-informace"
        ? [...krok, { klic: "odbery", nazev: "Zprávy a rádio", druh: "otazky", otazky: ODBERY, ids: ODBERY.map((q) => q.id), uvod: <>{ZMINKY.odbery}</> }]
        : krok;
    }),
    { klic: "offline", nazev: "Bez signálu", druh: "otazky", otazky: BEZ_SIGNALU, ids: BEZ_SIGNALU.map((q) => q.id), uvod: <>{ZMINKY.offline}</> },
    { klic: "lekarnicka", nazev: "Lékárnička", druh: "otazky", otazky: LEKARNICKA, ids: LEKARNICKA.map((q) => q.id), uvod: <>{ZMINKY.lekarnicka} Složení probírejte s lékárníkem — web zdravotní rady nedává.</> },
    { klic: "udalosti", nazev: "Události", druh: "otazky", otazky: UDALOSTI, ids: UDALOSTI.map((q) => q.id), uvod: <>Víte, co dělat, a máte k tomu doma, co je potřeba? Oficiální rady pro domácnosti: <a href="https://72h.gov.cz/" target="_blank" rel={VEN} className="odkaz">72h.gov.cz ↗</a></> },
    { klic: "vysledek", nazev: "Výsledek", druh: "vysledek", ids: [] },
  ];

  useEffect(() => {
    const ulozene = nactiOdpovedi();
    setOdpovedi(ulozene);
    setNacteno(true);
    setZarizeni(platforma());
    // Otevřít první nedokončený krok; kdo má vše, vidí rovnou výsledek.
    const prvni = kroky.findIndex((k) => k.druh !== "vysledek" && !souhrnOtazek(k.ids, ulozene).hotovo);
    setKrok(prvni === -1 ? kroky.length - 1 : prvni);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const odpovez = (id: string, o: Odpoved) => {
    const nove = { ...odpovedi, [id]: o };
    setOdpovedi(nove);
    if (!ulozOdpovedi(nove)) setUlozisteFunguje(false);
  };

  const vybrane = nastrojeDoPruvodce(nastroje);
  const skore = skorePripravenosti(vybrane, odpovedi);
  // Skóre nástrojů se počítá jen z odpovědí u nástrojů — vyplněná lékárnička ho nesmí „zapnout".
  const odpovezenoNastroju = vybrane.some((n) => odpovedi[n.id]);
  const aktualni = kroky[Math.min(krok, kroky.length - 1)];
  const posledni = krok >= kroky.length - 1;
  const jdi = (i: number) => {
    setKrok(Math.max(0, Math.min(kroky.length - 1, i)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const zodpovezenoCelkem = kroky.filter((k) => k.druh !== "vysledek").reduce((a, k) => a + souhrnOtazek(k.ids, odpovedi).zodpovezeno, 0);
  const otazekCelkem = kroky.filter((k) => k.druh !== "vysledek").reduce((a, k) => a + k.ids.length, 0);

  return (
    <div className="space-y-6">
      {/* Pruh postupu: tečka za každý krok, hotové zelené, aktuální s obrysem. Kliknutím se dá skočit kamkoli. */}
      <nav aria-label="Kroky průvodce" className="rounded-[22px] bg-plocha px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span className="nadpis-boxu">Krok {krok + 1} z {kroky.length} · {aktualni.nazev}</span>
          <span className="cislice text-mikro text-tlum2">{nacteno ? `${zodpovezenoCelkem} z ${otazekCelkem} · ${Object.values(odpovedi).filter((o) => o === "mam").length}× mám` : ""}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-plocha2">
          <div className="h-full rounded-full bg-klid transition-[width] duration-500" style={{ width: `${otazekCelkem ? Math.round((zodpovezenoCelkem / otazekCelkem) * 100) : 0}%` }} />
        </div>
        {aktualni.druh !== "vysledek" && souhrnOtazek(aktualni.ids, odpovedi).hotovo && (
          <p className="pop mt-2 flex items-center gap-2 text-drobne font-semibold text-klid-text"><Ikona nazev="fajfka" velikost={13} tah={2.6} /> {aktualni.nazev}: hotovo. Další krok je připravený.</p>
        )}
        <ol className="pas-scroll mt-3 flex gap-1.5 overflow-x-auto">
          {kroky.map((k, i) => {
            const s = k.druh === "vysledek" ? null : souhrnOtazek(k.ids, odpovedi);
            const hotovo = Boolean(s?.hotovo);
            return (
              <li key={k.klic} className="shrink-0">
                <button type="button" onClick={() => jdi(i)} aria-current={i === krok ? "step" : undefined}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-drobne ${i === krok ? "border-inkoust text-inkoust" : "border-linka2 text-tlum hover:border-akcent"}`}>
                  <span aria-hidden className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${hotovo ? "bg-klid text-papir" : i === krok ? "bg-inkoust text-papir" : "bg-plocha2 text-tlum2"}`}>{hotovo ? <Ikona nazev="fajfka" velikost={9} tah={3} /> : i + 1}</span>
                  {k.nazev}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {!ulozisteFunguje && <Sdeleni ton="neutral" ikona="info">Prohlížeč neumožnil odpovědi uložit — po obnovení stránky zmizí.</Sdeleni>}

      {/* Tělo kroku */}
      <section aria-label={aktualni.nazev} className="space-y-3">
        <h2 className="titul-mensi">{aktualni.nazev}</h2>
        {aktualni.druh === "nastroje" && (
          <>
            <p className="max-w-[62ch] text-male text-tlum">{ZMINKY[aktualni.klic] ? `${ZMINKY[aktualni.klic]} ` : ""}Zaškrtněte, co máte. Odpovědi zůstávají jen v tomto prohlížeči.</p>
            <ol className="bez-stropu divide-y divide-linka/60 rounded-[22px] bg-plocha px-3 sm:px-4">
              {aktualni.polozky.map((n) => <RadekNastroje key={n.id} n={n} odpovedi={odpovedi} odpovez={odpovez} zarizeni={zarizeni} />)}
            </ol>
          </>
        )}
        {aktualni.druh === "otazky" && (
          <>
            <p className="max-w-[62ch] text-male text-tlum">{aktualni.uvod}</p>
            <div className="rounded-[22px] bg-plocha px-3 sm:px-4"><SeznamOtazek otazky={aktualni.otazky} odpovedi={odpovedi} odpovez={odpovez} /></div>
          </>
        )}
        {aktualni.druh === "vysledek" && (
          <div className="rounded-[22px] bg-plocha p-5 sm:p-6">
            <div className="flex items-center gap-1.5"><span className="nadpis-boxu">Digitální připravenost</span><Otaznik popis={<span className="block">Počítá se jen z vašich odpovědí. Web nevidí, co máte v telefonu, a odpovědi zůstávají v tomto prohlížeči.</span>} /></div>
            <div className="mt-3 flex items-center gap-5">
              {(() => { const podil = nacteno && odpovezenoNastroju && skore.celkem ? skore.mam / skore.celkem : 0; const r = 34; const o = 2 * Math.PI * r; return (
                <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden className="pop shrink-0 -rotate-90">
                  <circle cx="46" cy="46" r={r} fill="none" stroke="var(--color-plocha2)" strokeWidth="9" />
                  <circle cx="46" cy="46" r={r} fill="none" stroke="var(--color-klid)" strokeWidth="9" strokeLinecap="round" strokeDasharray={o} strokeDashoffset={o * (1 - podil)} style={{ transition: "stroke-dashoffset 700ms ease-out" }} />
                </svg>
              ); })()}
              <div className="flex items-baseline gap-2">
                <span className="cislice text-cislo-xl font-bold leading-none text-inkoust">{nacteno && odpovezenoNastroju ? skore.mam : "–"}</span>
                <span className="cislice text-cislo text-tlum2">/ {skore.celkem}</span>
              </div>
            </div>
            {/* Před první odpovědí se skóre nepočítá: „0 z 8, u 8 nevíte" by vypadalo jako výsledek. */}
            <p className="mt-2 max-w-[62ch] text-male text-tlum">{!nacteno ? "Odpovědi se načítají z tohoto zařízení." : !odpovezenoNastroju ? "Zatím nic nezaškrtnuto. Projděte kroky a zaškrtněte, co máte." : vetaKeSkore(skore)}</p>
            {nacteno && (skore.chybi.length > 0 || skore.nevim.length > 0) && (
              <ul className="mt-4">
                {[...skore.chybi, ...skore.nevim].map((id) => {
                  const n = vybrane.find((x) => x.id === id);
                  if (!n) return null;
                  const i = kroky.findIndex((k) => k.druh === "nastroje" && k.ids.includes(id));
                  return (
                    <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="flex items-center gap-2 text-male text-inkoust"><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${odpovedi[id] === "nemam" ? "bg-akcent" : "bg-pozor"}`} />{n.nazev} <span className="text-drobne text-tlum2">nezaškrtnuto</span></span>
                      {i >= 0 && <button type="button" onClick={() => jdi(i)} className="text-drobne font-semibold text-tlum hover:text-akcent">upravit →</button>}
                    </li>
                  );
                })}
              </ul>
            )}
            {/* Na konci dotazníku velká výzva ke kalkulačce (26. 9. 2026): průvodce řekne, co máte; kalkulačka, jak dlouho s tím vydržíte. */}
            <a href="/odolnost/" className="group mt-6 block rounded-[22px] border-2 border-akcent bg-akcent/[0.06] p-5 transition-colors hover:bg-akcent/10 sm:p-6">
              <span className="flex items-center gap-2 text-akcent"><Ikona nazev="terc" velikost={20} tah={1.9} /><span className="nadpis-boxu !text-akcent">Další krok</span></span>
              <span className="mt-2 block text-cislo font-bold leading-tight text-inkoust">Vyzkoušejte i kalkulačku odolnosti</span>
              <span className="mt-1.5 block max-w-[56ch] text-zaklad text-tlum">Řekne vám, jak dlouho vydržíte bez proudu a obchodů — s vodou, jídlem i podle bílkovin, tuků a sacharidů — a co doplnit nejdřív.</span>
              <span className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-akcent px-6 text-zaklad font-semibold text-papir group-hover:bg-akcent-svetla">Spustit kalkulačku <Ikona nazev="nahoru" velikost={13} tah={2} trida="rotate-90" /></span>
            </a>
            <div className="mt-3"><Tlacitko kam="/" varianta="obrys" velikost="m">Zpět na přehled</Tlacitko></div>
          </div>
        )}
      </section>

      {/* Ovládání kroků */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <button type="button" onClick={() => jdi(krok - 1)} disabled={krok === 0} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-linka px-4 text-male font-semibold text-inkoust hover:border-akcent disabled:opacity-40 disabled:hover:border-linka">
          <Ikona nazev="nahoru" velikost={12} tah={2} trida="-rotate-90" /> Zpět
        </button>
        <span className="cislice text-mikro text-tlum2">{krok + 1} / {kroky.length}</span>
        {!posledni ? (
          <button type="button" onClick={() => jdi(krok + 1)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-akcent px-5 text-male font-semibold text-papir hover:bg-akcent-svetla">
            {krok === kroky.length - 2 ? "Zobrazit výsledek" : "Další"} <Ikona nazev="nahoru" velikost={12} tah={2} trida="rotate-90" />
          </button>
        ) : <span className="w-[96px]" />}
      </div>
    </div>
  );
}

/** Malá karta na úvodní straně: skóre a odkaz. Bez odpovědí ukáže jen počet položek. */
export function PripravenostKarta({ nastroje, vnoreny = false }: { nastroje: OficialniNastroj[]; vnoreny?: boolean }) {
  const [odpovedi, setOdpovedi] = useState<Odpovedi | null>(null);
  useEffect(() => { setOdpovedi(nactiOdpovedi()); }, []);
  const skore = skorePripravenosti(nastrojeDoPruvodce(nastroje), odpovedi ?? {});
  const zacal = odpovedi && Object.keys(odpovedi).length > 0;
  return (
    <section aria-label="Jsem připraven?" className={vnoreny ? "" : "overflow-hidden rounded-[22px] bg-plocha"}>
      {!vnoreny && <HlavickaWidgetu ikona="stit" nazev="Jsem připraven/a?" meta={<span className="cislice">{zacal ? `${skore.mam} / ${skore.celkem}` : `${skore.celkem} doporučených služeb`}</span>} />}
      <div className="px-4 py-3">
        <p className="text-male leading-snug text-tlum">
          {zacal ? vetaKeSkore(skore) : "Záchranka, varování na mobil, výstrahy ČHMÚ, kanál obce, offline mapa. Co z toho máte nastavené?"}
        </p>
        <Tlacitko kam="/pripravenost/" varianta="plny" velikost="s" ikonaVpravo="nahoru" trida="mt-3 [&>svg:last-child]:rotate-90">Projít průvodce</Tlacitko>
      </div>
    </section>
  );
}
