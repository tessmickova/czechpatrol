import Link from "next/link";
import { GrafSouvislosti } from "@/components/graf-souvislosti";
import { DetailObsah, HlavickaDetailu } from "@/components/detail-obsah";
import { UlozitUdalost } from "@/components/muj-prehled-klient";
import { OdznakUkazky } from "@/components/pruhy";
import { incident, incidenty } from "@/lib/data";

/**
 * Samostatná stránka události. Stejný obsah jako panel na stránce
 * Události — jen s vlastní adresou, kterou jde sdílet. Synchronní schválně:
 * stejnou komponentu vykresluje statický build i klikací náhled.
 */
export function DetailIncidentu({ slug }: { slug: string }) {
  const i = incident(slug);
  if (!i) return <Nenalezeno />;

  const vse = incidenty();
  const souvisejici = i.souvisejici
    .map((v) => {
      const cil = vse.find((x) => x.id === v.incidentId);
      return cil ? { incident: cil, potvrzena: v.potvrzena, popis: v.popis } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <article className="mx-auto max-w-[860px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/udalosti/" className="inline-flex min-h-[36px] items-center gap-1 text-[13.5px] font-semibold text-tlum hover:text-inkoust">← Události</Link>
        <UlozitUdalost slug={i.slug} />
      </div>
      {i.ukazka && <div className="mb-3"><OdznakUkazky /></div>}
      <HlavickaDetailu i={i} velka />
      <div className="mt-8"><DetailObsah i={i} /></div>
      {souvisejici.length > 0 && <div className="mt-10 overflow-x-auto"><GrafSouvislosti stred={i} souvisejici={souvisejici} /></div>}
    </article>
  );
}

/** Zobrazí se, když událost pod danou adresou neexistuje. */
function Nenalezeno() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-20 text-center sm:px-8">
      <div className="stitek mb-4">Událost</div>
      <h1 className="text-[28px] font-bold sm:text-[34px]">Tato událost tu není</h1>
      <p className="mx-auto mt-4 max-w-[34rem] text-[14px] leading-relaxed text-tlum">
        Buď adresa neodpovídá žádnému záznamu, nebo zatím není zveřejněná žádná událost.
        Zveřejňujeme pouze záznamy, které prošly kontrolou a mají uvedený zdroj.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        <Link href="/udalosti/" className="rounded-[18px] border border-linka bg-plocha px-3 py-2 text-[13px] font-medium transition-colors hover:border-inkoust">Všechny události</Link>
        <Link href="/" className="rounded-[18px] border border-linka bg-plocha px-3 py-2 text-[13px] font-medium transition-colors hover:border-inkoust">Přehled</Link>
      </div>
    </div>
  );
}
