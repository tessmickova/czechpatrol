"use client";

import { HlavickaWidgetu } from "./widgety";
import { useEffect, useState } from "react";
import { datumPraha } from "@/lib/cas";
import { LEKARNICKA, NAZVY_KATEGORII, PORADI_KATEGORII, UDALOSTI, nactiOdpovedi, skorePripravenosti, souhrnOtazek, ulozOdpovedi, vetaKeSkore, type Odpoved, type Odpovedi, type OtazkaDotazniku } from "@/lib/pripravenost";
import type { OficialniNastroj } from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { Odznak, Sdeleni, Tlacitko } from "./ui";
import { Otaznik } from "./zaklad";

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

const ODPOVEDI: { klic: Odpoved; znak: string; slovo: string }[] = [
  { klic: "mam", znak: "✓", slovo: "mám" },
  { klic: "nemam", znak: "○", slovo: "nemám" },
  { klic: "nevim", znak: "?", slovo: "nevím" },
];

const DOSTUPNOST: Record<OficialniNastroj["dostupnost"], string> = { aplikace: "aplikace", sluzba: "služba", system: "systém v telefonu / v místě" };

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

function Prepinac({ id, nazev, odpovedi, odpovez }: { id: string; nazev: string; odpovedi: Odpovedi; odpovez: (id: string, o: Odpoved) => void }) {
  const o = odpovedi[id];
  return (
    <div role="radiogroup" aria-label={`${nazev}: mám, nemám, nevím`} className="flex shrink-0 gap-1.5">
      {ODPOVEDI.map((x) => (
        <button
          key={x.klic}
          type="button"
          role="radio"
          aria-checked={o === x.klic}
          onClick={() => odpovez(id, x.klic)}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-drobne ${o === x.klic ? "border-inkoust text-inkoust" : "border-linka text-tlum hover:border-akcent"}`}
        >
          <span aria-hidden className={`h-[6px] w-[6px] rounded-full ${o === x.klic ? (x.klic === "mam" ? "bg-klid" : x.klic === "nemam" ? "bg-akcent" : "bg-pozor") : "border border-linka"}`} />
          {x.znak} {x.slovo}
        </button>
      ))}
    </div>
  );
}

function SeznamOtazek({ otazky, odpovedi, odpovez }: { otazky: OtazkaDotazniku[]; odpovedi: Odpovedi; odpovez: (id: string, o: Odpoved) => void }) {
  return (
    <ul className="bez-stropu divide-y divide-linka2">
      {otazky.map((q) => (
        <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 px-1 py-2.5">
          <span className="min-w-0">
            <span className="block text-zaklad font-semibold text-inkoust">{q.nazev}</span>
            {q.upresneni && <span className="block text-drobne text-tlum2">{q.upresneni}</span>}
          </span>
          <Prepinac id={q.id} nazev={q.nazev} odpovedi={odpovedi} odpovez={odpovez} />
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

function KartaNastroje({ n, odpovedi, odpovez, zarizeni }: { n: OficialniNastroj; odpovedi: Odpovedi; odpovez: (id: string, o: Odpoved) => void; zarizeni: "ios" | "android" | null }) {
  return (
    <li className="rounded-[22px] border border-linka2 bg-plocha p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-[2px] grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-linka2 text-tlum"><Ikona nazev={n.ikona as NazevIkony} velikost={18} tah={1.8} /></span>
          <span className="min-w-0">
            <h3 className="text-velke font-bold leading-tight text-inkoust">{n.nazev}</h3>
            <p className="mt-0.5 text-male text-inkoust">{n.kratce}</p>
            <p className="mt-0.5 text-drobne text-tlum2">{n.provozovatel} · {DOSTUPNOST[n.dostupnost]}</p>
          </span>
        </div>
        {/* Tři odpovědi jako přepínač. Barvu nese jen tečka u vybrané. */}
        <Prepinac id={n.id} nazev={n.nazev} odpovedi={odpovedi} odpovez={odpovez} />
      </div>

      {/* Instalace hned: jedno klepnutí do obchodu, nejdřív pro zařízení, ze kterého člověk čte. */}
      {(n.iosUrl || n.androidUrl) && (
        <p className="mt-3 flex flex-wrap gap-2">
          {(zarizeni === "android" ? [["android", n.androidUrl, "Nainstalovat pro Android"], ["ios", n.iosUrl, "Nainstalovat pro iPhone"]] : [["ios", n.iosUrl, "Nainstalovat pro iPhone"], ["android", n.androidUrl, "Nainstalovat pro Android"]])
            .filter(([, u]) => u)
            .map(([k, u, t], i) => (
              <a key={k as string} href={u as string} target="_blank" rel={VEN} className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-drobne font-semibold ${i === 0 ? "bg-akcent text-papir hover:bg-akcent-svetla" : "border border-linka text-inkoust hover:border-akcent"}`}>
                <Ikona nazev="instalace" velikost={14} tah={2} />{t as string}
              </a>
            ))}
        </p>
      )}

      {/* Podrobnosti na rozkliknutí: v kroku má být vidět otázka a odpověď, ne čtyři odstavce. */}
      <details className="group mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-drobne font-semibold text-tlum hover:text-inkoust">
          K čemu je a co nastavit <Ikona nazev="dolu" velikost={11} tah={2} trida="transition-transform group-open:rotate-180" />
        </summary>
        <p className="mt-3 max-w-[62ch] text-zaklad leading-relaxed text-tlum">{n.popis}</p>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-male sm:grid-cols-2 [&_dd]:max-w-[62ch] [&_dt]:max-w-[62ch]">
          <div><dt className="stitek">K čemu je</dt><dd className="mt-0.5 text-tlum">{n.kCemu}</dd></div>
          <div><dt className="stitek">Kdy mi pomůže</dt><dd className="mt-0.5 text-tlum">{n.kdyPomuze}</dd></div>
          <div><dt className="stitek">Proč to mít</dt><dd className="mt-0.5 text-tlum">{n.procMit}</dd></div>
          <div>
            <dt className="stitek">Co nastavit</dt>
            <dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{n.coNastavit.map((c) => <li key={c}>{c}</li>)}</ul></dd>
          </div>
        </dl>
        {n.poznamka && (
          <p className="mt-3 flex items-start gap-1.5 text-drobne leading-snug text-tlum2">
            <Ikona nazev="info" velikost={13} tah={1.9} trida="mt-[2px] shrink-0" />{n.poznamka}
          </p>
        )}
      </details>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-linka2 pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {n.webUrl && <a href={n.webUrl} target="_blank" rel={VEN} className="odkaz text-drobne">Web provozovatele ↗</a>}
          {n.oficialniZdroj && n.oficialniZdroj !== n.webUrl && <a href={n.oficialniZdroj} target="_blank" rel={VEN} className="odkaz text-drobne">Oficiální informace ↗</a>}
          {!n.iosUrl && !n.androidUrl && n.dostupnost === "aplikace" && <span className="text-drobne text-tlum2">odkazy do obchodů: přes web provozovatele</span>}
          {n.proKoho.map((p) => <Odznak key={p} ton="neutral">{p}</Odznak>)}
        </div>
        <Stav n={n} />
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
      const polozky = nastroje.filter((n) => n.kategorie === kat);
      return polozky.length ? [{ klic: kat, nazev: NAZVY_KATEGORII[kat], druh: "nastroje", polozky, ids: polozky.map((n) => n.id) }] : [];
    }),
    { klic: "lekarnicka", nazev: "Lékárnička", druh: "otazky", otazky: LEKARNICKA, ids: LEKARNICKA.map((q) => q.id), uvod: <>Na které oblasti jste připraveni. Složení lékárničky probírejte s lékárníkem nebo lékařem — web zdravotní rady nedává.</> },
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

  const skore = skorePripravenosti(nastroje, odpovedi);
  // Skóre nástrojů se počítá jen z odpovědí u nástrojů — vyplněná lékárnička ho nesmí „zapnout".
  const odpovezenoNastroju = nastroje.some((n) => odpovedi[n.id]);
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
      <nav aria-label="Kroky průvodce" className="rounded-[22px] border border-linka2 bg-plocha px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span className="stitek">Krok {krok + 1} z {kroky.length} · {aktualni.nazev}</span>
          <span className="cislice text-mikro text-tlum2">{nacteno ? `${zodpovezenoCelkem} z ${otazekCelkem} zodpovězeno` : ""}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-plocha2">
          <div className="h-full rounded-full bg-akcent transition-[width]" style={{ width: `${Math.round(((krok + 1) / kroky.length) * 100)}%` }} />
        </div>
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
            <p className="max-w-[62ch] text-male text-tlum">U každé služby zvolte mám, nemám nebo nevím. Odpovědi zůstávají jen v tomto prohlížeči.</p>
            <ol className="bez-stropu space-y-3">
              {aktualni.polozky.map((n) => <KartaNastroje key={n.id} n={n} odpovedi={odpovedi} odpovez={odpovez} zarizeni={zarizeni} />)}
            </ol>
          </>
        )}
        {aktualni.druh === "otazky" && (
          <>
            <p className="max-w-[62ch] text-male text-tlum">{aktualni.uvod}</p>
            <div className="rounded-[22px] border border-linka2 bg-plocha p-3 sm:p-4"><SeznamOtazek otazky={aktualni.otazky} odpovedi={odpovedi} odpovez={odpovez} /></div>
          </>
        )}
        {aktualni.druh === "vysledek" && (
          <div className="rounded-[22px] border border-linka2 bg-plocha p-5 sm:p-6">
            <div className="flex items-center gap-1.5"><span className="stitek">Digitální připravenost</span><Otaznik popis={<span className="block">Počítá se jen z vašich odpovědí. Web nevidí, co máte v telefonu, a odpovědi zůstávají v tomto prohlížeči.</span>} /></div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="cislice text-cislo-xl font-bold leading-none text-inkoust">{nacteno && odpovezenoNastroju ? skore.mam : "–"}</span>
              <span className="cislice text-cislo text-tlum2">/ {skore.celkem}</span>
            </div>
            {/* Před první odpovědí se skóre nepočítá: „0 z 8, u 8 nevíte" by vypadalo jako výsledek. */}
            <p className="mt-2 max-w-[62ch] text-male text-tlum">{!nacteno ? "Odpovědi se načítají z tohoto zařízení." : !odpovezenoNastroju ? "Zatím bez odpovědí. Projděte kroky a u každé položky zvolte mám, nemám nebo nevím." : vetaKeSkore(skore)}</p>
            {nacteno && (skore.chybi.length > 0 || skore.nevim.length > 0) && (
              <ul className="mt-4 divide-y divide-linka2 border-t border-linka2">
                {[...skore.chybi, ...skore.nevim].map((id) => {
                  const n = nastroje.find((x) => x.id === id);
                  if (!n) return null;
                  const i = kroky.findIndex((k) => k.druh === "nastroje" && k.ids.includes(id));
                  return (
                    <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="flex items-center gap-2 text-male text-inkoust"><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${odpovedi[id] === "nemam" ? "bg-akcent" : "bg-pozor"}`} />{n.nazev} <span className="text-drobne text-tlum2">{odpovedi[id] === "nemam" ? "nemáte" : "nevíte"}</span></span>
                      {i >= 0 && <button type="button" onClick={() => jdi(i)} className="text-drobne font-semibold text-tlum hover:text-akcent">upravit →</button>}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Tlacitko kam="/odolnost/" varianta="plny" velikost="m" ikona="terc">Kalkulačka odolnosti</Tlacitko>
              <Tlacitko kam="/" varianta="obrys" velikost="m">Zpět na přehled</Tlacitko>
            </div>
          </div>
        )}
      </section>

      {/* Ovládání kroků */}
      <div className="flex items-center justify-between gap-3 border-t border-linka2 pt-4">
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
  const skore = skorePripravenosti(nastroje, odpovedi ?? {});
  const zacal = odpovedi && Object.keys(odpovedi).length > 0;
  return (
    <section aria-label="Jsem připraven?" className={vnoreny ? "" : "overflow-hidden rounded-[22px] border border-linka2 bg-plocha"}>
      {!vnoreny && <HlavickaWidgetu ikona="stit" nazev="Jsem připraven/a?" meta={<span className="cislice">{zacal ? `${skore.mam} / ${skore.celkem}` : `${skore.celkem} doporučených služeb`}</span>} />}
      <div className="px-4 py-3">
        <p className="text-male leading-snug text-tlum">
          {zacal ? vetaKeSkore(skore) : "Záchranka, tísňové linky, varování na mobil, výstrahy ČHMÚ, DROZD, sirény, krizové vysílání, kanál obce. Co z toho máte nastavené?"}
        </p>
        <Tlacitko kam="/pripravenost/" varianta="plny" velikost="s" ikonaVpravo="nahoru" trida="mt-3 [&>svg:last-child]:rotate-90">Projít průvodce</Tlacitko>
      </div>
    </section>
  );
}
