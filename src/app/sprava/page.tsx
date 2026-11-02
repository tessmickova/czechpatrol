import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { SpravaKlient } from "@/components/sprava-klient";
import { kandidati, odmitnute } from "@/lib/data";
import { naliehaveVOkne } from "@/lib/naliehave";

export const metadata: Metadata = { title: "Správa", robots: { index: false, follow: false } };

export default function SpravaStranka() {
  /* Počty ze sestavení: kandidáti a odmítnuté jsou v repozitáři, ne v databázi. Web se přestaví po každém sběru. */
  const k = kandidati();
  const naliehave = naliehaveVOkne(k, Date.now()).length;
  const cekajicich = k.filter((x) => x.stav === "ceka").length;
  const odmitnutychVazne = odmitnute().filter((o) => o.posouzeni?.podezreni === "vysoke").length;
  return (
    <>
      <HlavickaStranky
        stitek="Správa"
        ikona="zamek"
        nadpis="Co čeká na rozhodnutí"
        popis="Jen pro správce. Nahoře fronty s počty, pak oznámení ven, pod tím jednotlivé části. Každý zásah zůstává v auditu."
      />
      <Obsah>
        {/* Další stránky správy: uvnitř obsahu, ne volně mezi hlavičkou a kartami (2. 11. 2026). */}
        <p className="mb-6 text-male text-tlum"><a href="/sprava/navstevnost/" className="odkaz">Návštěvnost a prokliky →</a> · <a href="/sprava/opravy/" className="odkaz">Opravy dat →</a> · <a href="/sprava/odmitnute/" className="odkaz">Odmítnuté sítem →</a></p>
        <SpravaKlient naliehave={naliehave} kandidatu={cekajicich} odmitnutychVazne={odmitnutychVazne} />
      </Obsah>
    </>
  );
}
