import { pripady } from "@/lib/agregace";
import { celkovyStav, incidenty, kampane, kandidati, overovaneAktivni, posledniOvereni, tipy as vsechnyTipy, tlakCr, urovenObcanu } from "@/lib/data";
import { odlehci } from "@/lib/odlehci";
import { pripravitTed } from "@/lib/priprava-ted";
import { pulz } from "@/lib/pulz";
import { UROVNE } from "@/lib/skala";
import type { Uroven } from "@/lib/typy";
import { MiniBox } from "./mini-box";
import { casyProPanel } from "@/lib/casy-panelu";
import { SidebarUvodu } from "./sidebar-uvodu";
import { TipyKPriprave } from "./tipy";

/*
  Postranní sloupec úvodu i pro ostatní stránky (24. 9. 2026, podle zadání):
  Manipulace, Země a Připravenost mají vpravo totéž, co úvod — podporu,
  souhrn situace, ověřované, situaci teď, tipy a „AI radí“. Tady se
  hodnoty spočítají na serveru stejně, jako je počítá úvod.
*/
export function SidebarWebu() {
  const ted = Date.now();
  const vse = incidenty().map(odlehci);
  const kamp = kampane();
  const dni90 = pripady(vse, { dni: 90, ted });
  const czKampane90 = kamp.filter((k) => k.kodyZemi.includes("CZ") && ted - new Date(k.odhaleno).getTime() <= 90 * 86_400_000);
  const czUrovne: Uroven[] = [...dni90.filter((i) => i.kodZeme === "CZ").map((i) => i.zavaznost), ...czKampane90.map((k) => k.zavaznost)];
  const cr: Uroven | null = czUrovne.length ? czUrovne.reduce((m, u) => (UROVNE[u].poradi > UROVNE[m].poradi ? u : m), czUrovne[0]) : null;
  const tipyNahled = vsechnyTipy(ted);
  return (
    <SidebarUvodu
      stav={celkovyStav()}
      cr={cr}
      crHistoricky={tlakCr().celkem}
      crPocet={{ pripadu: dni90.filter((i) => i.kodZeme === "CZ").length, kampani: czKampane90.length }}
      obcane={urovenObcanu()}
      pulz={pulz()}
      priprava={pripravitTed()}
      {...casyProPanel(vse, kamp)}
      kandidati={kandidati().filter((k) => k.naliehave || ted - new Date(k.publikovano ?? k.zachyceno).getTime() <= 72 * 3_600_000)}
      zkontrolovano={posledniOvereni()}
      overovane={overovaneAktivni()}
      ted={ted}
      tipy={<MiniBox nazev="Tipy k přípravě" ikona="fajfka" ton="klid" souhrn={tipyNahled.length ? tipyNahled[0].nadpis : "Zatím bez tipu"}><TipyKPriprave ted={ted} vnoreny /></MiniBox>}
    />
  );
}
