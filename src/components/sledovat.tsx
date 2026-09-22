import Link from "next/link";
import { KANALY, KOMUNITA, PARTNERI, UCTY_ZAPNUTE, WEB } from "@/config/web";
import { Ikona } from "./ikony";
import { ZnackaKanalu, type Znacka } from "./znacky";
import { Tlacitko } from "./ui";

/*
  Výzvy k akci: kam dál, kde nás sledovat, s kým spolupracujeme.
  Kanál bez adresy se ukáže jako připravovaný, ne jako funkční.
  Partner bez názvu je volné místo, ne vymyšlené logo.
*/

const KANALY_DEF: { klic: Znacka; nazev: string; popis: string }[] = [
  { klic: "telegram", nazev: "Telegram", popis: "kanál jen pro čtení" },
  { klic: "whatsapp", nazev: "WhatsApp", popis: "kanál jen pro čtení" },
  { klic: "signal", nazev: "Signal", popis: "šifrovaně" },
  { klic: "bluesky", nazev: "Bluesky", popis: "krátká shrnutí" },
];

const KARTA = "flex min-h-[64px] items-center gap-3 rounded-[18px] border px-3 py-2 text-left transition-colors";

export function Sledovat() {
  return (
    <section id="sledovat" aria-label="Sledujte nás" className="scroll-mt-[84px]">
      <div className="mb-1.5 flex items-center justify-between"><span className="stitek">Sledujte změny · nemusíte sem chodit</span><Tlacitko kam="/odber/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">jak fungují upozornění</Tlacitko></div>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        <li><a href={`${WEB.url}/feed.xml`} className={`${KARTA} border-akcent/50 bg-akcent/10 hover:bg-akcent/20`}><ZnackaKanalu znacka="rss" velikost={26} /><span><span className="block text-male font-bold text-inkoust">RSS</span><span className="block text-mikro text-tlum">každá čtečka</span></span></a></li>
        <li>
          {UCTY_ZAPNUTE ? (
            <Link href="/ucet/" className={`${KARTA} border-akcent/50 bg-akcent/10 hover:bg-akcent/20`}><ZnackaKanalu znacka="email" velikost={26} /><span><span className="block text-male font-bold text-inkoust">Souhrn a upozornění</span><span className="block text-mikro text-tlum">týdně, nebo hned při změně</span></span></Link>
          ) : (
            <span className={`${KARTA} border-dashed border-linka opacity-80`}><ZnackaKanalu znacka="email" velikost={26} tlumena /><span><span className="block text-male font-bold text-tlum">E-mailový souhrn</span><span className="block text-mikro text-tlum2">připravujeme</span></span></span>
          )}
        </li>
        {KANALY_DEF.map((k) => {
          const url = KANALY[k.klic];
          return (
            <li key={k.klic}>
              {url ? (
                <a href={url} target="_blank" rel="nofollow noopener noreferrer" className={`${KARTA} border-linka hover:border-akcent`}><ZnackaKanalu znacka={k.klic} velikost={26} /><span><span className="block text-male font-bold text-inkoust">{k.nazev}</span><span className="block text-mikro text-tlum">{k.popis}</span></span></a>
              ) : (
                <span className={`${KARTA} border-dashed border-linka opacity-80`}><ZnackaKanalu znacka={k.klic} velikost={26} tlumena /><span><span className="block text-male font-bold text-tlum">{k.nazev}</span><span className="block text-mikro text-tlum2">připravujeme</span></span></span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
        {KOMUNITA.diskuse && (
          <a href={KOMUNITA.diskuse} target="_blank" rel="nofollow noopener noreferrer" className={`${KARTA} border-linka hover:border-akcent`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 text-akcent"><Ikona nazev="uzivatel" velikost={16} tah={2} /></span>
            <span><span className="block text-male font-bold text-inkoust">Diskuse a tipy</span><span className="block text-mikro text-tlum">chybí tu událost?</span></span>
          </a>
        )}
        <Link href="/muj-prehled/" className={`${KARTA} border-linka hover:border-akcent`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 text-akcent"><Ikona nazev="terc" velikost={16} tah={2} /></span>
          <span><span className="block text-male font-bold text-inkoust">Můj přehled</span><span className="block text-mikro text-tlum">jen země a témata, která sledujete</span></span>
        </Link>
        <Link href="/podporit/" className={`${KARTA} border-linka hover:border-akcent`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 text-akcent"><Ikona nazev="srdce" velikost={16} tah={2} /></span>
          <span><span className="block text-male font-bold text-inkoust">Podpořit provoz</span><span className="block text-mikro text-tlum">bez inzerce, náklady veřejně</span></span>
        </Link>
      </div>
    </section>
  );
}

export function Partneri() {
  const mista = [0, 1, 2].map((i) => PARTNERI[i] ?? null);
  return (
    <section aria-label="Ve spolupráci s">
      <div className="mb-1.5 flex items-center justify-between"><span className="stitek">Ve spolupráci s</span><span className="text-mikro text-tlum2">partnerství nemění hodnocení ani data</span></div>
      <ul className="grid grid-cols-3 gap-1.5">
        {mista.map((p, i) => (
          <li key={i}>
            {p ? (
              <a href={p.url} target="_blank" rel="nofollow noopener noreferrer" className={`${KARTA} justify-center border-linka bg-plocha hover:border-akcent`}>
                <span className="text-center"><span className="block text-zaklad font-bold text-inkoust">{p.nazev}</span><span className="block text-mikro text-tlum">{p.popis}</span></span>
              </a>
            ) : (
              <span className={`${KARTA} justify-center border-dashed border-linka`}>
                <span className="text-center text-drobne text-tlum2">volné místo<br />pro partnera</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
