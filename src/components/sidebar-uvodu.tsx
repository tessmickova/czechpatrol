"use client";

import Link from "next/link";
import type { StavObcanu } from "@/lib/data";
import { NAZVY_HROZEB, type PripravitTed as DataPripravy } from "@/lib/priprava";
import type { Pulz } from "@/lib/pulz";
import { PASMA, UROVNE } from "@/lib/skala";
import type { CelkovyStav, Kandidat, Uroven } from "@/lib/typy";
import { casPraha, datumPraha } from "@/lib/cas";
import { useT } from "@/lib/i18n";
import { BUY_ME_A_COFFEE_URL, HEROHERO_URL, KANALY } from "@/config/web";
import { Ikona } from "./ikony";
import { ObloukovyMerak } from "./mericky";
import { Cara, poDnech, Sloupky } from "./mikrograf";
import { Tlacitko } from "./ui";
import { InternetBox } from "./internet-banner";
import { CoNaladitBox } from "./krizove-vysilani";
import type { SouhrnInternetu } from "@/lib/kyber-souhrn";
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

function Maly({ nadpis, obdobi, uroven, slovo, neutralni, popis, dodatek, navic, graf }: { nadpis: string; obdobi: string; uroven: Uroven | null; slovo?: string; neutralni?: boolean; popis?: string; dodatek?: string; /** Čím se ukazatel měří a na co dát pozor — jen v nápovědě. */ navic?: React.ReactNode; graf?: React.ReactNode }) {
  const pasmo = uroven && !neutralni ? PASMA[UROVNE[uroven].pasmo] : null;
  return (
    <Napoveda cele plna popis={<span className="block">{popis && <span className="mb-1.5 block text-inkoust">{popis}</span>}{uroven && !neutralni ? <VykladUrovne uroven={uroven} /> : null}{dodatek && <span className="mt-1.5 block text-tlum2">{dodatek}</span>}{navic}</span>}>
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

export function SidebarUvodu({ stav, cr, crHistoricky, crPocet, crKampane = [], internet, obcane, pulz, priprava, casy, casyCz, kandidati, zkontrolovano, ted, tipy }: {
  stav: CelkovyStav; cr: Uroven | null; crHistoricky: Uroven | null; crPocet: { pripadu: number; kampani: number };
  /** Operace proti občanům v Česku za 90 dní — do nápovědy u Česka: téma a zasažená média (ostražitost, ne další box). */
  crKampane?: { slug: string; nazev: string; probiha: boolean; odhaleno: string; media: string[] }[];
  /** Box Internet v Česku: co se děje a kde, za 72 h (server). */
  internet?: SouhrnInternetu;
  obcane: StavObcanu;
  pulz?: Pulz; priprava?: DataPripravy; casy: string[]; casyCz: string[]; kandidati: Kandidat[]; zkontrolovano: string | null; ted: number; /** Box Tipy k přípravě — stojí před „AI radí“ (24. 9. 2026). */ tipy?: React.ReactNode;
}) {
  /* Naléhavé zprávy chytá sběr, tak se čerstvost měří jeho posledním průchodem, ne ručním ověřením. */
  const kontrola = pulz?.kdy ?? zkontrolovano;
  const nal = stavNalehavosti(kandidati, kontrola, ted);
  const t = useT();
  const d = stav.uroven ? UROVNE[stav.uroven] : null;
  const pasmo = stav.uroven ? PASMA[UROVNE[stav.uroven].pasmo] : null;
  const d90 = poDnech(casy, 90, ted);
  const d14 = d90.slice(-14);
  const soucet = (n: number) => d90.slice(-n).reduce((a, b) => a + b, 0);
  const cz90 = poDnech(casyCz, 90, ted);
  const crPopis = cr
    ? [crPocet.pripadu ? `${crPocet.pripadu} ${sklon(crPocet.pripadu, "případ", "případy", "případů")}` : null, crPocet.kampani ? `${crPocet.kampani} ${sklon(crPocet.kampani, "operace proti občanům", "operace proti občanům", "operací proti občanům")}` : null].filter(Boolean).join(" a ")
    : "ani jeden případ za 90 dní";
  const podpora = BUY_ME_A_COFFEE_URL || HEROHERO_URL;

  return (
    <aside aria-label="Stav a příprava" className="space-y-4">
      {/* Podpora a odběr — první, bez rámečku, zarovnané s kartami pod tím (24. 9. 2026). */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {/* Rovnou do Telegramu (26. 9. 2026): mezikrok přes /odber/ opouštělo 72 % lidí. Kanál bez adresy → stránka Odběr. */}
        <Tlacitko kam={KANALY.telegram || "/odber/"} nove={Boolean(KANALY.telegram)} varianta="obrys" velikost="s" ikona="zvonek" trida="!border-akcent">{KANALY.telegram ? "Upozornění v Telegramu" : "Upozornění"}</Tlacitko>
        {BUY_ME_A_COFFEE_URL && <Tlacitko kam={BUY_ME_A_COFFEE_URL} nove varianta="obrys" velikost="s" ikona="kava">Buy me a coffee</Tlacitko>}
        {HEROHERO_URL && <Tlacitko kam={HEROHERO_URL} nove varianta="obrys" velikost="s" ikona="srdce">Herohero</Tlacitko>}
        {!podpora && <Tlacitko kam="/podporit/" varianta="obrys" velikost="s" ikona="kava">Podpořit provoz</Tlacitko>}
      </div>

      {/*
        Souhrn situace a Internet v Česku vedle sebe (24. 9. 2026, od 4. 11. 2026 místo „Právě ověřujeme“). 26. 9.: stejná
        stavba i výška — nadpis nahoře na jedné lince, text pod ním na nejvýš tři
        řádky; tón nese rámeček, ne různé rozložení.
      */}
      <div className="grid grid-cols-2 gap-3">
        <Napoveda cele plna popis={<span className="block">
          {nal.polozky.length ? (
            /* Každá naléhavá zpráva zvlášť, s proklikem do fronty a na zdroj. Je to pořadí ve frontě, ne tvrzení. */
            <span className="mb-1.5 block space-y-1.5">
              {nal.polozky.map((p) => (
                <span key={p.id} className="block">
                  <Link href={`/udalosti/?tab=cekajici#${p.id}`} className="font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-akcent">{p.titulek}</Link>
                  <span className="block text-tlum2">{p.druh} · {p.datum} · <a href={p.url} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-inkoust">{p.zdroj}</a>{p.zdroju > 1 ? ` a další, celkem ${p.zdroju} ${sklon(p.zdroju, "zdroj", "zdroje", "zdrojů")}` : ""} · neověřeno</span>
                </span>
              ))}
            </span>
          ) : nal.dodatek && <span className="mb-1.5 block text-inkoust">{nal.dodatek}</span>}
          {pulz && <span className="block text-tlum2">Za 24 h: {pulz.zachyceno24} zachyceno, {pulz.overeno24} ověřeno, {pulz.zdrojuOk} z {pulz.zdrojuCelkem} zdrojů odpovědělo.</span>}{kontrola && <span className="mt-1.5 block text-tlum2">Zdroje čteny {casPraha(kontrola)}.</span>}</span>}>
          {nal.polozky.length ? (
            /*
              Odkaz do fronty, klidně: tečka, počet, druhy zpráv. Žádný červený
              rámeček ani titulky — ty jsou v nápovědě a ve frontě. Je to
              pořadí k ověření, ne tvrzení, a tak to má i vypadat.
            */
            <Link href={`/udalosti/?tab=cekajici#${nal.polozky[0].id}`} role="status" aria-label="Souhrn situace" className="flex h-full min-h-[118px] w-full flex-col rounded-[22px] border border-linka bg-plocha2/40 px-3.5 py-3 text-left transition-colors hover:border-akcent/60">
              <span className="flex min-h-[34px] items-center gap-2"><IkonaKruh ikona="info" velikost="s" /><span className="nadpis-boxu leading-tight">Souhrn situace</span></span>
              <span className="mt-2 flex items-start gap-2 text-male font-bold leading-snug text-inkoust"><span aria-hidden className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-akcent" />{nal.text}</span>
              {/* Druh, kolikrát, a z kolika redakcí: „posílení hranice NATO (4 zdroje)“ říká víc než čtyři stejné řádky. */}
              <span className="mt-1 block text-mikro leading-snug text-tlum">{nal.skupiny.map((g) => `${g.pocet > 1 ? `${g.pocet}× ` : ""}${g.druh}${g.zdroju > 1 ? ` (${g.zdroju} ${sklon(g.zdroju, "zdroj", "zdroje", "zdrojů")})` : ""}`).join(" · ")}</span>
              <span className="mt-auto pt-2 text-mikro text-tlum2">otevřít frontu →</span>
            </Link>
          ) : (
            <span role="status" aria-label="Souhrn situace" className={`flex h-full min-h-[118px] w-full flex-col rounded-[22px] border px-3.5 py-3 text-left ${nal.ton === "deje" ? "border-akcent/70 bg-akcent/[0.05]" : "border-linka bg-plocha2/40"}`}>
              <span className="flex min-h-[34px] items-center gap-2"><IkonaKruh ikona="info" velikost="s" /><span className="nadpis-boxu leading-tight">Souhrn situace</span></span>
              <span className="mt-2 line-clamp-3 text-male font-bold leading-snug text-inkoust">{nal.text}</span>
            </span>
          )}
        </Napoveda>
        {/* Internet v Česku místo „Právě ověřujeme“ (4. 11. 2026, provozovatelka: Souhrn situace stačí). */}
        <InternetBox data={internet} />
      </div>

      {/* Situace teď */}
      <section className="overflow-hidden rounded-[22px] bg-plocha">
        <HlavickaWidgetu ikona="radar" nazev="Situace teď" meta={<span className="cislice">{soucet(14)} {sklon(soucet(14), "případ", "případy", "případů")} za 14 dní</span>} />
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-[14px] bg-plocha2/60 px-3 py-2.5">
            {/*
              Podle čeho (4. 11. 2026, provozovatelka): kritéria jen po najetí,
              stručně, s odkazem na metodiku. Bez úrovně stojí místo výkladu
              důvod ze shrnutí („méně než dva ověřené případy“).
            */}
            <Napoveda popis={<span className="block">
              {stav.uroven ? <VykladUrovne uroven={stav.uroven} /> : <span className="block">{stav.shrnuti || t("Hodnocení zatím nebylo stanoveno.")}</span>}
              <span className="mt-2.5 block border-t border-linka/60 pt-2 text-tlum">
                <span className="stitek block text-tlum2">Podle čeho</span>
                <span className="mt-1 block">Ověřené případy za 14 dní a jejich střední závažnost; mimo Česko o stupeň níž. Neověřené zprávy a zachycené signály nevstupují. Mimořádný signál redakce nejvýš o stupeň výš na 14 dní, vždy s důvodem. Méně než dva případy: nestanoveno.</span>
                <Link href="/metodika/#situace-ted" className="mt-1.5 inline-flex items-center gap-1 font-semibold text-inkoust hover:text-akcent">Celá metodika <Ikona nazev="nahoru" velikost={11} tah={2} trida="rotate-90" /></Link>
              </span>
            </span>}>
              <span className="block"><ObloukovyMerak uroven={stav.uroven} naNoci velikost={112} skrytPopisek /></span>
            </Napoveda>
            <div className="min-w-0 flex-1">
              <div className="whitespace-nowrap text-mikro font-semibold text-tlum">{t("Evropa · dnes")}</div>
              <p className={`text-velke font-bold leading-tight [overflow-wrap:normal] ${pasmo ? pasmo.text : "text-tlum"}`}>{d ? d.nazev : "Nestanoveno"}</p>
              <p className="mt-0.5 flex items-center gap-1 text-mikro font-semibold text-tlum">
                {stav.trend === "nahoru" && <><span className="text-stari"><Ikona nazev="nahoru" velikost={11} tah={2.2} /></span>{t("zhoršení za 7 dní")}</>}
                {stav.trend === "dolu" && !stav.mimoradny && <><span className="text-klid"><Ikona nazev="dolu" velikost={11} tah={2.2} /></span>{t("zlepšení za 7 dní")}</>}
                {stav.trend === "beze-zmeny" && <span className="text-tlum2">{t("stejně jako minulý týden")}</span>}
              </p>
              <div className={`mt-1.5 ${pasmo ? pasmo.text : "text-tlum"}`}><Cara hodnoty={d14} sirka={120} vyska={24} popis={`Případy po dnech za 14 dní: ${d14.join(", ")}`} /></div>
            </div>
          </div>
          <MimoradnySignalPoznamka stav={stav} className="mt-2" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Maly nadpis={t("Česko")} obdobi="90 dní" uroven={cr} slovo={cr ? undefined : "Bez záznamu"} neutralni={!cr} popis={crPopis} dodatek={crHistoricky ? `Nejvýš od roku 2014: ${UROVNE[crHistoricky].nazev.toLowerCase()}.` : undefined}
              navic={<span className="block">
                <span className="mt-1.5 block text-tlum2">Nejvyšší závažnost ověřených případů v Česku a operací proti občanům za 90 dní.</span>
                {crKampane.length > 0 && (
                  <span className="mt-2 block border-t border-linka/60 pt-2">
                    <span className="stitek block text-tlum2">Ostražitost</span>
                    {crKampane.slice(0, 3).map((k) => (
                      <span key={k.slug} className="mt-1 block">
                        <Link href={`/manipulace/#${k.slug}`} className="font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-akcent">{k.nazev}</Link>
                        <span className="block text-tlum2">{k.probiha ? "probíhá" : `odhaleno ${datumPraha(k.odhaleno)}`}{k.media.length ? ` · zasaženo: ${k.media.join(", ")}` : ""}</span>
                      </span>
                    ))}
                  </span>
                )}
              </span>}
              graf={<><span className="text-tlum"><Sloupky hodnoty={seskup(cz90, 12)} sirka={56} vyska={18} popis="Případy v Česku po týdnech" /></span><span>{cz90.reduce((a, b) => a + b, 0)} za 90 dní</span></>} />
            <Maly nadpis={t("Běžný život")} obdobi="teď" uroven={obcane.uroven} slovo={obcane.slovo} neutralni={obcane.neutralni} popis={obcane.popis}
              navic={<span className="mt-1.5 block text-tlum2">Úřední stav (nouzový stav, mobilizace, omezení) a provoz služeb podle úředních zdrojů. Zprávy z médií nevstupují.</span>}
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
          <p className="mt-2 px-1 text-mikro text-tlum2 max-lg:hidden">Případy a operace proti občanům v Evropě. <Link href="/metodika/#situace-ted" className="odkaz">Jak se hodnotí</Link>.</p>
        </div>
      </section>

      {/* Pizza index (kuriozita) z úvodu pryč 2. 11. 2026: na úvod patří jen to, co se dotýká bezpečí. */}


      {/* Tipy jen na počítači: na mobilu je to další box navíc. */}
      {/* Co naladit a co dělat (5. 11. 2026, provozovatelka): hlavní vysílání podle kraje a scénáře, i na telefonu. */}
      <CoNaladitBox internet={internet} />

      {tipy && <div className="max-lg:hidden">{tipy}</div>}

      {/* Připravenost */}
      <section className="overflow-hidden rounded-[22px] bg-plocha">
        {/* Dřív „AI radí dle aktuální situace“ — jenže výběr počítá pevné pravidlo nad záznamy za 30 dní (src/lib/priprava-ted.ts), ne AI (metodika v2, audit 9. 11. 2026). */}
        <HlavickaWidgetu ikona="stit" nazev="Co si připravit" podtitul="podle doložených událostí za 30 dní" />
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
          <Tlacitko kam="/odolnost/" varianta="obrys" velikost="s" ikona="terc" trida="!border-akcent">Kalkulačka odolnosti</Tlacitko>
        </div>
      </section>

    </aside>
  );
}
