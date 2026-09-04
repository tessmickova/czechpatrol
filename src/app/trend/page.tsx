import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { GrafTrendu, TabulkaTydnu } from "@/components/trend";
import { tydny } from "@/lib/data";

export const metadata: Metadata = {
  title: "Trend po týdnech",
  description: "Vývoj celkové úrovně, hybridního tlaku a rizika přímého střetu po jednotlivých týdnech.",
};

export default function Trend() {
  const t = tydny();
  return (
    <>
      <HlavickaStranky
        stitek="Trend"
        nadpis="Jak se situace vyvíjí"
        popis="Stupnice je diskrétní — úrovně, ne procenta. Riziko v procentech neuvádíme, protože k tomu nemáme model, který by to unesl."
      />
      <Obsah>
        <div className="space-y-5">
          <GrafTrendu tydny={t} />
          <TabulkaTydnu tydny={t} />
        </div>
      </Obsah>
    </>
  );
}
