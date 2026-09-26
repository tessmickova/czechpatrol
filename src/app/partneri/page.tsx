import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { PartneriFormular } from "@/components/partneri-klient";

export const metadata: Metadata = {
  title: "Partneři a banner",
  description: "Jak se stát partnerem CzechPatrol: pravidla, umístění a krátká poptávka.",
};

/*
  Zásady pro partnery. Stojí nad formulářem záměrně: kdo poptává, má
  vědět dopředu, co web nepustí. Obsah webu ani hodnocení na partnerech
  nezávisí — to je důvod, proč tu jsou pravidla a ne ceník.
*/
const ZASADY = [
  "Jen služby, které lidem pomáhají s připraveností, bezpečností, zdravím nebo spojením.",
  "Žádné poplašné sdělení, strašení ani sliby typu „přežijete jen s námi“.",
  "Banner je vždy označený jako partner a vyhledávačům ho hlásíme jako sponzorovaný odkaz.",
  "Stojí až za tím podstatným: pod aktualitami na úvodu a před patičkou ostatních stránek.",
  "Partner nemá vliv na obsah webu, výběr zpráv ani hodnocení situace.",
];

export default function PartneriStranka() {
  return (
    <>
      <HlavickaStranky
        stitek="Partneři"
        ikona="srdce"
        nadpis="Banner na CzechPatrol"
        popis="Prostor pro služby, které lidem pomáhají být připravení. Krátká poptávka, posoudíme ji ručně a ozveme se."
      />
      <Obsah>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-x-16">
          <section aria-labelledby="zasady" className="space-y-3">
            <h2 id="zasady" className="nadpis-boxu">Zásady</h2>
            <ul className="space-y-2">
              {ZASADY.map((z) => <li key={z} className="text-zaklad leading-relaxed text-tlum">— {z}</li>)}
            </ul>
            <p className="text-male leading-relaxed text-tlum2">Platby online připravujeme. Po schválení poptávky se ozveme s cenou a termínem.</p>
          </section>
          <section aria-labelledby="poptavka" className="rounded-[22px] bg-plocha p-5 sm:p-6">
            <h2 id="poptavka" className="nadpis-boxu mb-4">Poptávka</h2>
            <PartneriFormular />
          </section>
        </div>
      </Obsah>
    </>
  );
}
