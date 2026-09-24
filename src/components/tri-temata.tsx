"use client";

import Link from "next/link";
import { Ikona, type NazevIkony } from "./ikony";

/*
  Tři témata webu jako kompaktní dlaždice (revize 24. 9. 2026).

  Dřív to byly tři vysoké karty s ilustrací a tlačítkem, každá ~260 px, a na
  mobilu stály mezi budíky a úředním stavem. Kdo se přišel podívat, jestli
  se něco děje, projel 800 px nabídky, než se dostal k datům. Teď je to
  jeden řádek na dlaždici: ikona, nadpis, jedna věta, šipka — a stojí až
  pod úředním stavem.
*/
const TEMATA: { href: string; nadpis: string; popis: string; ikona: NazevIkony; tecka: string; barva: string }[] = [
  { href: "/zapojit-se/", nadpis: "Připojit se ke komunitě", popis: "WhatsApp skupina, slevy na výbavu, testování novinek, přednostní přístup.", ikona: "uzivatel", tecka: "bg-akcent", barva: "text-akcent" },
  { href: "/odolnost/", nadpis: "Jak dobře jste připraveni?", popis: "Pětiminutový dotazník odolnosti domácnosti. Souhrn hned, bez účtu.", ikona: "stit", tecka: "bg-jantar", barva: "text-jantar" },
  { href: "/zapojit-se/", nadpis: "Zapněte si upozornění", popis: "Telegram od nás a oficiální kanály. Zpráva jen, když se změní něco podstatného.", ikona: "zvonek", tecka: "bg-klid", barva: "text-klid" },
];

export function TriTemata() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3" aria-label="Tři hlavní témata">
      {TEMATA.map((t) => (
        <li key={t.nadpis} className="min-w-0">
          <Link href={t.href} className="group flex min-h-[68px] items-center gap-3 rounded-[18px] border border-linka bg-plocha px-4 py-3 transition-colors hover:border-akcent/60">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-plocha2 ${t.barva}`}><Ikona nazev={t.ikona} velikost={16} tah={1.9} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className={`h-[6px] w-[6px] shrink-0 rounded-full ${t.tecka}`} />
                <span className="block truncate text-male font-bold leading-tight text-inkoust">{t.nadpis}</span>
              </span>
              <span className="mt-0.5 line-clamp-1 text-drobne leading-snug text-tlum">{t.popis}</span>
            </span>
            <Ikona nazev="nahoru" velikost={13} tah={2} trida="shrink-0 rotate-90 text-tlum2 transition-colors group-hover:text-akcent" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
