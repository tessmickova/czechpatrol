import { datumPraha } from "@/lib/cas";
import { tipy } from "@/lib/data";
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

  Když tip žádný není, sekce se nevykreslí. Prázdný rámeček s nadpisem
  „Tipy“ by tvrdil, že si tu je co přečíst.
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
    <section aria-labelledby="tipy-nadpis" className={vnoreny ? "px-4 py-3" : "rounded-[18px] border border-linka2 bg-plocha px-3 py-2.5"}>
      <div className={`mb-2 flex items-center justify-between gap-3 ${vnoreny ? "sr-only" : ""}`}>
        <h3 id="tipy-nadpis" className="stitek flex items-center gap-1.5">
          <Ikona nazev="fajfka" velikost={12} tah={2} />
          Tipy k přípravě
        </h3>
      </div>
      <ul className="divide-y divide-linka2">
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
