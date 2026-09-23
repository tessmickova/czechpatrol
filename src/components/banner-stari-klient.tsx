"use client";

import { useZiveHodiny } from "@/lib/cas-klient";
import { cerstvost, datumCasPraha } from "@/lib/cas";
import { Ikona } from "./ikony";

/*
  Pruh nad obsahem: běží sběr, nebo web stojí?

  Proč je to klientská komponenta, když je celý web statický
  -----------------------------------------------------------
  Tohle je jediná věc na stránce, která musí stárnout i tehdy, když se web
  přestane sestavovat — protože právě tehdy je potřeba.

  Dřív se čerstvost počítala při sestavení. Rozdíl mezi „naposledy čteno"
  a „teď" tím zamrzl v okamžiku buildu: v HTML zůstalo napsáno „Zkontrolováno
  08:01 · bez nálezu" a to tam svítilo dál, ať uplynula hodina nebo týden.
  Čím déle web stál, tím sebevědoměji tvrdil, že je v pořádku.

  Stalo se to 17. 9. 2026: sběr přestal běžet v 08:03 a web další dva dny
  hlásil čerstvou kontrolu bez nálezu. Mlčící web je vada; web, který mlčení
  vydává za klid, je horší než žádný web — a tenhle má být pojistka.

  Teď se rozdíl počítá v prohlížeči návštěvníka. Zamrzlý web tak po pár
  hodinách sám přizná, že zamrzl.
*/

/** Za jak dlouho po poslední kontrole se z ticha stane přiznaný výpadek. */
/*
  5 h od 23. 9. 2026 (dřív 12). Sběr běží každou hodinu; i když ho hlídač
  minut zpomalí na nejvýš 4 h, 5 h bez čtení je výpadek, ne klid. Dvanáct
  hodin znamenalo, že web půl dne tvrdil čerstvý stav.
*/
export const HODIN_DO_VYPADKU = 5;

/*
  Stav kontroly jako drobný údaj, nikdy jako poplašný pruh.

  23. 9. 2026 rozhodnutí provozovatelky: velký pruh „Sběr neběží… web
  ukazuje stav k tomu okamžiku, ne dnešní" na stránku nepatří, ani když
  sběr opravdu stojí. Čtenáři stačí vědět, kdy byla data naposledy
  aktualizovaná — drobně, u pruhu o původu. Výpadek hlásí hlídač
  správkyni do soukromého chatu (api/src/hlidac.ts), ne čtenářům.

  Poctivost zůstává jinde: po HODIN_DO_VYPADKU hodinách zmizí zelený
  „klid" v úvodu (urgentni.tsx, budíky), takže stará data se za klid
  nevydávají.
*/
function text(zkontrolovano: string | null, nyni: number): string | null {
  const c = cerstvost(zkontrolovano, nyni, "provoz");
  if (!zkontrolovano || c === "nezname" || c === "budoucnost") return null;
  const hodin = (nyni - new Date(zkontrolovano).getTime()) / 3_600_000;
  return hodin >= 0 ? `Aktualizováno ${datumCasPraha(zkontrolovano)}` : null;
}

/** Drobný údaj na konec pruhu o původu. */
export function StavKontrolyVedle({ zkontrolovano, ted }: { zkontrolovano: string | null; ted: number }) {
  const nyni = useZiveHodiny(ted);
  const t = text(zkontrolovano, nyni);
  if (!t) return null;
  return (
    <span className="flex items-center gap-1.5 text-tlum2">
      <Ikona nazev="info" velikost={12} tah={2} trida="shrink-0" />
      {t}
    </span>
  );
}
