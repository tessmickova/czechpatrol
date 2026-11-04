import { HlavickaWidgetu } from "./widgety";
import { datumPraha } from "@/lib/cas";
import { tipy } from "@/lib/data-lehka";
import { Ikona } from "./ikony";

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

  Offline mapy jsou od 26. 9. 2026 v průvodci připraveností (krok „Bez
  signálu“), ne tady — tipy jsou jen datované novinky.
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
  if (!t.length) return null;

  return (
    <section aria-labelledby="tipy-nadpis" className={vnoreny ? "px-4 py-3" : "overflow-hidden rounded-[22px] bg-plocha"}>
      {vnoreny ? <h3 id="tipy-nadpis" className="sr-only">Tipy k přípravě</h3> : <HlavickaWidgetu ikona="fajfka" nazev="Tipy k přípravě" id="tipy-nadpis" ton="klid" meta={<span className="cislice">{t.length}</span>} />}
      <ul className={`${vnoreny ? "" : "px-4 py-3"}`}>
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
      </ul>
    </section>
  );
}


/*
  Box Tipy k přípravě do postranního panelu (4. 11. 2026, provozovatelka):
  až tři nejnovější tipy jako řádky s názvem a datem; text a zdroje
  až po rozkliknutí řádku. Dřív byl vidět jen první tip a zbytek
  schovaný za jedním rozbalením.
*/
export function TipyBox({ ted = Date.now() }: { ted?: number }) {
  const t = tipy(ted).slice(0, 3);
  return (
    <section aria-labelledby="tipy-box" className="overflow-hidden rounded-[22px] bg-plocha">
      <HlavickaWidgetu ikona="fajfka" nazev="Tipy k přípravě" id="tipy-box" ton="klid" meta={<span className="cislice">{t.length}</span>} />
      {t.length ? (
        <ul>
          {t.map((x) => (
            <li key={x.klic} className="border-t border-linka/60 first:border-t-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-2.5 hover:bg-plocha2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-male font-bold leading-snug text-inkoust">{x.nadpis}</span>
                    <span className="cislice mt-0.5 block text-mikro text-tlum2">{datumPraha(x.kdy)}</span>
                  </span>
                  <Ikona nazev="dolu" velikost={12} tah={2} trida="mt-1 shrink-0 text-tlum2 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-3">
                  <p className="text-male leading-snug text-tlum">{x.text}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {x.zdroje.map((z) => (
                      <a key={z.url} href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz text-drobne text-tlum2">{z.nazev} ↗</a>
                    ))}
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-male text-tlum2">Zatím bez tipu.</p>
      )}
    </section>
  );
}
