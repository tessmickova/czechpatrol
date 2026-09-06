"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikona, type NazevIkony } from "./ikony";
import { otevriPanel } from "./postranni-panel";

const POLOZKY: { href: string; label: string; ikona: NazevIkony }[] = [
  { href: "/", label: "Přehled", ikona: "radar" },
  { href: "/udalosti/", label: "Události", ikona: "osa" },
  { href: "/vyvoj/", label: "Vývoj", ikona: "graf" },
  { href: "/svet/", label: "Svět", ikona: "globus" },
];

/** Spodní lišta na mobilu: čtyři stránky a Menu, každý cíl aspoň 44 px vysoký. */
export function ListaMobil() {
  const cesta = usePathname();
  return (
    <nav aria-label="Hlavní (mobil)" // Spodní lišta je plná, ne skleněná — text pod ní by prosvítal a mátl.
      className="neni-tisk fixed inset-x-0 bottom-0 z-[60] border-t border-linka bg-plocha pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(20_20_15/0.08)] md:hidden">
      <ul className="grid grid-cols-5">
        {POLOZKY.map((p) => {
          const aktivni = p.href === "/" ? cesta === "/" : cesta.startsWith(p.href);
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={aktivni ? "page" : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 ${aktivni ? "text-akcent" : "text-tlum"}`}
              >
                <Ikona nazev={p.ikona} velikost={20} />
                <span className="text-[11px] font-semibold">{p.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={otevriPanel} className="flex min-h-[52px] w-full flex-col items-center justify-center gap-1 text-tlum">
            <Ikona nazev="menu" velikost={20} />
            <span className="text-[11px] font-semibold">Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
