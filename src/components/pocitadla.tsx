import { druh, kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import type { Kandidat, Nepotvrzene } from "@/lib/typy";
import { sklon } from "./zeme";

/*
  Započítávání. Počty podle data zjištění v pražském čase; přepočítají
  se při každém sestavení webu, tedy po každém hodinovém sběru. Číslo
  „dnes“ je proto nula, dokud nikdo nový záznam neověřil — to je
  poctivé, ne rozbité.
*/

function denPraha(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function Pocitadla({ vse, neprosle, kandidati = [], ted = Date.now() }: { vse: Zaznam[]; neprosle: Nepotvrzene[]; kandidati?: Kandidat[]; ted?: number }) {
  const dnes = denPraha(new Date(ted).toISOString());
  const p = vse.filter((i) => druh(i) === "pripad");
  const rok = dnes.slice(0, 4);
  const okna = [
    { nazev: "dnes", n: p.filter((i) => denPraha(kdyZjisteno(i)) === dnes).length },
    { nazev: "7 dní", n: p.filter((i) => ted - new Date(kdyZjisteno(i)).getTime() <= 7 * 86_400_000).length },
    { nazev: "30 dní", n: p.filter((i) => ted - new Date(kdyZjisteno(i)).getTime() <= 30 * 86_400_000).length },
    { nazev: `rok ${rok}`, n: p.filter((i) => kdyZjisteno(i).startsWith(rok)).length },
    { nazev: "od 2014", n: p.length },
  ];
  const zbytek = vse.length - p.length;
  return (
    <section aria-label="Započítávání" className="rounded-[18px] border border-linka2 bg-plocha px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="stitek">Započítané případy</span>
        {okna.map((o) => (
          <span key={o.nazev} className="flex items-baseline gap-1.5">
            <span className="cislice text-[20px] font-bold leading-none text-inkoust">{o.n}</span>
            <span className="text-[12px] text-tlum">{o.nazev}</span>
          </span>
        ))}
        {/*
          Dřív tu stál celý provozní výpis: kolik přibylo za 24 hodin, kdy byl
          poslední zápis, že se přepočítává po každém sběru. Čtenáři to neřeklo
          nic, co by potřeboval. Zůstalo jen to, co mění výklad čísel nalevo —
          co se do nich nepočítá — a ke kterému dni platí.
        */}
        <span className="ml-auto text-[11.5px] text-tlum2">
          + {zbytek} {sklon(zbytek, "navazující záznam", "navazující záznamy", "navazujících záznamů")} · {neprosle.length} neprošlo ověřením
          · <span className="text-akcent">{kandidati.length} čeká na ověření</span> · stav k {datumPraha(new Date(ted).toISOString())}
        </span>
      </div>
    </section>
  );
}
