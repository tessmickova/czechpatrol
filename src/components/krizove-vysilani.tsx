"use client";

import { useEffect, useState } from "react";
import { KRIZOVE_VYSILANI, krajVysilani, mhz, nactiKraj, ulozKraj } from "@/lib/krizove-vysilani";
import { Ikona } from "./ikony";
import { HlavickaWidgetu } from "./widgety";

/*
  Co naladit v krizi (5. 11. 2026, provozovatelka).

  Výběr kraje jako řada dlaždic, ne výchozí rozbalovací seznam: na telefonu
  se dá trefit prstem a vybraný kraj je vidět i bez rozkliknutí. Polohu web
  nezjišťuje; výběr zůstává v prohlížeči. Kmitočet FM se ukáže, jen když je
  doplněný z oficiálního seznamu Českého rozhlasu — jinak to řádek přizná.
*/
const VEN = "nofollow noopener noreferrer";

export function useKraj(): [string | null, (k: string | null) => void] {
  const [kraj, setKraj] = useState<string | null>(null);
  useEffect(() => { setKraj(nactiKraj()); }, []);
  const vyber = (k: string | null) => { setKraj(k); ulozKraj(k); };
  return [kraj, vyber];
}

export function VyberKraje({ kraj, onVyber }: { kraj: string | null; onVyber: (k: string | null) => void }) {
  return (
    <div role="group" aria-label="Kraj" className="flex flex-wrap gap-1.5">
      {KRIZOVE_VYSILANI.kraje.map((k) => {
        const aktivni = k.klic === kraj;
        return (
          <button
            key={k.klic}
            type="button"
            aria-pressed={aktivni}
            onClick={() => onVyber(aktivni ? null : k.klic)}
            className={`min-h-[32px] rounded-full border px-2.5 text-mikro font-semibold leading-none transition-colors ${aktivni ? "border-inkoust bg-inkoust text-papir" : "border-linka text-tlum hover:border-akcent hover:text-inkoust"}`}
          >
            {k.nazev}
          </button>
        );
      })}
    </div>
  );
}

export function CoNaladit({ kraj, onVyber }: { kraj: string | null; onVyber: (k: string | null) => void }) {
  const d = KRIZOVE_VYSILANI;
  const vybrany = krajVysilani(kraj);
  return (
    <div className="space-y-3">
      <p className="text-male leading-snug text-tlum">{d.krizoveVysilani.text}</p>
      <div>
        <div className="stitek mb-1.5 text-tlum2">Kraj — kmitočet FM se liší po vysílačích</div>
        <VyberKraje kraj={kraj} onVyber={onVyber} />
      </div>
      <dl className="space-y-2 text-male leading-snug">
        <div>
          <dt className="font-semibold text-inkoust">FM · {d.stanice}</dt>
          <dd className="text-tlum">
            {!vybrany
              ? "Vyberte kraj."
              : vybrany.fm.length
                ? (
                  /* Vysílače podle výkonu: první bývá slyšet v celém kraji, ostatní doplňují údolí a města. */
                  <span className="block space-y-0.5">
                    {vybrany.fm.map((v) => (
                      <span key={`${v.vysilac}-${v.mhz}`} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">{v.vysilac}</span>
                        <span className="cislice shrink-0 font-semibold text-inkoust">{mhz(v.mhz)}</span>
                      </span>
                    ))}
                    <span className="block pt-1 text-mikro text-tlum2">Podle regionů Českého rozhlasu; silný vysílač je slyšet i za hranicí kraje.</span>
                  </span>
                )
                : <>Kmitočty pro {vybrany.nazev === "Praha" ? "Prahu" : `${vybrany.nazev} kraj`} doplníme z oficiálního seznamu Českého rozhlasu. Do té doby platí DAB+ a televize níže.</>}
          </dd>
        </div>
        {d.celostatni.map((c) => (
          <div key={c.cesta}>
            <dt className="font-semibold text-inkoust">{c.cesta} · {c.co}{c.cesta === "DAB+" && vybrany?.dab?.length ? ` · blok ${vybrany.dab.join(", ")}` : ""}</dt>
            <dd className="text-tlum">{c.jak}</dd>
          </div>
        ))}
      </dl>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-drobne text-tlum2">
        <a href={d.kmitocty?.zdroj.url ?? d.zdroj.url} target="_blank" rel={VEN} className="odkaz">{d.kmitocty ? `${d.kmitocty.zdroj.nazev} (staženo ${d.kmitocty.stazeno.split("-").reverse().map(Number).join(". ")}) ↗` : `${d.zdroj.nazev} ↗`}</a>
        <a href={d.krizoveVysilani.zdroj.url} target="_blank" rel={VEN} className="odkaz">Varovný systém ASA ↗</a>
      </p>
    </div>
  );
}

/** Box do postranního panelu: souhrn v řádku, výběr a vysvětlení po rozkliknutí. */
export function CoNaladitBox() {
  const [kraj, vyber] = useKraj();
  const vybrany = krajVysilani(kraj);
  const souhrn = !vybrany
    ? `${KRIZOVE_VYSILANI.stanice} · vyberte kraj`
    : vybrany.fm.length
      ? `${vybrany.nazev}: ${vybrany.fm.slice(0, 3).map((v) => mhz(v.mhz)).join(" · ")}${vybrany.fm.length > 3 ? ` +${vybrany.fm.length - 3}` : ""}`
      : `${vybrany.nazev}: DAB+ a ČT24, kmitočet FM doplníme`;
  return (
    <details className="group overflow-hidden rounded-[22px] bg-plocha">
      <summary className="cursor-pointer list-none">
        <HlavickaWidgetu ikona="komunikace" nazev="Co naladit v krizi" ton="klid" meta={<Ikona nazev="dolu" velikost={13} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" />} />
        <span className="-mt-1 block px-4 pb-3 text-male font-semibold leading-snug text-inkoust">{souhrn}</span>
      </summary>
      <div className="border-t border-linka/60 px-4 py-3"><CoNaladit kraj={kraj} onVyber={vyber} /></div>
    </details>
  );
}

/** Do postranního menu nad tísňová čísla. */
export function CoNaladitVMenu() {
  const [kraj, vyber] = useKraj();
  return (
    <div className="mb-5">
      <div className="stitek mb-1.5">Co naladit v případě krize</div>
      <CoNaladit kraj={kraj} onVyber={vyber} />
    </div>
  );
}
