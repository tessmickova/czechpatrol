import type { Metadata } from "next";
import Link from "next/link";
import { TabulkaZemiKampani } from "@/components/kampane";
import { ManipulaceKlient } from "@/components/manipulace-klient";
import { HlavickaStranky, NadpisSekce } from "@/components/nadpisy";
import { Ikona } from "@/components/ikony";
import { Sdeleni, Tlacitko } from "@/components/ui";
import { sklon } from "@/components/zeme";
import { kampane, kampanePodleZemi, nazvyZemi } from "@/lib/data";

export const metadata: Metadata = {
  title: "Manipulace a útoky na občany",
  description:
    "Připravené operace cílené na občany Česka a jeho sousedů: podvržené dokumenty, weby a profily vydávající se za někoho jiného. U každé zvlášť: co je doložené a kdo za tím stojí.",
};

/*
  Manipulace a útoky na občany.

  Vlastní sekce, ne podmnožina událostí. Kampaň nemá jedno místo ani jeden
  okamžik, míří obvykle na víc zemí naráz a do počtu případů nevstupuje.
*/
export default function Manipulace() {
  const vse = kampane();
  const nazvy = nazvyZemi();
  const zeme = kampanePodleZemi();
  const bezi = vse.filter((k) => k.probiha).length;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Manipulace"
        nadpis="Manipulace a útoky na občany"
        uvod="Podvržené dokumenty, falešné weby redakcí, profily vydávající se za úředníky. U každé kampaně odpovídáme zvlášť: co je doložené a kdo za tím stojí. To druhé bývá méně jisté — a píšeme to."
      />

      <section aria-label="Jak to čteme" className="nalet mt-10 grid gap-3 sm:mt-14 sm:grid-cols-3">
        {[
          { ikona: "fajfka" as const, nadpis: "Co tvrdíme", text: "Jen to, co je doložené odkazem, na který se dá kliknout. Podvržený dokument se pozná z obsahu a technických stop." },
          { ikona: "otaznik" as const, nadpis: "Co netvrdíme", text: "Že za operací stojí konkrétní stát. Dokud to veřejně nedoloží úřad, vedeme to jako podezření — i když na to ukazuje všechno." },
          { ikona: "vaha" as const, nadpis: "Proč odděleně", text: "Doložený zásah a doložený původce jsou dvě různé věci. Kdo je slije do jedné věty, tvrdí víc, než má." },
        ].map((b) => (
          <div key={b.nadpis} className="rounded-[22px] border border-linka2 bg-plocha p-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev={b.ikona} velikost={17} tah={1.9} /></span>
            <h2 className="mt-3 text-zaklad font-bold text-inkoust">{b.nadpis}</h2>
            <p className="mt-1.5 text-zaklad leading-relaxed text-tlum">{b.text}</p>
          </div>
        ))}
      </section>

      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Rozbory"
          nadpis={vse.length ? `${vse.length} ${sklon(vse.length, "rozebraná kampaň", "rozebrané kampaně", "rozebraných kampaní")}` : "Zatím bez rozboru"}
          popis={
            vse.length
              ? `Filtrujte podle způsobu a uvidíte, kde jinde v Evropě sáhli po témže postupu. Každá operace je rozebraná v šesti částech: co se tvrdilo, jak se to šířilo, jak to doopravdy je, kdo reagoval, čemu to mělo posloužit a co by otázku uzavřelo.${bezi ? ` ${bezi} z nich podle nás stále běží.` : " Žádná z nich podle nás právě neběží."}`
              : "Zveřejňujeme jen kampaně, které prošly ověřením a mají dohledatelné zdroje."
          }
        />
        {vse.length ? (
          <ManipulaceKlient kampane={vse} nazvyZemi={nazvy} />
        ) : (
          <Sdeleni ikona="lupa">
            Zatím žádná rozebraná kampaň. Neznamená to, že žádná neběží — jen jsme ji ještě nedoložili.
          </Sdeleni>
        )}
      </div>

      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Podle zemí"
          nadpis="Na koho to mířilo"
          popis="Jedna kampaň může mířit na víc zemí naráz. U každé z nich se počítá."
          akce={<Tlacitko kam="/zeme/" varianta="obrys" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">přehled zemí</Tlacitko>}
        />
        <TabulkaZemiKampani radky={zeme} nazvyZemi={nazvy} celkem={vse.length} />
      </div>

      <p className="mt-10 text-drobne leading-relaxed text-tlum2">
        Kampaně nejsou události. Do hodnocení ani do počtů na úvodu se nepočítají.
      </p>
    </div>
  );
}
