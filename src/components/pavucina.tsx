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
    Poznámka u osy se píše jen tam, kde se liší od ostatních.

    U karty jedné země je u pěti os tatáž věta („Podle zveřejněných záznamů
    se zemí DE.") a u šesté jiná. Počítat jen různost nestačilo: dvě různé
    věty zapnuly výpis u všech šesti a pětkrát pod sebou stálo totéž. Bere
    se proto nejčastější věta jako pozadí a vypíše se jen to, co se z něj
    vymyká — u karty Evropy se liší všechny, takže se vypíšou všechny.
  */
  const cetnost = new Map<string, number>();
  for (const o of tlak.podkategorie) {
    if (o.poznamka) cetnost.set(o.poznamka, (cetnost.get(o.poznamka) ?? 0) + 1);
  }
  const nejcastejsi = [...cetnost.entries()].sort((a, b) => b[1] - a[1])[0];
  const pozadi = nejcastejsi && nejcastejsi[1] > 1 ? nejcastejsi[0] : null;
  return (
    <ul className="mt-2 grid gap-1.5">
      {tlak.podkategorie.map((o) => {
        const u = o.uroven ? UROVNE[o.uroven] : null;
        const t = o.uroven ? PASMA[UROVNE[o.uroven].pasmo] : null;
        return (
          <li key={o.klic}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-male text-tlum">{o.nazev}</span>
              <span className={`shrink-0 text-drobne font-semibold ${t ? t.text : "text-tlum2"}`}>
                {u ? u.nazev : "bez záznamu"}
              </span>
            </span>
            <span className="mt-1 block"><Pruh uroven={o.uroven} /></span>
            {o.poznamka && o.poznamka !== pozadi && (
              <span className="mt-0.5 block text-drobne leading-snug text-tlum2">{o.poznamka}</span>
            )}
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
  velikostObrazce = 150,
  sPopisky = false,
}: {
  nadpis: string;
  popis: string;
  tlak: HybridniTlak;
  odkaz?: { href: string; text: string };
  /** Vlajka před názvem. */
  vlajka?: React.ReactNode;
  /**
   * Velikost obrazce a popisky os. Výchozí je malý bez popisků — pro stránku
   * země, kde názvy stojí v rozpisu pod ním. Na přehledu je pavučina jediná
   * a velká, tam popisky dávají smysl.
   */
  velikostObrazce?: number;
  sPopisky?: boolean;
}) {
  return (
    /*
      Minimalistická karta: bez rámečku a bez výplně, jen vlasová linka vlevo
      od obsahu by byla příliš. Karet je v karuselu třináct a třináct
      orámovaných desek vedle sebe je mřížka, ne přehled.
    */
    <section aria-label={nadpis} className="h-full rounded-[22px] bg-plocha p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-vetsi font-bold leading-tight flex flex-wrap items-center gap-x-2 gap-y-1">
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

        Obrazec je bez popisků os. Popisky se nezmenšují s grafem, takže
        v úzké kartě karuselu zbylo z „Infrastruktura" jen „rastruktura" —
        a hlavně: tytéž názvy stojí hned pod obrazcem v rozpisu, každý
        i s úrovní slovy. Dvakrát totéž, z toho jednou ořezaně.
      */}
      <div className="mt-2">
        <div className="flex justify-center">
          <RadarTlaku tlak={tlak} velikost={velikostObrazce} okraj={sPopisky ? 40 : 18} bezPopisku={!sPopisky} />
        </div>
        <Rozpis tlak={tlak} />
      </div>
    </section>
  );
}
