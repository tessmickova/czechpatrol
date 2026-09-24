"use client";

import { HlavickaWidgetu } from "./widgety";
import Link from "next/link";
import { datumPraha } from "@/lib/cas";
import { jistotaZobrazena, kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { jeCesky } from "@/lib/jazyk";
import { PUVODCI } from "@/lib/kategorie";
import { JISTOTY, PASMA, UROVNE } from "@/lib/skala";
import type { Kandidat } from "@/lib/typy";
import { PanelNahledu, useNahled, type Nahled } from "./nahled-radku";
import { Tlacitko } from "./ui";
import { Otaznik } from "./zaklad";
import { Vlajka } from "./zeme";

/*
  Aktuality vedle úvodu.

  Proč vznikly: na titulce nebylo poznat, že projekt vůbec žije. Ověřené
  záznamy přibývají po dnech, protože každý musí projít člověkem — a mezi
  nimi web vypadal jako zamrzlý, i když sběr každou hodinu něco zachytil.

  Sloupec proto ukazuje obojí, a to v tomhle pořadí:
    1. ověřené záznamy — to je to, za čím si projekt stojí,
    2. zachycené a neověřené — důkaz, že se čte, ne tvrzení, že se to stalo.

  Obojího stejně. Zachycené zprávy jsou skoro vždycky čerstvější (ověřený
  záznam čeká na člověka), takže když jich bylo míň, chyběla na titulce
  právě ta část, kvůli které se sem člověk dívá. Aby se obojí vešlo do výšky
  daného úvodem, má řádek jen jednu řádku: datum a titulek vedle sebe.

  Hranice mezi nimi je to jediné, co tenhle sloupec nesmí rozmazat. Neověřené
  má vlastní nadpis, vlastní vysvětlení a odkazuje ven na zdroj, ne dovnitř
  na záznam, který neexistuje.
*/

const NAZVY_NALEHAVOSTI: Record<string, string> = {
  "mobilizace-rusko": "mobilizace v Rusku",
  "priprava-mobilizace": "přípravy mobilizace",
  "krizove-vysilani": "krizové vysílání",
  "clanek-nato": "článek 4/5 NATO",
  "pravni-stav-cr": "právní stav ČR",
  "hranice-cr": "hranice ČR",
  "vzdusny-prostor-nato": "vzdušný prostor Aliance",
};

/*
  Čtyři a čtyři je změřené, ne odhadnuté.

  Řádek má nejvýš dvě řádky titulku (56 px), takže se jich vedle úvodu
  vejde míň než jednořádkových — ale titulek se dá přečíst bez najetí
  myší. Čtyři a čtyři dávají sloupec zhruba o výšce úvodu; když jsou
  titulky delší, přesáhne ho o pár desítek pixelů, což úvod bez rámečku
  unese. Celý seznam je stejně jen ochutnávka; úplný je v Událostech.
*/

/*
  Titulek bez země na začátku.

  Záznamy mají titulek ve tvaru „Nizozemsko: úmyslně umístěné trubky…".
  V řádku, kde je vedle vlajka, je slovo navíc — zabírá místo, které
  chybí titulku. Odstraní se ale jen tehdy, když předpona opravdu je
  země záznamu; u „USA: obvinila pět osob…" se zemí Rusko zůstává, protože
  by věta bez podmětu nedávala smysl.
*/
function bezZeme(titulek: string, zeme: string, kodZeme: string): string {
  const predpony = [zeme, kodZeme === "CZ" ? "Česko" : "", kodZeme === "CZ" ? "ČR" : ""].filter(Boolean);
  for (const z of predpony) {
    if (titulek.toLowerCase().startsWith(`${z.toLowerCase()}:`)) {
      const zbytek = titulek.slice(z.length + 1).trim();
      return zbytek ? zbytek.charAt(0).toUpperCase() + zbytek.slice(1) : titulek;
    }
  }
  return titulek;
}

/*
  Náhled ověřeného záznamu: celý titulek a hodnocení v párech.

  Řádek má dvě řádky a vlajku místo jména země, takže náhled musí doplnit
  to, co řádek vynechal: celý titulek, jméno země a datum. Hodnocení
  (závažnost, jistota, původce, zdroj) je tu proto, aby se dalo posoudit
  bez prokliku, jestli záznam stojí za otevření.
*/
function nahledZaznamu(z: Zaznam): Nahled {
  const jistota = jistotaZobrazena(z);
  const uredni = z.zdroje.find((s) => s.primarni) ?? z.zdroje[0];
  const zdroj = uredni
    ? `${uredni.nazev.split(" — ")[0]}${z.zdroje.length > 1 ? ` +${z.zdroje.length - 1}` : ""}`
    : "bez odkazu";
  return {
    titulek: z.titulek,
    radky: [datumPraha(kdyZjisteno(z)), z.kodZeme === "CZ" ? "Česko" : z.zeme],
    udaje: [
      { popisek: "Závažnost", hodnota: UROVNE[z.zavaznost].nazev },
      { popisek: "Jistota", hodnota: JISTOTY[jistota].nazev },
      { popisek: "Původce", hodnota: z.puvodce ? PUVODCI[z.puvodce] : "neuvedeno" },
      { popisek: "Zdroj", hodnota: zdroj },
    ],
    poznamka: "Ověřený záznam. Klepnutím se otevře i se zdroji.",
  };
}
/*
  Náhled zachycené zprávy.

  Datum se popisuje slovem. U zachycené zprávy totiž není datum události —
  je to datum článku, a když to zdroj neuvádí, je to datum, kdy si toho sběr
  všiml. Holé datum u řádku se přitom čte jako „tehdy se to stalo". Proto
  je v náhledu napsané, o které z nich jde.
*/
function nahledKandidata(k: Kandidat): Nahled {
  const radky = [
    k.publikovano ? `zdroj vyšel ${datumPraha(k.publikovano)}` : `zachyceno ${datumPraha(k.zachyceno)}, datum zdroje neuvedeno`,
    k.zeme ?? "země neurčena",
    k.zdroj.nazev,
  ];
  if (k.naliehave) radky.push(NAZVY_NALEHAVOSTI[k.naliehave.druh] ?? k.naliehave.druh);
  return {
    titulek: k.titulek,
    radky,
    poznamka: "Zachyceno ze zdroje, zatím neověřeno. Klepnutím se otevře původní zdroj.",
  };
}

/*
  Neověřený řádek: nepotvrzený záznam, nebo zachycená zpráva.

  Obojí v jednom seznamu, protože pro čtenáře je to totéž — „stalo se, ale
  my za to neručíme". Liší se jen tím, kolik o tom víme: u nepotvrzeného
  záznamu máme zpracovaná fakta a zdroje, u zachycené zprávy jen titulek.
  Slovo u řádku to říká; tečka je pomocná.
*/
interface Neoverene {
  klic: string;
  kodZeme: string | null;
  zeme: string | null;
  kdy: string;
  bezData: boolean;
  slovo: "nepotvrzeno" | "zachyceno" | "neověřeno";
  titulek: string;
  kam: string;
  ven: boolean;
  tecka: string;
  nahled: Nahled;
}

/*
  Datum nad vlajkou, drobně (24. 9. 2026 na přání provozovatelky).

  Dřív stálo datum vedle vlajky v pevném sloupci 80 px a titulku zbývalo
  málo místa. Teď je levý sloupec úzký: nahoře krátké datum (rok jen
  u loňských a starších), pod ním vlajka. Bez data se píše pomlčka —
  datum zachycení by se četlo jako den události.
*/
function kratkeDatum(iso: string): string {
  const [den, mesic, rok = ""] = datumPraha(iso).split(".").map((x) => x.trim());
  return rok === String(new Date().getFullYear()) ? `${den}. ${mesic}.` : `${den}. ${mesic}. ${rok.slice(-2)}`;
}

function SloupecKdy({ kdy, zeme, kodZeme }: { kdy: string | null; zeme: string | null; kodZeme: string | null }) {
  return (
    <span className="flex w-[40px] shrink-0 flex-col items-center gap-[3px] pt-[2px]">
      <span className="cislice whitespace-nowrap text-mikro leading-none text-tlum2" title={kdy ? datumPraha(kdy) : "bez data"}>
        {kdy ? kratkeDatum(kdy) : "—"}
      </span>
      <span className="h-[14px] leading-none" title={zeme ?? undefined} aria-label={zeme ?? undefined}>
        {kodZeme ? <Vlajka kod={kodZeme} /> : null}
      </span>
    </span>
  );
}

export function Aktuality({
  zaznamy,
  kandidati,
  nepotvrzene = [],
  overenych = 4,
  neoverenych = 4,
}: {
  zaznamy: Zaznam[];
  kandidati: Kandidat[];
  nepotvrzene?: Zaznam[];
  overenych?: number;
  neoverenych?: number;
}) {
  /*
    Horní seznam jen ověřené (23. 9. 2026). Záznamy zveřejněné jako
    „neověřeno úředně“ patří pod předěl k ostatnímu neověřenému —
    nad ním by se četly jako věc, za kterou si projekt stojí.
  */
  const jeNeovereny = (z: Zaznam) => z.overeni === "neovereno";
  const overeneVse = [...zaznamy]
    .filter((z) => !jeNeovereny(z))
    .sort((a, b) => kdyZjisteno(b).localeCompare(kdyZjisteno(a)));

  /*
    Nepotvrzené a zachycené dohromady, nejnovější první.

    Dřív tu byly jen zachycené zprávy — a když fronta 21. 9. 2026 poprvé
    klesla na nulu, celý blok zmizel. Zůstala půlka karty s ověřenými a nic
    o tom, že se ve světě něco děje. Neověřeného je přitom pořád dost, jen
    to bylo o krok dál: zpracované, ale nepotvrzené.
  */
  const neoverene: Neoverene[] = [
    ...zaznamy.filter(jeNeovereny).map((z): Neoverene => ({
      klic: `u-${z.slug}`,
      kodZeme: z.kodZeme,
      zeme: z.kodZeme === "CZ" ? "Česko" : z.zeme,
      kdy: kdyZjisteno(z),
      bezData: false,
      slovo: "neověřeno",
      titulek: bezZeme(z.kratkyTitulek || z.titulek, z.zeme, z.kodZeme),
      kam: `/incident/${z.slug}/`,
      ven: false,
      tecka: `border ${PASMA[UROVNE[z.zavaznost].pasmo].pruh.replace("bg-", "border-")}`,
      nahled: { ...nahledZaznamu(z), poznamka: "Zveřejněno jako neověřené úředně: jen z médií. Do počtů ani hodnocení nevstupuje." },
    })),
    ...nepotvrzene.map((z): Neoverene => ({
      klic: `n-${z.id}`,
      kodZeme: z.kodZeme,
      zeme: z.kodZeme === "CZ" ? "Česko" : z.zeme,
      kdy: kdyZjisteno(z),
      bezData: false,
      slovo: "nepotvrzeno",
      titulek: bezZeme(z.kratkyTitulek || z.titulek, z.zeme, z.kodZeme),
      kam: `/nepotvrzeno/${z.id}/`,
      ven: false,
      tecka: `border ${PASMA[UROVNE[z.zavaznost].pasmo].pruh.replace("bg-", "border-")}`,
      nahled: {
        titulek: z.titulek,
        radky: [datumPraha(kdyZjisteno(z)), z.zeme, `závažnost ${UROVNE[z.zavaznost].nazev.toLowerCase()}`, `${z.zdroje.length} ${z.zdroje.length === 1 ? "zdroj" : "zdrojů"}`],
        poznamka: "Zpracováno, zatím bez potvrzení. Do počtů nevstupuje. Klepnutím se otevře i se zdroji.",
      },
    })),
    /*
      Jen česky psané zachycené zprávy (revize 24. 9. 2026). Anglický titulek
      v českém sloupci působil jako nedodělek a čtenář bez angličtiny ho
      přeskočil. Cizojazyčné se jen spočítají a vedou do fronty.
    */
    ...kandidati.filter((k) => jeCesky(k.titulek)).map((k): Neoverene => ({
      klic: `k-${k.id}`,
      kodZeme: k.kodZeme,
      zeme: k.zeme,
      kdy: k.publikovano ?? k.zachyceno,
      bezData: !k.publikovano,
      slovo: "zachyceno",
      titulek: k.titulek,
      kam: k.zdroj.url,
      ven: true,
      tecka: "border border-linka",
      nahled: nahledKandidata(k),
    })),
  ]
    .sort((a, b) => b.kdy.localeCompare(a.kdy))
    .slice(0, neoverenych);

  /*
    Když nic neověřeného není, předěl ani věta „nic nečeká“ se neukazují
    a místo po nich zaplní další ověřené záznamy (rozhodnutí 23. 9. 2026).
  */
  const posledni = overeneVse.slice(0, neoverene.length ? overenych : overenych + neoverenych);
  const cizojazycnych = kandidati.filter((k) => !jeCesky(k.titulek)).length;

  const { nahled, kde, ukaz, skryj, pohyb } = useNahled();

  return (
    <aside
      aria-labelledby="aktuality-nadpis"
      className="relative flex h-full flex-col overflow-hidden rounded-[22px] bg-plocha"
      onPointerLeave={skryj}
    >
      <HlavickaWidgetu ikona="radar" nazev="Aktuality" id="aktuality-nadpis" jako="h2" meta={<span className="cislice">{posledni.length} ověřených{neoverene.length ? ` · ${neoverene.length} neověřených` : ""}</span>} />

      {/*
        Pojistka pro dny, kdy je zachyceného víc: zkrátí se seznam, ne patička.
        Bez min-h-0 by flexbox oblast nezmenšil a odkaz na všechny události by
        vypadl ze zaobleného rámu pryč.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ul>
        {posledni.map((z) => {
          const t = PASMA[UROVNE[z.zavaznost].pasmo];
          const nahledZ = nahledZaznamu(z);
          const zeme = z.kodZeme === "CZ" ? "Česko" : z.zeme;
          return (
            <li key={z.slug} onPointerEnter={(e) => ukaz(nahledZ, e)} onPointerMove={pohyb}>
              {/*
                Odkaz vede na vlastní stránku záznamu, ne na seznam s
                otevřeným detailem: seznam detail otevírá jen v širokém
                rozvržení a na mobilu by čtenář skončil u výpisu bez
                záznamu, na který klepl.

                Řádek: tečka závažnosti, vlajka, datum, titulek na dvě řádky.
                Vlajka místo jména země — jméno je v titulku navíc a při
                najetí ho řekne vlajka sama. Titulek se láme pod sebe, ne pod
                datum: sloupce vlevo mají pevnou šířku.
              */}
              <Link
                href={`/incident/${z.slug}/`}
                className="flex items-start gap-2.5 px-4 py-2 hover:bg-plocha2"
                onFocus={(e) => {
                  const b = e.currentTarget.getBoundingClientRect();
                  ukaz(nahledZ, { clientX: b.right, clientY: b.top });
                }}
              >
                <span aria-hidden className={`mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full ${t.tecka}`} />
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  <SloupecKdy kdy={kdyZjisteno(z)} zeme={zeme} kodZeme={z.kodZeme} />
                  <span className="line-clamp-2 text-male leading-[20px] text-inkoust">{bezZeme(z.kratkyTitulek || z.titulek, z.zeme, z.kodZeme)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {neoverene.length > 0 && (
      <>
      {/*
        Předěl: černá plocha, bílý nadpis, červená ikona. Bez pruhu u kraje —
        vypadal jako výstraha, a tohle výstraha není.

        Nadpis je bílý místo tlumeného schválně: tohle je předěl, ne popisek.
        Odtud dolů přestává platit, že si za tím projekt stojí.
      */}
      <div className="border-y border-linka2 bg-plocha2/60 px-4 py-2">
        {/*
          Věta o tom, co neověřené znamená, je za puntíkem. Na ploše stála
          jako šedý popisek pod nadpisem — a čtenář ji přeskakoval stejně.
          Puntík je v barvě značky, takže je vidět, že tu vysvětlení je.
        */}
        <div className="stitek flex items-center gap-1.5 text-inkoust">
          Neověřeno
          <Otaznik label="Co znamená neověřeno" popis={<span className="block">Zpracované, ale nepotvrzené záznamy a zprávy zachycené sběrem. Do počtů ani do hodnocení nevstupují.</span>} />
        </div>
      </div>
        <ul>
          {neoverene.map((r) => {
            const trida = "flex items-start gap-2.5 px-4 py-2 hover:bg-plocha2";
            const telo = (
              <>
                <span aria-hidden className={`mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full ${r.tecka}`} />
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  <SloupecKdy kdy={r.bezData ? null : r.kdy} zeme={r.zeme} kodZeme={r.kodZeme} />
                  <span className="line-clamp-2 text-male leading-[20px] text-tlum">
                    <span className="stitek mr-1.5 text-tlum2">{r.slovo}</span>
                    {r.titulek}
                  </span>
                </span>
              </>
            );
            const naFokus = (e: { currentTarget: Element }) => {
              const b = e.currentTarget.getBoundingClientRect();
              ukaz(r.nahled, { clientX: b.right, clientY: b.top });
            };
            return (
              <li key={r.klic} onPointerEnter={(e) => ukaz(r.nahled, e)} onPointerMove={pohyb}>
                {r.ven ? (
                  <a href={r.kam} target="_blank" rel="nofollow noopener noreferrer" className={trida} onFocus={naFokus}>{telo}</a>
                ) : (
                  <Link href={r.kam} className={trida} onFocus={naFokus}>{telo}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </>
      )}
      {cizojazycnych > 0 && (
        <Link href="/udalosti/?tab=cekajici" className="block px-4 py-2 text-drobne text-tlum2 hover:bg-plocha2 hover:text-tlum">
          + {cizojazycnych} {cizojazycnych === 1 ? "zachycená zpráva v cizím jazyce" : cizojazycnych < 5 ? "zachycené zprávy v cizím jazyce" : "zachycených zpráv v cizím jazyce"} ve frontě →
        </Link>
      )}
      </div>

      <PanelNahledu nahled={nahled} kde={kde} />

      {/*
        Jediná cesta k archivu z úvodu. Seznam všech záznamů dřív stál i dole
        na úvodní straně — podruhé totéž, co je tady a v Událostech. Tlačítko
        ho nahrazuje.
      */}
      <div className="mt-auto px-4 py-2.5">
        {/*
          Plná červená, stejná jako „Odebírat na Telegramu": je to jediná
          cesta k archivu z úvodu a úvod sám žádné tlačítko na záznamy nemá.
        */}
        <Tlacitko kam="/udalosti/" varianta="plny" velikost="m" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">
          Všechny záznamy od 2014
        </Tlacitko>
      </div>
    </aside>
  );
}
