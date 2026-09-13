"use client";

import Link from "next/link";
import { useContextJazyka } from "@/lib/i18n";

/*
  Odkaz, který drží jazyk.

  Bez tohohle by první kliknutí v navigaci vrátilo čtenáře do češtiny: odkazy
  jsou psané česky (`/udalosti/`) a nevědí, v jaké jazykové větvi stojí.

  Vnější adresy, kotvy a soubory se nechávají být — jazyková předpona patří
  jen našim vnitřním stránkám.
*/
export function Odkaz({
  href,
  children,
  ...zbytek
}: { href: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const { odkaz } = useContextJazyka();
  return (
    <Link href={odkaz(href)} {...zbytek}>
      {children}
    </Link>
  );
}
