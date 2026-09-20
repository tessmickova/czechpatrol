"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/*
  Vysvětlivka, která funguje i prstem.

  Předtím stála jen na `:hover` a `:focus-within`. Na dotykovém displeji se
  nedalo najet myší a Safari na iPhonu tlačítku po klepnutí nedává fokus —
  takže na mobilu se vysvětlivka neotevřela vůbec. Otevírání proto řídí kód:
  myš najetím, prst i klávesnice klepnutím.

  Zavře se klepnutím mimo, klávesou Escape nebo opětovným klepnutím. Dokud se
  komponenta nenačte, platí záložní pravidlo v CSS (`:hover`, `:focus-within`),
  aby vysvětlivka fungovala i bez JavaScriptu.
*/
export function ObalNapovedy({
  children, popis, vpravo = false, label = "Co to znamená?", cele = false,
}: {
  children: ReactNode;
  popis: ReactNode;
  vpravo?: boolean;
  label?: string;
  /** Spouštěč vyplní celou šířku (dlaždice). */
  cele?: boolean;
}) {
  const [otevreno, setOtevreno] = useState(false);
  const [jeKod, setJeKod] = useState(false);
  const obal = useRef<HTMLSpanElement>(null);
  /* Stav před stiskem — klik přichází až po fokusu, viz onClick níž. */
  const predStiskem = useRef(false);
  const id = useId();

  /* Až po připojení: do té doby se web chová podle CSS a nic nepřeskakuje. */
  useEffect(() => setJeKod(true), []);

  useEffect(() => {
    if (!otevreno) return;
    const mimo = (e: Event) => {
      if (!obal.current?.contains(e.target as Node)) setOtevreno(false);
    };
    const klavesa = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOtevreno(false);
    };
    document.addEventListener("pointerdown", mimo);
    document.addEventListener("keydown", klavesa);
    return () => {
      document.removeEventListener("pointerdown", mimo);
      document.removeEventListener("keydown", klavesa);
    };
  }, [otevreno]);

  return (
    <span
      ref={obal}
      className={`napoveda-obal ${cele ? "w-full" : ""}`}
      data-js={jeKod ? "ano" : undefined}
      data-otevreno={otevreno ? "ano" : undefined}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setOtevreno(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setOtevreno(false); }}
    >
      <button
        type="button"
        /* U malého spouštěče (ikona „i") se zvětší jen dotyková plocha, ne místo v textu. */
        className={`text-left ${cele ? "w-full" : "-m-2 inline-flex min-h-[32px] min-w-[32px] items-center p-2"}`}
        aria-label={label}
        aria-expanded={otevreno}
        aria-describedby={otevreno ? id : undefined}
        onPointerDown={() => { predStiskem.current = otevreno; }}
        onClick={(e) => {
          /*
            Pořadí událostí je pointerdown → focus → click. Fokus vysvětlivku
            otevře, takže kdyby klik jen přepínal aktuální stav, hned by ji zase
            zavřel a na dotykovém displeji by se neotevřela nikdy. Přepíná se
            proto podle stavu před stiskem; klávesnice (detail === 0) fokus
            neřeší jinak, tam stačí stav aktuální.
          */
          setOtevreno(!(e.detail === 0 ? otevreno : predStiskem.current));
        }}
        onFocus={() => setOtevreno(true)}
        onBlur={(e) => {
          /* Fokus uvnitř vysvětlivky ji nesmí zavřít — jinak by nešlo dojít na odkaz v ní. */
          if (!obal.current?.contains(e.relatedTarget as Node | null)) setOtevreno(false);
        }}
      >
        {children}
      </button>
      <span id={id} role="tooltip" className={`napoveda ${vpravo ? "napoveda-vpravo" : ""}`}>
        {popis}
      </span>
    </span>
  );
}
