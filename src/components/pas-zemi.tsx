import Link from "next/link";
import { druh, kdyZjisteno, pripady, type Zaznam } from "@/lib/agregace";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Kampan, Uroven } from "@/lib/typy";
import { Ikona } from "./ikony";
import { sklon, Vlajka } from "./zeme";

/*
  Běžící pás zemí nahoře.

  Každá země: vlajka, počet incidentů za 90 dnů, barva podle nejvyšší
  závažnosti v tom období, vykřičníky podle počtu vysokých a vážných
  případů za 30 dnů (1 = aspoň jeden, 2 = aspoň dva, 3 = aspoň čtyři)
  a tři tečky = poslední tři záznamy. Pás se zastaví po najetí; při
  omezení pohybu stojí a jde rolovat prstem.

  Manipulační operace se počítají taky. Jinak by pás hlásil u Česka nulu
  ve chvíli, kdy o dva centimetry níž budík hlásí operaci proti občanům —
  a čtenář by nevěděl, čemu věřit.
*/

export function PasZemi({ vse, kampane = [], ted = Date.now() }: { vse: Zaznam[]; kampane?: Kampan[]; ted?: number }) {
  const dni90 = pripady(vse, { dni: 90, ted });
  const dni30 = pripady(vse, { dni: 30, ted });
  const kampane90 = kampane.filter((k) => ted - new Date(k.odhaleno).getTime() <= 90 * 86_400_000);
  const kody = [...new Set([...dni90.map((i) => i.kodZeme), ...kampane90.flatMap((k) => k.kodyZemi), "CZ"])];
  const zeme = kody.map((kod) => {
    const p = dni90.filter((i) => i.kodZeme === kod);
    const kp = kampane90.filter((k) => k.kodyZemi.includes(kod));
    const vysoke = dni30.filter((i) => i.kodZeme === kod && ["oranzova", "cervena"].includes(UROVNE[i.zavaznost].pasmo)).length;
    const urovne: Uroven[] = [...p.map((i) => i.zavaznost), ...kp.map((k) => k.zavaznost)];
    const nej = urovne.reduce<Uroven | null>((m, u) => (!m || UROVNE[u].poradi > UROVNE[m].poradi ? u : m), null);
    const posledni = vse.filter((i) => i.kodZeme === kod).sort((a, b) => kdyZjisteno(b).localeCompare(kdyZjisteno(a))).slice(0, 3);
    return {
      kod, nazev: kod === "CZ" ? "Česko" : p[0]?.zeme ?? vse.find((i) => i.kodZeme === kod)?.zeme ?? kod,
      pocet: p.length + kp.length, kampani: kp.length,
      vykricniky: vysoke >= 4 ? 3 : vysoke >= 2 ? 2 : vysoke >= 1 ? 1 : 0, nej, posledni,
    };
  }).sort((a, b) => (a.kod === "CZ" ? -1 : b.kod === "CZ" ? 1 : b.pocet - a.pocet));

  const polozky = (sufix: string) => zeme.map((z) => {
    const t = z.nej ? PASMA[UROVNE[z.nej].pasmo] : null;
    return (
      <Link
        key={`${z.kod}${sufix}`}
        href={`/zeme/${z.kod.toLowerCase()}/`}
        title={`${z.nazev}: ${z.pocet} ${sklon(z.pocet, "incident", "incidenty", "incidentů")} za 90 dnů${z.kampani ? ` (z toho ${z.kampani} ${sklon(z.kampani, "operace proti občanům", "operace proti občanům", "operací proti občanům")})` : ""}${z.nej ? `, nejvyšší závažnost ${UROVNE[z.nej].nazev}` : ""}`}
        className={`mx-1 inline-flex h-[34px] shrink-0 items-center gap-2 rounded-[12px] border px-2.5 text-[12.5px] hover:bg-plocha2 ${t ? `${t.ramecek} ${t.pozadi}` : "border-linka2 bg-plocha"}`}
      >
        <Vlajka kod={z.kod} />
        <span className="font-semibold text-inkoust">{z.nazev}</span>
        <span className={`cislice text-[14px] font-bold ${t ? t.text : "text-tlum2"}`}>{z.pocet}</span>
        {z.vykricniky > 0 && (
          <span aria-label={`${z.vykricniky === 3 ? "velmi vysoká" : z.vykricniky === 2 ? "vysoká" : "zvýšená"} aktivita`} className="flex gap-[1px] text-[#e8484f]">
            {Array.from({ length: z.vykricniky }, (_, i) => <Ikona key={i} nazev="vykricnik" velikost={12} tah={2.6} />)}
          </span>
        )}
        <span aria-hidden className="flex gap-[3px]">
          {[0, 1, 2].map((i) => {
            const z3 = z.posledni[i];
            if (!z3) return <span key={i} className="h-[6px] w-[6px] rounded-full border border-linka" />;
            const tt = PASMA[UROVNE[z3.zavaznost].pasmo];
            return <span key={i} className={`h-[6px] w-[6px] rounded-full ${druh(z3) === "pripad" ? tt.tecka : "border border-tlum2"}`} title={z3.kratkyTitulek || z3.titulek} />;
          })}
        </span>
      </Link>
    );
  });

  return (
    <div className="pas-obal border-b border-linka bg-papir" aria-label="Země za posledních 90 dnů">
      <div className="mx-auto flex max-w-[1280px] items-center">
        <span className="stitek hidden shrink-0 border-r border-linka2 px-3 py-2 sm:block">90 dnů</span>
        <div className="pas-scroll min-w-0 flex-1 overflow-x-auto py-1.5">
          <div className="pas-beh">
            {polozky("")}
            {/* druhá kopie jen kvůli plynulému běhu; čtečce se neoznamuje */}
            <span aria-hidden className="pas-kopie contents">{polozky("-2")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
