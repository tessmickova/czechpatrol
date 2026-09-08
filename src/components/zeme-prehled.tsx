import Link from "next/link";
import { druh, kdyZjisteno, novaZjisteni, pachatelPotvrzen, uredniZdroj, type Zaznam } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import { KATEGORIE } from "@/lib/kategorie";
import { PASMA, UROVNE, zDeseti } from "@/lib/skala";
import type { HybridniTlak, Kategorie } from "@/lib/typy";
import { NadpisBloku } from "./nadpisy";
import { NovaZjisteni } from "./nova-zjisteni";
import { PavucinaHrozeb } from "./pavucina";
import { PocitadlaZeme, type PolozkaPoctu } from "./pocitadla-zive";
import { Vlajka } from "./zeme";

/*
  Přehled jedné země: kolik toho tam je, čím je to tvořené a co konkrétně.

  Počty se počítají v prohlížeči, aby „dnes“ platilo i mezi sestaveními webu.
  Úroveň a osy pavučiny se berou jen ze záznamů té země — kde záznam není,
  zůstává prázdno a napíše se to.
*/

function Radek({ i }: { i: Zaznam }) {
  const t = PASMA[UROVNE[i.zavaznost].pasmo];
  const d = druh(i);
  return (
    <li>
      <Link href={`/incident/${i.slug}/`} className="flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-plocha2 sm:flex-row sm:items-baseline sm:gap-4 sm:px-5">
        <span className="cislice shrink-0 text-[13px] text-tlum2 sm:w-[86px]">{datumPraha(kdyZjisteno(i))}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-tlum">
            <span aria-hidden className={`h-[8px] w-[8px] rounded-full ${t.tecka}`} />
            <span>{d === "pripad" ? "případ" : d === "aktualizace" ? "nové zjištění" : d === "opatreni" ? "opatření" : "prohlášení"}</span>
            {d === "pripad" && <><span aria-hidden className="text-tlum2">·</span><span>{UROVNE[i.zavaznost].nazev.toLowerCase()} {zDeseti(i.zavaznost)}/10</span></>}
            {uredniZdroj(i) && <><span aria-hidden className="text-tlum2">·</span><span className="text-akcent">úřední zdroj</span></>}
          </span>
          <span className="mt-0.5 block text-[15px] font-semibold leading-snug text-inkoust">{i.kratkyTitulek || i.titulek}</span>
        </span>
      </Link>
    </li>
  );
}

export function ZemePrehled({
  kodZeme,
  nazev,
  zaznamy,
  tlak,
  polozky,
  ted,
}: {
  kodZeme: string;
  nazev: string;
  zaznamy: Zaznam[];
  tlak: HybridniTlak;
  polozky: PolozkaPoctu[];
  ted: number;
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
          popis={`Osy podle zveřejněných záznamů se zemí ${kodZeme}. Prázdná osa znamená, že takový záznam nemáme — ne že se nic nestalo.`}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <PavucinaHrozeb
            nadpis={nazev}
            popis="Nejvyšší úroveň v každé oblasti, kterou pro tuhle zemi evidujeme."
            tlak={tlak}
          />
          <section aria-label="Souhrn" className="rounded-[22px] border border-linka2 bg-plocha p-5 sm:p-6">
            <h3 className="titul-mensi">Co o tom víme</h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-[14px]">
              <div>
                <dt className="stitek">Případů celkem</dt>
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
                <dt className="stitek">Všech záznamů</dt>
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
          akce={<Link href={`/udalosti/?zeme=${kodZeme}`} className="text-[13px] font-semibold text-akcent hover:text-akcent-svetla">otevřít ve filtru →</Link>}
        />
        {serazene.length ? (
          <ol className="divide-y divide-linka2 overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
            {serazene.map((i) => <Radek key={i.slug} i={i} />)}
          </ol>
        ) : (
          <p className="rounded-[22px] border border-linka2 bg-plocha px-4 py-5 text-[14.5px] text-tlum">
            Pro tuhle zemi zatím nemáme žádný ověřený záznam. <Vlajka kod={kodZeme} /> Neznamená to, že se tam nic nestalo — jen že jsme nic nedoložili.
          </p>
        )}
      </div>
    </>
  );
}
