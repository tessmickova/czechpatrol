import Link from "next/link";
import { KANALY, KDY_UPOZORNENI, UCTY_ZAPNUTE, WEB } from "@/config/web";
import { Ikona } from "./ikony";

/**
 * Odběr: jen to, co skutečně funguje.
 *
 * RSS se generuje při každém sestavení a funguje vždy. Týdenní souhrn
 * a upozornění na změny jdou přes účet, jen když běží API. Kanály, které
 * nemají adresu, se neukazují vůbec — ani jako „připravujeme“.
 */
export function OdberPanel({ kompaktni = false }: { kompaktni?: boolean }) {
  const dalsi = Object.entries(KANALY).filter(([k, url]) => k !== "email" && url);
  return (
    <div className={`grid gap-6 ${kompaktni ? "" : "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"}`}>
      <ul className="space-y-3">
        <li className="flex gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent"><Ikona nazev="rss" velikost={16} tah={2} /></span>
          <span>
            <a href={`${WEB.url}/feed.xml`} className="text-[15px] font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-inkoust">RSS kanál</a>
            <span className="block text-[13.5px] leading-snug text-tlum">Bez účtu a bez adresy. Každý zveřejněný záznam, nic navíc. Funguje v každé čtečce.</span>
          </span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent"><Ikona nazev="zvonek" velikost={16} tah={2} /></span>
          <span>
            {UCTY_ZAPNUTE ? (
              <Link href="/ucet/" className="text-[15px] font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-inkoust">Týdenní souhrn a upozornění na změny</Link>
            ) : (
              <span className="text-[15px] font-semibold text-tlum">Týdenní souhrn a upozornění na změny</span>
            )}
            <span className="block text-[13.5px] leading-snug text-tlum">
              {UCTY_ZAPNUTE
                ? "Výchozí je jeden souhrn týdně. Okamžité upozornění chodí jen při změně, kvůli které by člověk mohl jednat jinak."
                : "Zatím není spuštěné — chybí běžící účetní služba. Neslibujeme termín."}
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
            {KDY_UPOZORNENI.map((k) => (
              <li key={k} className="flex gap-2 text-[13.5px] leading-snug text-tlum">
                <span aria-hidden className="mt-[3px] shrink-0 text-[#256b45]"><Ikona nazev="fajfka" velikost={12} tah={2} /></span>{k}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-tlum2">Stejná změna se nikdy nepošle dvakrát. Odhlášení je jedním kliknutím v účtu.</p>
        </div>
      )}
    </div>
  );
}
