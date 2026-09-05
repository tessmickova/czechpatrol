"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BUY_ME_A_COFFEE_URL, WEB } from "@/config/web";
import { Ikona } from "./ikony";
import { otevriPanel } from "./postranni-panel";

/**
 * Web je jedna stránka. Navigace proto skáče na sekce dashboardu,
 * ne na samostatné adresy.
 */
const ODKAZY = [
  { href: "/", label: "Přehled" },
  { href: "/#cr", label: "ČR" },
  { href: "/#udalosti", label: "Události" },
  { href: "/#vyvoj", label: "Vývoj" },
  { href: "/dnes/", label: "Dnes" },
];

export function Navigace() {
  const cesta = usePathname();

  const aktivni = (href: string) =>
    href.includes("#") ? false : href === "/" ? cesta === "/" : cesta.startsWith(href);

  return (
    <header className="neni-tisk sklo-rozmaz sticky top-0 z-50 border-b border-linka">
      <div className="mx-auto flex h-[52px] max-w-[1180px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-[26px] w-[26px] place-items-center rounded-[10px] border border-akcent/50 bg-akcent/15 text-akcent shadow-[0_0_14px_rgb(56_232_255/0.45)]">
            <Ikona nazev="radar" velikost={15} tah={1.7} />
          </span>
          <span className="svit text-[17px] font-bold uppercase tracking-[0.06em] text-inkoust">{WEB.nazev}</span>
          <span className="stitek hidden sm:inline">{WEB.podtitul}</span>
        </Link>

        <nav aria-label="Hlavní" className="hidden flex-1 items-center gap-0.5 lg:flex">
          {ODKAZY.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              aria-current={aktivni(o.href) ? "page" : undefined}
              className={`rounded-[10px] px-3 py-1.5 text-[14px] font-semibold uppercase tracking-[0.04em] transition-colors ${
                aktivni(o.href) ? "bg-akcent/10 text-akcent" : "text-tlum hover:text-inkoust"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span aria-hidden className="relative flex h-[6px] w-[6px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4fdd9a] opacity-60" />
              <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-[#4fdd9a] shadow-[0_0_8px_rgb(79_221_154/0.9)]" />
            </span>
            <span className="stitek !text-tlum">Live</span>
          </span>
          <Link
            href="/odber/"
            className="hidden rounded-full border border-akcent/60 bg-akcent/15 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.05em] text-akcent-svetla shadow-[0_0_18px_-4px_rgb(56_232_255/0.6)] transition-all hover:bg-akcent/25 sm:inline-block"
          >
            Odebírat
          </Link>
          {BUY_ME_A_COFFEE_URL && (
            <a
              href={BUY_ME_A_COFFEE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full border border-linka px-3.5 py-2 text-[13px] font-semibold transition-colors hover:border-akcent lg:inline-block"
            >
              Podpořit
            </a>
          )}
          <button
            type="button"
            onClick={otevriPanel}
            className="grid h-9 w-9 place-items-center rounded-full border border-linka text-tlum transition-colors hover:border-akcent hover:text-inkoust"
          >
            <span className="sr-only">Účet a nástroje</span>
            <Ikona nazev="uzivatel" velikost={17} />
          </button>
        </div>
      </div>

    </header>
  );
}
