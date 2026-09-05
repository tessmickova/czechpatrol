import Link from "next/link";
import { SituacniPanel } from "@/components/hero";
import { Ikona } from "@/components/ikony";
import { OdberPanel } from "@/components/odber";
import { Mrizka, Panel } from "@/components/panel";
import { WatchlistPanel } from "@/components/panely";
import { CasovyPosuvnik } from "@/components/posuvnik";
import { KdoZaTimStoji } from "@/components/puvodce";
import { GrafMesicu, GrafTrendu, TabulkaTydnu } from "@/components/trend";
import { Zaznamy } from "@/components/zaznamy";
import { SeznamZdroju } from "@/components/zdroje";
import { DopadPoZemich } from "@/components/zeme";
import {
  archiv, celkovyStav, dnyBezZmeny, hybridniTlak, incidenty, mesice, nato, nepotvrzene,
  posledniOvereni, pravniStav, tlakCr, tydny, watchlist,
} from "@/lib/data";

const odkaz =
  "rounded-full border border-linka px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors hover:border-akcent";

/**
 * Hlavní stránka je jedna konzole. Co platí a neplatí, je v liště pod menu;
 * tady je úroveň, co ji může změnit, dopad po zemích, kdo za činy stojí,
 * vývoj v čase a záznamy. Nic není dvakrát.
 */
export default function Prehled() {
  const stav = celkovyStav();
  const vse = incidenty();
  const tydenni = tydny();

  return (
    <>
      <SituacniPanel
        stav={stav}
        hybridni={hybridniTlak()}
        tlakCr={tlakCr()}
        dnyBezZmeny={dnyBezZmeny()}
        overeno={posledniOvereni()}
        pocetZaznamu={vse.length}
      />

      <Mrizka>
        <Panel
          kod="Sledujeme"
          ikona="terc"
          nadpis="Co může hodnocení změnit"
          popis="Konkrétní kroky institucí — nahoru i dolů. Nic z toho nenastává automaticky."
        >
          <WatchlistPanel watchlist={watchlist()} kompaktni />
        </Panel>

        <Panel
          id="zeme"
          kod="Dopad po zemích"
          ikona="mapa"
          nadpis="Kde se to děje a kolik"
          popis={`Letošní záznamy (${new Date().getUTCFullYear()}). Česko je vždy první — i když tam nic není. Starší roky jsou na ose níže.`}
          sirka="dve-tretiny"
        >
          <DopadPoZemich />
        </Panel>

        <Panel
          kod="Původce"
          ikona="lupa"
          nadpis="Kdo za tím stojí"
          popis="Letos. Rusko, Ukrajina, jiný stát, domácí pachatel, neznámý — jen činy, jen potvrzené počty."
          sirka="tretina"
        >
          <KdoZaTimStoji />
        </Panel>

        <Panel
          id="vyvoj"
          kod="Vývoj v čase"
          ikona="hodiny"
          nadpis="Jak se situace vyvíjela"
          popis="Přehrajte si den po dni, co web tvrdil. Ukazují se jen dny, kdy se něco změnilo."
        >
          <CasovyPosuvnik archiv={archiv()} />
        </Panel>

        <Panel kod="Letos po týdnech" ikona="graf" nadpis="Vývoj po týdnech" popis="Od začátku roku. Bez dat = bez dat." sirka="dve-tretiny">
          <GrafTrendu tydny={tydenni} />
        </Panel>

        <Panel kod="Od roku 2010" ikona="graf" nadpis="Vývoj po měsících" popis="Sloupce = hodnocení (od 7/2026). Tečky = počet záznamů v měsíci. Bez dat je bez dat." sirka="tretina">
          <GrafMesicu mesice={mesice().mesice} />
        </Panel>

        <Panel kod="Týdny" ikona="osa" nadpis="Týdenní přehled" popis="Vykřičník = zvýšený počet signálů. Tři jsou maximum.">
          <TabulkaTydnu tydny={tydenni} />
        </Panel>

        <Panel
          id="udalosti"
          kod="Záznamy"
          ikona="oko"
          nadpis="Záznamy od roku 2014: ověřené, nepotvrzené i vyvrácené"
          popis="Jedna osa. U každého řádku zvlášť, jak je potvrzená informace a jak pachatel. Roky 2010–2013 nemají v tomto rámci žádný záznam."
          akce={<Link href="/udalosti/" className={odkaz}>Samostatně</Link>}
        >
          <Zaznamy incidenty={vse} neprosle={nepotvrzene()} />
        </Panel>

        <Panel id="odber" kod="Odběr" ikona="zvonek" nadpis="Dáme vědět, když se něco změní" sirka="dve-tretiny">
          <OdberPanel />
        </Panel>

        <Panel
          kod="Zdroje"
          ikona="dokument"
          nadpis="Odkud data pocházejí"
          popis="Přednost mají orgány, které věc samy oznámily."
          sirka="tretina"
          akce={<Link href="/metodika/" className={odkaz}>Metodika</Link>}
        >
          <div className="max-h-[300px] overflow-y-auto pr-1">
            <SeznamZdroju zdroje={[...pravniStav().polozky, ...nato().polozky].flatMap((p) => p.zdroje).slice(0, 12)} husty />
          </div>
          <Link href="/zdroje/" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-akcent hover:text-akcent-svetla">
            Všechny zdroje <Ikona nazev="nahoru" velikost={12} tah={2} trida="rotate-90" />
          </Link>
        </Panel>
      </Mrizka>
    </>
  );
}
