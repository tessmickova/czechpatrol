"use client";

import { useEffect, useState } from "react";
import { datumCasPraha } from "@/lib/cas";
import type { Overovana } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Odznak, Sdeleni } from "./ui";
import { SeznamZdroju } from "./zdroje";
import { sklon, Vlajka } from "./zeme";

/*
  Právě ověřujeme.

  Řeší jedinou díru v přehledu: zpráva může být důležitá a přitom ještě
  neověřená. Dosud propadla úplně — na úvodní straně byly jen ověřené
  záznamy a čtenář se o věci nedozvěděl nic.

  Web o takové zprávě NETVRDÍ, že platí. Tvrdí tři věci, které si sám
  ověřil: kdo ji vydal, že ji projekt nemá potvrzenou, a co k ní říkají
  (nebo neříkají) úřady. Všechny tři jsou pravdivé a doložitelné.

  Pořadí na kartě je proto obrácené, než jak to dělají média: první je
  úřední stav, teprve pak tvrzení. A poslední řádek je vždycky o tom,
  že čtenář zatím nemá co dělat — protože skoro vždycky nemá.

  Barvu závažnosti tahle karta nepoužívá. Barva na tomhle webu znamená
  ohodnocenou závažnost a tady žádná ohodnocená není.

  Lhůta se počítá v prohlížeči: po jejím uplynutí karta zmizí i mezi
  sestaveními webu, takže tu nezůstane viset tvrzení, které nikdo
  nepotvrdil.
*/

function zbyva(doKdy: string, ted: number): string | null {
  const h = Math.floor((new Date(doKdy).getTime() - ted) / 3_600_000);
  if (h < 0) return null;
  if (h < 1) return "uzavřeme do hodiny";
  if (h < 24) return `uzavřeme do ${h} ${sklon(h, "hodiny", "hodin", "hodin")}`;
  const d = Math.floor(h / 24);
  return `uzavřeme do ${d} ${sklon(d, "dne", "dnů", "dnů")}`;
}

function Karta({ o, ted }: { o: Overovana; ted: number }) {
  const lhuta = zbyva(o.uzavritDo, ted);
  return (
    <article className="overflow-hidden rounded-[22px] border border-dashed border-jantar/55 bg-jantar/[0.07]">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-dashed border-jantar/35 px-5 py-3">
        <Odznak ton="pozor" duraz="silny" ikona="otaznik">Neověřeno — ověřujeme</Odznak>
        <span className="inline-flex items-center gap-1.5 text-drobne text-tlum">
          <Vlajka kod={o.kodZeme} /> {o.kodZeme === "CZ" ? "Česko" : o.zeme}
        </span>
        <span aria-hidden className="text-tlum2">·</span>
        <span className="cislice text-drobne text-tlum2">naposledy prověřeno {datumCasPraha(o.overenoNaposledy)}</span>
        {lhuta && <span className="ml-auto text-drobne text-tlum2">{lhuta}</span>}
      </header>

      <div className="space-y-4 p-5">
        {/* Úřední stav stojí první. Je to to jediné, co je tu jisté. */}
        <section>
          <h3 className="flex items-center gap-2 text-zaklad font-bold text-inkoust">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-klid/15 text-klid-text"><Ikona nazev="fajfka" velikost={12} tah={2.2} /></span>
            Co je jisté: co říkají úřady
          </h3>
          <ul className="mt-1.5 space-y-1 pl-8">
            {o.coRikajiUrady.map((t) => (
              <li key={t} className="text-zaklad leading-relaxed text-inkoust">{t}</li>
            ))}
          </ul>
        </section>

        <section className="border-t border-dashed border-jantar/30 pt-3.5">
          <h3 className="flex items-center gap-2 text-zaklad font-bold text-inkoust">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-jantar/20 text-jantar"><Ikona nazev="bublina" velikost={12} tah={2.2} /></span>
            Co se zatím jen hlásí
          </h3>
          <p className="mt-1.5 pl-8 text-zaklad leading-relaxed text-tlum">{o.coSeHlasi}</p>
          <div className="mt-2.5 pl-8">
            <div className="stitek mb-1.5">Kdo to uvádí ({o.kdoHlasi.length})</div>
            <SeznamZdroju zdroje={o.kdoHlasi.map((z) => ({ ...z, publikovano: "", jazyk: "cs" }))} husty />
          </div>
        </section>

        <section className="border-t border-dashed border-jantar/30 pt-3.5">
          <h3 className="flex items-center gap-2 text-zaklad font-bold text-inkoust">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-plocha2 text-tlum2"><Ikona nazev="lupa" velikost={12} tah={2.2} /></span>
            Co jsme ověřili my
          </h3>
          <ul className="mt-1.5 space-y-1 pl-8">
            {o.coJsmeOverili.map((t) => (
              <li key={t} className="text-zaklad leading-relaxed text-tlum">{t}</li>
            ))}
          </ul>
          <p className="mt-2 pl-8 text-zaklad leading-relaxed text-tlum">
            <b className="font-semibold text-inkoust">Kdyby to platilo:</b> {o.kdybyPlatilo}
          </p>
        </section>

        {/* Poslední slovo má vždycky pokyn, ne tvrzení. */}
        <p className="flex items-start gap-2.5 rounded-[18px] border border-linka2 bg-plocha px-4 py-3">
          <span className="mt-[1px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-klid-text">
            <Ikona nazev="stit" velikost={15} tah={2} />
          </span>
          <span className="text-zaklad leading-relaxed text-tlum">
            <b className="font-bold text-inkoust">Co dělat teď:</b> {o.coDelatTed}
          </span>
        </p>
      </div>
    </article>
  );
}

export function PruhOverujeme({
  aktivni, uzavrene, ted,
}: {
  aktivni: Overovana[]; uzavrene: Overovana[]; ted: number;
}) {
  // Lhůta se musí počítat podle hodin čtenáře, ne podle posledního sestavení.
  const [cas, setCas] = useState(ted);
  useEffect(() => {
    setCas(Date.now());
    const t = setInterval(() => setCas(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const ziveKarty = aktivni.filter((o) => new Date(o.uzavritDo).getTime() > cas);
  const dodatecneUzavrene = aktivni.filter((o) => new Date(o.uzavritDo).getTime() <= cas);
  const vsechnyUzavrene = [...uzavrene, ...dodatecneUzavrene];

  if (!ziveKarty.length && !vsechnyUzavrene.length) return null;

  return (
    <section aria-label="Právě ověřujeme" className="mb-4">
      {ziveKarty.length > 0 && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="stitek-znacky">Právě ověřujeme</span>
            <span className="text-drobne text-tlum2">
              {ziveKarty.length} {sklon(ziveKarty.length, "zpráva, kterou", "zprávy, které", "zpráv, které")} zatím nemáme potvrzené
            </span>
          </div>
          <div className="space-y-2.5">
            {ziveKarty.map((o) => <Karta key={o.slug} o={o} ted={cas} />)}
          </div>
          <Sdeleni ton="neutral" ikona="vaha" trida="mt-2.5">
            Tohle nejsou naše zjištění a do žádného počtu ani hodnocení na téhle stránce nevstupují. Neposíláme je
            ani do kanálů. Uvádíme je proto, že mlčet o něčem, co se šíří, je horší než napsat, co o tom doopravdy víme.
          </Sdeleni>
        </>
      )}

      {vsechnyUzavrene.length > 0 && (
        <details className="group mt-2.5 overflow-hidden rounded-[18px] border border-linka2 bg-plocha">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-male font-semibold text-inkoust hover:bg-plocha2">
            <span>Jak dopadly starší ověřované zprávy ({vsechnyUzavrene.length})</span>
            <Ikona nazev="dolu" velikost={13} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-linka2 border-t border-linka2">
            {vsechnyUzavrene.map((o) => {
              const vyprselo = o.stav === "overujeme";
              return (
                <li key={o.slug} className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2 text-drobne">
                    <Odznak ton={o.stav === "potvrzeno" ? "pozor" : "klid"} duraz="silny">
                      {o.stav === "potvrzeno" ? "potvrdilo se" : o.stav === "vyvraceno" ? "vyvráceno" : "nepotvrzeno"}
                    </Odznak>
                    <span className="cislice text-tlum2">{datumCasPraha(o.zacalo)}</span>
                  </span>
                  <span className="mt-1 block text-zaklad leading-relaxed text-tlum">{o.coSeHlasi}</span>
                  <span className="mt-1 block text-male leading-relaxed text-tlum2">
                    {o.jakDopadlo ?? (vyprselo ? "Uplynula lhůta bez potvrzení. Z přehledu jsme to stáhli." : "")}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
