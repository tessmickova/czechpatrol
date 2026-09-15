import Link from "next/link";
import { DORUCOVANI, KANALY, KDY_UPOZORNENI, UCTY_ZAPNUTE, WEB } from "@/config/web";
import { Ikona } from "./ikony";

/**
 * Odběr: jen to, co skutečně běží.
 *
 * Seznam se skládá z `DORUCOVANI` v konfiguraci — jediného místa, kde je
 * napsané, co která cesta doopravdy dělá. Dřív si stránky odporovaly: úvod
 * sliboval Telegram bez denních souhrnů, workflow denní souhrn mělo, /odber/
 * nabízel týdenní souhrn a /ucet/ vedle toho říkal, že účty neběží.
 *
 * Co v konfiguraci neběží, se tu ukáže jako připravované, ne jako dostupné.
 */
export function OdberPanel({ kompaktni = false }: { kompaktni?: boolean }) {
  // Telegram má vlastní řádek výš; tady zbývají případné další sítě.
  const dalsi = Object.entries(KANALY).filter(([k, url]) => k !== "email" && k !== "telegram" && url);
  return (
    <div className={`grid gap-6 ${kompaktni ? "" : "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"}`}>
      <ul className="space-y-3">
        <li className="flex gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent"><Ikona nazev="komunikace" velikost={16} tah={2} /></span>
          <span>
            {KANALY.telegram ? (
              <a href={KANALY.telegram} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-inkoust">{DORUCOVANI.telegram.nazev}</a>
            ) : (
              <span className="text-[15px] font-semibold text-tlum">{DORUCOVANI.telegram.nazev}</span>
            )}
            <span className="block text-[13.5px] leading-snug text-tlum">{DORUCOVANI.telegram.rozsah}</span>
            <span className="block text-[12.5px] leading-snug text-tlum2">Bez nové zprávy nelze usuzovat na stav situace.</span>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent"><Ikona nazev="rss" velikost={16} tah={2} /></span>
          <span>
            <a href={`${WEB.url}/feed.xml`} className="text-[15px] font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-inkoust">{DORUCOVANI.rss.nazev}</a>
            <span className="block text-[13.5px] leading-snug text-tlum">{DORUCOVANI.rss.rozsah} Bez účtu a bez adresy.</span>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 text-tlum2"><Ikona nazev="zvonek" velikost={16} tah={2} /></span>
          <span>
            {UCTY_ZAPNUTE ? (
              <Link href="/ucet/" className="text-[15px] font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-inkoust">{DORUCOVANI.ucty.nazev}</Link>
            ) : (
              <span className="text-[15px] font-semibold text-tlum">{DORUCOVANI.ucty.nazev} — připravujeme</span>
            )}
            <span className="block text-[13.5px] leading-snug text-tlum">
              {UCTY_ZAPNUTE
                ? DORUCOVANI.ucty.rozsah
                : "Zatím neběží — chybí nasazená účetní služba. Neslibujeme termín a nikam vás zatím neregistrujeme."}
            </span>
          </span>
        </li>
        {dalsi.map(([k, url]) => (
          <li key={k} className="flex gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent"><Ikona nazev="komunikace" velikost={16} tah={2} /></span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-inkoust">{k}</a>
          </li>
        ))}
      </ul>
      {!kompaktni && (
        <div className="rounded-[18px] border border-linka2 bg-plocha p-4">
          <div className="stitek mb-2">Kdy přijde okamžité upozornění</div>
          <ul className="space-y-1.5">
            {KDY_UPOZORNENI.map((k) => {
              /* Mimořádná výstraha je jiná kategorie než běžná změna stavu — i v seznamu. */
              const vystraha = k.startsWith("mimořádná výstraha");
              return (
                <li key={k} className={`flex gap-2 text-[13.5px] leading-snug ${vystraha ? "text-inkoust" : "text-tlum"}`}>
                  <span aria-hidden className={`mt-[3px] shrink-0 ${vystraha ? "text-akcent" : "text-klid-text"}`}>
                    <Ikona nazev={vystraha ? "sirena" : "fajfka"} velikost={12} tah={2} />
                  </span>
                  {k}
                </li>
              );
            })}
          </ul>
          {/*
            Dřív tu byla záruka „stejná změna se nikdy nepošle dvakrát". Taková
            absolutní technická jistota se u doručování přes cizí API slíbit
            nedá — po vypršení časového limitu nemusí být jasné, jestli zpráva
            dorazila. Popis deduplikace patří do metodiky, ne do slibu.
          */}
          {/*
            „Odhlášení v účtu" tu stálo, i když účty neběží. Z telegramového
            kanálu se odchází opuštěním kanálu a nikde se nezakládá účet.
          */}
          <p className="mt-3 text-[12.5px] text-tlum2">Opakovanému odeslání téže změny se bráníme; postup je popsaný v metodice. Z kanálu se odhlásíte jeho opuštěním — nezakládá se žádný účet.</p>
        </div>
      )}
    </div>
  );
}
