"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

/*
  Náhled řádku u kurzoru.

  Seznamy na úvodní straně mají řádky na jednu řádku, aby se jich vešlo víc.
  Titulek se tím ale ořízne a zbytek se dal přečíst jen proklikem.

  První verze ukazovala náhled dole v kartě. Bylo to bezpečné vůči ořezu
  zaoblených rohů, ale nepřehledné: oko muselo přeskočit přes půl seznamu
  a zpátky. Náhled proto stojí u kurzoru.

  Ořezu se vyhýbá jinak — panel je `position: fixed`, takže ho `overflow`
  karty nezajímá, a jeho poloha se drží uvnitř okna. Ukazuje se jen tomu,
  kdo má myš: na dotykovém displeji se nenajíždí a klepnutí otevře záznam
  nebo zdroj, což je totéž rozhodnutí o krok dál.
*/

export interface Nahled {
  titulek: string;
  /** Krátké údaje pod titulkem; spojí se tečkami. */
  radky: string[];
  /** Věta navíc — čím zpráva je a co s ní bude. */
  poznamka?: string;
  /**
    Hodnocení záznamu v párech popisek–hodnota. Ověřený záznam má čtyři:
    závažnost, jistotu, původce a zdroj. Zachycená zpráva nemá žádné —
    hodnocení u ní neexistuje, a prázdná tabulka by tvrdila, že ano.
  */
  udaje?: { popisek: string; hodnota: string }[];
}

const SIRKA = 360;
const OKRAJ = 12;

/** Stav náhledu i obsluha myši na jednom místě, ať to seznamy nemusí řešit. */
export function useNahled() {
  const [nahled, setNahled] = useState<Nahled | null>(null);
  const [kde, setKde] = useState<{ x: number; y: number } | null>(null);

  /*
    Jen myš. Na dotykovém displeji přijde pointerenter s prstem těsně před
    klepnutím: náhled se ukázal, překryl řádek pod ním a než stránka
    přešla dál, čtenář viděl blikat panel přes půl obrazovky. Prst se
    nenajíždí — klepnutí je totéž rozhodnutí o krok dál.
  */
  const ukaz = useCallback((n: Nahled, e?: { clientX: number; clientY: number; pointerType?: string }) => {
    if (e?.pointerType && e.pointerType !== "mouse") return;
    setNahled(n);
    if (e) setKde({ x: e.clientX, y: e.clientY });
  }, []);
  const skryj = useCallback(() => { setNahled(null); setKde(null); }, []);

  /* Posun myši v rámci řádku náhled táhne s sebou. */
  const pohyb = useCallback((e: { clientX: number; clientY: number; pointerType?: string }) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    setKde((p) => (p ? { x: e.clientX, y: e.clientY } : p));
  }, []);

  return { nahled, kde, ukaz, skryj, pohyb };
}

export function PanelNahledu({ nahled, kde }: { nahled: Nahled | null; kde: { x: number; y: number } | null }) {
  const [okno, setOkno] = useState({ w: 1280, h: 800 });

  useEffect(() => {
    const zmer = () => setOkno({ w: window.innerWidth, h: window.innerHeight });
    zmer();
    window.addEventListener("resize", zmer);
    return () => window.removeEventListener("resize", zmer);
  }, []);

  if (!nahled || !kde) return null;

  /*
    Poloha se drží v okně. Vpravo od kurzoru, pokud se tam panel vejde;
    jinak vlevo. Svisle se posadí pod kurzor a u spodního okraje nad něj —
    jinak by u posledních řádků vylézal ven.
  */
  const vpravo = kde.x + OKRAJ + SIRKA <= okno.w - OKRAJ;
  const x = vpravo ? kde.x + OKRAJ : Math.max(OKRAJ, kde.x - OKRAJ - SIRKA);
  const vyska = nahled.udaje?.length ? 230 : 150;
  const dole = kde.y + vyska > okno.h;
  const y = dole ? Math.max(OKRAJ, kde.y - vyska) : kde.y + 18;

  return (
    <div
      aria-hidden
      style={{ left: x, top: y, width: SIRKA }}
      className="pointer-events-none fixed z-50 rounded-[16px] border border-linka bg-plocha2 px-3.5 py-3 [@media(hover:none)]:hidden"
    >
      <p className="text-male leading-snug text-inkoust">{nahled.titulek}</p>
      {nahled.radky.length > 0 && (
        <p className="cislice mt-1.5 text-mikro leading-snug text-tlum2">{nahled.radky.join(" · ")}</p>
      )}
      {nahled.udaje && nahled.udaje.length > 0 && (
        <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-linka2 pt-2.5 text-drobne leading-snug">
          {nahled.udaje.map((u) => (
            <Fragment key={u.popisek}>
              <dt className="stitek text-tlum2">{u.popisek}</dt>
              <dd className="truncate text-inkoust">{u.hodnota}</dd>
            </Fragment>
          ))}
        </dl>
      )}
      {nahled.poznamka && <p className="mt-2 text-drobne leading-snug text-tlum">{nahled.poznamka}</p>}
    </div>
  );
}
