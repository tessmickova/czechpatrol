"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikona, type NazevIkony } from "./ikony";
import { otevriPanel } from "./postranni-panel";

const POLOZKY: { href: string; label: string; ikona: NazevIkony }[] = [
  { href: "/", label: "Přehled", ikona: "radar" },
  { href: "/#cr", label: "ČR", ikona: "vaha" },
  { href: "/#udalosti", label: "Události", ikona: "osa" },
  { href: "/#vyvoj", label: "Vývoj", ikona: "graf" },
];

/** Spodní lišta na mobilu — aplikace má mít ovládání pod palcem. */
export function ListaMobil() {
  const cesta = usePathname();
  return (
    <nav
      aria-label="Rychlá navigace"
      className="neni-tisk sklo-rozmaz fixed inset-x-0 bottom-0 z-[60] border-t border-linka pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {POLOZKY.map((p) => {
          const aktivni = p.href === "/" ? cesta === "/" : false;
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                className={`flex flex-col items-center gap-1 py-2.5 ${aktivni ? "text-akcent" : "text-tlum"}`}
              >
                <Ikona nazev={p.ikona} velikost={20} />
                <span className="stitek !text-[9px] !text-current">{p.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={otevriPanel} className="flex w-full flex-col items-center gap-1 py-2.5 text-tlum">
            <Ikona nazev="uzivatel" velikost={20} />
            <span className="stitek !text-[9px] !text-current">Účet</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
