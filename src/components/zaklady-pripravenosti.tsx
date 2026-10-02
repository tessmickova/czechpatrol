import Link from "next/link";
import { KvizZaklady } from "./kviz-zaklady";
import { Vlna } from "./letaky";
import { PRIRUCKY, TONY_SIREN } from "@/lib/letaky";

/*
  Základy do Průvodce připraveností (3. 10. 2026): tři tóny sirén, kvíz
  „Vím to“, letáky k tisku a oficiální příručky ke stažení.
*/
export function ZakladyPripravenosti() {
  return (
    <section id="zaklady" className="mb-10 scroll-mt-20">
      <h2 className="nadpis-boxu mb-3">Základy, které by měl znát každý</h2>
      <ul className="grid gap-2 sm:grid-cols-3">
        {TONY_SIREN.map((t) => (
          <li key={t.klic} className={`rounded-[16px] border p-3 ${t.klic === "vystraha" ? "border-akcent/60 bg-akcent/10" : "border-linka"}`}>
            <b className="block text-male text-inkoust">{t.nazev}</b>
            <Vlna tvar={t.tvar} trida={`my-1.5 h-6 w-full ${t.klic === "vystraha" ? "text-akcent" : t.klic === "pozar" ? "text-jantar" : "text-tlum"}`} />
            <span className="block text-drobne leading-snug text-tlum">{t.co}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4"><KvizZaklady /></div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/letaky/" className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-akcent px-5 text-zaklad font-semibold text-papir hover:bg-akcent-svetla">Letáky k tisku a PDF</Link>
        <span className="text-male text-tlum">Sirény · všeobecná výstraha · nález munice nebo trosek</span>
      </div>
      <details className="mt-4 rounded-[18px] border border-linka">
        <summary className="cursor-pointer px-4 py-3 text-zaklad font-semibold text-inkoust">Oficiální příručky ke stažení ({PRIRUCKY.length})</summary>
        <ul className="divide-y divide-linka2 border-t border-linka">
          {PRIRUCKY.map((p) => (
            <li key={p.url} className="px-4 py-2.5">
              <a href={p.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz text-male font-semibold">{p.nazev} ↗</a>
              <span className="block text-drobne text-tlum2">{p.kdo} · {p.jazyk}{p.poznamka ? ` · ${p.poznamka}` : ""}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
