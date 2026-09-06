"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WEB } from "@/config/web";
import { Ikona } from "./ikony";
import { otevriPanel } from "./postranni-panel";

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
    <header className="neni-tisk sklo-rozmaz sticky top-0 z-50 border-b border-linka">
      <div className="mx-auto flex h-[56px] max-w-[1200px] items-center gap-5 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${WEB.nazev} — přehled`}>
          <span className="grid h-[28px] w-[28px] place-items-center rounded-[8px] bg-akcent/15 text-akcent">
            <Ikona nazev="radar" velikost={16} tah={1.8} />
          </span>
          <span className="text-[17px] font-bold tracking-[-0.01em]">{WEB.nazev}</span>
        </Link>

        <nav aria-label="Hlavní" className="hidden items-center gap-1 md:flex">
          {HLAVNI.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              aria-current={aktivni(o.href) ? "page" : undefined}
              className={`rounded-[8px] px-3 py-2 text-[14px] font-semibold transition-colors ${
                aktivni(o.href) ? "bg-plocha2 text-inkoust" : "text-tlum hover:bg-plocha hover:text-inkoust"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/podporit/" className="hidden rounded-[8px] px-3 py-2 text-[14px] font-semibold text-tlum transition-colors hover:bg-plocha hover:text-inkoust md:inline-block">
            Podpořit
          </Link>
          <button
            type="button"
            onClick={otevriPanel}
            className="grid h-11 w-11 place-items-center rounded-[8px] text-tlum transition-colors hover:bg-plocha hover:text-inkoust"
          >
            <span className="sr-only">Menu</span>
            <Ikona nazev="menu" velikost={20} tah={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
