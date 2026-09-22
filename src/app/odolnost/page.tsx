import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { OdolnostKlient } from "@/components/odolnost-klient";

export const metadata: Metadata = {
  title: "Odolnost domácnosti",
  description: "Pro přihlášené: za pět minut zjistíte, co u vás vypadne s čím, jak dlouho vydrží zásoby, co dokoupit a co zařídit. Zůstává jen ve vašem zařízení.",
  robots: { index: false },
};

export default function Odolnost() {
  return (
    <>
      <HlavickaStranky
        stitek="Odolnost domácnosti"
        ikona="terc"
        nadpis="Zjistěte za pět minut, jak je vaše domácnost připravená"
        popis="Zaškrtněte, jak u vás fungují voda, teplo a spojení. Hned uvidíte, co vypadne s čím, co dokoupit a co zařídit. Zůstává jen ve vašem zařízení, nikam se neposílá."
      />
      <Obsah>
        <OdolnostKlient />
      </Obsah>
    </>
  );
}
