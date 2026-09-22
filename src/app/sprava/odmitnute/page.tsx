import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { Odznak, Sdeleni } from "@/components/ui";
import { odmitnute } from "@/lib/data";
import { datumCas } from "@/lib/format";
import type { Odmitnuty } from "@/lib/typy";

/*
  Co síto nepustilo.

  Proč tahle stránka existuje: síto na klíčová slova neumí posoudit zprávu,
  která je vážná, ale napsaná mizerně. Titulek „Začínáme“ nad textem o vypuknutí
  války se do žádného seznamu slov netrefí. Dokud se odmítnuté zprávy
  zahazovaly, nebylo jak to zachytit — ani zpětně zjistit, že nám něco uteklo.

  Stránka je pracovní, ne veřejná: není v navigaci, má noindex a nic z ní
  nevstupuje do počtů ani hodnocení. Zároveň o ní nepředstírám, že je tajná —
  soubor `data/fronta/odmitnute.json` je součástí statického buildu i veřejného
  repozitáře. Jsou to veřejné titulky a odkazy, nic víc; drží se stranou proto,
  aby nedělaly ze zpravodajského šumu obsah webu.
*/

export const metadata: Metadata = {
  title: "Co síto nepustilo",
  robots: { index: false, follow: false },
};

const DUVODY: Record<Odmitnuty["duvod"], string> = {
  "vylouceno-tematem": "vyloučené téma",
  "bez-skutku": "žádný skutek",
  "bez-mista": "chybí místo",
};

function Radek({ o }: { o: Odmitnuty }) {
  return (
    <li className="border-b border-linka2 px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="font-mono text-mikro text-tlum2">{datumCas(o.publikovano ?? o.zachyceno)}</span>
        <Odznak ton="neutral">{DUVODY[o.duvod]}</Odznak>
        {o.zdroj.primarni && <Odznak ton="klid">úřední zdroj</Odznak>}
        <span className="text-mikro text-tlum2">{o.zdroj.nazev}</span>
      </div>

      <a
        href={o.zdroj.url}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="mt-1.5 block text-zaklad font-semibold leading-snug text-inkoust hover:underline"
      >
        {o.titulek}
      </a>
      {o.shrnuti && <p className="mt-1 text-male leading-relaxed text-tlum2">{o.shrnuti}</p>}

      {o.posouzeni && o.posouzeni.podezreni !== "zadne" && (
        <p className="mt-2 text-male text-tlum">
          <b className="font-semibold text-inkoust">Model:</b> {o.posouzeni.duvod}
        </p>
      )}

      {/*
        Převzetí je vědomý krok člověka u příkazové řádky, ne kliknutí na webu.
        Web je statický — zapsat do repozitáře odsud nejde a předstírat tlačítko,
        které nic neudělá, by bylo horší než příkaz k okopírování.
      */}
      <p className="mt-2 font-mono text-mikro text-tlum2">node nastroje/prijmi-odmitnuty.mjs {o.id}</p>
    </li>
  );
}

function Skupina({ nadpis, popis, polozky, otevreno = false }: { nadpis: string; popis: string; polozky: Odmitnuty[]; otevreno?: boolean }) {
  if (!polozky.length) return null;
  return (
    <details open={otevreno} className="mt-6 overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
      <summary className="cursor-pointer list-none px-4 py-3.5 sm:px-5">
        <span className="text-zaklad font-semibold text-inkoust">{nadpis}</span>
        <span className="ml-2 font-mono text-male text-tlum2">{polozky.length}</span>
        <span className="mt-0.5 block text-drobne text-tlum2">{popis}</span>
      </summary>
      <ol className="border-t border-linka2">
        {polozky.map((o) => (
          <Radek key={o.id} o={o} />
        ))}
      </ol>
    </details>
  );
}

export default function Stranka() {
  const vse = odmitnute();
  const podle = (p: "vysoke" | "stredni" | "zadne") => vse.filter((o) => o.posouzeni?.podezreni === p);

  const neposouzene = vse.filter((o) => !o.posouzeni);
  const vysoke = podle("vysoke");
  const stredni = podle("stredni");
  const zadne = podle("zadne");

  return (
    <>
      <HlavickaStranky
        stitek="Správa"
        ikona="lupa"
        nadpis="Co síto nepustilo"
        popis="Zprávy, které automatický sběr zachytil, ale nepustil dál. Levný model jim dal druhé čtení; rozhodnutí je na člověku."
      />
      <Obsah>
        <Sdeleni ton="neutral" ikona="info">
          Nic z téhle stránky nevstupuje do počtů, hodnocení ani na veřejné stránky. Jediná cesta dál vede přes ruční
          převzetí mezi kandidáty, kde položku čeká normální ověření.
        </Sdeleni>

        {vse.length === 0 && (
          <Sdeleni ton="neutral" ikona="info" trida="mt-4">
            Zatím tu nic není. Seznam se naplní při nejbližším sběru.
          </Sdeleni>
        )}

        <Skupina
          otevreno
          nadpis="Vypadá to vážně"
          popis="Model soudí, že jde o závažnou bezpečnostní událost, i když se titulek do síta netrefil. Projít ručně."
          polozky={vysoke}
        />
        <Skupina
          nadpis="Možná něco je"
          popis="Z titulku se nedá poznat, jestli jde o bezpečnostní událost."
          polozky={stredni}
        />
        {neposouzene.length > 0 && (
          <Skupina
            nadpis="Neposouzeno"
            popis="Model se k nim nedostal — chybí klíč, nebo došel strop běhu. Neposouzeno není totéž co „nic vážného“."
            polozky={neposouzene}
          />
        )}
        <Skupina nadpis="Zjevně nic" popis="Sport, kultura, ekonomika, komentáře a běžná politika." polozky={zadne} />
      </Obsah>
    </>
  );
}
