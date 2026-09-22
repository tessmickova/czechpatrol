import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { OdolnostKlient } from "@/components/odolnost-klient";
import { Zebricek } from "@/components/zebricek-klient";

export const metadata: Metadata = {
  title: "Odolnost domácnosti",
  description: "Za pět minut zjistíte, jak je vaše domácnost připravená: souhrn a bezpečnostní nálezy zdarma, podrobný plán jako Premium. Profil zůstává ve vašem zařízení.",
};

export default function Odolnost() {
  return (
    <>
      <HlavickaStranky
        stitek="Odolnost domácnosti"
        ikona="terc"
        nadpis="Zjistěte za pět minut, jak je vaše domácnost připravená"
        popis={
          <>
            {/* Motto pod nadpisem: proč to celé má smysl, jednou větou. */}
            <p className="text-vetsi font-semibold text-noc-text">Čím lépe budeme připraveni, tím méně atraktivním cílem budeme.</p>
            <p className="mt-3">Zaškrtněte, jak u vás fungují voda, teplo a spojení. Souhrn, bezpečnostní nálezy a rady za 0 Kč vidíte hned a bez účtu. Podrobný plán — co vypadne s čím, na kolik dní, co dokoupit — je Premium. Profil zůstává ve vašem zařízení.</p>
          </>
        }
      />
      <Obsah>
        <OdolnostKlient />
        {/* Žebříček pod auditem: srovnání je až po vyplnění, ne důvod k vyplnění. */}
        <Zebricek />
      </Obsah>
    </>
  );
}
