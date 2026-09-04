import type { Metadata } from "next";
import Link from "next/link";
import { GrafSouvislosti } from "@/components/graf-souvislosti";
import { ObsahUdalosti } from "@/components/karta-udalosti";
import { OdznakUkazky } from "@/components/pruhy";
import { Karta, OdznakJistoty, OdznakUrovne, Otaznik } from "@/components/zaklad";
import { incident, incidenty } from "@/lib/data";
import { datum, datumCas } from "@/lib/format";
import { ATRIBUCE, KATEGORIE, STAVY } from "@/lib/kategorie";
import { tokeny } from "@/lib/skala";

export const dynamicParams = false;

/** Zástupný slug pro případ, kdy zatím není zveřejněná žádná událost. */
const ZADNA = "nenalezeno";

export async function generateStaticParams() {
  // Statický export vyžaduje aspoň jednu cestu. Dokud nejsou zveřejněné žádné
  // události, vygeneruje se jediná stránka, která to slušně vysvětlí.
  const vse = incidenty();
  return vse.length ? vse.map((i) => ({ slug: i.slug })) : [{ slug: ZADNA }];
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const i = incident(slug);
  if (!i) return { title: "Událost nenalezena", robots: { index: false, follow: false } };
  return {
    title: i.titulek,
    description: i.vyznam.slice(0, 180),
    openGraph: { title: i.titulek, description: i.vyznam.slice(0, 180), type: "article" },
  };
}

export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = incident(slug);
  if (!i) return <Nenalezeno />;

  const vse = incidenty();
  const souvisejici = i.souvisejici
    .map((v) => {
      const cil = vse.find((x) => x.id === v.incidentId);
      return cil ? { incident: cil, potvrzena: v.potvrzena, popis: v.popis } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const t = tokeny(i.zavaznost);

  return (
    <article>
      <div className={`border-b border-linka ${t.pozadi}`}>
        <div className="mx-auto max-w-[860px] px-5 py-11 sm:px-8 sm:py-14">
          <Link href="/udalosti/" className="stitek mb-6 inline-block hover:text-inkoust">
            ← Události
          </Link>

          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <OdznakUrovne uroven={i.zavaznost} />
            <span className="stitek">{i.zeme}</span>
            {i.kategorie.map((k) => (
              <span key={k} className="stitek !text-tlum2">{KATEGORIE[k].nazev}</span>
            ))}
            {i.ukazka && <OdznakUkazky />}
          </div>

          <h1 className="nadpis max-w-[26ch] text-[28px] sm:text-[38px]">{i.titulek}</h1>

          <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-5 border-t border-linka/70 pt-6 sm:grid-cols-4">
            <div>
              <dt className="stitek mb-2">Datum události</dt>
              <dd className="cislice text-[13.5px] font-medium">{datum(i.datumUdalosti)}</dd>
            </div>
            <div>
              <dt className="stitek mb-2 flex items-center gap-1.5">
                Nové zjištění
                <Otaznik popis={<span className="block">Kdy věc vyšla najevo nebo kdy přišlo nové vyšetřovací zjištění. Není totožné s datem, kdy se událost stala.</span>} />
              </dt>
              <dd className="cislice text-[13.5px] font-medium">
                {i.datumZjisteni ? datum(i.datumZjisteni) : "—"}
              </dd>
            </div>
            <div>
              <dt className="stitek mb-2">Stav</dt>
              <dd className="text-[13.5px] font-medium">{STAVY[i.stav]}</dd>
            </div>
            <div>
              <dt className="stitek mb-2 flex items-center gap-1.5">
                Atribuce
                <Otaznik vpravo popis={<span className="block">{ATRIBUCE[i.atribuce].popis}</span>} />
              </dt>
              <dd className="text-[13.5px] font-medium">{ATRIBUCE[i.atribuce].nazev}</dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-linka/70 pt-5">
            <div className="stitek mb-2.5">Jistota informace</div>
            <OdznakJistoty jistota={i.jistota} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[860px] space-y-8 px-5 py-11 sm:px-8 sm:py-14">
        <Karta className="p-5 sm:p-6">
          <ObsahUdalosti incident={i} />
        </Karta>

        {souvisejici.length > 0 && <GrafSouvislosti stred={i} souvisejici={souvisejici} />}

        {i.historie.length > 0 && (
          <Karta className="p-5 sm:p-6">
            <h2 className="podnadpis mb-1.5 text-[16px]">Historie aktualizací</h2>
            <p className="mb-5 text-[12.5px] leading-relaxed text-tlum2">
              Aktualizace záznamu neznamená nový útok. Tady je vidět, co přesně a kdy
              přibylo.
            </p>
            <ol className="relative space-y-0">
              <span aria-hidden className="absolute bottom-3 left-[4px] top-3 w-px bg-linka" />
              {i.historie.map((h, n) => (
                <li key={n} className="relative flex gap-4 py-3">
                  <span aria-hidden className="relative z-10 mt-[6px] h-[9px] w-[9px] shrink-0 rounded-[2px] border-2 border-plocha bg-tlum2" />
                  <span className="block">
                    <span className="cislice stitek mb-1.5 block">{datumCas(h.kdy)}</span>
                    <span className="block text-[13.5px] leading-relaxed">{h.text}</span>
                    {h.novySignal && (
                      <span className="stitek-tmavy mt-2 inline-block rounded-[10px] border border-linka px-1.5 py-[3px] text-tlum">
                        Započítáno jako nový signál
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Karta>
        )}
      </div>
    </article>
  );
}

/** Zobrazí se, když událost pod danou adresou neexistuje. */
function Nenalezeno() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-20 text-center sm:px-8">
      <div className="stitek mb-4">Událost</div>
      <h1 className="nadpis text-[28px] sm:text-[34px]">Tato událost tu není</h1>
      <p className="mx-auto mt-4 max-w-[34rem] text-[14px] leading-relaxed text-tlum">
        Buď adresa neodpovídá žádnému záznamu, nebo zatím není zveřejněná žádná událost.
        Zveřejňujeme pouze záznamy, které prošly kontrolou a mají uvedený zdroj.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        <Link href="/udalosti/" className="rounded-[10px] border border-linka bg-plocha px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust">
          Všechny události
        </Link>
        <Link href="/" className="rounded-[10px] border border-linka bg-plocha px-3 py-2 text-[12.5px] font-medium transition-colors hover:border-inkoust">
          Přehled
        </Link>
      </div>
    </div>
  );
}
