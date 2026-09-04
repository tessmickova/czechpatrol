import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { CasovaOsa } from "@/components/osa";
import { incidenty } from "@/lib/data";

export const metadata: Metadata = {
  title: "Časová osa",
  description: "Chronologie ověřených bezpečnostních událostí relevantních pro ČR a Evropu.",
};

export default function Osa() {
  return (
    <>
      <HlavickaStranky
        ikona="osa"
        stitek="Časová osa"
        nadpis="Chronologie a kumulace"
        popis="Osa ukazuje, jak na sebe události navazují. Záznam označený „nové zjištění“ není nový útok — je to nový vyšetřovací posun u starší věci."
      />
      <Obsah>
        <CasovaOsa incidenty={incidenty()} />
      </Obsah>
    </>
  );
}
