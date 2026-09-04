"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BUY_ME_A_COFFEE_URL, WEB } from "@/config/web";
import { Ikona } from "./ikony";

const ODKAZY = [
  { href: "/", label: "Přehled" },
  { href: "/dnes/", label: "Dnes" },
  { href: "/udalosti/", label: "Události" },
  { href: "/osa/", label: "Časová osa" },
  { href: "/cr/", label: "ČR" },
  { href: "/nato/", label: "NATO" },
  { href: "/trend/", label: "Trend" },
  { href: "/metodika/", label: "Metodika" },
  { href: "/odber/", label: "Odběr" },
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
    href === "/" ? cesta === "/" : cesta.startsWith(href);

  return (
    <header className="neni-tisk sklo sticky top-0 z-50 border-b border-linka">
      <div className="mx-auto flex h-[52px] max-w-[1180px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-[10px] bg-inkoust text-plocha">
            <Ikona nazev="radar" velikost={13} tah={1.6} />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.03em]">{WEB.nazev}</span>
          <span className="hidden text-[11px] text-tlum2 sm:inline">{WEB.podtitul}</span>
        </Link>

        <nav aria-label="Hlavní" className="hidden flex-1 items-center gap-0.5 lg:flex">
          {ODKAZY.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              aria-current={aktivni(o.href) ? "page" : undefined}
              className={`rounded-[10px] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                aktivni(o.href) ? "bg-linka2 text-inkoust" : "text-tlum hover:text-inkoust"
              }`}
            >
              {o.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span aria-hidden className="relative flex h-[6px] w-[6px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2e8b62] opacity-60" />
              <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-[#2e8b62]" />
            </span>
            <span className="stitek !text-tlum">Live</span>
          </span>
          {BUY_ME_A_COFFEE_URL && (
            <a
              href={BUY_ME_A_COFFEE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-[10px] bg-akcent px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-akcent-tmava sm:inline-block"
            >
              Podpořit projekt
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
        <div id="mobilni-menu" className="border-t border-linka bg-papir lg:hidden">
          <nav aria-label="Hlavní (mobil)" className="mx-auto max-w-[1180px] px-5 py-3 sm:px-8">
            {ODKAZY.map((o) => (
              <Link
                key={o.href}
                href={o.href}
                aria-current={aktivni(o.href) ? "page" : undefined}
                className={`block border-b border-linka2 py-3 text-[15px] font-medium last:border-0 ${
                  aktivni(o.href) ? "text-inkoust" : "text-tlum"
                }`}
              >
                {o.label}
              </Link>
            ))}
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
