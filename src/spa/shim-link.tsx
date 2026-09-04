import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Náhrada za next/link. Vnitřní odkazy míří do fragmentu adresy,
 * vnější zůstávají beze změny.
 */
export default function Link({
  href, children, ...zbytek
}: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const vnitrni = href.startsWith("/");
  return (
    <a href={vnitrni ? `#${href}` : href} {...zbytek}>
      {children}
    </a>
  );
}
