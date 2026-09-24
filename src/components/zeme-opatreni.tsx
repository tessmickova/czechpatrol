import { NadpisBloku } from "./nadpisy";
import { Odznak } from "./ui";
import type { OpatreniZeme } from "@/lib/typy";
import { datum } from "@/lib/format";

/*
  Opatření země: co doloženě udělala a co z pevného výčtu nemá.

  Výčet je stejný pro všechny země, aby se daly porovnat. „Chybí" je
  hodnocení projektu, ne fakt — a rozlišuje dvě různé věci: zdroj výslovně
  říká, že země opatření nemá, a nedohledáno. Kdyby se to slilo, stálo by
  na webu „Česko nemá protidronovou obranu" jen proto, že jsme ji nenašli.
*/
export function ZemeOpatreni({ polozky, nazvy, aktualizovano }: {
  polozky: OpatreniZeme[];
  nazvy: Record<string, string>;
  aktualizovano: string;
}) {
  if (!polozky.length) return null;
  const prijata = polozky.filter((p) => p.stav === "ano" || p.stav === "castecne");
  const chybi = polozky.filter((p) => p.stav === "ne");
  const nevime = polozky.filter((p) => p.stav === null && !p.nerelevantni);

  return (
    <div className="nalet mt-16 sm:mt-24">
      <NadpisBloku
        nadpis="Opatření"
        popis={`Doložené kroky a co z pevného výčtu chybí. Stav k ${datum(aktualizovano)}.`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Přijatá opatření" className="rounded-[22px] bg-plocha p-5 sm:p-6">
          <h3 className="titul-mensi">Přijato</h3>
          {prijata.length ? (
            <ul className="mt-4 space-y-3.5">
              {prijata.map((p) => (
                <li key={p.klic} className="text-male leading-relaxed text-tlum">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-inkoust">
                    {nazvy[p.klic] ?? p.klic}
                    {p.stav === "castecne" && <Odznak ton="pozor">částečně</Odznak>}
                  </span>
                  {p.popis}{" "}
                  {p.zdroj && (
                    <a href={p.zdroj.url} className="odkaz" rel="noopener noreferrer" target="_blank">zdroj</a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-male text-tlum">Nic z výčtu jsme zatím nedoložili.</p>
          )}
        </section>
        <section aria-label="Chybějící opatření" className="rounded-[22px] bg-plocha p-5 sm:p-6">
          <h3 className="titul-mensi">Chybí</h3>
          <p className="stitek mt-1">Hodnocení projektu podle pevného výčtu</p>
          {chybi.length > 0 && (
            <ul className="mt-4 space-y-3.5">
              {chybi.map((p) => (
                <li key={p.klic} className="text-male leading-relaxed text-tlum">
                  <span className="block font-semibold text-inkoust">{nazvy[p.klic] ?? p.klic}</span>
                  {p.popis}{" "}
                  {p.zdroj && (
                    <a href={p.zdroj.url} className="odkaz" rel="noopener noreferrer" target="_blank">zdroj</a>
                  )}
                </li>
              ))}
            </ul>
          )}
          {nevime.length > 0 && (
            <>
              <h4 className="stitek mt-5">Nedohledáno — bez dokladu, ne „nemá“</h4>
              <p className="mt-2 text-male leading-relaxed text-tlum">
                {nevime.map((p) => nazvy[p.klic] ?? p.klic).join(" · ")}
              </p>
            </>
          )}
          {!chybi.length && !nevime.length && <p className="mt-4 text-male text-tlum">Z výčtu nic nechybí.</p>}
        </section>
      </div>
    </div>
  );
}
