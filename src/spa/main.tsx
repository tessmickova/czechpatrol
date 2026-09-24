import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ListaMobil } from "@/components/lista-mobil";
import { Navigace } from "@/components/navigace";
import { PostranniPanel } from "@/components/postranni-panel";
import { Paticka } from "@/components/paticka";
import { UkazkaPruh } from "@/components/pruhy";
import { DetailIncidentu } from "@/components/detail-incidentu";
import Prehled from "@/app/page";
import Udalosti from "@/app/udalosti/page";
import Vyvoj from "@/app/vyvoj/page";
import Svet from "@/app/svet/page";
import MujPrehled from "@/app/muj-prehled/page";
import OProjektu from "@/app/o-projektu/page";
import Opravy from "@/app/sprava/opravy/page";
import Podporit from "@/app/podporit/page";
import Metodika from "@/app/metodika/page";
import Zdroje from "@/app/zdroje/page";
import Odber from "@/app/odber/page";
import Ucet from "@/app/ucet/page";
import Izs from "@/app/izs/page";
import Sprava from "@/app/sprava/page";
import Soukromi from "@/app/soukromi/page";
import Podminky from "@/app/podminky/page";
import Offline from "@/app/offline/page";
import { Presmerovani } from "@/components/presmerovani";
import { usePathname } from "./shim-navigation";

/**
 * Vstupní bod klikacího náhledu.
 *
 * Vykresluje přesně ty komponenty, ze kterých se staví ostrý web — náhled tedy
 * není přemalovaná kopie, ale táž aplikace běžící bez serveru. Díky tomu
 * fungují i filtry, rozbalování a nápovědy.
 */

const CESTY: Record<string, () => React.JSX.Element> = {
  "/": Prehled,
  "/udalosti/": Udalosti,
  "/vyvoj/": Vyvoj,
  "/svet/": Svet,
  "/muj-prehled/": MujPrehled,
  "/o-projektu/": OProjektu,
  "/sprava/opravy/": Opravy,
  "/podporit/": Podporit,
  "/metodika/": Metodika,
  "/zdroje/": Zdroje,
  "/odber/": Odber,
  "/ucet/": Ucet,
  "/izs/": Izs,
  "/sprava/": Sprava,
  "/soukromi/": Soukromi,
  "/podminky/": Podminky,
  "/offline/": Offline,
};

/** Přestěhované adresy — stejné jako v public/_redirects. */
const PRESUNUTE: Record<string, string> = {
  "/dnes/": "/", "/trend/": "/vyvoj/", "/tlak/": "/vyvoj/", "/watchlist/": "/vyvoj/", "/osa/": "/udalosti/",
  "/cr/": "/#opatreni", "/nato/": "/#opatreni", "/nepotvrzeno/": "/udalosti/?overeni=neprosle", "/komunita/": "/o-projektu/",
};

function Obsah() {
  const cesta = usePathname();
  const normalni = cesta.replace(/\/?$/, "/");
  if (PRESUNUTE[normalni]) return <Presmerovani kam={PRESUNUTE[normalni]} co="Stránka se přestěhovala" />;

  const detail = cesta.match(/^\/incident\/([^/]+)\/?$/);
  if (detail) return <DetailIncidentu slug={detail[1]} />;

  const Stranka = CESTY[cesta] ?? CESTY[cesta.replace(/\/?$/, "/")] ?? Prehled;
  return <Stranka />;
}

function Aplikace() {
  return (
    <>
      <a
        href="#obsah"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[18px] focus:bg-inkoust focus:px-3 focus:py-2 focus:text-male focus:text-white"
      >
        Přeskočit na obsah
      </a>
      <Navigace />
      <UkazkaPruh />
      <main id="obsah" className="pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0">
        <Obsah />
      </main>
      <Paticka />
      <PostranniPanel />
      <ListaMobil />
    </>
  );
}

const koren = document.getElementById("app");
if (koren) {
  createRoot(koren).render(
    <StrictMode>
      <Aplikace />
    </StrictMode>,
  );
}
