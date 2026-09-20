"use client";

/*
  Schéma cesty zprávy od zdroje na web.

  Proč kreslené a ne seznamem: otázka, která se opakovala, nebyla „jaké jsou
  kroky", ale „kde to uvázlo". Na to odpovídá tvar — kde se cesta větví a kam
  vede ta druhá větev. V číslovaném seznamu to vidět není.

  Barva se drží docs/ZNACKA.md: plochy neutrální, linky vlasové, barevná je
  jen tečka do 8 px u míst, kde se rozhoduje. Žádné výplně ani barevné rámečky.
*/

interface Uzel {
  x: number;
  y: number;
  nadpis: string;
  popis: string;
  /** Rozhodovací místo dostane tečku. */
  brana?: boolean;
}

const S = 168; // šířka bloku
const V = 52; // výška bloku

const UZLY: Uzel[] = [
  { x: 16, y: 16, nadpis: "Sběr", popis: "111 zdrojů, po hodině" },
  { x: 16, y: 104, nadpis: "Kandidáti", popis: "holý titulek + odkaz" },
  { x: 16, y: 192, nadpis: "Posouzení", popis: "model / ověřovatel", brana: true },
  { x: 16, y: 280, nadpis: "Fronta návrhů", popis: "ve Správě, neveřejné" },
  { x: 16, y: 368, nadpis: "Vaše rozhodnutí", popis: "schválit / znovu / zamítnout", brana: true },
  { x: 232, y: 368, nadpis: "Zamítnuto", popis: "do koše i s důvodem" },
  { x: 232, y: 280, nadpis: "Zpět ověřovateli", popis: "návrh zůstává ve frontě" },
  { x: 16, y: 456, nadpis: "Na webu", popis: "počítá se do statistik" },
  { x: 232, y: 456, nadpis: "Telegram", popis: "vážné hned, zbytek v souhrnu" },
  { x: 232, y: 104, nadpis: "Zachyceno, neověřeno", popis: "na titulce, mimo počty" },
  { x: 232, y: 192, nadpis: "Telegram bez schválení", popis: "naléhavé a úředně doložené", brana: true },
];

const SIPKY: [number, number, number, number][] = [
  [100, 68, 100, 104], // sběr → kandidáti
  [100, 156, 100, 192], // kandidáti → posouzení
  [100, 244, 100, 280], // posouzení → fronta
  [100, 332, 100, 368], // fronta → rozhodnutí
  [100, 420, 100, 456], // rozhodnutí → web
  [184, 394, 232, 394], // rozhodnutí → zamítnuto
  [184, 382, 232, 306], // rozhodnutí → zpět ověřovateli
  [184, 482, 232, 482], // web → telegram
  [184, 130, 232, 130], // kandidáti → zachyceno neověřeno
  [184, 218, 232, 218], // posouzení → Telegram bez schválení
];

export function SchemaToku() {
  return (
    <svg
      viewBox="0 0 416 528"
      className="h-auto w-full max-w-[460px]"
      role="img"
      aria-label="Schéma: zpráva jde od sběru přes posouzení a frontu návrhů k vašemu rozhodnutí. Schválená jde na web a do Telegramu, vrácená zpět ověřovateli, zamítnutá do koše. Zachycené a neověřené zprávy se ukazují jen na titulce mimo počty."
    >
      <defs>
        <marker id="hrot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" className="fill-linka" />
        </marker>
      </defs>

      {SIPKY.map(([x1, y1, x2, y2]) => (
        <line
          key={`${x1}-${y1}-${x2}-${y2}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          className="stroke-linka"
          strokeWidth="1"
          markerEnd="url(#hrot)"
        />
      ))}

      {UZLY.map((u) => (
        <g key={u.nadpis}>
          <rect
            x={u.x}
            y={u.y}
            width={S}
            height={V}
            rx="14"
            className="fill-plocha stroke-linka2"
            strokeWidth="1"
          />
          {u.brana && <circle cx={u.x + 12} cy={u.y + 17} r="3.5" className="fill-akcent" />}
          <text
            x={u.brana ? u.x + 24 : u.x + 12}
            y={u.y + 21}
            className="fill-inkoust text-[11px] font-bold"
          >
            {u.nadpis}
          </text>
          <text x={u.x + 12} y={u.y + 38} className="fill-tlum2 text-[9.5px]">
            {u.popis}
          </text>
        </g>
      ))}
    </svg>
  );
}
