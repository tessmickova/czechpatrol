"use client";

import Link from "next/link";
import type { StavObcanu } from "@/lib/data";
import { kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { NAZVY_HROZEB, type PripravitTed as DataPripravy } from "@/lib/priprava";
import type { Pulz } from "@/lib/pulz";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, Kampan, Kandidat, Overovana, Uroven } from "@/lib/typy";
import { casPraha } from "@/lib/cas";
import { useT } from "@/lib/i18n";
import { BUY_ME_A_COFFEE_URL, HEROHERO_URL } from "@/config/web";
import { PIZZA_INDEX, VEN } from "@/config/odkazy-ven";
import { popisCasu, stavPizzy } from "@/lib/pizza";
import { Ikona } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Cara, poDnech, Sloupky } from "./mikrograf";
import { Tlacitko } from "./ui";
import { stavNalehavosti } from "./urgentni";
import { HlavickaWidgetu, IkonaKruh } from "./widgety";
import { Napoveda, VykladUrovne } from "./zaklad";
import { MimoradnySignalPoznamka } from "./mimoradny-signal";
import { sklon } from "./zeme";

/*
  Postranní sloupec úvodu (24. 9. 2026, podle zadání): situace teď, tlačítka
  k připravenosti, malý souhrn situace a podpora. Každý ukazatel nese stav,
  pohyb (mikrograf) a období, ať je vidět, že web měří i v klidu.
*/
function seskup(hodnoty: number[], kusu: number): number[] {
  const out: number[] = [];
  const velikost = Math.ceil(hodnoty.length / kusu);
  for (let i = 0; i < hodnoty.length; i += velikost) out.push(hodnoty.slice(i, i + velikost).reduce((a, b) => a + b, 0));
  return out;
}

function Maly({ nadpis, obdobi, uroven, slovo, neutralni, popis, dodatek, graf }: { nadpis: string; obdobi: string; uroven: Uroven | null; slovo?: string; neutralni?: boolean; popis?: string; dodatek?: string; graf?: React.ReactNode }) {
  const pasmo = uroven && !neutralni ? PASMA[UROVNE[uroven].pasmo] : null;
  return (
    <Napoveda cele plna popis={<span className="block">{popis && <span className="mb-1.5 block text-inkoust">{popis}</span>}{uroven && !neutralni ? <VykladUrovne uroven={uroven} /> : null}{dodatek && <span className="mt-1.5 block text-tlum2">{dodatek}</span>}</span>}>
      <span className="flex h-full w-full flex-col rounded-[14px] bg-plocha2/60 px-3 py-2.5 text-left">
        <span className="whitespace-nowrap text-mikro font-semibold text-tlum">{nadpis} <span className="font-normal text-tlum2">· {obdobi}</span></span>
        <span className="mt-1.5 flex items-center gap-2">
          <span aria-hidden className={`h-[8px] w-[8px] shrink-0 rounded-full ${pasmo ? pasmo.tecka : neutralni ? "bg-tlum2" : "bg-klid"}`} />
          <span className={`text-zaklad font-bold leading-tight ${pasmo ? pasmo.text : neutralni ? "text-tlum" : "text-klid-text"}`}>{slovo ?? (uroven ? UROVNE[uroven].nazev : "Bez záznamu")}</span>
        </span>
        {graf && <span className="mt-auto flex min-h-[22px] items-end justify-between gap-2 pt-1.5 text-mikro text-tlum2">{graf}</span>}
      </span>
    </Napoveda>
  );
}

export function SidebarUvodu({ stav, cr, crHistoricky, crPocet, obcane, pulz, priprava, vse, kampane, kandidati, zkontrolovano, overovane = [], ted, tipy }: {
  stav: CelkovyStav; cr: Uroven | null; crHistoricky: Uroven | null; crPocet: { pripadu: number; kampani: number }; obcane: StavObcanu;
  pulz?: Pulz; priprava?: DataPripravy; vse: Zaznam[]; kampane: Kampan[]; kandidati: Kandidat[]; zkontrolovano: string | null; overovane?: Overovana[]; ted: number; /** Box Tipy k přípravě — stojí před „AI radí“ (24. 9. 2026). */ tipy?: React.ReactNode;
}) {
  /* Naléhavé zprávy chytá sběr, tak se čerstvost měří jeho posledním průchodem, ne ručním ověřením. */
  const kontrola = pulz?.kdy ?? zkontrolovano;
  const nal = stavNalehavosti(kandidati, kontrola, ted);
  const t = useT();
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const pasmo = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  const casy = [...vse.filter((z) => (z.druh ?? "pripad") === "pripad").map((z) => kdyZjisteno(z)), ...kampane.map((k) => k.odhaleno)];
  const casyCz = [...vse.filter((z) => (z.druh ?? "pripad") === "pripad" && z.kodZeme === "CZ").map((z) => kdyZjisteno(z)), ...kampane.filter((k) => k.kodyZemi.includes("CZ")).map((k) => k.odhaleno)];
  const d90 = poDnech(casy, 90, ted);
  const d14 = d90.slice(-14);
  const soucet = (n: number) => d90.slice(-n).reduce((a, b) => a + b, 0);
  const cz90 = poDnech(casyCz, 90, ted);
  const crPopis = cr
    ? [crPocet.pripadu ? `${crPocet.pripadu} ${sklon(crPocet.pripadu, "případ", "případy", "případů")}` : null, crPocet.kampani ? `${crPocet.kampani} ${sklon(crPocet.kampani, "operace proti občanům", "operace proti občanům", "operací proti občanům")}` : null].filter(Boolean).join(" a ")
    : "ani jeden případ za 90 dní";
  const podpora = BUY_ME_A_COFFEE_URL || HEROHERO_URL;
  const pizza = stavPizzy(undefined, ted);

  return (
    <aside aria-label="Stav a příprava" className="space-y-4">
      {/* Podpora a odběr — první, bez rámečku, zarovnané s kartami pod tím (24. 9. 2026). */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <Tlacitko kam="/odber/" varianta="obrys" velikost="s" ikona="zvonek">Upozornění</Tlacitko>
        {BUY_ME_A_COFFEE_URL && <Tlacitko kam={BUY_ME_A_COFFEE_URL} nove varianta="obrys" velikost="s" ikona="kava">Buy me a coffee</Tlacitko>}
        {HEROHERO_URL && <Tlacitko kam={HEROHERO_URL} nove varianta="obrys" velikost="s" ikona="srdce">Herohero</Tlacitko>}
        {!podpora && <Tlacitko kam="/podporit/" varianta="obrys" velikost="s" ikona="kava">Podpořit provoz</Tlacitko>}
      </div>

      {/*
        Souhrn situace a Právě ověřujeme vedle sebe (24. 9. 2026). 26. 9.: stejná
        stavba i výška — nadpis nahoře na jedné lince, text pod ním na nejvýš tři
        řádky; tón nese rámeček, ne různé rozložení.
      */}
      <div className="grid grid-cols-2 gap-3">
        <Napoveda cele plna popis={<span className="block">{nal.dodatek && <span className="mb-1.5 block text-inkoust">{nal.dodatek}</span>}{pulz && <span className="block text-tlum2">Za 24 h: {pulz.zachyceno24} zachyceno, {pulz.overeno24} ověřeno, {pulz.zdrojuOk} z {pulz.zdrojuCelkem} zdrojů odpovědělo.</span>}{kontrola && <span className="mt-1.5 block text-tlum2">Zdroje čteny {casPraha(kontrola)}.</span>}</span>}>
          <span role="status" aria-label="Souhrn situace" className={`flex h-full min-h-[118px] w-full flex-col rounded-[22px] border px-3.5 py-3 text-left ${nal.ton === "deje" ? "border-akcent/70 bg-akcent/[0.05]" : "border-linka bg-plocha2/40"}`}>
            <span className="flex min-h-[34px] items-center gap-2"><IkonaKruh ikona="info" velikost="s" /><span className="nadpis-boxu leading-tight">Souhrn situace</span></span>
            <span className="mt-2 line-clamp-3 text-male font-bold leading-snug text-inkoust">{nal.text}</span>
          </span>
        </Napoveda>
        <Napoveda cele plna popis={overovane.length ? <span className="block">{overovane.slice(0, 3).map((o) => <span key={o.slug} className="mb-1.5 block"><b className="font-semibold text-inkoust">{o.kratce ?? o.coSeHlasi}</b><span className="block">{o.coSeHlasi}</span>{o.coRikajiUrady[0] && <span className="block text-tlum2">Úřady: {o.coRikajiUrady[0]}</span>}</span>)}<span className="block text-tlum2">Nepotvrzené zprávy. Do počtů ani hodnocení nevstupují.</span></span> : <span className="block">Žádná zpráva teď nečeká na posouzení.</span>}>
          <span aria-label="Právě ověřujeme" className="flex h-full min-h-[118px] w-full flex-col rounded-[22px] border border-dashed border-jantar/55 bg-jantar/[0.06] px-3.5 py-3 text-left">
            <span className="flex min-h-[34px] items-center gap-2"><IkonaKruh ikona="otaznik" velikost="s" /><span className="nadpis-boxu min-w-0 flex-1 leading-tight">Právě ověřujeme</span><span className="cislice text-tlum2">{overovane.length}</span></span>
            <span className="mt-2 line-clamp-3 text-male font-bold leading-snug text-inkoust">{overovane[0] ? overovane[0].kratce ?? overovane[0].coSeHlasi : "Nic v hodnocení"}</span>
          </span>
        </Napoveda>
      </div>

      {/* Situace teď */}
      <section className="overflow-hidden rounded-[22px] bg-plocha">
        <HlavickaWidgetu ikona="radar" nazev="Situace teď" meta={<span className="cislice">{soucet(14)} {sklon(soucet(14), "případ", "případy", "případů")} za 14 dní</span>} />
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-[14px] bg-plocha2/60 px-3 py-2.5">
            <Napoveda popis={stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">{t("Hodnocení zatím nebylo stanoveno.")}</span>}>
              <span className="block"><ObloukovyMerak uroven={stav.uroven} naNoci velikost={112} skrytPopisek /></span>
            </Napoveda>
            <div className="min-w-0 flex-1">
              <div className="whitespace-nowrap text-mikro font-semibold text-tlum">{t("Evropa · dnes")}</div>
              <p className={`text-velke font-bold leading-tight [overflow-wrap:normal] ${pasmo ? pasmo.text : "text-tlum"}`}>{d ? d.nazev : "Nestanoveno"}</p>
              <p className="mt-0.5 flex items-center gap-1 text-mikro font-semibold text-tlum">
                {stav.trend === "nahoru" && <><span className="text-stari"><Ikona nazev="nahoru" velikost={11} tah={2.2} /></span>{t("zhoršení za 7 dní")}</>}
                {stav.trend === "dolu" && !stav.mimoradny && <><span className="text-klid"><Ikona nazev="dolu" velikost={11} tah={2.2} /></span>{t("zlepšení za 7 dní")}</>}
                {stav.trend === "beze-zmeny" && <span className="text-tlum2">{t("beze změny 7 dní")}</span>}
              </p>
              <div className={`mt-1.5 ${pasmo ? pasmo.text : "text-tlum"}`}><Cara hodnoty={d14} sirka={120} vyska={24} popis={`Případy po dnech za 14 dní: ${d14.join(", ")}`} /></div>
            </div>
          </div>
          <MimoradnySignalPoznamka stav={stav} className="mt-2" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Maly nadpis={t("Česko")} obdobi="90 dní" uroven={cr} slovo={cr ? undefined : "Bez záznamu"} neutralni={!cr} popis={crPopis} dodatek={crHistoricky ? `Nejvýš od roku 2014: ${UROVNE[crHistoricky].nazev.toLowerCase()}.` : undefined}
              graf={<><span className="text-tlum"><Sloupky hodnoty={seskup(cz90, 12)} sirka={56} vyska={18} popis="Případy v Česku po týdnech" /></span><span>{cz90.reduce((a, b) => a + b, 0)} za 90 dní</span></>} />
            <Maly nadpis={t("Běžný život")} obdobi="teď" uroven={obcane.uroven} slovo={obcane.slovo} neutralni={obcane.neutralni} popis={obcane.popis}
              graf={<span>{obcane.neovereno ? `${obcane.neovereno} bez údaje` : "orientační kontrola"}</span>} />
          </div>
          {/* Čísla v jednom pruhu, ne čtyři krabičky (26. 9. 2026). */}
          <div className="mt-3 grid grid-cols-4 divide-x divide-linka/60 rounded-[14px] bg-plocha2/60 py-2 max-lg:hidden">
            {[["dnes", soucet(1)], ["7 dní", soucet(7)], ["30 dní", soucet(30)], ["90 dní", soucet(90)]].map(([n, v]) => (
              <span key={n} className="text-center">
                <span className="cislice block text-zaklad font-bold leading-none text-inkoust">{v}</span>
                <span className="mt-1 block text-mikro text-tlum2">{n}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 px-1 text-mikro text-tlum2 max-lg:hidden">Případy a operace proti občanům v Evropě. <Link href="/metodika/" className="odkaz">Jak se hodnotí</Link>.</p>
        </div>
      </section>

      {/* Pizza index ve vlastním boxu pod Situací teď — kuriozita, ne součást našeho měření (26. 9. 2026). */}
      <section aria-label="Pizza index" className="flex items-center justify-between gap-3 rounded-[22px] bg-plocha px-4 py-3 text-male">
        <Napoveda popis={<span className="block">{PIZZA_INDEX.popis}<span className="mt-1.5 block text-tlum2">{pizza.uroven ? `Stupeň ${pizza.uroven} z 5 na jejich stupnici (5 je nejnižší)${pizza.popis ? `, „${pizza.popis}“` : ""}. ` : "Aktuální hodnotu teď nemáme. "}{popisCasu(pizza, ted)}</span></span>} label="Co je Pizza index" nahoru>
          <span className="inline-flex cursor-help items-center gap-2 text-inkoust">
            <Ikona nazev="pizza" velikost={17} tah={1.8} />
            <span className="font-semibold underline decoration-dotted underline-offset-4">Pizza index</span>
          </span>
        </Napoveda>
        <span className="flex items-center gap-3">
          {/* Jedno slovo stavu; bez čerstvého údaje „nezjištěno“, nikdy domyšlený klid. */}
          <span className={`rounded-full border px-2 py-0.5 text-mikro ${pizza.aktualni ? "border-linka text-inkoust" : "border-dashed border-linka text-tlum2"}`}>{pizza.slovo}{pizza.uroven ? ` · ${pizza.uroven}/5` : ""}</span>
          <a href={PIZZA_INDEX.url} target="_blank" rel={VEN} className="odkaz text-mikro">otevřít ↗</a>
        </span>
      </section>

      {/* Tipy jen na počítači: na mobilu je to další box navíc. */}
      {tipy && <div className="max-lg:hidden">{tipy}</div>}

      {/* Připravenost */}
      <section className="overflow-hidden rounded-[22px] bg-plocha">
        <HlavickaWidgetu ikona="stit" nazev="AI radí dle aktuální situace" napoveda={<span className="block">Tři věci pro domácnost, které AI vybírá podle tlaku doložených událostí za 30 dní, narušených služeb a platných opatření. Není to předpověď ani úřední doporučení.</span>} />
        {priprava && priprava.polozky.length > 0 && (
          <ol>
            {priprava.polozky.map((p, i) => (
              <li key={p.klic}>
                <Link href={`/odolnost/?seznam=${p.seznam}&zvyrazni=${p.klic}`} className="group flex items-start gap-3 px-4 py-2.5 hover:bg-plocha2">
                  <span className="cislice mt-[1px] text-velke font-bold leading-none text-tlum">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-male font-bold leading-snug text-inkoust">{p.nazev}</span>
                    <span className="block text-mikro text-tlum2">{NAZVY_HROZEB[p.hrozba]}</span>
                  </span>
                  <Ikona nazev="nahoru" velikost={12} tah={2} trida="mt-1 shrink-0 rotate-90 text-tlum2 group-hover:text-akcent" />
                </Link>
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap gap-2 px-4 pb-4 pt-2">
          <Tlacitko kam="/pripravenost/" varianta="plny" velikost="s" ikona="stit">Projít průvodce</Tlacitko>
          <Tlacitko kam="/odolnost/" varianta="obrys" velikost="s" ikona="terc">Kalkulačka odolnosti</Tlacitko>
        </div>
      </section>

    </aside>
  );
}
