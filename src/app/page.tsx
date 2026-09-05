import Link from "next/link";
import { SituacniPanel } from "@/components/hero";
import { Ikona } from "@/components/ikony";
import { OdberPanel } from "@/components/odber";
import { Mrizka, Panel } from "@/components/panel";
import { WatchlistPanel } from "@/components/panely";
import { KdoZaTimStoji } from "@/components/puvodce";
import { GrafMesicu, GrafTrendu, TabulkaTydnu } from "@/components/trend";
import { Zaznamy } from "@/components/zaznamy";
import { SeznamZdroju } from "@/components/zdroje";
import { DopadPoZemich } from "@/components/zeme";
import {
  celkovyStav, hybridniTlak, incidenty, mesice, nato, nepotvrzene,
  posledniOvereni, pravniStav, tlakCr, tydny, urovenObcanu, watchlist,
} from "@/lib/data";

const odkaz =
  "rounded-full border border-linka px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] transition-colors hover:border-akcent";

/**
 * Pořadí: hero → záznamy → kde a kdo → vývoj po týdnech → týdenní přehled
 * → vývoj v čase s posuvníkem → odběr a zdroje. Co platí a neplatí je
 * v liště pod menu; spouštěče eskalace jsou v hero pod tlačítkem.
 */
export default function Prehled() {
  const stav = celkovyStav();
  const vse = incidenty();
  const tydenni = tydny();
  const rok = new Date().getUTCFullYear();

  return (
    <>
      <SituacniPanel
        stav={stav}
        hybridni={hybridniTlak()}
        tlakCr={tlakCr()}
        obcane={urovenObcanu()}
        posledni={vse.filter((i) => !i.historicky).slice(0, 4)}
        overeno={posledniOvereni()}
        pocetZaznamu={vse.length}
        watchlist={<WatchlistPanel watchlist={watchlist()} kompaktni />}
      />

      <Mrizka>
        <Panel
          id="udalosti"
          kod="Záznamy"
          ikona="oko"
          nadpis="Ověřené, nepotvrzené i vyvrácené záznamy od roku 2014"
          popis="Jedna osa, deset nejnovějších. U každého řádku zvlášť, jak je potvrzená informace, pachatel a zdroj."
          akce={<Link href="/udalosti/" className={odkaz}>Samostatně</Link>}
          holy
        >
          <Zaznamy incidenty={vse} neprosle={nepotvrzene()} />
        </Panel>

        <Panel
          id="zeme"
          kod="Kde"
          ikona="mapa"
          nadpis="Kde se to děje a kolik"
          popis={`Letošní záznamy (${rok}). Česko je vždy první — i když tam nic není. Činy a prohlášení se počítají zvlášť.`}
          sirka="dve-tretiny"
          holy
        >
          <DopadPoZemich />
        </Panel>

        <Panel
          kod="Kdo"
          ikona="lupa"
          nadpis="Kdo za tím stojí"
          popis={`Letos (${rok}). Jen činy. Jeden případ = jeden čin, i když má víc záznamů.`}
          sirka="tretina"
          holy
        >
          <KdoZaTimStoji />
        </Panel>

        <Panel kod="Letos po týdnech" ikona="graf" nadpis="Vývoj po týdnech" popis="Od začátku roku. Bez dat = bez dat." sirka="dve-tretiny" holy>
          <GrafTrendu tydny={tydenni} />
        </Panel>

        <Panel kod="Od roku 2010" ikona="graf" nadpis="Vývoj po měsících" popis="Sloupce = hodnocení (od 7/2026). Tečky = počet záznamů v měsíci." sirka="tretina" holy>
          <GrafMesicu mesice={mesice().mesice} />
        </Panel>

        <Panel kod="Týdny" ikona="osa" nadpis="Týdenní přehled" popis="Vykřičník = zvýšený počet signálů. Tři jsou maximum." holy>
          <TabulkaTydnu tydny={tydenni} />
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
