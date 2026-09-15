import { RadarTlaku } from "./mericky";
import { PASMA, UROVNE, zDeseti } from "@/lib/skala";
import type { HybridniTlak } from "@/lib/typy";
import { Tlacitko } from "./ui";
import { Otaznik } from "./zaklad";

/*
  Typy evidovaných událostí.

  Pavučina vedle rozpisu. Obrazec ukáže na jeden pohled, kde je tlak vychýlený;
  rozpis pod ním nese tytéž hodnoty slovy a v pruzích.

  Proč obojí, a ne jen obrazec: plocha polygonu svádí ke čtení „celkové míry
  hrozby", ale osy nejsou jedna měřitelná veličina a překrývají se — sabotáž
  bývá zároveň útokem na infrastrukturu. Pořadí os navíc mění tvar obrazce,
  aniž by se změnila data. Rozpis tuhle vadu nemá a zároveň je to jediná
  podoba, kterou přečte čtečka obrazovky.

  Kategorie bez záznamu zůstane prázdná — nic se nedopočítává a prázdno se
  nespojuje jako naměřená nula.
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
  /*
    Poznámka u osy se píše jen tehdy, když se řádky liší. U karty jedné země
    je u všech šesti os stejná věta („Podle zveřejněných záznamů se zemí DE.")
    a šestkrát pod sebou je to jen šum — totéž stojí v puntíku u nadpisu.
  */
  const poznamky = new Set(tlak.podkategorie.map((o) => o.poznamka).filter(Boolean));
  const ukazatPoznamky = poznamky.size > 1;
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
            {ukazatPoznamky && o.poznamka && <span className="mt-0.5 block text-[12.5px] leading-snug text-tlum2">{o.poznamka}</span>}
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
  vlajka,
}: {
  nadpis: string;
  popis: string;
  tlak: HybridniTlak;
  odkaz?: { href: string; text: string };
  /** Vlajka před názvem — jen v karuselu zemí. */
  vlajka?: React.ReactNode;
}) {
  return (
    <section aria-label={nadpis} className="h-full rounded-[22px] border border-linka2 bg-plocha p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="titul-mensi flex flex-wrap items-center gap-x-2 gap-y-1">
          {vlajka}
          {nadpis}
          {popis && <Otaznik popis={popis} label="Co graf ukazuje" />}
        </h3>
        {odkaz && (
          <Tlacitko kam={odkaz.href} varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">{odkaz.text}</Tlacitko>
        )}
      </div>
      {/*
        Obrazec nad rozpisem, ne vedle něj. Vedle sebe se v půlce dvousloupcové
        mřížky obojí zmáčklo: popisky os se ořezávaly a názvy kategorií se
        lámaly po slabikách. Nad sebou má každé plnou šířku.
      */}
      <div className="mt-3">
        <div className="flex justify-center"><RadarTlaku tlak={tlak} velikost={210} okraj={52} /></div>
        <Rozpis tlak={tlak} />
      </div>
    </section>
  );
}
