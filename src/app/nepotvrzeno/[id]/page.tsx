import type { Metadata } from "next";
import Link from "next/link";
import { DetailObsah, HlavickaDetailu } from "@/components/detail-obsah";
import { Sdeleni } from "@/components/ui";
import { incidenty, nepotvrzeneZaznamy, opravy } from "@/lib/data";

export const dynamicParams = false;

/*
  Samostatná stránka nepotvrzeného záznamu.

  Proč vůbec: v seznamu událostí vedl ověřený záznam na vlastní stránku,
  kdežto nepotvrzený jen zpátky na filtrovaný seznam. Zvenčí to vypadalo,
  že některé události stránku mají a jiné ne — bez zjevného důvodu.

  Proč ne pod /incident/: adresa je součást sdělení. Záznam, za kterým
  projekt stojí, a zpracovaná zpráva, kterou nikdo nepotvrdil, nemají bydlet
  na stejné ulici. Kdo dostane odkaz, má poznat rozdíl dřív, než stránku
  otevře.

  Zachycené zprávy vlastní stránku nedostávají: je z nich jen titulek a
  odkaz, nic našeho. Vyrobit jim stránku by znamenalo tvářit se, že o nich
  něco víme.
*/

const zaznam = (id: string) => nepotvrzeneZaznamy().find((z) => z.id === id);

export async function generateStaticParams() {
  const vse = nepotvrzeneZaznamy();
  return vse.length ? vse.map((z) => ({ id: z.id })) : [{ id: "zadny" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const z = zaznam(id);
  if (!z) return { title: "Nepotvrzený záznam nenalezen", robots: { index: false, follow: false } };
  return {
    title: `Nepotvrzeno: ${z.titulek}`,
    /* Neindexuje se: nepotvrzená zpráva nemá chodit do vyhledávačů jako fakt. */
    robots: { index: false, follow: true },
  };
}

export default async function Stranka({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const z = zaznam(id);

  if (!z) {
    return (
      <div className="mx-auto max-w-[640px] px-5 py-20 text-center sm:px-8">
        <div className="stitek mb-4">Nepotvrzený záznam</div>
        <h1 className="text-cislo-l font-bold">Tenhle záznam tu už není</h1>
        <p className="mx-auto mt-4 max-w-[34rem] text-zaklad leading-relaxed text-tlum">
          Buď ho někdo potvrdil a je mezi událostmi, nebo se ukázalo, že událostí není, a byl zamítnut.
        </p>
        <div className="mt-6"><Link href="/udalosti/?tab=nepotvrzene" className="odkaz">Nepotvrzené záznamy</Link></div>
      </div>
    );
  }

  const uredni = z.zdroje.filter((x) => x.typ === "primary" && Boolean(x.url)).length;
  const dost = z.zdroje.length >= 2;

  return (
    <article className="mx-auto max-w-[860px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5">
        <Link href="/udalosti/?tab=nepotvrzene" className="inline-flex min-h-[36px] items-center gap-1 text-male font-semibold text-tlum hover:text-inkoust">
          ← Nepotvrzené záznamy
        </Link>
      </div>

      {/*
        Výhrada stojí nad záznamem, ne pod ním. Kdo si otevře odkaz, má vědět,
        co čte, dřív než to začne číst.
      */}
      <Sdeleni ton="akcent" ikona="otaznik" carkovane nadpis="Nepotvrzená zpráva" trida="mb-6">
        Zpráva je zpracovaná jako AI shrnutí a má uvedené zdroje, ale zatím není potvrzená. Do počtů, do hodnocení situace
        ani do upozornění nevstupuje.{" "}
        {!dost
          ? "Chybí jí druhý nezávislý zdroj — bez něj se nezveřejní ani po schválení."
          : uredni
            ? "Má dva nezávislé zdroje včetně úředního, takže se zveřejní sama při nejbližším běhu."
            : "Je doložená jen médii. Zveřejní se, až to schválí člověk, nebo až přibude úřední zdroj."}
      </Sdeleni>

      <HlavickaDetailu i={z} vse={incidenty()} velka />
      <div className="mt-8"><DetailObsah i={z} vse={incidenty()} opravy={opravy()} /></div>
    </article>
  );
}
