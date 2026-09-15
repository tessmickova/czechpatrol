"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Stránka, která se přestěhovala. Na Cloudflare Pages přesměruje server
 * (public/_redirects); tohle je záloha pro jiný hosting a pro klikací
 * náhled. Odkaz je vidět i bez skriptu.
 */
export function Presmerovani({ kam, co }: { kam: string; co: string }) {
  useEffect(() => {
    const t = setTimeout(() => {
      if (location.hash.startsWith("#/")) location.hash = kam;
      else location.replace(kam);
    }, 400);
    return () => clearTimeout(t);
  }, [kam]);
  return (
    <div className="mx-auto max-w-[640px] px-5 py-20 text-center">
      <p className="stitek mb-3">Stránka se přestěhovala</p>
      <h1 className="text-cislo font-bold">{co}</h1>
      <p className="mt-3 text-zaklad text-tlum">Přesměrujeme vás. Pokud se nic neděje, pokračujte odkazem.</p>
      <Link href={kam} className="mt-6 inline-flex min-h-[44px] items-center rounded-[18px] border border-linka px-4 text-zaklad font-semibold text-inkoust hover:border-akcent">Pokračovat</Link>
    </div>
  );
}
