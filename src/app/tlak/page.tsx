import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { HybridniPanel, RuskoPanel } from "@/components/panely";
import { Sekce } from "@/components/zaklad";
import { KdoZaTimStoji } from "@/components/puvodce";
import { hybridniTlak, puvodce, rusko } from "@/lib/data";

export const metadata: Metadata = {
  title: "Hybridní tlak",
  description:
    "Sabotáže, kybernetické operace, drony a kritická infrastruktura — a odděleně riziko přímého vojenského střetu.",
};

export default function Tlak() {
  return (
    <>
      <HlavickaStranky
        ikona="terc"
        stitek="Hybridní tlak"
        nadpis="Vysoký tlak neznamená blížící se válku"
        popis="Sabotáže a kybernetické operace jsou jedna otázka. Vojenský střet je druhá. Měříme je zvlášť."
      />
      <Obsah>
        <HybridniPanel tlak={hybridniTlak()} />
      </Obsah>
      <Sekce
        kicker="Původ"
        nadpis="Kolik případů má prokázaného původce"
        popis="Část incidentů, které zpočátku vypadaly jako jedna série, dostala domácí vysvětlení. Proto to sledujeme zvlášť."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <KdoZaTimStoji />
        </div>
      </Sekce>

      <Sekce
        kicker="Doplňkový ukazatel"
        nadpis="Rusko: vnitřní tlak režimu"
        popis="Méně jistý než zbytek webu. Celkové hodnocení sám o sobě nemění."
      >
        <RuskoPanel stav={rusko()} />
      </Sekce>
    </>
  );
}
