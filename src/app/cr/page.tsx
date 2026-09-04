import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { PravniSemafor, ProvozPanel } from "@/components/panely";
import { Sekce } from "@/components/zaklad";
import { pravniStav, provoz } from "@/lib/data";

export const metadata: Metadata = {
  title: "Česká republika",
  description: "Právní stav ČR — mobilizace, stav ohrožení státu, válečný stav, vycestování a hranice. Vždy s odkazem na primární právní zdroj.",
};

export default function Cr() {
  const p = pravniStav();
  return (
    <>
      <HlavickaStranky
        ikona="vaha"
        stitek="Česká republika"
        nadpis="Právní stav a praktický dopad"
        popis="Mimořádné stavy nevznikají tím, že se zhorší situace. Každý z nich je samostatný právní krok s vlastními podmínkami, vlastním schvalovacím procesem a vlastním úředním vyhlášením."
      />
      <Obsah>
        <PravniSemafor polozky={p.polozky} overeno={p.overeno} />
      </Obsah>
      <Sekce
        kicker="Praktický dopad"
        nadpis="Co to znamená pro běžný život"
        popis="Praktický stav běžných služeb. Kde chybí spolehlivý veřejný zdroj, napíšeme to."
      >
        <ProvozPanel provoz={provoz()} />
      </Sekce>
    </>
  );
}
