"use client";

import type { ReactNode } from "react";

/** Jednotné ovládací prvky formulářů — jeden vzhled napříč účtem, IZS i správou. */

export const TLACITKO =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-5 text-zaklad font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50";
export const TLACITKO_AKCENT = `${TLACITKO} border-akcent/60 bg-akcent/15 text-akcent-svetla  hover:bg-akcent/25`;
export const TLACITKO_TICHE = `${TLACITKO} border-linka text-inkoust hover:border-akcent/60`;
export const TLACITKO_VAROVNE = `${TLACITKO} border-akcent/50 text-akcent-svetla hover:bg-akcent/10`;

export const POLE =
  "w-full rounded-[18px] border border-linka bg-noc/60 px-3.5 py-2.5 text-zaklad text-inkoust placeholder:text-tlum2 focus:border-akcent focus:outline-none";

export function Popisek({ children, pro }: { children: ReactNode; pro?: string }) {
  return (
    <label htmlFor={pro} className="stitek mb-2 block !text-tlum">
      {children}
    </label>
  );
}

export function Hlaska({ typ, children }: { typ: "chyba" | "ok" | "info"; children: ReactNode }) {
  const tridy = {
    chyba: "border-akcent/40 bg-akcent/10 text-akcent-svetla",
    ok: "border-klid/40 bg-klid/10 text-klid-text",
    info: "border-akcent/40 bg-akcent/10 text-akcent-svetla",
  }[typ];
  return (
    <div role={typ === "chyba" ? "alert" : "status"} className={`rounded-[18px] border px-4 py-3 text-zaklad leading-relaxed ${tridy}`}>
      {children}
    </div>
  );
}

/** Volba z několika možností — velká, klikatelná, s vysvětlením. */
export function Volby<T extends string>({
  nazev, hodnota, moznosti, onChange,
}: {
  nazev: string;
  hodnota: T;
  moznosti: { hodnota: T; nazev: string; popis: string }[];
  onChange: (h: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={nazev} className="grid gap-2 sm:grid-cols-2">
      {moznosti.map((m) => {
        const aktivni = m.hodnota === hodnota;
        return (
          <button
            key={m.hodnota}
            type="button"
            role="radio"
            aria-checked={aktivni}
            onClick={() => onChange(m.hodnota)}
            className={`rounded-[22px] border p-3.5 text-left transition-colors ${
              aktivni ? "border-akcent/60 bg-akcent/10" : "border-linka hover:border-akcent/40"
            }`}
          >
            <span className={`block text-zaklad font-bold uppercase tracking-[0.03em] ${aktivni ? "text-akcent-svetla" : "text-inkoust"}`}>
              {m.nazev}
            </span>
            <span className="mt-1 block text-male leading-snug text-tlum">{m.popis}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Prepinac({
  zapnuto, onChange, nazev, popis,
}: { zapnuto: boolean; onChange: (z: boolean) => void; nazev: string; popis?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={zapnuto}
      onClick={() => onChange(!zapnuto)}
      className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-linka p-3.5 text-left transition-colors hover:border-akcent/40"
    >
      <span>
        <span className="block text-zaklad font-semibold text-inkoust">{nazev}</span>
        {popis && <span className="mt-0.5 block text-male leading-snug text-tlum">{popis}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          zapnuto ? "border-akcent bg-akcent/40" : "border-linka bg-noc"
        }`}
      >
        <span
          className={`absolute top-[3px] h-[16px] w-[16px] rounded-full transition-all ${
            zapnuto ? "left-[23px] bg-akcent-svetla " : "left-[3px] bg-tlum2"
          }`}
        />
      </span>
    </button>
  );
}
