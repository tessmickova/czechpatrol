/**
 * Piktogramy.
 *
 * Jedna mřížka 24 × 24, jedna tloušťka tahu, žádné výplně. Ikona je vždy jen
 * doprovod textového popisku — nikdy nenese informaci sama.
 */

export type NazevIkony =
  | "radar" | "stit" | "stit-ok" | "vaha" | "dokument" | "vlajka" | "globus"
  | "pas" | "hranice" | "palivo" | "elektrina" | "plyn" | "banky" | "komunikace" | "skoly"
  | "dron" | "kabel" | "kyber" | "vystraha" | "oko" | "rozvodna" | "terc"
  | "osa" | "graf" | "kniha" | "zebrik" | "hodiny"
  | "nahoru" | "dolu" | "fajfka" | "krizek";

const TVARY: Record<NazevIkony, string> = {
  radar:
    "M12 21a9 9 0 1 1 9-9 M12 12l6.4-4.2 M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7",
  stit: "M12 3l7.5 3v5.4c0 4.7-3.2 8.1-7.5 9.6-4.3-1.5-7.5-4.9-7.5-9.6V6z",
  "stit-ok":
    "M12 3l7.5 3v5.4c0 4.7-3.2 8.1-7.5 9.6-4.3-1.5-7.5-4.9-7.5-9.6V6z M8.8 11.8l2.4 2.4 4.2-4.6",
  vaha:
    "M12 4v16 M6 7.5h12 M8.5 20h7 M6 7.5 3 14a3 3 0 0 0 6 0z M18 7.5 15 14a3 3 0 0 0 6 0z",
  dokument: "M6.5 2.5h7l4.5 4.5v14.5h-11.5z M13.5 2.5V7h4.5 M9.5 12h6 M9.5 16h6",
  vlajka: "M5.5 21.5V3 M5.5 3.5h11l-2.2 3.8 2.2 3.8h-11",
  globus:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M3.2 12h17.6 M12 3c2.6 2.7 2.6 15.3 0 18 M12 3c-2.6 2.7-2.6 15.3 0 18",
  pas: "M6 2.5h12v19H6z M12 10.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4 M8.6 15.5c0-1.9 1.5-3 3.4-3s3.4 1.1 3.4 3 M9.5 18.5h5",
  hranice: "M12 2.5v19 M4.5 6.5h3 M16.5 6.5h3 M4.5 12h3 M16.5 12h3 M4.5 17.5h3 M16.5 17.5h3",
  palivo:
    "M4.5 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16 M3 21h13 M5.5 10h7 M16 8.2l3 2.3v5.8a1.6 1.6 0 0 0 3.2 0V9.8L19.4 7",
  elektrina: "M13.2 2.5 4.5 14h5.6l-1 7.5L18.8 10h-5.6z",
  plyn:
    "M12 2.8s5.2 4.4 5.2 9.2a5.2 5.2 0 0 1-10.4 0c0-2.2 1.2-3.5 1.2-3.5s.4 1.6.9 2.4c.5-2 2.6-5.2 3.1-8.1z",
  banky: "M3 9.2 12 4l9 5.2 M4.8 9.5v8.6 M9.1 9.5v8.6 M14.9 9.5v8.6 M19.2 9.5v8.6 M2.5 21h19",
  komunikace:
    "M12 19.8h.01 M8.9 16.4a4.4 4.4 0 0 1 6.2 0 M5.8 13.2a8.8 8.8 0 0 1 12.4 0 M2.7 10a13.2 13.2 0 0 1 18.6 0",
  skoly: "M12 3.5 2.5 8.4 12 13.3l9.5-4.9z M6.2 10.8v5.4c0 1.8 2.6 3.1 5.8 3.1s5.8-1.3 5.8-3.1v-5.4",
  dron:
    "M8.5 8.5h7v7h-7z M8.5 8.5 6 6 M15.5 8.5 18 6 M8.5 15.5 6 18 M15.5 15.5 18 18 M3.5 3.5h3.5v3.5H3.5z M17 3.5h3.5v3.5H17z M3.5 17h3.5v3.5H3.5z M17 17h3.5v3.5H17z",
  kabel: "M2.5 12h5.5 M16 12h5.5 M8 8.8v6.4 M16 8.8v6.4 M10.4 12h1.2 M13 12h1",
  kyber: "M7.5 11V8.2a4.5 4.5 0 0 1 9 0V11 M5 11h14v10H5z M12 14.8v2.6",
  vystraha: "M12 3.2 21.5 20.3H2.5z M12 10v4.2 M12 17.2h.01",
  oko: "M2.5 12s3.6-5.8 9.5-5.8S21.5 12 21.5 12s-3.6 5.8-9.5 5.8S2.5 12 2.5 12z M12 14.9a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8",
  rozvodna: "M12 2.5v19 M5.5 21.5 12 4.2l6.5 17.3 M7.8 16.5h8.4 M9.4 11h5.2",
  terc: "M12 2.5v3.2 M12 18.3v3.2 M2.5 12h3.2 M18.3 12h3.2 M12 16.8a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6",
  osa: "M6 2.5v19 M6 6.5h12 M6 12h9 M6 17.5h6",
  graf: "M3.5 3v18h17 M7.5 15.5l4-4.8 3 2.9 5.5-7",
  kniha:
    "M4 4h6.5a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z M20 4h-6.5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2H20z",
  zebrik: "M7.5 2.5v19 M16.5 2.5v19 M7.5 7h9 M7.5 12h9 M7.5 17h9",
  hodiny: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 7.2V12l3.2 2.2",
  nahoru: "M12 19.5V5 M6 11l6-6 6 6",
  dolu: "M12 4.5V19 M6 13l6 6 6-6",
  fajfka: "M4.5 12.5 9.5 17.5 19.5 6.5",
  krizek: "M6 6l12 12 M18 6 6 18",
};

export function Ikona({
  nazev, velikost = 18, tah = 1.4, trida = "",
}: { nazev: NazevIkony; velikost?: number; tah?: number; trida?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={velikost}
      height={velikost}
      aria-hidden
      focusable="false"
      className={`shrink-0 ${trida}`}
    >
      <path
        d={TVARY[nazev]}
        fill="none"
        stroke="currentColor"
        strokeWidth={tah}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
