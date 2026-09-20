"use client";

/*
  Náhled řádku při najetí.

  Seznamy na úvodní straně mají řádky na jednu řádku, aby se jich vešlo víc.
  Titulek se tím ale ořízne a zbytek se dal přečíst jen proklikem. Náhled to
  řeší, aniž by se muselo klikat: při najetí se dole v kartě ukáže celý
  titulek a pár údajů, které stojí za rozhodnutím, jestli to otevřít.

  Proč panel dole v kartě, a ne bublina u řádku: karta má zaoblené rohy a
  ořezává obsah, takže bublina u řádku by se uřízla — u horních řádků nahoře,
  u krajních do stran. Panel uvnitř karty tenhle problém nemá a nikam
  neposouvá rozvržení.

  Na dotykovém displeji se nenajíždí. Tam se nic neztrácí: klepnutí otevře
  záznam nebo zdroj, což je totéž rozhodnutí o krok dál.
*/

export interface Nahled {
  titulek: string;
  /** Krátké údaje pod titulkem; spojí se tečkami. */
  radky: string[];
  /** Věta navíc — čím zpráva je a co s ní bude. */
  poznamka?: string;
}

export function PanelNahledu({ nahled }: { nahled: Nahled | null }) {
  if (!nahled) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-2 bottom-2 z-20 rounded-[16px] border border-linka bg-plocha2 px-3.5 py-3"
    >
      <p className="text-male leading-snug text-inkoust">{nahled.titulek}</p>
      {nahled.radky.length > 0 && (
        <p className="cislice mt-1.5 text-mikro leading-snug text-tlum2">{nahled.radky.join(" · ")}</p>
      )}
      {nahled.poznamka && <p className="mt-1.5 text-drobne leading-snug text-tlum">{nahled.poznamka}</p>}
    </div>
  );
}
