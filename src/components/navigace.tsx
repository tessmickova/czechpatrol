"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BUY_ME_A_COFFEE_URL, WEB } from "@/config/web";
import { Ikona } from "./ikony";

/** Hlavní navigace zůstává krátká. Zbytek rozcestník na přehledu a patička. */
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

/** Doplňkové cesty — jen v mobilním menu a v patičce. */
const DALSI = [
  { href: "/osa/", label: "Časová osa" },
  { href: "/watchlist/", label: "Watchlist 72 h" },
  { href: "/nepotvrzeno/", label: "Nepotvrzeno" },
  { href: "/nato/", label: "NATO" },
  { href: "/metodika/", label: "Metodika" },
  { href: "/zdroje/", label: "Zdroje" },
  { href: "/komunita/", label: "Komunita" },
];

export function Navigace() {
  const cesta = usePathname();
  const [otevreno, setOtevreno] = useState(false);

  useEffect(() => setOtevreno(false), [cesta]);
  useEffect(() => {
    document.body.style.overflow = otevreno ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [otevreno]);

  const aktivni = (href: string) =>
    href.includes("#") ? false : href === "/" ? cesta === "/" : cesta.startsWith(href);

  return (
    <header className="neni-tisk sklo sticky top-0 z-50 border-b border-linka">
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
            onClick={() => setOtevreno((x) => !x)}
            aria-expanded={otevreno}
            aria-controls="mobilni-menu"
            className="lg:hidden"
          >
            <span className="sr-only">Menu</span>
            <span aria-hidden className="flex h-6 w-6 flex-col items-center justify-center gap-[5px]">
              <span className={`h-[1.5px] w-[17px] bg-inkoust transition-transform ${otevreno ? "translate-y-[3.25px] rotate-45" : ""}`} />
              <span className={`h-[1.5px] w-[17px] bg-inkoust transition-transform ${otevreno ? "-translate-y-[3.25px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {otevreno && (
        <div id="mobilni-menu" className="sklo border-t border-linka lg:hidden">
          <nav aria-label="Hlavní (mobil)" className="mx-auto max-w-[1180px] px-5 py-3 sm:px-8">
            {[...ODKAZY, ...DALSI].map((o) => (
              <Link
                key={o.href}
                href={o.href}
                aria-current={aktivni(o.href) ? "page" : undefined}
                className={`block border-b border-linka2 py-3.5 text-[16px] font-medium last:border-0 ${
                  aktivni(o.href) ? "text-inkoust" : "text-tlum"
                }`}
              >
                {o.label}
              </Link>
            ))}
            <Link
              href="/odber/"
              className="mt-4 block rounded-full border border-akcent/60 bg-akcent/15 py-3 text-center text-[15px] font-bold uppercase tracking-[0.05em] text-akcent-svetla"
            >
              Odebírat
            </Link>
            {BUY_ME_A_COFFEE_URL && (
              <a
                href={BUY_ME_A_COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block rounded-[10px] border border-linka bg-plocha py-2.5 text-center text-[13px] font-medium"
              >
                Podpořit projekt
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
