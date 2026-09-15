import Link from "next/link";
import { DISKUZE, KANALY } from "@/config/web";
import { Ikona } from "./ikony";
import { Znacka } from "./znacka";

/*
  Komunita jako kolečka.

  Kolečka schválně nejsou fotky ani jména. Nemáme souhlas skutečných lidí
  a vymýšlet si tváře odběratelů by bylo přesně to, co tenhle projekt jinde
  vytýká ostatním. Jsou to značky místa: tolik koleček, kolik jich je vidět,
  a vedle nich napsané, co o komunitě doopravdy víme.

  Počet odběratelů se vyplňuje ručně podle skutečného čísla z Telegramu.
  Nula znamená „nevíme“, ne „nikdo“ — a web to tak i napíše.
*/

const KRUH = "grid h-8 w-8 place-items-center rounded-full border-2 border-papir bg-plocha2 text-tlum2";

export function KruhyKomunity({ onKlik }: { onKlik?: () => void }) {
  const mistCelkem = 5;
  const diskuzeBezi = Boolean(DISKUZE.url);

  return (
    <div className="rounded-[18px] border border-linka2 bg-plocha p-3.5">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex shrink-0 -space-x-2.5">
          {Array.from({ length: mistCelkem }, (_, i) =>
            i === mistCelkem - 1 ? (
              <span key={i} className={`${KRUH} bg-akcent/15 text-akcent`}>
                <Znacka velikost={17} tmave />
              </span>
            ) : (
              <span key={i} className={KRUH}>
                <Ikona nazev="uzivatel" velikost={15} tah={1.8} />
              </span>
            ),
          )}
        </span>
        <span className="min-w-0 flex-1 text-male leading-snug text-tlum">
          {DISKUZE.odberatelu > 0 ? (
            <>
              <b className="cislice font-bold text-inkoust">{DISKUZE.odberatelu}</b> lidí odebírá upozornění.
            </>
          ) : (
            <>Kolik lidí kanál odebírá, veřejně neuvádíme — dokud číslo nedoložíme, nebudeme ho odhadovat.</>
          )}
        </span>
      </div>

      {diskuzeBezi ? (
        <a
          href={DISKUZE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex min-h-[44px] items-center gap-2.5 rounded-[18px] border border-akcent/50 bg-akcent/12 px-3 transition-colors hover:bg-akcent/20"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-akcent/20 text-akcent"><Ikona nazev="bublina" velikost={14} tah={1.9} /></span>
          <span className="min-w-0 flex-1 text-male font-semibold text-inkoust">Živá diskuze k tématu</span>
          <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-45 text-akcent" />
        </a>
      ) : (
        <p className="mt-2.5 rounded-[18px] border border-dashed border-linka px-3 py-2.5 text-drobne leading-relaxed text-tlum2">
          Živá diskuze zrovna neběží. Otevíráme ji jen u témat, kde to dává smysl — a přístup do ní dostanou
          odběratelé {KANALY.telegram ? "telegramového kanálu" : "upozornění"}.
        </p>
      )}

      <p className="mt-2 text-drobne leading-relaxed text-tlum2">
        Kolečka jsou značky míst, ne skuteční lidé. Fotky ani jména odběratelů nezveřejňujeme.{" "}
        <Link href="/o-projektu/" onClick={onKlik} className="odkaz">Kdo za projektem stojí →</Link>
      </p>
    </div>
  );
}
