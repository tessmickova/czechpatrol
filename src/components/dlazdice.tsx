import Link from "next/link";
import { Ikona, type NazevIkony } from "./ikony";
import { Napoveda } from "./zaklad";

/* ---------------- velká stavová dlaždice ---------------- */

export type Ton = "klid" | "pozor" | "poplach" | "neznamo";

const TONY: Record<Ton, { karta: string; stitek: string; hodnota: string; ikona: string }> = {
  klid: {
    karta: "border-[#c9e3d4] bg-list",
    stitek: "text-[#3d7a5c]",
    hodnota: "text-[#1f5c40]",
    ikona: "border-[#bcdcca] bg-list2 text-[#2e7a56]",
  },
  pozor: {
    karta: "border-[#eddcb6] bg-slunce",
    stitek: "text-[#8a6a24]",
    hodnota: "text-[#6f5215]",
    ikona: "border-[#e6cfa4] bg-slunce2 text-[#8a6a24]",
  },
  poplach: {
    karta: "border-[#e9c2a8] bg-[#fdeee3]",
    stitek: "text-[#9c4f18]",
    hodnota: "text-[#7d3d10]",
    ikona: "border-[#e3b492] bg-[#f7ddc9] text-[#9c4f18]",
  },
  neznamo: {
    karta: "border-dashed border-linka bg-plocha",
    stitek: "text-tlum2",
    hodnota: "text-tlum2",
    ikona: "border-dashed border-linka bg-papir text-tlum2",
  },
};

export interface Dlazdice {
  klic: string;
  stitek: string;
  hodnota: string;
  ton: Ton;
  ikona: NazevIkony;
  napoveda: React.ReactNode;
}

export function StavoveDlazdice({ dlazdice }: { dlazdice: Dlazdice[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {dlazdice.map((d) => {
        const t = TONY[d.ton];
        return (
          <li key={d.klic} className={`rounded-[20px] border p-5 ${t.karta}`}>
            <Napoveda popis={d.napoveda} label={`${d.stitek} — co to znamená?`}>
              <span className="block">
                <span className={`mb-4 grid h-[38px] w-[38px] place-items-center rounded-[13px] border ${t.ikona}`}>
                  <Ikona nazev={d.ikona} velikost={18} />
                </span>
                <span className={`stitek mb-2.5 block ${t.stitek}`}>{d.stitek}</span>
                <span
                  className={`block text-[19px] font-semibold leading-tight tracking-[-0.025em] ${t.hodnota}`}
                >
                  {d.hodnota}
                </span>
              </span>
            </Napoveda>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- rozcestník ---------------- */

export interface Rozcestnik {
  href: string;
  nazev: string;
  popis: string;
  ikona: NazevIkony;
  odznak?: string;
  ton?: "modra" | "zelena" | "pisek" | "slez" | "noc";
}

// Barva textu je uvedená vždy: světlé karty stojí i na tmavé sekci,
// kde by jinak zdědily světlé písmo a zmizely.
const POZADI: Record<string, string> = {
  modra: "border-[#cddcf7] bg-mycka text-inkoust hover:border-[#a9c4f2]",
  zelena: "border-[#c9e3d4] bg-list text-inkoust hover:border-[#a8d1bd]",
  pisek: "border-[#e3d8bd] bg-pisek text-inkoust hover:border-[#d2c19b]",
  slez: "border-[#dcd7f0] bg-slez text-inkoust hover:border-[#c3bce6]",
  noc: "border-white/12 bg-noc2 text-noc-text hover:border-white/25",
};

export function RozcestnikMrizka({ polozky }: { polozky: Rozcestnik[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {polozky.map((p) => {
        const noc = p.ton === "noc";
        return (
          <li key={p.href}>
            <Link
              href={p.href}
              className={`zdvih flex h-full flex-col rounded-[20px] border p-5 sm:p-6 ${
                POZADI[p.ton ?? "modra"]
              }`}
            >
              <span className="mb-5 flex items-start justify-between gap-3">
                <span
                  className={`grid h-[40px] w-[40px] place-items-center rounded-[14px] border ${
                    noc ? "border-white/15 bg-white/5" : "border-white/70 bg-white/70"
                  }`}
                >
                  <Ikona nazev={p.ikona} velikost={19} />
                </span>
                {p.odznak && (
                  <span
                    className={`stitek-tmavy rounded-full border px-2.5 py-1 ${
                      noc ? "border-white/20 text-noc-tlum" : "border-white/80 bg-white/60 text-tlum"
                    }`}
                  >
                    {p.odznak}
                  </span>
                )}
              </span>
              <span className="text-[17px] font-semibold tracking-[-0.025em]">{p.nazev}</span>
              <span
                className={`mt-1.5 text-[13px] leading-snug ${noc ? "text-noc-tlum" : "text-tlum"}`}
              >
                {p.popis}
              </span>
              <span
                className={`mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium ${
                  noc ? "text-noc-text" : "text-inkoust"
                }`}
              >
                Otevřít
                <Ikona nazev="nahoru" velikost={12} tah={1.9} trida="rotate-90" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- pás čísel ---------------- */

export function PasCisel({
  polozky,
}: {
  polozky: { stitek: string; hodnota: string | number; ikona: NazevIkony; tlumene?: boolean }[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {polozky.map((p) => (
        <li key={p.stitek} className="rounded-[20px] border border-linka bg-plocha p-5 sm:p-6">
          <span className="mb-4 flex items-center gap-2 text-tlum2">
            <Ikona nazev={p.ikona} velikost={14} />
            <span className="stitek">{p.stitek}</span>
          </span>
          <span
            className={`velke-cislo block text-[38px] sm:text-[46px] ${
              p.tlumene ? "text-tlum2" : "text-inkoust"
            }`}
          >
            {p.hodnota}
          </span>
        </li>
      ))}
    </ul>
  );
}
