"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PLACENE, UCTY_ZAPNUTE } from "@/config/web";
import { maRoli, useUcet } from "@/lib/ucet";
import { Ikona } from "./ikony";

/**
 * Obsah jen pro podporovatele.
 *
 * Zapíná se jednou hodnotou v konfiguraci. Bez zapnutí vrací obsah tak,
 * jak je. Se zapnutím ho čtenáři bez role zakryje — a řekne mu proč.
 * Omezení běží v prohlížeči (web je statický); kdo ho chce mít tvrdé,
 * musí data přesunout do API.
 */
export function PlacenaVrstva({ children, co = "Tahle část" }: { children: ReactNode; co?: string }) {
  const { ucet, nacita } = useUcet();
  if (!PLACENE.hraniceADoprava) return <>{children}</>;
  if (UCTY_ZAPNUTE && nacita) return <>{children}</>;
  if (maRoli(ucet, "podporovatel")) return <>{children}</>;
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-[6px] opacity-40">{children}</div>
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="sklo sklo-akcent max-w-[28rem] rounded-[16px] p-5 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-[12px] border border-jantar/50 bg-jantar/15 text-jantar">
            <Ikona nazev="zamek" velikost={18} />
          </span>
          <p className="mt-3 text-[16px] font-bold uppercase tracking-[0.03em]">{co} je pro podporovatele</p>
          <p className="mt-2 text-[14px] leading-relaxed text-tlum">
            Provoz platí sběr dat a doručování. Podporovatelé mají tuhle část odemčenou.
          </p>
          <Link href="/ucet/" className="mt-4 inline-flex items-center gap-2 rounded-full border border-jantar/60 bg-jantar/15 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.05em] text-jantar">
            Přihlásit nebo podpořit
          </Link>
        </div>
      </div>
    </div>
  );
}
