"use client";

import { Odkaz } from "./odkaz";
import { usePathname } from "next/navigation";
import { WEB } from "@/config/web";
import { Ikona } from "./ikony";
import { otevriPanel } from "./postranni-panel";
import { Logo } from "./znacka";
import { PrepinacJazyku } from "./prepinac-jazyku";
import { useT } from "@/lib/i18n";

/*
  Šest cílů. Vývoj, Aktéři a Manipulace stojí pod jedním rozcestníkem
  Analýzy — jsou to tři odpovědi na tutéž otázku „co z toho plyne“ a
  v liště by se rozpadly do nesrozumitelného výčtu.
*/
export const HLAVNI = [
  { href: "/", label: "Přehled" },
  { href: "/udalosti/", label: "Události" },
  { href: "/manipulace/", label: "Manipulace" },
  { href: "/zeme/", label: "Země" },
  { href: "/analyzy/", label: "Analýzy" },
  { href: "/muj-prehled/", label: "Můj přehled" },
];

export function Navigace() {
  const t = useT();
  const cesta = usePathname();
  const aktivni = (href: string) => (href === "/" ? cesta === "/" : cesta.startsWith(href));

  return (
    // Hlavička je skleněná pilulka, ne pruh přes celou šířku — tak ji má značka.
    // Vnější obal je záměrně shodný s obsahem stránky (max-w-[1280px] + px-4/6),
    // aby pilulka lícovala s panely pod sebou. Dřív měla vlastní 1200 px a byla
    // o 16 px zasunutá z každé strany; kopírováním obsahu to zůstane srovnané,
    // i kdyby se šířka webu někdy změnila.
    <header className="neni-tisk sticky top-0 z-50 pt-3">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      {/*
        Jeden řádek, i na úzkém displeji.

        Hlavička se dřív zalamovala: značka je s nápisem a štítkem BETA široká,
        takže se přepínač jazyka a menu odsunuly na druhý řádek a z pilulky
        byla vysoká deska s dírou uprostřed. Nezalamuje se (`flex-nowrap`)
        a značka je na mobilu menší — víc než logo a dvě tlačítka se na
        390 px stejně nevejde.
      */}
      <div className="sklo-hlavicka flex min-h-[56px] flex-nowrap items-center gap-x-2 rounded-full px-3 py-2 sm:gap-x-4 sm:px-4">
        <Odkaz href="/" className="mr-auto flex min-w-0 shrink items-center" aria-label={`${WEB.nazev} — přehled`}>
          <span className="sm:hidden"><Logo velikost={26} pismo={15} tmave /></span>
          <span className="hidden sm:block"><Logo velikost={34} pismo={19} tmave /></span>
        </Odkaz>

        {/*
          Vodorovná nabídka až od 1024 px, ne od 768.

          Šest položek, tlačítko Podpořit, přepínač jazyka a menu se do
          tabletové šířky nevešly: řádek se nezalomil (flex-nowrap), jen
          přetekl doleva přes logo, takže „PŘEHLED" leželo na slově
          „CzechPatrol". Pod 1024 px vede nabídka přes tlačítko menu, které
          je na liště pořád.
        */}
        <nav aria-label={t("Hlavní")} className="hidden items-center gap-1 lg:flex">
          {HLAVNI.map((o) => (
            <Odkaz
              key={o.href}
              href={o.href}
              aria-current={aktivni(o.href) ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-male font-semibold uppercase tracking-[0.06em] transition-colors ${
                aktivni(o.href) ? "bg-[rgb(255_255_255/0.12)] text-inkoust" : "text-tlum hover:bg-[rgb(255_255_255/0.07)] hover:text-inkoust"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {t(o.label)}
            </Odkaz>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <PrepinacJazyku />
          <Odkaz
            href="/podporit/"
            // Jediná plná plocha v hlavičce: na tmavém podkladu papír, po najetí červená.
            className="hidden rounded-full bg-inkoust px-5 py-2.5 text-drobne font-semibold uppercase tracking-[0.06em] text-papir transition-colors hover:bg-akcent hover:text-papir lg:inline-block"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Podpořit
          </Odkaz>
          <button
            type="button"
            onClick={otevriPanel}
            className="grid h-11 w-11 place-items-center rounded-full text-tlum transition-colors hover:bg-[rgb(255_255_255/0.08)] hover:text-inkoust"
          >
            <span className="sr-only">{t("Menu")}</span>
            <Ikona nazev="menu" velikost={20} tah={1.8} />
          </button>
        </div>
      </div>
      </div>
    </header>
  );
}
