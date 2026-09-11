import Link from "next/link";
import { druh, kdyZjisteno, novaZjisteni, pachatelPotvrzen, uredniZdroj, type Zaznam } from "@/lib/agregace";
import { KATEGORIE } from "@/lib/kategorie";
import type { HybridniTlak, Kampan, Kategorie } from "@/lib/typy";
import { DlazdiceKampane } from "./kampane";
import { NadpisBloku } from "./nadpisy";
import { NovaZjisteni } from "./nova-zjisteni";
import { PavucinaHrozeb } from "./pavucina";
import { PocitadlaZeme, type PolozkaPoctu } from "./pocitadla-zive";
import { Odznak, OdznakZavaznosti, RadekSeznamu, Sdeleni, SeznamPolozek, TeckaZavaznosti, Tlacitko } from "./ui";

/*
  Přehled jedné země: kolik toho tam je, čím je to tvořené a co konkrétně.

  Počty se počítají v prohlížeči, aby „dnes“ platilo i mezi sestaveními webu.
  Úroveň a osy pavučiny se berou jen ze záznamů té země — kde záznam není,
  zůstává prázdno a napíše se to.
*/

/** Řádek země používá tutéž stavebnici jako Události a Nová zjištění. */
function Radek({ i }: { i: Zaznam }) {
  const d = druh(i);
  return (
    <RadekSeznamu
      kam={`/incident/${i.slug}/`}
      o={{
        datum: kdyZjisteno(i),
        tecka: <TeckaZavaznosti uroven={i.zavaznost} plna={d === "pripad"} />,
        meta: [
          <span key="d">{d === "pripad" ? "případ" : d === "aktualizace" ? "nové zjištění" : d === "opatreni" ? "opatření" : "prohlášení"}</span>,
          d === "pripad" ? <OdznakZavaznosti key="u" uroven={i.zavaznost} /> : null,
          uredniZdroj(i) ? <Odznak key="z" ton="akcent" ikona="fajfka">úřední zdroj</Odznak> : null,
        ].filter(Boolean),
        cerstvost: kdyZjisteno(i),
        titulek: i.kratkyTitulek || i.titulek,
      }}
    />
  );
}

export function ZemePrehled({
  kodZeme,
  nazev,
  zaznamy,
  tlak,
  polozky,
  ted,
  kampane = [],
  nazvyZemi = {},
}: {
  kodZeme: string;
  nazev: string;
  zaznamy: Zaznam[];
  tlak: HybridniTlak;
  polozky: PolozkaPoctu[];
  ted: number;
  kampane?: Kampan[];
  nazvyZemi?: Record<string, string>;
}) {
  const pripady = zaznamy.filter((i) => druh(i) === "pripad");
  const potvrzeno = pripady.filter(pachatelPotvrzen).length;
  const sUrednim = pripady.filter(uredniZdroj).length;
  const kategorie = [...new Set(zaznamy.flatMap((i) => i.kategorie))] as Kategorie[];
  const zjisteni = novaZjisteni(zaznamy, 4);
  const serazene = [...zaznamy].sort((a, b) => kdyZjisteno(b).localeCompare(kdyZjisteno(a)));

  return (
    <>
      <PocitadlaZeme polozky={polozky} ted={ted} nazev={nazev} />

      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisBloku
          nadpis="Čím je tlak tvořený"
          popis={`Osy podle všech zveřejněných záznamů se zemí ${kodZeme} od roku 2014. Prázdná osa znamená, že takový záznam nemáme — ne že se nic nestalo.`}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <PavucinaHrozeb
            nadpis={nazev}
            popis="Nejvyšší úroveň v každé oblasti od roku 2014, ne stav k dnešku."
            tlak={tlak}
          />
          <section aria-label="Souhrn" className="rounded-[22px] border border-linka2 bg-plocha p-5 sm:p-6">
            <h3 className="titul-mensi">Co o tom víme</h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-[14px]">
              <div>
                <dt className="stitek">Případů od roku 2014</dt>
                <dd className="cislice mt-1 text-[26px] font-bold leading-none text-inkoust">{pripady.length}</dd>
              </div>
              <div>
                <dt className="stitek">S potvrzeným pachatelem</dt>
                <dd className="cislice mt-1 text-[26px] font-bold leading-none text-inkoust">{potvrzeno}</dd>
              </div>
              <div>
                <dt className="stitek">S úředním zdrojem</dt>
                <dd className="cislice mt-1 text-[26px] font-bold leading-none text-inkoust">{sUrednim}</dd>
              </div>
              <div>
                <dt className="stitek">Všech záznamů od 2014</dt>
                <dd className="cislice mt-1 text-[26px] font-bold leading-none text-inkoust">{zaznamy.length}</dd>
              </div>
            </dl>
            {kategorie.length > 0 && (
              <div className="mt-5 border-t border-linka2 pt-4">
                <div className="stitek mb-2.5">Oblasti, které se tu objevily</div>
                <ul className="flex flex-wrap gap-2">
                  {kategorie.map((k) => (
                    <li key={k}>
                      <Link
                        href={`/udalosti/?zeme=${kodZeme}&tema=${k}`}
                        className="inline-flex rounded-full border border-linka2 px-3 py-1.5 text-[12.5px] text-tlum transition-colors hover:border-akcent hover:text-inkoust"
                      >
                        {KATEGORIE[k].nazev}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      {kampane.length > 0 && (
        <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
          <NadpisBloku
            nadpis="Manipulace a útoky mířené sem"
            popis="Připravené operace cílené na občany této země. Nepočítají se mezi případy — je to operace, ne událost."
            akce={<Tlacitko kam="/manipulace/" varianta="obrys" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">celý rozbor</Tlacitko>}
          />
          <div className={`grid gap-3 ${kampane.length === 1 ? "" : "sm:grid-cols-2"}`}>
            {kampane.map((k) => <DlazdiceKampane key={k.slug} k={k} nazvyZemi={nazvyZemi} siroka={kampane.length === 1} />)}
          </div>
        </div>
      )}

      {zjisteni.length > 0 && (
        <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
          <NadpisBloku nadpis="Nová zjištění" popis="Posuny ve vyšetřování: obvinění, rozsudky, úředně potvrzený pachatel." />
          <NovaZjisteni polozky={zjisteni} />
        </div>
      )}

      <div className="nalet mt-14 border-t border-linka pt-12 sm:mt-20 sm:pt-14">
        <NadpisBloku
          nadpis="Všechny záznamy"
          popis="Od nejnovějšího. Případy, jejich pokračování, úřední opatření i prohlášení."
          akce={<Tlacitko kam={`/udalosti/?zeme=${kodZeme}`} varianta="obrys" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">otevřít ve filtru</Tlacitko>}
        />
        {serazene.length ? (
          <SeznamPolozek>
            {serazene.map((i) => <Radek key={i.slug} i={i} />)}
          </SeznamPolozek>
        ) : (
          <Sdeleni ikona="lupa">
            Pro tuhle zemi zatím nemáme žádný ověřený záznam. Neznamená to, že se tam nic nestalo — jen že jsme nic nedoložili.
          </Sdeleni>
        )}
      </div>
    </>
  );
}
