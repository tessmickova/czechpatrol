import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { OdolnostPrepinac } from "@/components/odolnost-prepinac";
import { Zebricek } from "@/components/zebricek-klient";
import { CoDal } from "@/components/co-dal";
import { SPUSTENO } from "@/config/web";

export const metadata: Metadata = {
  title: "Odolnost domácnosti",
  description: "Za pět minut zjistíte, jak je vaše domácnost připravená: souhrn, bezpečnostní nálezy a rady zdarma. Profil zůstává ve vašem zařízení.",
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
            {/* Dřív „…tím méně atraktivním cílem budeme" — rámovalo čtenáře jako cíl útoku (audit 23. 9. 2026). */}
            <p className="text-vetsi font-semibold text-noc-text">Lepší připravenost pomáhá domácnosti zvládnout dny, kdy běžné služby dočasně nefungují.</p>
            <p className="mt-3">Zaškrtněte, jak u vás fungují voda, teplo a spojení. Souhrn, bezpečnostní nálezy a rady vidíte hned, zdarma a bez účtu. Profil zůstává ve vašem zařízení.</p>
          </>
        }
      />
      <Obsah>
        <OdolnostPrepinac />
        {/* Žebříček pod auditem: srovnání je až po vyplnění, ne důvod k vyplnění. */}
        {SPUSTENO.zebricek && <Zebricek />}
        <CoDal bez="/odolnost/" />
      </Obsah>
    </>
  );
}
