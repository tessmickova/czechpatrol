import Link from "next/link";
import { RadarTlaku } from "./mericky";
import { UROVNE } from "@/lib/skala";
import { PASMA } from "@/lib/skala";
import type { HybridniTlak } from "@/lib/typy";

/*
  Pavučina typů hrozeb.

  Ukazuje, čím je tlak tvořený — ne jen jak je velký. Dvě vedle sebe:
  NATO a Evropa jako celek, a Česko podle vlastních záznamů. Rozdíl mezi
  nimi je to podstatné: co se děje jinde a co doma.

  Osa bez záznamu zůstává prázdná. Nic se nedopočítává.
*/

function Legenda({ tlak }: { tlak: HybridniTlak }) {
  return (
    <ul className="mt-1 grid gap-x-5 gap-y-2">
      {tlak.podkategorie.map((o) => {
        const u = o.uroven ? UROVNE[o.uroven] : null;
        const t = o.uroven ? PASMA[UROVNE[o.uroven].pasmo] : null;
        return (
          <li key={o.klic} className="flex items-center gap-2 text-[13px]">
            <span aria-hidden className={`h-[8px] w-[8px] shrink-0 rounded-full ${t ? t.tecka : "bg-linka"}`} />
            <span className="min-w-0 flex-1 text-tlum">{o.nazev}</span>
            <span className={`shrink-0 text-[12.5px] font-semibold ${t ? t.text : "text-tlum2"}`}>{u ? u.nazev : "bez záznamu"}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PavucinaHrozeb({
  nadpis,
  popis,
  tlak,
  odkaz,
}: {
  nadpis: string;
  popis: string;
  tlak: HybridniTlak;
  odkaz?: { href: string; text: string };
}) {
  return (
    <section aria-label={nadpis} className="rounded-[22px] border border-linka2 bg-plocha p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="titul-mensi">{nadpis}</h3>
        {odkaz && (
          <Link href={odkaz.href} className="text-[13px] font-semibold text-akcent hover:text-akcent-svetla">{odkaz.text}</Link>
        )}
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-tlum">{popis}</p>
      <div className="mt-4 flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:gap-7">
        <div className="shrink-0">
          <RadarTlaku tlak={tlak} velikost={288} okraj={78} />
        </div>
        <div className="w-full min-w-0">
          <Legenda tlak={tlak} />
        </div>
      </div>
    </section>
  );
}
