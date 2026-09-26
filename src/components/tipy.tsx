import { HlavickaWidgetu } from "./widgety";
import { datumPraha } from "@/lib/cas";
import { tipy } from "@/lib/data";
import { Ikona } from "./ikony";
import { Napoveda } from "./zaklad";
import { OFFLINE_MAPY, VEN } from "@/config/odkazy-ven";

/*
  Tipy k přípravě.

  Stojí pod „Co je nového“ vedle signálů ze sítí a odpovídají na jinou otázku
  než zbytek webu. Zbytek říká, co se stalo; tip říká, co s tím může člověk
  udělat dnes — a to i ve chvíli, kdy se neděje nic.

  Pravidla, která z toho dělají tip a ne radu:
  - vychází z doloženého zdroje, jinak se nezobrazí vůbec,
  - popisuje, co existuje, ne co si má kdo myslet,
  - nikdy neradí, co dělat v probíhající krizi. Od toho jsou úřady a krizové
    vysílání; tenhle web nemá jak vědět, kde zrovna kdo je.

  Stálá část: offline mapy (26. 9. 2026). Nejsou to novinky, ale věc,
  kterou je potřeba mít připravenou dřív, než vypadne signál — proto se
  ukazují vždy, i když žádný datovaný tip není.
*/

export function TipyKPripraveNadpis() {
  return (
    <div className="stitek flex items-center gap-1.5">
      <Ikona nazev="fajfka" velikost={12} tah={2} />
      Tipy k přípravě
    </div>
  );
}

export function TipyKPriprave({ ted = Date.now(), vnoreny = false }: { ted?: number; vnoreny?: boolean }) {
  const t = tipy(ted);

  return (
    <section aria-labelledby="tipy-nadpis" className={vnoreny ? "px-4 py-3" : "overflow-hidden rounded-[22px] bg-plocha"}>
      {vnoreny ? <h3 id="tipy-nadpis" className="sr-only">Tipy k přípravě</h3> : <HlavickaWidgetu ikona="fajfka" nazev="Tipy k přípravě" id="tipy-nadpis" ton="klid" meta={<span className="cislice">{t.length}</span>} />}
      {t.length > 0 && <ul className={`${vnoreny ? "" : "px-4 py-3"}`}>
        {t.map((x) => (
          <li key={x.klic} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="cislice text-mikro text-tlum2">{datumPraha(x.kdy)}</span>
              <span className="text-male font-semibold text-inkoust">{x.nadpis}</span>
            </div>
            <p className="mt-1 text-male leading-snug text-tlum">{x.text}</p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {x.zdroje.map((z) => (
                <a key={z.url} href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz text-drobne text-tlum2">
                  {z.nazev} ↗
                </a>
              ))}
            </p>
          </li>
        ))}
      </ul>}
      <OfflineMapy odsazeni={!vnoreny} oddelit={t.length > 0} />
    </section>
  );
}

/** Offline mapy: důvod po najetí nebo klepnutí na název, odkazy do obchodů s aplikacemi. */
function OfflineMapy({ odsazeni, oddelit }: { odsazeni: boolean; oddelit: boolean }) {
  return (
    <div className={`${odsazeni ? "px-4 pb-3" : ""} ${oddelit ? "mt-3 border-t border-linka pt-3" : ""}`}>
      <p className="flex items-center gap-1.5 text-male font-semibold text-inkoust"><Ikona nazev="mapa" velikost={14} tah={2} /> Offline mapy</p>
      <p className="mt-0.5 text-mikro leading-snug text-tlum">Stáhněte si mapu svého kraje předem — bez signálu se nová nenačte.</p>
      <ul className="mt-2 space-y-2">
        {OFFLINE_MAPY.map((m) => (
          <li key={m.nazev} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Napoveda popis={<span className="block">{m.proc}</span>} label={`Proč ${m.nazev}`} nahoru>
              <span className="cursor-help text-male font-semibold text-inkoust underline decoration-dotted underline-offset-4">
                {m.nazev}{m.alternativa && <span className="ml-1.5 text-mikro font-normal text-tlum2">alternativa</span>}
              </span>
            </Napoveda>
            <a href={m.android} target="_blank" rel={VEN} className="odkaz text-drobne text-tlum2">Android ↗</a>
            <a href={m.ios} target="_blank" rel={VEN} className="odkaz text-drobne text-tlum2">iPhone ↗</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
