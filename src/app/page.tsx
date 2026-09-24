import { Dashboard } from "@/components/dashboard";
import { archiv, celkovyStav, oficialniNastroje, hybridniTlak, incidenty, kampane, kandidati, nato, nazvyZemi, nepotvrzene, nepotvrzeneZaznamy, posledniKontrola, posledniOvereni, pravniStav, provoz, tlakCr, tydny, overovaneAktivni, overovaneUzavrene, urovenObcanu, watchlist } from "@/lib/data";
import { pripravitTed } from "@/lib/priprava";
import { odlehci } from "@/lib/odlehci";
import { pulz } from "@/lib/pulz";
import { souhrnSituace } from "@/lib/souhrn-situace";
import type { Incident } from "@/lib/typy";

import { hlavniVeta } from "@/lib/veta";

/**
 * Úvodní strana = dashboard. Vše na jedné obrazovce, bez odstavců:
 * stavy jako dlaždice, události jako řádky, čísla jako čísla.
 * Text a vysvětlení jsou v nápovědách a na podstránkách.
 */
export default function Prehled() {
  /*
    Jeden a týž čas pro pruh i pro dashboard. Klientské komponenty ho
    dostanou ze serveru, aby se první vykreslení shodlo s HTML; teprve
    po připojení si vezmou skutečný čas prohlížeče (viz useZiveHodiny).
  */
  const ted = Date.now();
  return (
    <>
      <Dashboard
        ted={ted}
        stav={celkovyStav()}
        pravni={pravniStav().polozky}
        natoPolozky={nato().polozky}
        provozPolozky={provoz().polozky}
        overeno={posledniOvereni()}
        vse={incidenty().map(odlehci)}
        neprosle={nepotvrzene()}
        priprava={pripravitTed()}
        pulz={pulz()}
        souhrn={souhrnSituace(ted)}
        kandidati={kandidati().filter((k) => k.naliehave || Date.now() - new Date(k.publikovano ?? k.zachyceno).getTime() <= 72 * 3_600_000)}
        nepotvrzene={nepotvrzeneZaznamy()}
        tydny={tydny()}
        watchlist={watchlist()}
        crHistoricky={tlakCr().celkem}
        snimky={archiv().snimky}
        nastroje={oficialniNastroje()}
        hybridni={hybridniTlak().celkem}
        tlakEvropa={hybridniTlak()}
        tlakCesko={tlakCr()}
        obcane={urovenObcanu()}
        veta={hlavniVeta(pravniStav().polozky, provoz().polozky, celkovyStav().uroven)}
        kampane={kampane()}
        nazvyZemi={nazvyZemi()}
        overovaneAktivni={overovaneAktivni()}
        overovaneUzavrene={overovaneUzavrene()}
      />
    </>
  );
}
