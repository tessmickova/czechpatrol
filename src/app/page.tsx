import { BannerStari } from "@/components/cerstvost";
import { Dashboard } from "@/components/dashboard";
import { celkovyStav, hybridniTlak, incidenty, kandidati, nato, nepotvrzene, posledniOvereni, pravniStav, provoz, tlakCr, tydny, urovenObcanu, watchlist } from "@/lib/data";

/**
 * Úvodní strana = dashboard. Vše na jedné obrazovce, bez odstavců:
 * stavy jako dlaždice, události jako řádky, čísla jako čísla.
 * Text a vysvětlení jsou v nápovědách a na podstránkách.
 */
export default function Prehled() {
  return (
    <>
      <BannerStari overeno={posledniOvereni()} />
      <Dashboard
        stav={celkovyStav()}
        pravni={pravniStav().polozky}
        natoPolozky={nato().polozky}
        provozPolozky={provoz().polozky}
        overeno={posledniOvereni()}
        vse={incidenty()}
        neprosle={nepotvrzene()}
        kandidati={kandidati()}
        tydny={tydny()}
        watchlist={watchlist()}
        cr={tlakCr().celkem}
        hybridni={hybridniTlak().celkem}
        obcane={urovenObcanu()}
      />
    </>
  );
}
