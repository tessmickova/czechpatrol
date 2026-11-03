import Link from "next/link";
import { datumPraha } from "@/lib/cas";
import { incidenty } from "@/lib/data";
import type { SnimekKyber, ZpravaKyber } from "@/lib/kyber";
import { sestavPrehledTypu, type PrehledTypu, type PrikladTypu } from "@/lib/typy-utoku";
import { Ikona } from "./ikony";
import { sklon, Vlajka } from "./zeme";
import archivKyber from "../../data/kyber-archiv.json";
import snimekKyber from "../../data/kyber.json";

/*
  Stránka „Typy útoků“ (3. 11. 2026). Pořadí podle naší evidence, u každého
  typu co to je, co předem, co když nastane, úřední odkazy a tři poslední
  doložené případy se zdrojem. Žádná evropská statistika: čísla jsou počty
  toho, co prošlo kontrolou webu, a stránka to říká.
*/
const VEN = "nofollow noopener noreferrer";

export function prehledTypu(): PrehledTypu[] {
  const zpravy = [...(snimekKyber as SnimekKyber).zpravy, ...(archivKyber as ZpravaKyber[])];
  return sestavPrehledTypu(incidenty(), zpravy);
}

function Priklad({ p }: { p: PrikladTypu }) {
  const trida = "min-w-0 flex-1 text-male leading-snug text-inkoust hover:text-akcent";
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span className="cislice w-[88px] shrink-0 pt-0.5 text-mikro text-tlum2">{datumPraha(p.kdy)}</span>
      <span className="w-[22px] shrink-0 pt-0.5 text-center leading-none">{p.kodZeme ? <Vlajka kod={p.kodZeme} /> : <span className="text-tlum2">·</span>}</span>
      <span className="min-w-0 flex-1">
        {p.ven
          ? <a href={p.kam} target="_blank" rel={VEN} className={trida}>{p.titulek}</a>
          : <Link href={p.kam} className={trida}>{p.titulek}</Link>}
        {p.zdroj && <span className="block text-mikro text-tlum2">{p.doklad === "media" ? p.zdroj : `zdroj: ${p.zdroj}`}</span>}
      </span>
    </li>
  );
}

function Body({ nadpis, polozky }: { nadpis: string; polozky: string[] }) {
  return (
    <div>
      <h3 className="nadpis-boxu">{nadpis}</h3>
      <ul className="mt-2 space-y-1.5">
        {polozky.map((p) => (
          <li key={p} className="flex gap-2.5 text-zaklad leading-relaxed text-tlum">
            <span aria-hidden className="mt-[10px] h-[4px] w-[4px] shrink-0 rounded-full bg-inkoust" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TypyUtokuPrehled({ prehled }: { prehled: PrehledTypu[] }) {
  const nejvic = Math.max(1, ...prehled.map((p) => p.zaznamu));
  return (
    <div className="min-w-0">
      {/* Pořadí na jeden pohled: číslo, název, pruh v délce počtu doložených záznamů (podle nich je pořadí). Neutrální: počet není výstraha. */}
      <ol className="divide-y divide-linka">
        {prehled.map((p, i) => {
          const celkem = p.zaznamu + p.zprav;
          return (
            <li key={p.typ.klic}>
              <a href={`#${p.typ.klic}`} className="group flex items-center gap-3 py-2.5 hover:text-akcent">
                <span className="cislice w-[22px] shrink-0 text-male text-tlum2">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-zaklad font-semibold leading-snug text-inkoust group-hover:text-akcent">{p.typ.nazev}</span>
                  <span className="mt-1 block h-[6px] w-full max-w-[280px] overflow-hidden rounded-full bg-linka2"><span className="block h-full rounded-full bg-tlum2/70" style={{ width: `${Math.max(2, Math.round((p.zaznamu / nejvic) * 100))}%` }} /></span>
                </span>
                <span className="cislice shrink-0 text-right text-mikro text-tlum2">
                  {p.zaznamu > 0 && <span className="block">{p.zaznamu} {sklon(p.zaznamu, "záznam", "záznamy", "záznamů")}</span>}
                  {p.zprav > 0 && <span className="block">{p.zprav} {sklon(p.zprav, "zpráva z médií", "zprávy z médií", "zpráv z médií")}</span>}
                  {celkem === 0 && <span className="block">zatím nic</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 space-y-10">
        {prehled.map((p, i) => (
          <section key={p.typ.klic} id={p.typ.klic} aria-labelledby={`typ-${p.typ.klic}`} className="scroll-mt-20 border-t border-linka pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id={`typ-${p.typ.klic}`} className="podnadpis text-velke"><span className="cislice mr-2 text-tlum2">{i + 1}.</span>{p.typ.nazev}</h2>
              {p.posledni && <span className="cislice text-mikro text-tlum2">poslední {datumPraha(p.posledni)}</span>}
            </div>
            <p className="mt-3 text-zaklad leading-relaxed text-tlum">{p.typ.coToJe}</p>
            <p className="mt-1.5 text-male leading-relaxed text-tlum2">{p.typ.proObcana}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Body nadpis="Předem" polozky={p.typ.predem} />
              <Body nadpis="Když nastane" polozky={p.typ.kdyzNastane} />
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-male">
              <span className="text-tlum2">Oficiální postup:</span>
              {p.typ.odkazy.map((o) => o.url.startsWith("/")
                ? <Link key={o.url} href={o.url} className="inline-flex items-center gap-1 font-semibold text-inkoust hover:text-akcent">{o.nazev} <Ikona nazev="nahoru" velikost={11} tah={2} trida="rotate-90" /></Link>
                : <a key={o.url} href={o.url} target="_blank" rel={VEN} className="inline-flex items-center gap-1 font-semibold text-inkoust hover:text-akcent">{o.nazev} <Ikona nazev="nahoru" velikost={11} tah={2} trida="rotate-45" /></a>)}
            </p>
            {p.prikladyZaznamu.length > 0 && (
              <div className="mt-5">
                <h3 className="nadpis-boxu">Naposledy v evidenci · doložené záznamy</h3>
                <ul className="mt-1 divide-y divide-linka/60">{p.prikladyZaznamu.map((x) => <Priklad key={x.klic} p={x} />)}</ul>
              </div>
            )}
            {p.prikladyMedii.length > 0 && (
              <div className="mt-5">
                <h3 className="nadpis-boxu">Naposledy v médiích · neověřeno</h3>
                <ul className="mt-1 divide-y divide-linka/60">{p.prikladyMedii.map((x) => <Priklad key={x.klic} p={x} />)}</ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
