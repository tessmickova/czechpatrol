import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Navigace } from "@/components/navigace";
import { Paticka } from "@/components/paticka";
import { BetaPruh, UkazkaPruh } from "@/components/pruhy";
import { DetailIncidentu } from "@/components/detail-incidentu";
import Prehled from "@/app/page";
import Dnes from "@/app/dnes/page";
import Udalosti from "@/app/udalosti/page";
import Osa from "@/app/osa/page";
import Cr from "@/app/cr/page";
import Nato from "@/app/nato/page";
import Trend from "@/app/trend/page";
import Metodika from "@/app/metodika/page";
import Zdroje from "@/app/zdroje/page";
import { usePathname } from "./shim-navigation";
import { spustParallax } from "./parallax";

/**
 * Vstupní bod klikacího náhledu.
 *
 * Vykresluje přesně ty komponenty, ze kterých se staví ostrý web — náhled tedy
 * není přemalovaná kopie, ale táž aplikace běžící bez serveru. Díky tomu
 * fungují i filtry, rozbalování a nápovědy.
 */

const CESTY: Record<string, () => React.JSX.Element> = {
  "/": Prehled,
  "/dnes/": Dnes,
  "/udalosti/": Udalosti,
  "/osa/": Osa,
  "/cr/": Cr,
  "/nato/": Nato,
  "/trend/": Trend,
  "/metodika/": Metodika,
  "/zdroje/": Zdroje,
};

function Obsah() {
  const cesta = usePathname();

  useEffect(() => {
    // Vrstvy se po přepnutí stránky přepočítají, jinak by zůstaly posunuté.
    spustParallax();
  }, [cesta]);

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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:bg-inkoust focus:px-3 focus:py-2 focus:text-[13px] focus:text-white"
      >
        Přeskočit na obsah
      </a>
      <Navigace />
      <BetaPruh />
      <UkazkaPruh />
      <main id="obsah">
        <Obsah />
      </main>
      <Paticka />
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
