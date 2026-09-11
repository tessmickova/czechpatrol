import Link from "next/link";
import { datumZdroje } from "@/lib/format";
import { METODY, type Metoda } from "@/lib/metody";
import { JISTOTY } from "@/lib/skala";
import type { Jistota, Kampan, ZasazenySubjekt } from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { Odznak, OdznakZavaznosti, Sdeleni, type Ton } from "./ui";
import { Napoveda } from "./zaklad";
import { SeznamZdroju } from "./zdroje";
import { sklon, Vlajka } from "./zeme";

/*
  Manipulace a útoky na občany.

  Operace není událost. Nemá jedno místo ani jeden okamžik, obvykle míří na
  víc zemí naráz a nedá se odbýt jedním odstavcem. Karta ji proto rozebírá
  na šest částí — a hlavně odděluje dvě otázky, které se všude slévají:

    1. Je doložené, že šlo o zásah?  (z obsahu a technických stop)
    2. Kdo za tím stojí?             (skoro vždy jen úředním závěrem)

  Že je něco prokazatelně podvrh, neříká nic o tom, kdo ho vyrobil. Kdo obojí
  spojí do jedné věty, tvrdí víc, než má doloženo — a právě na tom se dá
  projekt nejsnáz nachytat.

  Pojmy, které část čtenářů rovnou odradí, tu schválně nejsou. Web popisuje
  skutky — podvržený dokument, napodobený web, ukradená identita — ne nálepky.
*/

/** Šest oddílů karty. Pořadí je pevné: co se tvrdilo → co z toho platí → co dál. */
const CASTI: { klic: keyof Kampan; nadpis: string; popis: string; ikona: NazevIkony }[] = [
  { klic: "tvrzeni", nadpis: "Co se tvrdilo", popis: "Obsah operace vlastními slovy, ne parafráze.", ikona: "bublina" },
  { klic: "kanaly", nadpis: "Jak se to šířilo", popis: "Kudy to šlo k lidem — weby, profily, placená propagace.", ikona: "komunikace" },
  { klic: "skutecnost", nadpis: "Jak to doopravdy je", popis: "Co je doložené z jiných zdrojů.", ikona: "fajfka" },
  { klic: "reakce", nadpis: "Kdo na to reagoval", popis: "Úřady, instituce a dotčené strany.", ikona: "vaha" },
  { klic: "coByPotvrdilo", nadpis: "Co by otázku uzavřelo", popis: "Co by muselo vyjít najevo, aby se dalo říct, kdo za tím stojí.", ikona: "lupa" },
];

/*
  Jistota se mapuje na tón stavebnice, ne na vlastní barvy.

  Doložené je zelené, rozpracované jantarové, nedoložené šedé — nikdy naopak.
  Šedá u podezření je záměr: neříká „pozor“, říká „tohle zatím nevíme“.
  Kdyby měla tahle sekce vlastní paletu, četl by čtenář stejnou barvu jinak
  než o dvě sekce výš, kde znamená závažnost.
*/
const TON_JISTOTY: Record<Jistota, Ton> = {
  potvrzeno: "klid",
  vysoka: "klid",
  stredni: "pozor",
  nizka: "neutral",
};

const RAMECEK_JISTOTY: Record<Ton, string> = {
  klid: "border-[#5cbf8a]/50 bg-[#5cbf8a]/10 text-[#8fd6ae]",
  pozor: "border-[#d9b24c]/45 bg-[#d9b24c]/10 text-[#e6c977]",
  vazne: "border-[#e8484f]/50 bg-[#e8484f]/12 text-[#f2848a]",
  neutral: "border-linka bg-plocha2 text-tlum",
  akcent: "border-akcent/55 bg-akcent/12 text-akcent-svetla",
};

function StitekJistoty({ otazka, odpoved, jistota, duvod }: { otazka: string; odpoved: string; jistota: Jistota; duvod: string }) {
  return (
    <Napoveda cele popis={<span className="block">{duvod}</span>}>
      <span className={`flex min-h-[64px] w-full flex-col justify-center gap-1 rounded-[18px] border px-4 py-3 text-left ${RAMECEK_JISTOTY[TON_JISTOTY[jistota]]}`}>
        <span className="stitek !text-tlum2">{otazka}</span>
        <span className="text-[15.5px] font-bold leading-tight">{odpoved}</span>
        <span className="text-[11.5px] leading-tight opacity-90">jistota: {JISTOTY[jistota].nazev.toLowerCase()}</span>
      </span>
    </Napoveda>
  );
}

function Cast({ nadpis, popis, ikona, body }: { nadpis: string; popis: string; ikona: NazevIkony; body: string[] }) {
  if (!body.length) return null;
  return (
    <section className="border-t border-linka2 pt-4">
      <h4 className="flex items-center gap-2 text-[14.5px] font-bold text-inkoust">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev={ikona} velikost={14} tah={1.9} /></span>
        {nadpis}
      </h4>
      <p className="mt-1 pl-9 text-[12px] text-tlum2">{popis}</p>
      <ul className="mt-2 space-y-2 pl-9">
        {body.map((b) => (
          <li key={b} className="flex gap-2.5 text-[14.5px] leading-relaxed text-tlum">
            <span aria-hidden className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-akcent/70" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Jak se jmenuje druh zasaženého subjektu, aby to dávalo smysl bez legendy. */
const DRUH_SUBJEKTU: Record<ZasazenySubjekt["druh"], { nazev: string; ikona: NazevIkony }> = {
  medium: { nazev: "médium", ikona: "dokument" },
  urad: { nazev: "úřad", ikona: "vaha" },
  osoba: { nazev: "osoba", ikona: "uzivatel" },
  platforma: { nazev: "platforma", ikona: "komunikace" },
  verejnost: { nazev: "veřejnost", ikona: "globus" },
};

/**
 * Použité metody.
 *
 * Tohle je to, podle čeho se dá porovnávat napříč zeměmi: stejný postup
 * v Česku, v Polsku i ve Finsku znamená jednu školu, ne náhodu. Proto
 * jsou metody tučně, mají pevné názvy a dá se podle nich filtrovat.
 */
export function MetodyKampane({ metody, odkazovat = true }: { metody: string[]; odkazovat?: boolean }) {
  const zname = metody.filter((m): m is Metoda => m in METODY);
  if (!zname.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5 sm:pl-9">
      {zname.map((m) => {
        const d = METODY[m];
        const obsah = (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-akcent/45 bg-akcent/12 px-3 py-1.5 text-[12.5px] font-bold text-akcent-svetla transition-colors hover:bg-akcent/22">
            {d.nazev}
          </span>
        );
        return (
          <li key={m} title={`${d.popis} ${d.jakPoznat}`}>
            {odkazovat ? <Link href={`/manipulace/?metoda=${m}`}>{obsah}</Link> : obsah}
          </li>
        );
      })}
    </ul>
  );
}

export function KartaKampane({ k, nazvyZemi }: { k: Kampan; nazvyZemi: Record<string, string> }) {
  return (
    <article id={k.slug} className="scroll-mt-[84px] overflow-hidden rounded-[28px] border border-linka2 bg-plocha">
      <header className="border-b border-linka2 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-tlum">
          <span className="flex items-center gap-1.5">
            {k.kodyZemi.map((kod) => <Vlajka key={kod} kod={kod} />)}
          </span>
          <span>{k.kodyZemi.map((kod) => nazvyZemi[kod] ?? kod).join(" a ")}</span>
          <span aria-hidden className="text-tlum2">·</span>
          <span className="cislice">odhaleno {datumZdroje(k.odhaleno)}</span>
          <span aria-hidden className="text-tlum2">·</span>
          <span>{k.kdoOdhalil}</span>
          <Odznak ton={k.probiha ? "akcent" : "neutral"} duraz="silny" ikona={k.probiha ? "oko" : "hodiny"} trida="ml-auto">
            {k.probiha ? "běží dál" : "utichla"}
          </Odznak>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <span className="stitek">Cíl operace</span>
          <OdznakZavaznosti uroven={k.zavaznost} duraz="silny" />
          <Odznak ton="neutral">známá jako {k.oznaceni}</Odznak>
        </div>
        <h3 className="titul-mensi mt-2">{k.nazev}</h3>
        <p className="mt-2 text-[16px] leading-relaxed text-tlum">{k.titulek}</p>
      </header>

      {/* Použité metody — hned pod hlavičkou, protože podle nich se porovnává. */}
      <div className="border-b border-linka2 p-5 sm:p-6">
        <h4 className="flex items-center gap-2 text-[14.5px] font-bold text-inkoust">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev="zebrik" velikost={14} tah={1.9} /></span>
          Jakými způsoby
        </h4>
        <p className="mt-1 pl-9 text-[12px] text-tlum2">Klikněte na způsob a uvidíte, kde jinde v Evropě ho použili.</p>
        <MetodyKampane metody={k.metody} />
      </div>

      {/* Koho to zasáhlo nebo čí jméno bylo zneužito. */}
      {k.zasazeni.length > 0 && (
        <div className="border-b border-linka2 p-5 sm:p-6">
          <h4 className="flex items-center gap-2 text-[14.5px] font-bold text-inkoust">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev="terc" velikost={14} tah={1.9} /></span>
            Kdo byl zasažen nebo zneužit
          </h4>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2 sm:pl-9">
            {k.zasazeni.map((z) => (
              <li key={z.nazev} className="rounded-[18px] border border-linka2 bg-plocha2 px-3.5 py-3">
                <span className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-plocha text-tlum2"><Ikona nazev={DRUH_SUBJEKTU[z.druh].ikona} velikost={12} tah={1.9} /></span>
                  <span className="text-[14px] font-bold leading-tight text-inkoust">{z.nazev}</span>
                  <Odznak ton="neutral" trida="ml-auto">{DRUH_SUBJEKTU[z.druh].nazev}</Odznak>
                </span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-tlum">{z.jak}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dva štítky, dvě nezávislé otázky. Vedle sebe schválně. */}
      <div className="border-b border-linka2 p-5 sm:p-6">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <StitekJistoty
            otazka="Je zásah doložený?"
            odpoved={k.jistotaManipulace === "potvrzeno" || k.jistotaManipulace === "vysoka" ? "Ano, doloženo" : k.jistotaManipulace === "stredni" ? "Zatím jen pravděpodobně" : "Zatím sporné"}
            jistota={k.jistotaManipulace}
            duvod={k.duvodManipulace}
          />
          <StitekJistoty
            otazka="Kdo za tím stojí?"
            odpoved={k.puvodce.koho ? (k.puvodce.jistota === "potvrzeno" || k.puvodce.jistota === "vysoka" ? k.puvodce.koho : `${k.puvodce.koho} — zatím jen podezření`) : "Neznámý"}
            jistota={k.puvodce.jistota}
            duvod={k.puvodce.duvod}
          />
        </div>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-tlum2">
          Obě odpovědi jsou na sobě nezávislé. Že je něco prokazatelně podvrh, samo o sobě neříká nic o tom, kdo ho vyrobil.
        </p>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {CASTI.slice(0, 4).map((c) => (
          <Cast key={c.nadpis} nadpis={c.nadpis} popis={c.popis} ikona={c.ikona} body={k[c.klic] as string[]} />
        ))}

        <section className="border-t border-linka2 pt-4">
          <h4 className="flex items-center gap-2 text-[14.5px] font-bold text-inkoust">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev="terc" velikost={14} tah={1.9} /></span>
            Čemu to mělo posloužit
          </h4>
          <p className="mt-1 pl-9 text-[12px] text-tlum2">Hodnocení projektu, ne doložený fakt. Označeno schválně.</p>
          <p className="mt-2 rounded-[18px] border border-dashed border-linka bg-plocha2 px-4 py-3 text-[14.5px] leading-relaxed text-tlum sm:ml-9">{k.ucel}</p>
        </section>

        <Cast nadpis={CASTI[4].nadpis} popis={CASTI[4].popis} ikona={CASTI[4].ikona} body={k.coByPotvrdilo} />

        <section className="border-t border-linka2 pt-4">
          <h4 className="flex items-center gap-2 text-[14.5px] font-bold text-inkoust">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev="dokument" velikost={14} tah={1.9} /></span>
            Zdroje ({k.zdroje.length})
          </h4>
          <p className="mt-1 pl-9 text-[12px] text-tlum2">
            {k.zdroje.filter((z) => z.primarni).length} {sklon(k.zdroje.filter((z) => z.primarni).length, "úřední nebo přímo dotčený zdroj", "úřední nebo přímo dotčené zdroje", "úředních nebo přímo dotčených zdrojů")} z {k.zdroje.length}.
          </p>
          <div className="mt-2.5 sm:pl-9"><SeznamZdroju zdroje={k.zdroje} /></div>
        </section>
      </div>
    </article>
  );
}

/** Dlaždice na úvodní stranu: jedna kampaň, dvě odpovědi, odkaz na rozbor. */
export function DlazdiceKampane({ k, nazvyZemi, siroka = false }: { k: Kampan; nazvyZemi: Record<string, string>; siroka?: boolean }) {
  return (
    <Link
      href={`/manipulace/#${k.slug}`}
      className={`flex h-full flex-col gap-3 rounded-[22px] border border-linka2 bg-plocha p-5 transition-colors hover:border-akcent ${siroka ? "sm:grid sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] sm:items-center sm:gap-x-8 sm:p-6" : ""}`}
    >
      <span className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-tlum ${siroka ? "sm:col-start-1" : ""}`}>
        {k.kodyZemi.map((kod) => <Vlajka key={kod} kod={kod} />)}
        <span>{k.kodyZemi.map((kod) => nazvyZemi[kod] ?? kod).join(" a ")}</span>
        <span aria-hidden className="text-tlum2">·</span>
        <span className="cislice">{datumZdroje(k.odhaleno)}</span>
        <OdznakZavaznosti uroven={k.zavaznost} />
      </span>
      <span className={`font-bold leading-snug text-inkoust ${siroka ? "text-[21px] sm:col-start-1" : "text-[17px]"}`}>{k.nazev}</span>
      <span className={`text-[13px] leading-relaxed text-tlum ${siroka ? "sm:col-start-1" : ""}`}>
        {k.titulek}
      </span>
      <span className={`flex flex-wrap gap-1.5 ${siroka ? "sm:col-start-1" : ""}`}>
        {k.metody.filter((m): m is Metoda => m in METODY).slice(0, 3).map((m) => (
          <span key={m} className="inline-flex rounded-full border border-akcent/40 bg-akcent/10 px-2.5 py-1 text-[11.5px] font-bold text-akcent-svetla">
            {METODY[m].nazev}
          </span>
        ))}
        {k.metody.length > 3 && <span className="self-center text-[11.5px] text-tlum2">+ {k.metody.length - 3} dalších</span>}
      </span>
      <span className={`mt-auto flex flex-wrap gap-1.5 pt-1 ${siroka ? "sm:col-start-2 sm:row-start-1 sm:row-end-4 sm:mt-0 sm:flex-col sm:items-start sm:self-center sm:pt-0" : ""}`}>
        <Odznak ton={TON_JISTOTY[k.jistotaManipulace]} duraz="silny" ikona="fajfka">
          zásah: {k.jistotaManipulace === "potvrzeno" || k.jistotaManipulace === "vysoka" ? "doloženo" : k.jistotaManipulace === "stredni" ? "pravděpodobně" : "sporné"}
        </Odznak>
        <Odznak ton={TON_JISTOTY[k.puvodce.jistota]} duraz="silny" ikona="otaznik">
          původce: {k.puvodce.koho ? (k.puvodce.jistota === "potvrzeno" || k.puvodce.jistota === "vysoka" ? k.puvodce.koho.toLowerCase() : `${k.puvodce.koho.toLowerCase()} — podezření`) : "neznámý"}
        </Odznak>
      </span>
    </Link>
  );
}

/**
 * Kolik zpracovaných operací míří na kterou zemi.
 *
 * Číslo neříká, kolik jich proti té zemi běží — jen kolik jich máme
 * rozebraných. Jedna operace mířící na dvě země se počítá u obou, takže
 * součet přes země je vyšší než počet kampaní. Napsáno je to i v tabulce.
 */
export function TabulkaZemiKampani({
  radky, nazvyZemi, celkem,
}: {
  radky: { kodZeme: string; pocet: number; posledni: string }[];
  nazvyZemi: Record<string, string>;
  celkem: number;
}) {
  if (!radky.length) {
    return <Sdeleni ikona="lupa">Zatím nemáme rozebranou žádnou kampaň.</Sdeleni>;
  }
  const max = Math.max(...radky.map((r) => r.pocet));
  return (
    <div className="overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
      <ul className="divide-y divide-linka2">
        {radky.map((r) => (
          <li key={r.kodZeme}>
            <Link href={`/zeme/${r.kodZeme.toLowerCase()}/`} className="flex min-h-[52px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-plocha2 sm:px-5">
              <Vlajka kod={r.kodZeme} />
              <span className="w-[7.5rem] shrink-0 truncate text-[14.5px] font-semibold text-inkoust">{nazvyZemi[r.kodZeme] ?? r.kodZeme}</span>
              <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-linka2">
                <span className="block h-full rounded-full bg-akcent" style={{ width: `${(r.pocet / max) * 100}%` }} />
              </span>
              <span className="cislice w-6 shrink-0 text-right text-[15px] font-bold text-inkoust">{r.pocet}</span>
              <span className="hidden w-[10rem] shrink-0 whitespace-nowrap text-right text-[12px] text-tlum2 sm:block">naposledy {datumZdroje(r.posledni)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="border-t border-linka2 px-4 py-3 text-[12.5px] leading-relaxed text-tlum2 sm:px-5">
        Počítají se jen kampaně, které jsme rozebrali — ne všechno, co kde koluje. Jedna kampaň může mířit
        na několik zemí naráz a u každé se počítá, proto je součet vyšší než {celkem} {sklon(celkem, "rozebraná kampaň", "rozebrané kampaně", "rozebraných kampaní")}.
      </p>
    </div>
  );
}
