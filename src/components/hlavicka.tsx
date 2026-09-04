import type { ReactNode } from "react";
import { Ikona, type NazevIkony } from "./ikony";

/**
 * Hlavička podstránky. Tmavý pás drží stejnou řeč jako situační panel
 * na přehledu — web má napříč působit jako jeden přístroj.
 */
export function HlavickaStranky({
  stitek, ikona, nadpis, popis, doplnek,
}: {
  stitek: string; ikona?: NazevIkony; nadpis: string;
  popis?: ReactNode; doplnek?: ReactNode;
}) {
  return (
    <div className="noc relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div data-vrstva="0.05" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[60%]" />
      </div>
      <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
          {ikona && <Ikona nazev={ikona} velikost={13} tah={1.6} trida="text-akcent-svetla" />}
          <span className="stitek !text-noc-tlum">{stitek}</span>
        </div>
        <h1 className="nadpis max-w-[22ch] text-[32px] text-noc-text sm:text-[44px]">{nadpis}</h1>
        {popis && (
          <div className="mt-4 max-w-[44rem] text-[14px] leading-relaxed text-noc-tlum">{popis}</div>
        )}
        {doplnek && <div className="mt-6">{doplnek}</div>}
      </div>
    </div>
  );
}

export function Obsah({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1180px] px-5 py-11 sm:px-8 sm:py-14">{children}</div>;
}
