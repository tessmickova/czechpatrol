import type { Metadata } from "next";
import Link from "next/link";
import { KartaKampane, TabulkaZemiKampani } from "@/components/kampane";
import { HlavickaStranky, NadpisSekce } from "@/components/nadpisy";
import { Ikona } from "@/components/ikony";
import { sklon } from "@/components/zeme";
import { kampane, kampanePodleZemi, nazvyZemi } from "@/lib/data";

export const metadata: Metadata = {
  title: "Manipulační kampaně",
  description:
    "Rozebrané kampaně, které cíleně šíří nepravdu o Česku a jeho sousedech. U každé zvlášť: je to doložená manipulace, a kdo za ní stojí.",
};

/*
  Manipulační kampaně.

  Vlastní sekce, ne podmnožina událostí. Kampaň nemá jedno místo ani jeden
  okamžik, míří obvykle na víc zemí naráz a do počtu případů nevstupuje.
*/
export default function Manipulace() {
  const vse = kampane();
  const nazvy = nazvyZemi();
  const zeme = kampanePodleZemi();
  const bezi = vse.filter((k) => k.probiha).length;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 sm:py-16">
      <HlavickaStranky
        stitek="Manipulace"
        nadpis="Kampaně, které cíleně šíří nepravdu"
        uvod="Kampaň není jedna lež. Je to koordinované šíření nepravdy: podvržené dokumenty, falešné weby, profily vydávající se za úředníky. U každé kampaně odpovídáme zvlášť na dvě otázky — jestli je manipulace doložená, a kdo za ní stojí. Druhá odpověď bývá mnohem méně jistá než první a my to píšeme."
      />

      <section aria-label="Jak to čteme" className="nalet mt-10 grid gap-3 sm:mt-14 sm:grid-cols-3">
        {[
          { ikona: "fajfka" as const, nadpis: "Co tvrdíme", text: "Jen to, co je doložené odkazem, na který se dá kliknout. Podvržený dokument poznáme z obsahu a technických stop." },
          { ikona: "otaznik" as const, nadpis: "Co netvrdíme", text: "Že za kampaní stojí konkrétní stát. Dokud to veřejně nedoloží úřad, vedeme to jako podezření — i když na to ukazuje všechno." },
          { ikona: "vaha" as const, nadpis: "Proč odděleně", text: "Doložená manipulace a doložený původce jsou dvě různé věci. Kdo je slije do jedné věty, tvrdí víc, než má." },
        ].map((b) => (
          <div key={b.nadpis} className="rounded-[22px] border border-linka2 bg-plocha p-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev={b.ikona} velikost={17} tah={1.9} /></span>
            <h2 className="mt-3 text-[15.5px] font-bold text-inkoust">{b.nadpis}</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-tlum">{b.text}</p>
          </div>
        ))}
      </section>

      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Rozbory"
          nadpis={vse.length ? `${vse.length} ${sklon(vse.length, "rozebraná kampaň", "rozebrané kampaně", "rozebraných kampaní")}` : "Zatím bez rozboru"}
          popis={
            vse.length
              ? `Každá kampaň v šesti částech: co se tvrdilo, jak se to šířilo, jak to doopravdy je, kdo reagoval, čemu to mělo posloužit a co by otázku uzavřelo.${bezi ? ` ${bezi} z nich podle nás stále běží.` : " Žádná z nich podle nás právě neběží."}`
              : "Zveřejňujeme jen kampaně, které prošly ověřením a mají dohledatelné zdroje."
          }
        />
        {vse.length ? (
          <div className="space-y-5">
            {vse.map((k) => <KartaKampane key={k.slug} k={k} nazvyZemi={nazvy} />)}
          </div>
        ) : (
          <p className="rounded-[22px] border border-linka2 bg-plocha px-5 py-6 text-[15px] leading-relaxed text-tlum">
            Zatím nemáme rozebranou žádnou kampaň. Neznamená to, že žádná neběží — jen že jsme zatím žádnou nedoložili
            tak, abychom ji mohli zveřejnit.
          </p>
        )}
      </div>

      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisSekce
          stitek="Podle zemí"
          nadpis="Na koho kampaně mířily"
          popis="Jedna kampaň může mířit na víc zemí naráz. U každé z nich se počítá."
          akce={<Link href="/zeme/" className="text-[13px] font-semibold text-akcent hover:text-akcent-svetla">přehled zemí →</Link>}
        />
        <TabulkaZemiKampani radky={zeme} nazvyZemi={nazvy} celkem={vse.length} />
      </div>

      <p className="mt-10 text-[12.5px] leading-relaxed text-tlum2">
        Kampaně se nepočítají mezi bezpečnostní případy — jsou to operace, ne události. Do hodnocení úrovně
        ani do počtů na úvodní straně nevstupují.
      </p>
    </div>
  );
}
