import { PASMA, UROVNE, zDeseti } from "@/lib/skala";
import type { HybridniTlak } from "@/lib/typy";
import { Tlacitko } from "./ui";

/*
  Typy evidovaných událostí.

  Byl to radarový polygon. Vypadal chytře, ale říkal něco, co není pravda:
  plocha obrazce svádí ke čtení „celkové míry hrozby", přestože osy nejsou
  jedna měřitelná veličina a překrývají se (sabotáž bývá zároveň útok na
  infrastrukturu). Pořadí os přitom tvar obrazce mění, aniž by se změnila data.

  Pruhy tuhle vadu nemají: každý řádek stojí sám za sebe, dá se přečíst
  i ve screen readeru a v tabulce vedle. Kategorie bez záznamu zůstane
  prázdná — nic se nedopočítává a prázdno se nespojuje jako naměřená nula.
*/

/** Délka pruhu. Slovní úroveň zůstává hlavním sdělením, pruh je jen odhad velikosti. */
function Pruh({ uroven }: { uroven: HybridniTlak["podkategorie"][number]["uroven"] }) {
  const t = uroven ? PASMA[UROVNE[uroven].pasmo] : null;
  const podil = uroven ? (zDeseti(uroven) / 10) * 100 : 0;
  return (
    <span aria-hidden className="block h-[6px] w-full overflow-hidden rounded-full bg-linka2">
      <span className={`block h-full rounded-full ${t ? t.tecka : "bg-linka"}`} style={{ width: `${podil}%` }} />
    </span>
  );
}

function Rozpis({ tlak }: { tlak: HybridniTlak }) {
  return (
    <ul className="mt-3 grid gap-2.5">
      {tlak.podkategorie.map((o) => {
        const u = o.uroven ? UROVNE[o.uroven] : null;
        const t = o.uroven ? PASMA[UROVNE[o.uroven].pasmo] : null;
        return (
          <li key={o.klic}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] text-tlum">{o.nazev}</span>
              <span className={`shrink-0 text-[13px] font-semibold ${t ? t.text : "text-tlum2"}`}>
                {u ? u.nazev : "bez záznamu"}
              </span>
            </span>
            <span className="mt-1 block"><Pruh uroven={o.uroven} /></span>
            {o.poznamka && <span className="mt-0.5 block text-[12.5px] leading-snug text-tlum2">{o.poznamka}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function PavucinaHrozeb({
  nadpis,
  popis,
  tlak,
  odkaz,
}: {
  nadpis: string;
  popis: string;
  tlak: HybridniTlak;
  odkaz?: { href: string; text: string };
}) {
  return (
    <section aria-label={nadpis} className="rounded-[22px] border border-linka2 bg-plocha p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="titul-mensi">{nadpis}</h3>
        {odkaz && (
          <Tlacitko kam={odkaz.href} varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{odkaz.text}</Tlacitko>
        )}
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-tlum">{popis}</p>
      <Rozpis tlak={tlak} />
    </section>
  );
}
