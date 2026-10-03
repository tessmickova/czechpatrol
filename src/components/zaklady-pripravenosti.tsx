import Link from "next/link";
import { KvizZaklady } from "./kviz-zaklady";
import { Vlna } from "./letaky";
import { PriruckyKarty } from "./prirucky-karty";
import { Ikona } from "./ikony";
import { TONY_SIREN } from "@/lib/letaky";

/*
  Základy do Průvodce připraveností (3. 10. 2026): za minutu hotové —
  tři tóny sirén s obrázkem, kvíz se třemi otázkami, letáky k tisku
  a oficiální příručky jako karty s náhledem.
*/
const BARVA: Record<string, string> = { zkouska: "text-tlum", vystraha: "text-akcent", pozar: "text-jantar" };

export function ZakladyPripravenosti() {
  return (
    <section id="zaklady" className="mb-12 scroll-mt-20">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-akcent/15 text-akcent"><Ikona nazev="sirena" velikost={24} tah={2} /></span>
        <div>
          <h2 className="titul-mensi leading-tight">Základy za minutu</h2>
          <p className="text-male text-tlum">Tři tóny, tři otázky, hotovo. Pak už jen odškrtat, co máte.</p>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-3">
        {TONY_SIREN.map((t) => (
          <li key={t.klic} className={`rounded-[18px] border p-3.5 ${t.klic === "vystraha" ? "border-akcent/60 bg-akcent/10" : "border-linka bg-plocha"}`}>
            <b className="block text-zaklad text-inkoust">{t.nazev}</b>
            <Vlna tvar={t.tvar} trida={`my-2 h-8 w-full ${BARVA[t.klic]}`} />
            <span className="block text-male leading-snug text-tlum">{t.co}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4"><KvizZaklady /></div>

      <Link href="/letaky/" className="group mt-4 flex items-center gap-4 rounded-[18px] border-2 border-dashed border-akcent/50 p-4 transition-colors hover:bg-akcent/[0.06]">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-akcent text-papir"><Ikona nazev="dokument" velikost={22} tah={2} /></span>
        <span className="min-w-0 flex-1">
          <b className="block text-zaklad text-inkoust">Letáky na lednici</b>
          <span className="block text-male text-tlum">Sirény · co dělat při výstraze · nález trosek — vytisknout nebo PDF</span>
        </span>
        <Ikona nazev="nahoru" velikost={16} tah={2} trida="shrink-0 rotate-90 text-akcent transition-transform group-hover:translate-x-1" />
      </Link>

      <div className="mt-6"><PriruckyKarty /></div>
    </section>
  );
}
