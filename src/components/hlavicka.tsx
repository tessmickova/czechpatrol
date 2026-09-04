import type { ReactNode } from "react";

export function HlavickaStranky({
  stitek, nadpis, popis, doplnek,
}: { stitek: string; nadpis: string; popis?: ReactNode; doplnek?: ReactNode }) {
  return (
    <div className="border-b border-linka">
      <div className="mx-auto max-w-[1180px] px-5 py-11 sm:px-8 sm:py-14">
        <div className="stitek mb-4">{stitek}</div>
        <h1 className="nadpis max-w-[24ch] text-[30px] sm:text-[40px]">{nadpis}</h1>
        {popis && (
          <div className="mt-4 max-w-[46rem] text-[14px] leading-relaxed text-tlum">{popis}</div>
        )}
        {doplnek && <div className="mt-6">{doplnek}</div>}
      </div>
    </div>
  );
}

export function Obsah({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-11 sm:px-8 sm:py-14">{children}</div>
  );
}
