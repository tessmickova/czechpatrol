"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { POLE, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Ikona } from "./ikony";

/*
  Vlastní dialog místo alert(), confirm() a prompt().

  Proč: nativní dialogy prohlížeče nejdou ovlivnit. Vypadají jinak na každém
  systému, na mobilu překryjí půl obrazovky, nadepíšou se adresou webu
  a nedá se v nich vysvětlit, co se vlastně stane. U kroku, který maže účet
  nebo ruší platnost obnovovacího kódu, je to málo.

  Prohlížeč je navíc smí potlačit — ve vnořeném rámu nebo po opakovaném
  volání je zobrazit nemusí. Tichý `confirm()`, který vrátí false, vypadá
  jako by uživatel odmítl. Tenhle dialog se zobrazí vždycky.

  Barva se drží pravidla z docs/ZNACKA.md: plocha neutrální, žádný tónovaný
  podklad ani barevný rámeček. Červená je jen na hlavní akci, protože to je
  jedno z míst, kde ji značka povoluje.
*/

interface Potvrzeni {
  nadpis: string;
  text?: string;
  /** Popisek hlavního tlačítka. Sloveso, ne „OK“ — ať je vidět, co se stane. */
  potvrdit?: string;
  zrusit?: string;
}

interface Otazka extends Potvrzeni {
  popisek: string;
  vychozi?: string;
  zastupny?: string;
}

interface Kontext {
  /** Ano/ne. Vrací true, když člověk potvrdil. */
  potvrd: (v: Potvrzeni) => Promise<boolean>;
  /** Otázka na text. Vrací null, když člověk odmítl. */
  zeptejSe: (v: Otazka) => Promise<string | null>;
  /** Sdělení s jediným tlačítkem. */
  rekni: (v: Omit<Potvrzeni, "zrusit">) => Promise<void>;
}

const KONTEXT = createContext<Kontext | null>(null);

type Stav =
  | { druh: "potvrzeni"; v: Potvrzeni; vyres: (ano: boolean) => void }
  | { druh: "otazka"; v: Otazka; vyres: (text: string | null) => void }
  | { druh: "sdeleni"; v: Potvrzeni; vyres: () => void };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [stav, setStav] = useState<Stav | null>(null);
  const [text, setText] = useState("");
  const poleRef = useRef<HTMLInputElement>(null);
  const hlavniRef = useRef<HTMLButtonElement>(null);

  const potvrd = useCallback(
    (v: Potvrzeni) => new Promise<boolean>((vyres) => setStav({ druh: "potvrzeni", v, vyres })),
    [],
  );
  const zeptejSe = useCallback(
    (v: Otazka) =>
      new Promise<string | null>((vyres) => {
        setText(v.vychozi ?? "");
        setStav({ druh: "otazka", v, vyres });
      }),
    [],
  );
  const rekni = useCallback(
    (v: Omit<Potvrzeni, "zrusit">) => new Promise<void>((vyres) => setStav({ druh: "sdeleni", v, vyres })),
    [],
  );

  const zavri = useCallback(
    (potvrzeno: boolean) => {
      if (!stav) return;
      if (stav.druh === "potvrzeni") stav.vyres(potvrzeno);
      else if (stav.druh === "otazka") stav.vyres(potvrzeno ? text : null);
      else stav.vyres();
      setStav(null);
      setText("");
    },
    [stav, text],
  );

  useEffect(() => {
    if (!stav) return;
    document.body.style.overflow = "hidden";
    /* U otázky patří pozornost do pole, jinak na hlavní tlačítko. */
    const cil = stav.druh === "otazka" ? poleRef.current : hlavniRef.current;
    cil?.focus();
    const klavesa = (e: KeyboardEvent) => {
      if (e.key === "Escape") zavri(false);
    };
    window.addEventListener("keydown", klavesa);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", klavesa);
    };
  }, [stav, zavri]);

  return (
    <KONTEXT.Provider value={{ potvrd, zeptejSe, rekni }}>
      {children}
      {stav && (
        <>
          <div aria-hidden onClick={() => zavri(false)} className="fixed inset-0 z-[90] bg-noc/70" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-nadpis"
            className="fixed left-1/2 top-1/2 z-[95] w-[calc(100vw-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-linka bg-papir p-6"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="dialog-nadpis" className="podnadpis text-velke text-inkoust">
                {stav.v.nadpis}
              </h2>
              <button
                type="button"
                onClick={() => zavri(false)}
                className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-[12px] text-tlum transition-colors hover:bg-plocha hover:text-inkoust"
              >
                <span className="sr-only">Zavřít</span>
                <Ikona nazev="krizek" velikost={17} tah={2} />
              </button>
            </div>

            {stav.v.text && <p className="text-zaklad leading-relaxed text-tlum">{stav.v.text}</p>}

            {stav.druh === "otazka" && (
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  zavri(true);
                }}
              >
                <label className="stitek mb-1.5 block" htmlFor="dialog-pole">
                  {stav.v.popisek}
                </label>
                <input
                  id="dialog-pole"
                  ref={poleRef}
                  className={`${POLE} w-full`}
                  value={text}
                  placeholder={stav.v.zastupny}
                  onChange={(e) => setText(e.target.value)}
                />
              </form>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button ref={hlavniRef} type="button" onClick={() => zavri(true)} className={TLACITKO_AKCENT}>
                {stav.v.potvrdit ?? "Potvrdit"}
              </button>
              {stav.druh !== "sdeleni" && (
                <button type="button" onClick={() => zavri(false)} className={TLACITKO_TICHE}>
                  {stav.v.zrusit ?? "Zpět"}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </KONTEXT.Provider>
  );
}

export function useDialog(): Kontext {
  const k = useContext(KONTEXT);
  /*
    Bez poskytovatele by se dialog tiše neukázal a kód by pokračoval, jako
    by člověk odmítl. To je přesně ta tichá chyba, kvůli které se nativní
    dialogy nahrazovaly — radši ať je to vidět hned.
  */
  if (!k) throw new Error("useDialog vyžaduje DialogProvider (je v app/layout.tsx).");
  return k;
}
