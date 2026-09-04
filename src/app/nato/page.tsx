import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { HybridniPanel, NatoPanel } from "@/components/panely";
import { SeznamZdroju } from "@/components/zdroje";
import { Karta, Sekce } from "@/components/zaklad";
import { hybridniTlak, nato } from "@/lib/data";

export const metadata: Metadata = {
  title: "NATO",
  description: "Stav článku 4 a 5, pohotovost sil a východní křídlo — s uvedením data ověření a zdroje.",
};

export default function Nato() {
  const a = nato();
  return (
    <>
      <HlavickaStranky
        ikona="stit"
        stitek="NATO"
        nadpis="Stav Aliance"
        popis="Článek 4 je nástroj konzultací, ne obrany. Jeho aktivace automaticky nevede k článku 5 — to jsou dva různé mechanismy s různými důsledky."
      />
      <Obsah>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <NatoPanel polozky={a.polozky} overeno={a.overeno} />
          <Karta className="p-5 sm:p-6">
            <h2 className="podnadpis mb-4 text-[16px]">Zdroje</h2>
            <SeznamZdroju zdroje={a.polozky.flatMap((p) => p.zdroje)} husty />
          </Karta>
        </div>
      </Obsah>
      <Sekce nadpis="Hybridní tlak a přímý střet" popis="Dvě různé otázky, dvě různé stupnice.">
        <HybridniPanel tlak={hybridniTlak()} />
      </Sekce>
    </>
  );
}
