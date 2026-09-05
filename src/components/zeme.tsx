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
  const emoji = k.length === 2 && k !== "EU"
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
            className={`sklo relative flex flex-col rounded-[16px] p-4 ${cr ? "sklo-akcent" : ""}`}
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
                  <span className="stitek !text-[#8ff0c0]">žádný zveřejněný záznam</span>
                )}
              </span>
            </div>
            {z.pocet > 0 && (
              <>
                <div className="mt-3 flex flex-wrap gap-1">
                  {z.kategorie.slice(0, 4).map((k) => (
                    <span key={k} className="stitek-tmavy rounded-[6px] border border-linka px-1.5 py-[3px] text-tlum">{KATEGORIE[k].nazev}</span>
                  ))}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[13px] text-tlum">
                  <Ikona nazev="hodiny" velikost={12} />
                  {z.posledni ? `poslední ${datum(z.posledni)}` : ""}
                  <span className="ml-auto">{z.cinu} {sklon(z.cinu, "čin", "činy", "činů")} · {z.potvrzenych} potvrz.</span>
                </p>
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
