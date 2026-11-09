"use client";

import { HODIN_DO_VYPADKU } from "./banner-stari-klient";

import Link from "next/link";
import { datumCasPraha, datumPraha } from "@/lib/cas";
import { useZiveHodiny } from "@/lib/cas-klient";
import { vystraha } from "@/lib/data-lehka";
import { NAZVY_NALIEHAVE, naliehaveVOkne as naliehaveVOkneLib } from "@/lib/naliehave";
import { pocetZdroju, seskupSignaly } from "@/lib/signaly";
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
    2. zachycené naléhavé signály, které ještě nikdo neověřil a jejichž
       lhůta podle druhu ještě běží (src/lib/naliehave.ts, PLATNOST_HODIN) —
       starší sem nepatří, protože „urgentní" je o čase,
    3. nic z toho — a to se taky napíše, protože prázdné místo by čtenář
       četl jako „web nefunguje", ne jako „je klid".

  Neověřené je vždy označené jako neověřené. Rozdíl mezi „platí" a „někdo to
  píše" je jediná věc, kterou tahle sekce nesmí rozmazat.
*/

const NAZVY = NAZVY_NALIEHAVE;

/*
  Jak staré smí být zachycené hlášení, aby se ještě vešlo pod slovo
  „urgentní". Bez stropu tu týden visela zpráva z osmého září jako
  naléhavá — a „urgentní" pak neznamená nic. Do 9. 11. 2026 platilo pevně
  48 hodin; od té doby lhůta podle druhu (posílení hranice týden, narušení
  vzdušného prostoru tři dny), stejná jako ve sloupci Signály z médií.
  Starší zachycené zprávy nemizí, jen patří mezi události, ne sem.
*/

/**
 * Stav naléhavosti pro postranní souhrn (úvod v2): jedno slovo, jedna barva.
 * Táž logika jako pás níž — výstraha, naléhavá zachycená zpráva, stará
 * data (žádná zelená bez čerstvé kontroly), jinak klid.
 */
export interface NaliehavaPolozka { id: string; titulek: string; druh: string; datum: string; zdroj: string; url: string; /** Kolik redakcí o téže události píše. */ zdroju: number }

export interface SkupinaNaliehavych { druh: string; /** Počet událostí tohoto druhu. */ pocet: number; /** Počet redakcí dohromady. */ zdroju: number }

export function stavNalehavosti(kandidati: Kandidat[], zkontrolovano: string | null, ted: number): { ton: "deje" | "stary" | "klid"; text: string; dodatek: string | null; polozky: NaliehavaPolozka[]; skupiny: SkupinaNaliehavych[] } {
  const v = vystraha();
  if (v) return { ton: "deje", text: `Platí: ${v.nadpis}`, dodatek: datumCasPraha(v.kdy), polozky: [], skupiny: [] };
  /*
    Tatáž událost z několika redakcí je jedna událost (3. 11. 2026): sloupec
    Signály z médií i tenhle souhrn ji počítají jednou a vedle ní říkají,
    kolik zdrojů o ní píše. Pravidlo slučování je společné (src/lib/signaly.ts).
  */
  const vOkne = new Set(naliehaveVOkneLib(kandidati, ted, undefined, 100).map((k) => k.id));
  /* Skupiny se dělají nad všemi zachycenými (i neoznačenými), aby počet zdrojů vyšel stejně jako ve sloupci; zůstanou ty s naléhavou zprávou v okně. */
  const n = seskupSignaly(kandidati).filter((g) => g.polozky.some((p) => vOkne.has(p.id))).slice(0, 5);
  /*
    Položky jdou ven i jednotlivě: souhrn v úvodu na ně odkazuje (fronta
    na stránce Události s kotvou na kandidáta), aby čtenář i správce
    viděli, O ČEM zpráva je a kde se schvaluje — ne jen že „dvě čekají“.
  */
  /*
    Tatáž událost chodí v několika jazycích (Polsko u Kaliningradu: čtyři
    média). Souhrn proto počítá druhy, ne titulky — „posílení hranice (4)“
    říká víc než čtyři stejné řádky a nekřičí.
  */
  if (n.length) {
    const druhSkupiny = (g: (typeof n)[number]) => NAZVY[g.polozky.find((p) => vOkne.has(p.id))!.naliehave!.druh];
    const skupiny = new Map<string, SkupinaNaliehavych>();
    for (const g of n) {
      const druh = druhSkupiny(g);
      const s = skupiny.get(druh) ?? { druh, pocet: 0, zdroju: 0 };
      s.pocet += 1;
      s.zdroju += pocetZdroju(g.polozky);
      skupiny.set(druh, s);
    }
    return {
      ton: "deje",
      text: n.length === 1 ? "Zachycená událost k ověření" : n.length < 5 ? `${n.length} zachycené události k ověření` : `${n.length} zachycených událostí k ověření`,
      dodatek: druhSkupiny(n[0]),
      polozky: n.map((g) => ({ id: g.hlavni.id, titulek: g.hlavni.titulek, druh: druhSkupiny(g), datum: datumPraha(g.hlavni.publikovano ?? g.hlavni.zachyceno), zdroj: g.hlavni.zdroj.nazev, url: g.hlavni.zdroj.url, zdroju: pocetZdroju(g.polozky) })),
      skupiny: [...skupiny.values()],
    };
  }
  const stary = !zkontrolovano || ted - new Date(zkontrolovano).getTime() > HODIN_DO_VYPADKU * 3_600_000;
  if (stary) { const h = zkontrolovano ? Math.round((ted - new Date(zkontrolovano).getTime()) / 3_600_000) : null; return { ton: "stary", text: h === null ? "Kontrola zdrojů" : `Poslední kontrola před ${h} h`, dodatek: zkontrolovano ? datumCasPraha(zkontrolovano) : null, polozky: [], skupiny: [] }; }
  /*
    26. 9. 2026: dřív „Nic naléhavého za 48 h — žádná mobilizace, krizové
    vysílání ani mimořádný stav“, zeleně. Tvrdilo to víc, než sběr ví:
    čte média a titulní stránky úřadů, ne výstražné systémy. Teď to říká
    jen to, co je pravda — náš sběr nic nezachytil — a barvu nemá.
  */
  return { ton: "klid", text: "Náš sběr nezachytil platnou naléhavou zprávu", dodatek: "Týká se zpráv, které sběr zachytil. Úřední výstrahy a stav zdrojů jsou v Rychlém přehledu.", polozky: [], skupiny: [] };
}

/** Naléhavé zachycené zprávy, jejichž lhůta běží, nejnovější první. Nejvýš pět. */
export function naliehaveVOkne(kandidati: Kandidat[], ted: number) {
  return naliehaveVOkneLib(kandidati, ted);
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
            <b className="text-inkoust">Sběr nezachytil nic naléhavého.</b> Ve sledovaných zdrojích není platná zpráva
            o vyhlášené mobilizaci, krizovém vysílání ani mimořádném právním stavu.
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
  když platí výstraha nebo sběr zachytil naléhavou zprávu, jejíž lhůta
  běží, zelený, když nic. Barvu rámečku má jinak jen naléhavý řádek ve
  sloupci Signály z médií: tady barva nese odpověď na otázku „děje se
  něco?“ a čte se dřív než text.
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
          /*
            Každá zpráva zvlášť a proklikem: do fronty na stránce Události
            (kotva na kandidáta) a na zdroj. Dřív tu byl jen počet a první
            druh — čtenář se k ničemu nedostal a správce nevěděl, co schválit.
          */
          <>
            <b className="font-semibold text-inkoust">Sběr zachytil {naliehave.length === 1 ? "naléhavou zprávu" : naliehave.length < 5 ? `${naliehave.length} naléhavé zprávy` : `${naliehave.length} naléhavých zpráv`}, {naliehave.length === 1 ? "čeká" : naliehave.length < 5 ? "čekají" : "čeká"} na ověření.</b>
            <span className="mt-1 block space-y-0.5">
              {naliehave.map((k) => (
                <span key={k.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="cislice shrink-0 text-mikro text-tlum2">{datumPraha(k.publikovano ?? k.zachyceno)}</span>
                  <Link href={`/udalosti/?tab=cekajici#${k.id}`} className="min-w-0 text-inkoust underline decoration-linka underline-offset-4 hover:decoration-akcent">{k.titulek}</Link>
                  <span className="shrink-0 text-mikro text-tlum2">{NAZVY[k.naliehave!.druh]} · <a href={k.zdroj.url} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-inkoust">{k.zdroj.nazev}</a> · neověřeno</span>
                </span>
              ))}
            </span>
          </>
        ) : stary ? (
          <>Naléhavé zprávy sledujeme průběžně.{zkontrolovano ? <span className="cislice text-mikro text-tlum2"> · aktualizováno {datumCasPraha(zkontrolovano)}</span> : null}</>
        ) : (
          /*
            Audit 23. 9. 2026 (P0-5): „Teď nic urgentního. Žádná mobilizace…"
            tvrdilo zápor bez dokladu a bez času. Teď jen to, co víme,
            a vždy s časem kontroly.
          */
          <><b className="font-semibold text-inkoust">Náš sběr nezachytil nic naléhavého.</b> Nenašli jsme platnou zprávu o vyhlášení mobilizace, krizovém vysílání ani mimořádném stavu.{zkontrolovano ? <span className="cislice text-mikro text-tlum2"> · zdroje čteny {datumCasPraha(zkontrolovano)}</span> : <span className="text-mikro text-tlum2"> · čas kontroly neznámý</span>}</>
        )}
      </span>
      <Tlacitko kam="/odber/" varianta="plny" velikost="s" ikonaVpravo="nahoru" trida="shrink-0 whitespace-nowrap [&>svg:last-child]:rotate-90">Jak se to dozvíte hned</Tlacitko>
    </div>
  );
}
