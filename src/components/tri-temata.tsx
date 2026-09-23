"use client";

import Link from "next/link";
import { EMAIL_ODBER_BEZI } from "@/config/web";
import { Ikona, type NazevIkony } from "./ikony";

/*
  Tři témata webu jako tři desky vedle sebe: komunita, dotazník, upozornění.

  Pozadí je tematická grafika kreslená v SVG (síť lidí, kruhy měřáku,
  vlny signálu) pod tmavým překryvem, aby text držel kontrast; žádné
  cizí obrázky a žádná fotobanka. Barva je jen v tečce a ikoně.

  Texty říkají, co existuje. U dotazníku se „porovnejte s ostatními“
  ukáže, jen když žebříček doopravdy běží (uvedený provozovatel + API);
  jinak zůstane jen audit, který funguje vždy.
*/

function Sit() {
  return (
    <svg aria-hidden viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5">
        <path d="M60 60 L150 40 L230 90 L320 50 L370 120 L300 190 L200 170 L110 200 L40 140 Z M150 40 L200 170 M230 90 L110 200 M320 50 L200 170 M60 60 L230 90 M370 120 L200 170" />
      </g>
      <g fill="currentColor" opacity="0.9">
        {[[60, 60], [150, 40], [230, 90], [320, 50], [370, 120], [300, 190], [200, 170], [110, 200], [40, 140]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />)}
      </g>
    </svg>
  );
}
function Merak() {
  return (
    <svg aria-hidden viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M80 200 A120 120 0 0 1 320 200" strokeWidth="14" opacity="0.25" />
        <path d="M80 200 A120 120 0 0 1 200 80" strokeWidth="14" opacity="0.7" />
        <path d="M120 200 A80 80 0 0 1 280 200" strokeWidth="2" opacity="0.4" strokeDasharray="4 8" />
        <path d="M200 200 L262 118" strokeWidth="3" opacity="0.9" />
      </g>
      <circle cx="200" cy="200" r="7" fill="currentColor" />
    </svg>
  );
}
function Vlny() {
  return (
    <svg aria-hidden viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        {[40, 80, 120, 160].map((r, i) => <circle key={r} cx="300" cy="120" r={r} opacity={0.75 - i * 0.17} />)}
      </g>
      <circle cx="300" cy="120" r="8" fill="currentColor" />
      <g fill="currentColor" opacity="0.5">
        <rect x="60" y="150" width="14" height="40" rx="3" /><rect x="84" y="130" width="14" height="60" rx="3" /><rect x="108" y="105" width="14" height="85" rx="3" />
      </g>
    </svg>
  );
}

const TEMATA: { href: string; stitek: string; nadpis: string; popis: string; akce: string; ikona: NazevIkony; grafika: React.ReactNode; barva: string }[] = [
  {
    href: "/zapojit-se/",
    stitek: "Komunita",
    nadpis: "Připojit se ke komunitě",
    popis: "WhatsApp skupina, slevy na výbavu, testování novinek, přednostní přístup, VIP příprava. Omezený počet míst.",
    akce: "Chci se přidat",
    ikona: "uzivatel",
    grafika: <Sit />,
    barva: "text-akcent",
  },
  {
    href: "/odolnost/",
    stitek: "Dotazník",
    nadpis: "Jak dobře jste připraveni?",
    popis: EMAIL_ODBER_BEZI
      ? "Pětiminutový rychlodotazník odolnosti vaší domácnosti v krizi. Souhrn a bezpečnostní nálezy hned, bez účtu."
      : "Pětiminutový rychlodotazník odolnosti vaší domácnosti v krizi. Souhrn a bezpečnostní nálezy hned, bez účtu.",
    akce: "Vyplnit za 5 minut",
    ikona: "stit",
    grafika: <Merak />,
    barva: "text-jantar",
  },
  {
    href: "/zapojit-se/",
    stitek: "Upozornění",
    nadpis: "Zapněte si upozornění",
    popis: "Telegram od nás, Záchranka, HZS a další oficiální kanály. Zpráva jen tehdy, když se změní něco, kvůli čemu byste jednali jinak.",
    akce: "Zapnout upozornění",
    ikona: "zvonek",
    grafika: <Vlny />,
    barva: "text-klid",
  },
];

export function TriTemata() {
  return (
    /*
      Stejná mezera jako mezi úvodem a aktualitami nad tím (gap-4, od 1280 px
      gap-10) a stejný rádius jako karta aktualit, ať desky sedí do linií
      stránky a nevypadají jako cizí blok.
    */
    <ul className="mt-6 grid gap-4 md:grid-cols-3 xl:mt-8 xl:gap-10" aria-label="Tři hlavní témata">
      {TEMATA.map((t) => (
        <li key={t.nadpis} className="min-w-0">
          <Link href={t.href} className="noc group relative block h-full overflow-hidden rounded-[28px] border border-linka transition-colors hover:border-akcent/60">
            <span className={`pointer-events-none absolute inset-0 ${t.barva} opacity-[0.28] transition-opacity group-hover:opacity-[0.4]`}>{t.grafika}</span>
            {/* Tmavší překryv, ať text drží kontrast i tam, kde grafika prochází pod ním. */}
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.15)_0%,rgb(0_0_0/0.62)_100%)]" />
            <span className="relative flex h-full min-h-[220px] flex-col p-6">
              <span className="flex items-center gap-2">
                <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${t.barva === "text-akcent" ? "bg-akcent" : t.barva === "text-jantar" ? "bg-jantar" : "bg-klid"}`} />
                <span className="stitek text-noc-tlum">{t.stitek}</span>
              </span>
              <span className="mt-3 flex items-start gap-2.5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgb(255_255_255/0.08)] ${t.barva}`}><Ikona nazev={t.ikona} velikost={16} tah={1.9} /></span>
                <span className="text-velke font-bold leading-tight text-noc-text">{t.nadpis}</span>
              </span>
              <span className="mt-2 text-male leading-relaxed text-noc-tlum">{t.popis}</span>
              {/* Tlačítko značky: obrysová pilulka na tmavé desce, uvnitř odkazu jako span (odkaz v odkazu nejde). */}
              <span className="mt-auto pt-5">
                <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-linka px-3.5 text-drobne font-bold text-noc-text transition-colors group-hover:border-akcent">
                  {t.akce} <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-90" />
                </span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
