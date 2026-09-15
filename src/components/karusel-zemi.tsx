import type { ReactNode } from "react";
import { podleZemi, pripady } from "@/lib/agregace";
import { incidenty, tlakZeme } from "@/lib/data";
import { PavucinaHrozeb } from "./pavucina";
import { Vlajka } from "./zeme";

/*
  Karusel zemí.

  Jedna pavučina za každou zemi, ve které máme zveřejněný záznam, a jako
  první karta Evropa jako celek. Rozdíl mezi obrazci je to podstatné: kde se
  dělá co a jak se to liší od Česka. Evropa a Česko stály dřív zvlášť nad
  karuselem — byly to tři obrazce ve dvou různých velikostech, které se
  nedaly porovnat.

  Posouvá se rolováním do strany, ne samo od sebe. Automatický posun by
  odnesl obrazec dřív, než ho někdo dočte, a pohyb je na tomhle webu vypnutý
  jako výchozí stav. Každá karta má vlastní nadpis, takže se dá odkázat
  i přeskočit; řazení je podle počtu záznamů, Česko první.

  Země bez záznamu tu není. Prázdná pavučina by tvrdila „tady je klid",
  přitom by znamenala jen to, že odtud nic nemáme.
*/

export function KaruselZemi({
  maxZemi = 12,
  prvni,
}: {
  maxZemi?: number;
  /** Karta, která stojí před zeměmi — na přehledu je to Evropa jako celek. */
  prvni?: ReactNode;
}) {
  const zeme = podleZemi(pripady(incidenty()))
    .filter((z) => z.pripady > 0)
    .slice(0, maxZemi);

  if (!zeme.length && !prvni) return null;

  return (
    <div
      className="pas-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      // Vodorovný seznam karet: čtečka ho ohlásí jako seznam, ne jako jednu plochu.
      role="list"
      aria-label="Typy událostí po zemích"
    >
      {prvni && (
        <div role="listitem" className="w-[min(78vw,320px)] shrink-0 snap-start">
          {prvni}
        </div>
      )}
      {zeme.map((z) => (
        <div key={z.kodZeme} role="listitem" className="w-[min(78vw,320px)] shrink-0 snap-start">
          <PavucinaHrozeb
            nadpis={z.zeme}
            /* Vysvětlení má sekce, ne každá z dvanácti karet — jinak to je dvanáctkrát tentýž odstavec. */
            popis={`Záznamy se zemí ${z.zeme}.`}
            tlak={tlakZeme(z.kodZeme)}
            vlajka={<Vlajka kod={z.kodZeme} />}
            odkaz={{ href: `/zeme/${z.kodZeme.toLowerCase()}/`, text: `${z.pripady} ${z.pripady === 1 ? "záznam" : z.pripady < 5 ? "záznamy" : "záznamů"} →` }}
          />
        </div>
      ))}
    </div>
  );
}
