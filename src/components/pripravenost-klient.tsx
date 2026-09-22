"use client";

import { useEffect, useState } from "react";
import { datumPraha } from "@/lib/cas";
import { NAZVY_KATEGORII, PORADI_KATEGORII, nactiOdpovedi, skorePripravenosti, ulozOdpovedi, vetaKeSkore, type Odpoved, type Odpovedi } from "@/lib/pripravenost";
import type { OficialniNastroj } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Odznak, Sdeleni } from "./ui";

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

export function PripravenostKlient({ nastroje }: { nastroje: OficialniNastroj[] }) {
  const [odpovedi, setOdpovedi] = useState<Odpovedi>({});
  const [nacteno, setNacteno] = useState(false);
  const [ulozisteFunguje, setUlozisteFunguje] = useState(true);

  useEffect(() => {
    setOdpovedi(nactiOdpovedi());
    setNacteno(true);
  }, []);

  const odpovez = (id: string, o: Odpoved) => {
    const nove = { ...odpovedi, [id]: o };
    setOdpovedi(nove);
    if (!ulozOdpovedi(nove)) setUlozisteFunguje(false);
  };

  const skore = skorePripravenosti(nastroje, odpovedi);

  return (
    <div className="space-y-8">
      {/* Skóre. Číslo je z odpovědí, ne z telefonu — věta pod ním to říká. */}
      <section aria-label="Digitální připravenost" className="rounded-[22px] border border-linka2 bg-plocha p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="stitek">Digitální připravenost</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="cislice text-cislo-xl font-bold leading-none text-inkoust">{nacteno && Object.keys(odpovedi).length > 0 ? skore.mam : "–"}</span>
              <span className="cislice text-cislo text-tlum2">/ {skore.celkem}</span>
            </div>
            {/* Před první odpovědí se skóre nepočítá: „0 z 8, u 8 nevíte" by vypadalo jako výsledek. */}
            <p className="mt-2 text-male text-tlum">{!nacteno ? "Odpovědi se načítají z tohoto zařízení." : Object.keys(odpovedi).length === 0 ? "Zatím bez odpovědí. U každé položky níže zvolte mám, nemám nebo nevím." : vetaKeSkore(skore)}</p>
          </div>
          <p className="max-w-[34ch] text-mikro leading-snug text-tlum2">
            Počítá se jen z vašich odpovědí. Web nevidí, co máte v telefonu, a odpovědi zůstávají v tomto prohlížeči.
          </p>
        </div>
        {!ulozisteFunguje && (
          <div className="mt-4"><Sdeleni ton="neutral" ikona="info">Prohlížeč neumožnil odpovědi uložit — po obnovení stránky zmizí.</Sdeleni></div>
        )}
      </section>

      {PORADI_KATEGORII.map((kat) => {
        const polozky = nastroje.filter((n) => n.kategorie === kat);
        if (!polozky.length) return null;
        return (
          <section key={kat} aria-label={NAZVY_KATEGORII[kat]}>
            <h2 className="stitek mb-3">{NAZVY_KATEGORII[kat]}</h2>
            {/* bez-stropu: karta je seznam údajů, ne odstavec — strop 72ch na li tu nemá co dělat */}
            <ol className="bez-stropu space-y-3">
              {polozky.map((n) => {
                const o = odpovedi[n.id];
                return (
                  <li key={n.id} className="rounded-[22px] border border-linka2 bg-plocha p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-velke font-bold leading-tight text-inkoust">{n.nazev}</h3>
                        <p className="mt-1 text-male text-tlum">{n.provozovatel} · {DOSTUPNOST[n.dostupnost]}</p>
                      </div>
                      {/* Tři odpovědi jako přepínač. Barvu nese jen tečka u vybrané. */}
                      <div role="radiogroup" aria-label={`${n.nazev}: mám, nemám, nevím`} className="flex shrink-0 gap-1.5">
                        {ODPOVEDI.map((x) => (
                          <button
                            key={x.klic}
                            type="button"
                            role="radio"
                            aria-checked={o === x.klic}
                            onClick={() => odpovez(n.id, x.klic)}
                            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-drobne ${o === x.klic ? "border-inkoust text-inkoust" : "border-linka text-tlum hover:border-akcent"}`}
                          >
                            <span aria-hidden className={`h-[6px] w-[6px] rounded-full ${o === x.klic ? (x.klic === "mam" ? "bg-klid" : x.klic === "nemam" ? "bg-akcent" : "bg-pozor") : "border border-linka"}`} />
                            {x.znak} {x.slovo}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="mt-3 text-zaklad leading-relaxed text-tlum">{n.popis}</p>

                    <dl className="mt-3 grid gap-x-6 gap-y-2 text-male sm:grid-cols-2">
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

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-linka2 pt-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {n.iosUrl && <a href={n.iosUrl} target="_blank" rel="noopener noreferrer" className="odkaz text-drobne">iOS ↗</a>}
                        {n.androidUrl && <a href={n.androidUrl} target="_blank" rel="noopener noreferrer" className="odkaz text-drobne">Android ↗</a>}
                        {n.webUrl && <a href={n.webUrl} target="_blank" rel="noopener noreferrer" className="odkaz text-drobne">Web provozovatele ↗</a>}
                        {n.oficialniZdroj && n.oficialniZdroj !== n.webUrl && <a href={n.oficialniZdroj} target="_blank" rel="noopener noreferrer" className="odkaz text-drobne">Oficiální informace ↗</a>}
                        {!n.iosUrl && !n.androidUrl && n.dostupnost === "aplikace" && <span className="text-drobne text-tlum2">odkazy do obchodů: přes web provozovatele</span>}
                        {n.proKoho.map((p) => <Odznak key={p} ton="neutral">{p}</Odznak>)}
                      </div>
                      <Stav n={n} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/** Malá karta na úvodní straně: skóre a odkaz. Bez odpovědí ukáže jen počet položek. */
export function PripravenostKarta({ nastroje }: { nastroje: OficialniNastroj[] }) {
  const [odpovedi, setOdpovedi] = useState<Odpovedi | null>(null);
  useEffect(() => { setOdpovedi(nactiOdpovedi()); }, []);
  const skore = skorePripravenosti(nastroje, odpovedi ?? {});
  const zacal = odpovedi && Object.keys(odpovedi).length > 0;
  return (
    <section aria-label="Jsem připraven?" className="rounded-[22px] border border-linka2 bg-plocha">
      <div className="flex items-center justify-between gap-2 border-b border-linka2 px-4 py-3">
        <span className="flex items-center gap-2">
          <span aria-hidden className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-akcent/50">
            <span className="h-[6px] w-[6px] rounded-full bg-akcent" />
          </span>
          <h3 className="stitek">Jsem připraven/a?</h3>
        </span>
        <span className="cislice text-mikro text-tlum2">{zacal ? `${skore.mam} / ${skore.celkem}` : `${skore.celkem} doporučených služeb`}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-male leading-snug text-tlum">
          {zacal ? vetaKeSkore(skore) : "Záchranka, tísňové linky, varování na mobil, výstrahy ČHMÚ, DROZD, sirény, krizové vysílání, kanál obce. Co z toho máte nastavené?"}
        </p>
        <a href="/pripravenost/" className="odkaz mt-2 inline-flex min-h-[32px] items-center text-drobne">Projít průvodce →</a>
      </div>
    </section>
  );
}
