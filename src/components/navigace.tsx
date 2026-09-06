"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WEB } from "@/config/web";
import { Ikona } from "./ikony";
import { otevriPanel } from "./postranni-panel";
import { Logo } from "./znacka";

/** Čtyři hlavní cíle. Všechno ostatní je v patičce a v postranním panelu. */
export const HLAVNI = [
  { href: "/", label: "Přehled" },
  { href: "/udalosti/", label: "Události" },
  { href: "/vyvoj/", label: "Vývoj" },
  { href: "/svet/", label: "Svět" },
  { href: "/muj-prehled/", label: "Můj přehled" },
];

export function Navigace() {
  const cesta = usePathname();
  const aktivni = (href: string) => (href === "/" ? cesta === "/" : cesta.startsWith(href));

  return (
    // Hlavička je skleněná pilulka, ne pruh přes celou šířku — tak ji má značka.
    <header className="neni-tisk sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="sklo mx-auto flex min-h-[56px] max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 rounded-full px-3 py-2 sm:px-4">
        <Link href="/" className="mr-auto flex shrink-0 items-center" aria-label={`${WEB.nazev} — přehled`}>
          <Logo velikost={34} pismo={19} />
        </Link>

        <nav aria-label="Hlavní" className="hidden items-center gap-1 md:flex">
          {HLAVNI.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              aria-current={aktivni(o.href) ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-[13px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                aktivni(o.href) ? "bg-[rgb(255_255_255/0.85)] text-inkoust shadow-[0_2px_8px_rgb(20_20_15/0.06)]" : "text-tlum hover:bg-[rgb(255_255_255/0.6)] hover:text-inkoust"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {o.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/podporit/"
            className="hidden rounded-full bg-noc px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-noc-text transition-colors hover:bg-akcent md:inline-block"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Podpořit
          </Link>
          <button
            type="button"
            onClick={otevriPanel}
            className="grid h-11 w-11 place-items-center rounded-full text-tlum transition-colors hover:bg-[rgb(255_255_255/0.7)] hover:text-inkoust"
          >
            <span className="sr-only">Menu</span>
            <Ikona nazev="menu" velikost={20} tah={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
