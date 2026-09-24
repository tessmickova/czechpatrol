"use client";

import type Link from "next/link";
import { useContextJazyka } from "@/lib/i18n";

/*
  Odkaz, který drží jazyk.

  Bez tohohle by první kliknutí v navigaci vrátilo čtenáře do češtiny: odkazy
  jsou psané česky (`/udalosti/`) a nevědí, v jaké jazykové větvi stojí.

  Vnější adresy, kotvy a soubory se nechávají být — jazyková předpona patří
  jen našim vnitřním stránkám.

  Od 24. 9. 2026 je to obyčejný <a>, ne Link z Next.js. Web se nasazuje
  každou půlhodinu a soubory buildu se s každým nasazením přejmenují;
  otevřená stránka pak při klientském přechodu sahala po souborech, které
  už na serveru nebyly, a „Události“ z menu se neotevřely. Plné načtení
  statické stránky je rychlé a vždycky sedí k tomu, co je nasazené.
*/
export function Odkaz({
  href,
  children,
  ...zbytek
}: { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "prefetch" | "replace" | "scroll" | "shallow" | "locale" | "legacyBehavior">) {
  const { odkaz } = useContextJazyka();
  return (
    <a href={odkaz(href)} {...(zbytek as React.ComponentProps<"a">)}>
      {children}
    </a>
  );
}
