import { KATEGORIE } from "@/lib/kategorie";
import { zemeDopad } from "@/lib/data";
import { datum } from "@/lib/format";
import { tokeny, UROVNE } from "@/lib/skala";
import { Ikona } from "./ikony";

/** Český tvar podle počtu: 1 čin, 2–4 činy, 0 a 5+ činů. */
export const sklon = (n: number, j: string, mn: string, mnoho: string) => (n === 1 ? j : n >= 2 && n <= 4 ? mn : mnoho);

/** Vlajka z kódu země — dvě písmena, žádné obrázky. */
export function Vlajka({ kod, velka = false }: { kod: string; velka?: boolean }) {
  const k = kod.toUpperCase();
  // XZ = mezinárodní vody (kód pro místa mimo státy); NATO a jiná seskupení nemají vlajku.
  const emoji = k === "XZ" ? "🌊"
    : k.length === 2 && k !== "EU"
    ? String.fromCodePoint(...[...k].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : k === "EU" ? "🇪🇺" : "🏳️";
  return (
    <span aria-label={k} title={k} className={`inline-block shrink-0 ${velka ? "text-[24px] leading-none" : "text-[17px] leading-none"}`}>
      {emoji}
    </span>
  );
}

/*
  Dopad po zemích.

  Každá země jedna karta: kolik záznamů, nejzávažnější, jaké oblasti.
  ČR je vždy první, i kdyby tam nebylo nic — to, že tam nic není, je
  informace, kterou čtenář hledá.
*/
export function DopadPoZemich() {
  const zeme = zemeDopad();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {zeme.map((z) => {
        const t = z.nejvyssi ? tokeny(z.nejvyssi) : null;
        const cr = z.kodZeme === "CZ";
        return (
          <article
            key={z.kodZeme}
            className={`relative flex flex-col rounded-[22px] border p-4 transition-colors ${
              cr ? "border-akcent/40 bg-akcent/5" : "border-linka2 hover:border-linka"
            }`}
          >
            <span aria-hidden className={`absolute inset-x-4 top-0 h-[3px] rounded-b-full ${t ? t.pruh : "bg-linka"}`} />
            <div className="flex items-center gap-2.5">
              <Vlajka kod={z.kodZeme} velka />
              <span className="text-[16px] font-bold uppercase tracking-[0.03em]">{z.zeme}</span>
              {cr && <span className="stitek ml-auto !text-akcent">u nás</span>}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span>
                <span className="velke-cislo block text-[30px] text-inkoust">{z.pocet}</span>
                <span className="stitek">{sklon(z.pocet, "záznam", "záznamy", "záznamů")}</span>
              </span>
              <span className="text-right">
                {z.nejvyssi ? (
                  <>
                    <span className={`block text-[14px] font-bold uppercase tracking-[0.03em] ${t!.text}`}>{UROVNE[z.nejvyssi].nazev}</span>
                    <span className="stitek">nejvyšší závažnost</span>
                  </>
                ) : (
                  <span className="stitek !text-[#8fd6ae]">žádný zveřejněný záznam</span>
                )}
              </span>
            </div>
            {z.pocet > 0 && (
              <>
                {/* Z čeho se počet skládá: činy s potvrzeným pachatelem, činy bez něj, prohlášení a reakce. */}
                <div aria-hidden className="mt-3 flex h-[6px] overflow-hidden rounded-full bg-linka2">
                  {z.potvrzenych > 0 && <span className="bg-[#e8763f]" style={{ width: `${(z.potvrzenych / z.pocet) * 100}%` }} />}
                  {z.cinu - z.potvrzenych > 0 && <span className="bg-[#d9b24c]" style={{ width: `${((z.cinu - z.potvrzenych) / z.pocet) * 100}%` }} />}
                  {z.prohlaseni > 0 && <span className="bg-tlum2" style={{ width: `${(z.prohlaseni / z.pocet) * 100}%` }} />}
                </div>
                <ul className="mt-2 space-y-1 text-[12.5px] text-tlum">
                  <li className="flex items-center gap-2"><span aria-hidden className="h-[6px] w-[6px] rounded-[2px] bg-[#e8763f]" /><span className="cislice text-inkoust">{z.potvrzenych}</span> {sklon(z.potvrzenych, "čin", "činy", "činů")} s potvrzeným pachatelem</li>
                  <li className="flex items-center gap-2"><span aria-hidden className="h-[6px] w-[6px] rounded-[2px] bg-[#d9b24c]" /><span className="cislice text-inkoust">{z.cinu - z.potvrzenych}</span> {sklon(z.cinu - z.potvrzenych, "čin", "činy", "činů")} bez potvrzení</li>
                  <li className="flex items-center gap-2"><span aria-hidden className="h-[6px] w-[6px] rounded-[2px] bg-tlum2" /><span className="cislice text-inkoust">{z.prohlaseni}</span> {sklon(z.prohlaseni, "prohlášení nebo reakce", "prohlášení nebo reakce", "prohlášení a reakcí")}</li>
                </ul>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {z.kategorie.slice(0, 3).map((k) => (
                    <span key={k} className="stitek-tmavy rounded-[10px] border border-linka px-1.5 py-[3px] text-tlum">{KATEGORIE[k].nazev}</span>
                  ))}
                </div>
                {z.posledni && (
                  <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-tlum2">
                    <Ikona nazev="hodiny" velikost={12} /> poslední {datum(z.posledni)}
                  </p>
                )}
              </>
            )}
            {cr && z.pocet === 0 && (
              <p className="mt-3 text-[13.5px] leading-relaxed text-tlum">Zatím žádná ověřená událost na území ČR. Stav služeb a práva je v liště nahoře.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
