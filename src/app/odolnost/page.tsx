import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { OdolnostKlient } from "@/components/odolnost-klient";

export const metadata: Metadata = {
  title: "Odolnost domácnosti",
  description: "Pro přihlášené: co u vás vypadne s čím, které zálohy sdílejí stejné selhání, jak dlouho vydrží zásoby a co má teď největší smysl. Bez nákupního seznamu.",
  robots: { index: false },
};

export default function Odolnost() {
  return (
    <>
      <HlavickaStranky
        stitek="Odolnost domácnosti"
        ikona="terc"
        nadpis="Nejde o víc věcí. Jde o to, aby jedna porucha nevypnula všechno."
        popis="Zaškrtněte, jak u vás fungují voda, teplo, spojení a další. Web spočítá, co na čem stojí, kde dvě zálohy selžou naráz a co má teď největší smysl. Vše zůstává jen ve vašem zařízení."
      />
      <Obsah>
        <OdolnostKlient />
      </Obsah>
    </>
  );
}
