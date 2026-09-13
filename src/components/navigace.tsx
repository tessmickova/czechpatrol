"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WEB } from "@/config/web";
import { Ikona } from "./ikony";
import { otevriPanel } from "./postranni-panel";
import { Logo } from "./znacka";
import { PrepinacJazyku } from "./prepinac-jazyku";

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
      <div className="sklo-hlavicka flex min-h-[56px] flex-wrap items-center gap-x-4 gap-y-2 rounded-full px-3 py-2 sm:px-4">
        <Link href="/" className="mr-auto flex shrink-0 items-center" aria-label={`${WEB.nazev} — přehled`}>
          <Logo velikost={34} pismo={19} tmave />
        </Link>

        <nav aria-label="Hlavní" className="hidden items-center gap-1 md:flex">
          {HLAVNI.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              aria-current={aktivni(o.href) ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                aktivni(o.href) ? "bg-[rgb(255_255_255/0.12)] text-inkoust" : "text-tlum hover:bg-[rgb(255_255_255/0.07)] hover:text-inkoust"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {o.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <PrepinacJazyku />
          <Link
            href="/podporit/"
            // Jediná plná plocha v hlavičce: na tmavém podkladu papír, po najetí červená.
            className="hidden rounded-full bg-inkoust px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-papir transition-colors hover:bg-akcent hover:text-papir md:inline-block"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Podpořit
          </Link>
          <button
            type="button"
            onClick={otevriPanel}
            className="grid h-11 w-11 place-items-center rounded-full text-tlum transition-colors hover:bg-[rgb(255_255_255/0.08)] hover:text-inkoust"
          >
            <span className="sr-only">Menu</span>
            <Ikona nazev="menu" velikost={20} tah={1.8} />
          </button>
        </div>
      </div>
      </div>
    </header>
  );
}
