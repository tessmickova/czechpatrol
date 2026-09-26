"use client";

import { HODIN_DO_VYPADKU } from "./banner-stari-klient";

import Link from "next/link";
import { datumCasPraha, datumPraha } from "@/lib/cas";
import { useZiveHodiny } from "@/lib/cas-klient";
import { vystraha } from "@/lib/data-lehka";
import type { Kandidat } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Tlacitko } from "./ui";

/*
  Urgentní upozornění.

  Stojí hned pod úvodem — na místě, kde dřív byl rámeček s pěti velkými čísly
  (ta jsou teď v úvodu). Odpovídá na otázku, se kterou sem člověk ve strachu
  chodí: děje se právě teď něco, kvůli čemu bych měl něco dělat?

  Tři stupně, v tomhle pořadí:
    1. platná mimořádná výstraha — vyhlášená mobilizace, krizové vysílání,
    2. zachycené naléhavé signály z posledních 48 hodin, které ještě nikdo
       neověřil — starší sem nepatří, protože „urgentní" je o čase,
    3. nic z toho — a to se taky napíše, protože prázdné místo by čtenář
       četl jako „web nefunguje", ne jako „je klid".

  Neověřené je vždy označené jako neověřené. Rozdíl mezi „platí" a „někdo to
  píše" je jediná věc, kterou tahle sekce nesmí rozmazat.
*/

const NAZVY = {
  "mobilizace-rusko": "vyhlášení mobilizace v Rusku",
  "priprava-mobilizace": "přípravy mobilizace v Rusku",
  "krizove-vysilani": "krizové vysílání Českého rozhlasu",
  "clanek-nato": "článek 4 nebo 5 NATO",
  "pravni-stav-cr": "mimořádný právní stav v ČR",
  "hranice-cr": "uzavření hranic ČR",
  "vzdusny-prostor-nato": "narušení vzdušného prostoru Aliance",
} as const;

/*
  Jak staré smí být zachycené hlášení, aby se ještě vešlo pod slovo
  „urgentní". Bez tohohle stropu tu týden visela zpráva z osmého září
  jako naléhavá — a „urgentní" pak neznamená nic. Starší zachycené zprávy
  nemizí, jen patří mezi události, ne sem.
*/
const OKNO_HODIN = 48;

/**
 * Stav naléhavosti pro postranní souhrn (úvod v2): jedno slovo, jedna barva.
 * Táž logika jako pás níž — výstraha, naléhavá zachycená zpráva, stará
 * data (žádná zelená bez čerstvé kontroly), jinak klid.
 */
export function stavNalehavosti(kandidati: Kandidat[], zkontrolovano: string | null, ted: number): { ton: "deje" | "stary" | "klid"; text: string; dodatek: string | null } {
  const v = vystraha();
  if (v) return { ton: "deje", text: `Platí: ${v.nadpis}`, dodatek: datumCasPraha(v.kdy) };
  const n = naliehaveVOkne(kandidati, ted);
  if (n.length) return { ton: "deje", text: n.length === 1 ? "Naléhavá zpráva čeká na ověření" : `${n.length} naléhavé zprávy čekají na ověření`, dodatek: NAZVY[n[0].naliehave!.druh] };
  const stary = !zkontrolovano || ted - new Date(zkontrolovano).getTime() > HODIN_DO_VYPADKU * 3_600_000;
  if (stary) { const h = zkontrolovano ? Math.round((ted - new Date(zkontrolovano).getTime()) / 3_600_000) : null; return { ton: "stary", text: h === null ? "Kontrola zdrojů" : `Poslední kontrola před ${h} h`, dodatek: zkontrolovano ? datumCasPraha(zkontrolovano) : null }; }
  /*
    26. 9. 2026: dřív „Nic naléhavého za 48 h — žádná mobilizace, krizové
    vysílání ani mimořádný stav“, zeleně. Tvrdilo to víc, než sběr ví:
    čte média a titulní stránky úřadů, ne výstražné systémy. Teď to říká
    jen to, co je pravda — náš sběr nic nezachytil — a barvu nemá.
  */
  return { ton: "klid", text: `Náš sběr nezachytil naléhavou zprávu · ${OKNO_HODIN} h`, dodatek: "Týká se zpráv, které sběr zachytil. Úřední výstrahy a stav zdrojů jsou v Rychlém přehledu." };
}

/** Naléhavé zachycené zprávy uvnitř okna, nejnovější první. Nejvýš tři. */
export function naliehaveVOkne(kandidati: Kandidat[], ted: number) {
  return kandidati
    .filter((k) => k.naliehave)
    .filter((k) => ted - new Date(k.publikovano ?? k.zachyceno).getTime() <= OKNO_HODIN * 3_600_000)
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, 3);
}

export function UrgentniUpozorneni({
  kandidati,
  zkontrolovano,
  ted = Date.now(),
}: {
  kandidati: Kandidat[];
  /** Kdy se naposledy četly zdroje. Bez toho je „nic urgentního" slib bez krytí. */
  zkontrolovano: string | null;
  ted?: number;
}) {
  const v = vystraha();
  /*
    Okno se počítá proti hodinám prohlížeče, ne proti času sestavení. Web je
    statický: kdyby se čas vzal z buildu, zamrzl by spolu s ním a zachycená
    zpráva by pod nadpisem „urgentní" zůstala viset i týden po tom, co se
    web přestal sestavovat. Právě tehdy je na tom nejvíc záležet.
  */
  const naliehave = naliehaveVOkne(kandidati, useZiveHodiny(ted));

  return (
    <section aria-labelledby="urgentni-nadpis" className="mt-4 overflow-hidden rounded-[20px] bg-plocha">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
        <h2 id="urgentni-nadpis" className="stitek flex items-center gap-1.5">
          <Ikona nazev="sirena" velikost={12} tah={2} />
          Urgentní upozornění
        </h2>
        {zkontrolovano && (
          <span className="cislice text-mikro text-tlum2">zdroje čteny {datumCasPraha(zkontrolovano)}</span>
        )}
      </div>

      {v ? (
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="stitek-tmavy rounded-full border border-akcent/60 px-2 py-[3px] text-akcent">Platí</span>
            <span className="cislice text-mikro text-tlum2">{datumCasPraha(v.kdy)}</span>
          </div>
          <p className="mt-1.5 text-vetsi font-bold leading-snug text-inkoust">{v.nadpis}</p>
          <p className="mt-1 text-male leading-snug text-tlum">{v.text}</p>
        </div>
      ) : naliehave.length > 0 ? (
        <div className="px-4 py-3">
          <p className="text-male text-tlum">
            <b className="text-inkoust">Žádná výstraha neplatí.</b> Sběr ale zachytil zprávy, které čekají na ověření
            — nejsou potvrzené a do počtů nevstupují.
          </p>
          <ul className="mt-2 space-y-1.5">
            {naliehave.map((k) => (
              <li key={k.id} className="flex flex-wrap items-baseline gap-x-2 text-male">
                <span className="cislice shrink-0 text-mikro text-tlum2">{datumPraha(k.publikovano ?? k.zachyceno)}</span>
                <span className="stitek-tmavy shrink-0 text-akcent">{NAZVY[k.naliehave!.druh]}</span>
                <a href={k.zdroj.url} target="_blank" rel="nofollow noopener noreferrer" className="min-w-0 text-tlum hover:text-inkoust">
                  {k.titulek}
                </a>
                {/* Titulek bývá v jazyce zdroje. Bez jména zdroje není poznat, odkud věta je. */}
                <span className="shrink-0 text-mikro text-tlum2">{k.zdroj.nazev}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
          <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-klid" />
          <p className="text-male text-tlum">
            <b className="text-inkoust">Sběr nezachytil nic naléhavého.</b> Ve sledovaných zdrojích není za posledních
            {" "}{OKNO_HODIN} hodin vyhlášená mobilizace, krizové vysílání ani mimořádný právní stav.
          </p>
        </div>
      )}

      <div className="px-4 py-2">
        <Link href="/odber/" className="stitek inline-flex min-h-[32px] items-center text-tlum2 transition-colors hover:text-inkoust">
          Jak se to dozvíte hned →
        </Link>
      </div>
    </section>
  );
}

/*
  Kompaktní podoba pro úvod: jeden řádek v rámečku barvy stavu — červený,
  když platí výstraha nebo sběr zachytil naléhavou zprávu, zelený, když
  za posledních 48 hodin nic. Jediné místo na webu, kde má rámeček barvu:
  tady barva nese odpověď na otázku „děje se něco?“ a čte se dřív než text.
  Slovo a tečka jsou u toho vždycky — kdo barvy nerozliší, přečte totéž.
*/
export function UrgentniPas({ kandidati, zkontrolovano, ted = Date.now() }: { kandidati: Kandidat[]; zkontrolovano: string | null; ted?: number }) {
  const v = vystraha();
  const naliehave = naliehaveVOkne(kandidati, useZiveHodiny(ted));
  const deje = Boolean(v) || naliehave.length > 0;
  const nyni = useZiveHodiny(ted);
  /* Stará data nejsou klid: bez zelené, když sběr dlouho neběžel. */
  const stary = !zkontrolovano || nyni - new Date(zkontrolovano).getTime() > HODIN_DO_VYPADKU * 3_600_000;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border px-4 py-3 ${deje ? "border-akcent/70" : stary ? "border-linka" : "border-klid/60"}`} role="status" aria-label="Urgentní upozornění">
      <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${deje ? "bg-akcent" : stary ? "bg-tlum2" : "bg-klid"}`} />
      {/* Minimální šířka textu: na úzkém displeji spadne tlačítko pod text, místo aby text mačkalo do sloupečku. */}
      <span className="min-w-[14rem] flex-1 text-male leading-snug text-tlum">
        {v ? (
          <><b className="font-semibold text-inkoust">Platí: {v.nadpis}</b> <span className="cislice text-mikro text-tlum2">{datumCasPraha(v.kdy)}</span></>
        ) : naliehave.length > 0 ? (
          <><b className="font-semibold text-inkoust">Sběr zachytil {naliehave.length === 1 ? "naléhavou zprávu" : `${naliehave.length} naléhavé zprávy`}, čekají na ověření.</b> {NAZVY[naliehave[0].naliehave!.druh]}{naliehave[0].publikovano || naliehave[0].zachyceno ? ` · ${datumPraha(naliehave[0].publikovano ?? naliehave[0].zachyceno)}` : ""}</>
        ) : stary ? (
          <>Naléhavé zprávy sledujeme průběžně.{zkontrolovano ? <span className="cislice text-mikro text-tlum2"> · aktualizováno {datumCasPraha(zkontrolovano)}</span> : null}</>
        ) : (
          /*
            Audit 23. 9. 2026 (P0-5): „Teď nic urgentního. Žádná mobilizace…"
            tvrdilo zápor bez dokladu a bez času. Teď jen to, co víme,
            a vždy s časem kontroly.
          */
          <><b className="font-semibold text-inkoust">Náš sběr nezachytil nic naléhavého.</b> Za {OKNO_HODIN} h jsme nenašli vyhlášení mobilizace, krizové vysílání ani mimořádný stav.{zkontrolovano ? <span className="cislice text-mikro text-tlum2"> · zdroje čteny {datumCasPraha(zkontrolovano)}</span> : <span className="text-mikro text-tlum2"> · čas kontroly neznámý</span>}</>
        )}
      </span>
      <Tlacitko kam="/odber/" varianta="plny" velikost="s" ikonaVpravo="nahoru" trida="shrink-0 whitespace-nowrap [&>svg:last-child]:rotate-90">Jak se to dozvíte hned</Tlacitko>
    </div>
  );
}
