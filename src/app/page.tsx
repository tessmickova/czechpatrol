import { PruhKontroly } from "@/components/banner-stari-klient";
import { Dashboard } from "@/components/dashboard";
import { celkovyStav, hybridniTlak, incidenty, kampane, kandidati, nato, nazvyZemi, nepotvrzene, nepotvrzeneZaznamy, posledniKontrola, posledniOvereni, pravniStav, provoz, tlakCr, tydny, overovaneAktivni, overovaneUzavrene, pocetZemeObdobi, urovenObcanu, urovenZemeObdobi, watchlist } from "@/lib/data";
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
      <PruhKontroly zkontrolovano={posledniKontrola()} ted={ted} />
      <Dashboard
        ted={ted}
        stav={celkovyStav()}
        pravni={pravniStav().polozky}
        natoPolozky={nato().polozky}
        provozPolozky={provoz().polozky}
        overeno={posledniOvereni()}
        vse={incidenty()}
        neprosle={nepotvrzene()}
        kandidati={kandidati()}
        nepotvrzene={nepotvrzeneZaznamy()}
        tydny={tydny()}
        watchlist={watchlist()}
        cr={urovenZemeObdobi("CZ", 90)}
        crHistoricky={tlakCr().celkem}
        crPocet={pocetZemeObdobi("CZ", 90)}
        hybridni={hybridniTlak().celkem}
        tlakEvropa={hybridniTlak()}
        tlakCesko={tlakCr()}
        obcane={urovenObcanu()}
        veta={hlavniVeta(pravniStav().polozky, provoz().polozky, hybridniTlak().celkem)}
        kampane={kampane()}
        nazvyZemi={nazvyZemi()}
        overovaneAktivni={overovaneAktivni()}
        overovaneUzavrene={overovaneUzavrene()}
      />
    </>
  );
}
