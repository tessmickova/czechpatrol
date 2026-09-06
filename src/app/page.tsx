import { BannerStari } from "@/components/cerstvost";
import { Dashboard } from "@/components/dashboard";
import { celkovyStav, incidenty, nato, posledniOvereni, pravniStav, provoz, tydny, watchlist } from "@/lib/data";

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
        tydny={tydny()}
        watchlist={watchlist()}
      />
    </>
  );
}
