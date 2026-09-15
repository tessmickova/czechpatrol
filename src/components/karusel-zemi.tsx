import { podleZemi, pripady } from "@/lib/agregace";
import { incidenty, tlakZeme } from "@/lib/data";
import { PavucinaHrozeb } from "./pavucina";
import { Vlajka } from "./zeme";

/*
  Karusel zemí.

  Jedna pavučina za každou zemi, ve které máme zveřejněný záznam. Rozdíl
  mezi obrazci je to podstatné: kde se dělá co a jak se to liší od Česka.

  Posouvá se rolováním do strany, ne samo od sebe. Automatický posun by
  odnesl obrazec dřív, než ho někdo dočte, a pohyb je na tomhle webu vypnutý
  jako výchozí stav. Každá karta má vlastní nadpis, takže se dá odkázat
  i přeskočit; řazení je podle počtu záznamů, Česko první.

  Země bez záznamu tu není. Prázdná pavučina by tvrdila „tady je klid",
  přitom by znamenala jen to, že odtud nic nemáme.
*/

export function KaruselZemi({ maxZemi = 12 }: { maxZemi?: number }) {
  const zeme = podleZemi(pripady(incidenty()))
    .filter((z) => z.pripady > 0)
    .slice(0, maxZemi);

  if (!zeme.length) return null;

  return (
    <div
      className="pas-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      // Vodorovný seznam karet: čtečka ho ohlásí jako seznam, ne jako jednu plochu.
      role="list"
      aria-label="Typy událostí po zemích"
    >
      {zeme.map((z) => (
        <div key={z.kodZeme} role="listitem" className="w-[min(88vw,420px)] shrink-0 snap-start">
          <PavucinaHrozeb
            nadpis={z.zeme}
            popis={`Typy událostí podle zveřejněných záznamů se zemí ${z.zeme}. Osa bez záznamu zůstává prázdná — neznamená to klid, znamená to, že odtud takový záznam nemáme.`}
            tlak={tlakZeme(z.kodZeme)}
            vlajka={<Vlajka kod={z.kodZeme} />}
            odkaz={{ href: `/zeme/${z.kodZeme.toLowerCase()}/`, text: `${z.pripady} ${z.pripady === 1 ? "záznam" : z.pripady < 5 ? "záznamy" : "záznamů"} →` }}
          />
        </div>
      ))}
    </div>
  );
}
