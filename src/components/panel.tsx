import type { ReactNode } from "react";
import { Ikona, type NazevIkony } from "./ikony";

/**
 * Panel dashboardu.
 *
 * Jednotná hlavička: kód sekce, název, jedna věta obyčejnou češtinou.
 * Ta věta je tam schválně u každého panelu — dashboard má být čitelný
 * i pro toho, kdo ho vidí poprvé, ne jen pro toho, kdo ví, co hledá.
 */
export function Panel({
  kod, nadpis, popis, ikona, akce, children, sirka = "plna", tmavy = false, id,
  vnorena = false,
}: {
  kod: string;
  nadpis: string;
  popis?: string;
  ikona?: NazevIkony;
  akce?: ReactNode;
  children: ReactNode;
  /** Šířka v mřížce dashboardu. */
  sirka?: "plna" | "dve-tretiny" | "tretina" | "pul";
  tmavy?: boolean;
  id?: string;
  /** Obsah si nese vlastní kartu — panel pak nepřidává druhý rám ani odsazení. */
  vnorena?: boolean;
}) {
  const rozpeti = {
    plna: "lg:col-span-12",
    "dve-tretiny": "lg:col-span-8",
    tretina: "lg:col-span-4",
    pul: "lg:col-span-6",
  }[sirka];

  return (
    <section
      id={id}
      className={`${rozpeti} scroll-mt-[70px] overflow-hidden rounded-[18px] border ${
        tmavy ? "noc relative border-white/10" : "border-linka bg-plocha"
      }`}
    >
      {tmavy && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div data-vrstva="0.04" className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[60%]" />
        </div>
      )}

      <header
        className={`flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4 sm:px-6 ${
          tmavy ? "border-white/10" : "border-linka2"
        }`}
      >
        <div className="min-w-0">
          <div className={`mb-2 flex items-center gap-2 ${tmavy ? "text-noc-tlum" : "text-tlum2"}`}>
            {ikona && <Ikona nazev={ikona} velikost={13} />}
            <span className={`stitek ${tmavy ? "!text-noc-tlum" : ""}`}>{kod}</span>
          </div>
          <h2
            className={`text-[16px] font-semibold tracking-[-0.02em] sm:text-[17px] ${
              tmavy ? "text-noc-text" : ""
            }`}
          >
            {nadpis}
          </h2>
          {popis && (
            <p className={`mt-1 max-w-[52ch] text-[12.5px] leading-snug ${tmavy ? "text-noc-tlum" : "text-tlum"}`}>
              {popis}
            </p>
          )}
        </div>
        {akce && <div className="shrink-0">{akce}</div>}
      </header>

      <div
        className={
          vnorena
            ? "[&>*]:rounded-none [&>*]:border-x-0 [&>*]:border-t-0"
            : "p-5 sm:p-6"
        }
      >
        {children}
      </div>
    </section>
  );
}

/** Mřížka dashboardu. */
export function Mrizka({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-start gap-4 px-4 py-4 sm:px-6 lg:grid-cols-12">
      {children}
    </div>
  );
}
