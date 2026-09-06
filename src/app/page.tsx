import Link from "next/link";
import { BannerStari } from "@/components/cerstvost";
import { HodnoceniProjektu } from "@/components/hodnoceni";
import { Ikona } from "@/components/ikony";
import { OdberPanel } from "@/components/odber";
import { Opatreni } from "@/components/opatreni";
import { sklon, Vlajka } from "@/components/zeme";
import { druh, kdyZjisteno, pocty, podlePuvodce, podleZemi, posledniZmeny, pripady, vyber } from "@/lib/agregace";
import { datumCasPraha, datumPraha } from "@/lib/cas";
import { celkovyStav, incidenty, nato, posledniOvereni, pravniStav, provoz, urovenObcanu, watchlist } from "@/lib/data";
import { UROVNE } from "@/lib/skala";

/*
  Přehled.

  Pořadí odpovídá tomu, co člověk potřebuje vědět nejdřív:
  1. kdy byla data naposledy úspěšně ověřena,
  2. co se děje a co z toho plyne pro běžný život — se zdroji,
  3. co se naposledy skutečně změnilo,
  4. co oficiálně platí (opatření) — odděleně od hodnocení projektu,
  5. kde a kdo, letos,
  6. odběr.

  Nic tu nezelená samo od sebe. „Bez omezení“ je tvrzení ověřené proti
  úřednímu zdroji s uvedeným stářím, ne výchozí barva.
*/

const DRUH_SLOVA: Record<string, string> = { pripad: "případ", aktualizace: "aktualizace", opatreni: "opatření", reakce: "reakce" };

export default function Prehled() {
  const stav = celkovyStav();
  const vse = incidenty();
  const overeno = posledniOvereni();
  const obcane = urovenObcanu();
  const zmeny = posledniZmeny(5, vse);
  const nejdulezitejsi = zmeny[0] ?? null;
  const rok = new Date().getUTCFullYear();
  const letos = vyber(vse, { odRoku: rok });
  const p = pocty(letos, `záznamy z roku ${rok}`);
  const zeme = podleZemi(letos).filter((z) => z.celkem > 0 || z.kodZeme === "CZ").slice(0, 8);
  const puv = podlePuvodce(letos);
  const aktivni = pripady(vse, { dni: 90 });
  const w = watchlist();

  return (
    <>
      <BannerStari overeno={overeno} />
      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
        {/* 1 — nadpis a čerstvost */}
        <div className="flex flex-col gap-2 border-b border-linka pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold leading-tight sm:text-[34px]">Bezpečnostní přehled ČR</h1>
            <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-tlum">
              Ověřené události v Česku a v Evropě, oficiální opatření a to, co z nich plyne pro běžný život. Bez rad, kam jet — jen fakta a zdroje.
            </p>
          </div>
          <p className="shrink-0 text-[13px] text-tlum">
            <span className="stitek block">Poslední úspěšné ověření podkladů</span>
            <span className="cislice text-[14px] text-inkoust">{overeno ? datumCasPraha(overeno) : "zatím neproběhlo"}</span>
          </p>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-10">
            {/* 2 — situace a dopad */}
            <section aria-labelledby="situace">
              <h2 id="situace" className="text-[20px] font-bold">Co se děje</h2>
              <p className="mt-2 text-[15.5px] leading-relaxed text-inkoust">
                Za posledních 90 dnů evidujeme <b className="font-semibold">{aktivni.length} {sklon(aktivni.length, "případ", "případy", "případů")}</b>
                {aktivni.length > 0 && (
                  <>
                    {" "}— {(() => {
                      const cz = aktivni.filter((i) => i.kodZeme === "CZ").length;
                      const zemi = new Set(aktivni.map((i) => i.kodZeme)).size;
                      return `v ${zemi} ${sklon(zemi, "zemi", "zemích", "zemích")}, z toho ${cz} v Česku`;
                    })()}
                  </>
                )}
                . {stav.shrnuti}
              </p>
              <p className="mt-2 text-[13px] text-tlum">
                Shrnutí je hodnocení projektu podle <Link href="/metodika/" className="odkaz">metodiky</Link>; každý případ má vlastní zdroje v <Link href="/udalosti/?obdobi=30d" className="odkaz">seznamu událostí</Link>.
              </p>
              <div className="mt-4 rounded-[12px] border border-linka bg-plocha p-4">
                <div className="stitek mb-1">Dopad na běžný život v Česku</div>
                <p className="text-[15px] leading-relaxed text-inkoust">
                  {obcane.uroven === "G1"
                    ? "Podle úředních zdrojů neplatí v ČR žádné mimořádné omezení: žádná mobilizace, žádné omezení vycestování, hranice v běžném režimu."
                    : `Podle úředních zdrojů ${obcane.popis}.`}
                  {obcane.neovereno > 0 && ` ${obcane.neovereno} ${sklon(obcane.neovereno, "položka zatím není ověřena", "položky zatím nejsou ověřeny", "položek zatím není ověřeno")} — ty nedopočítáváme.`}
                </p>
                <a href="#opatreni" className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-akcent hover:text-akcent-svetla">
                  Seznam opatření a stáří ověření <Ikona nazev="dolu" velikost={12} tah={2} />
                </a>
              </div>
            </section>

            {/* 3 — poslední změny */}
            <section aria-labelledby="zmeny">
              <div className="flex items-end justify-between gap-3">
                <h2 id="zmeny" className="text-[20px] font-bold">Co se naposledy změnilo</h2>
                <Link href="/udalosti/" className="text-[13.5px] font-semibold text-akcent hover:text-akcent-svetla">Všechny události</Link>
              </div>
              {nejdulezitejsi ? (
                <article className="mt-3 rounded-[12px] border border-akcent/40 bg-akcent/5 p-4">
                  <div className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-tlum">
                    <span className="font-semibold uppercase tracking-[0.05em] text-akcent">Nejdůležitější změna</span>
                    <span aria-hidden>·</span>
                    <span>{DRUH_SLOVA[druh(nejdulezitejsi)]}</span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1"><Vlajka kod={nejdulezitejsi.kodZeme} /> {nejdulezitejsi.kodZeme === "CZ" ? "Česko" : nejdulezitejsi.zeme}</span>
                    <span aria-hidden>·</span>
                    <span className="cislice">zjištěno {datumPraha(kdyZjisteno(nejdulezitejsi))}</span>
                  </div>
                  <h3 className="mt-1.5 text-[17px] font-bold leading-snug">
                    <Link href={`/incident/${nejdulezitejsi.slug}/`} className="hover:text-akcent-svetla">{nejdulezitejsi.titulek}</Link>
                  </h3>
                  {nejdulezitejsi.fakta[0] && <p className="mt-1.5 text-[14.5px] leading-relaxed text-tlum">{nejdulezitejsi.fakta[0]}</p>}
                  <p className="mt-2 text-[12.5px] text-tlum2">
                    Závažnost: {UROVNE[nejdulezitejsi.zavaznost].nazev} · {nejdulezitejsi.zdroje.length} {sklon(nejdulezitejsi.zdroje.length, "zdroj", "zdroje", "zdrojů")}
                  </p>
                </article>
              ) : (
                <p className="mt-3 text-[14px] text-tlum">Za posledních 30 dnů není zveřejněná žádná nová událost.</p>
              )}
              {zmeny.length > 1 && (
                <ol className="mt-3 divide-y divide-linka2 border-y border-linka2">
                  {zmeny.slice(1).map((z) => (
                    <li key={z.id}>
                      <Link href={`/incident/${z.slug}/`} className="flex min-h-[44px] items-center gap-3 py-2 hover:bg-plocha">
                        <span className="cislice w-[64px] shrink-0 text-[12.5px] text-tlum">{datumPraha(kdyZjisteno(z)).replace(/ \d{4}$/, "")}</span>
                        <Vlajka kod={z.kodZeme} />
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-inkoust">{z.kratkyTitulek || z.titulek}</span>
                        <span className="hidden shrink-0 text-[12px] text-tlum2 sm:inline">{DRUH_SLOVA[druh(z)]}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* 4 — oficiální opatření */}
            <section id="opatreni" aria-labelledby="opatreni-nadpis" className="scroll-mt-[72px]">
              <h2 id="opatreni-nadpis" className="text-[20px] font-bold">Co oficiálně platí</h2>
              <p className="mt-1 mb-4 text-[14px] text-tlum">
                Úřední stav, ne hodnocení projektu. U každého řádku je, kdy byl naposledy ověřen — obnovení stránky není ověření.
              </p>
              <Opatreni pravni={pravniStav().polozky} nato={nato().polozky} provoz={provoz().polozky} />
            </section>

            {/* 5 — kde a kdo */}
            <section aria-labelledby="kde">
              <div className="flex items-end justify-between gap-3">
                <h2 id="kde" className="text-[20px] font-bold">Kde a kdo — letos</h2>
                <Link href="/vyvoj/" className="text-[13.5px] font-semibold text-akcent hover:text-akcent-svetla">Vývoj v čase</Link>
              </div>
              <p className="mt-1 text-[13.5px] text-tlum">
                {p.mnozina}: {p.pripady} {sklon(p.pripady, "případ", "případy", "případů")}, {p.aktualizace} {sklon(p.aktualizace, "aktualizace", "aktualizace", "aktualizací")}, {p.opatreni} opatření, {p.reakce} {sklon(p.reakce, "reakce", "reakce", "reakcí")}. Do počtu případů vstupují jen skutečné události.
              </p>
              <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-[13.5px]">
                    <thead>
                      <tr className="border-b border-linka">
                        <th className="stitek py-2 pr-3 font-medium">Země</th>
                        <th className="stitek py-2 pr-3 text-right font-medium">Případy</th>
                        <th className="stitek py-2 pr-3 text-right font-medium">s potvrzeným pachatelem</th>
                        <th className="stitek py-2 pr-3 text-right font-medium">Opatření</th>
                        <th className="stitek py-2 text-right font-medium">Reakce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zeme.map((z) => (
                        <tr key={z.kodZeme} className="border-b border-linka2 last:border-0">
                          <td className="py-2 pr-3">
                            <Link href={`/udalosti/?zeme=${z.kodZeme}&obdobi=letos`} className="inline-flex min-h-[36px] items-center gap-2 font-semibold text-inkoust hover:text-akcent-svetla">
                              <Vlajka kod={z.kodZeme} /> {z.zeme}
                            </Link>
                          </td>
                          <td className="cislice py-2 pr-3 text-right text-inkoust">{z.pripady}</td>
                          <td className="cislice py-2 pr-3 text-right text-tlum">{z.pripadyPotvrzenyPachatel}</td>
                          <td className="cislice py-2 pr-3 text-right text-tlum">{z.opatreni}</td>
                          <td className="cislice py-2 text-right text-tlum">{z.reakce}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {zeme.find((z) => z.kodZeme === "CZ")?.celkem === 0 && (
                    <p className="mt-2 text-[13px] text-tlum">V Česku letos není zveřejněný žádný záznam. To je informace, ne chyba.</p>
                  )}
                </div>
                <div>
                  <div className="stitek mb-2">Kdo za případy stojí ({puv.celkem} {sklon(puv.celkem, "případ", "případy", "případů")})</div>
                  <ul className="divide-y divide-linka2 border-y border-linka2">
                    {puv.skupiny.map((s) => (
                      <li key={s.klic} className="flex min-h-[40px] items-center gap-3 py-1.5 text-[14px]">
                        <span className={s.pocet ? "text-inkoust" : "text-tlum2"}>{s.nazev}</span>
                        <span className="ml-auto text-[12.5px] text-tlum2">
                          {s.pocet > 0 && s.klic !== "neznamy" ? (s.potvrzeno === s.pocet ? "vše potvrzeno" : `${s.potvrzeno} potvrzeno`) : ""}
                        </span>
                        <span className="cislice w-8 text-right text-[16px] font-bold text-inkoust">{s.pocet}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[12.5px] text-tlum2">„Potvrzeno“ = oficiální závěr orgánu nebo prokázaný domácí pachatel. Tvrzení v médiích se nepočítá.</p>
                </div>
              </div>
            </section>

            {/* 6 — odběr */}
            <section id="odber" aria-labelledby="odber-nadpis" className="scroll-mt-[72px] border-t border-linka pt-8">
              <h2 id="odber-nadpis" className="text-[20px] font-bold">Dáme vědět, když se něco změní</h2>
              <p className="mt-1 mb-4 text-[14px] text-tlum">Ne u každé události. Jen když se změní něco, kvůli čemu by člověk mohl jednat jinak.</p>
              <OdberPanel />
            </section>
          </div>

          {/* vedlejší sloupec — hodnocení projektu a co by ho změnilo */}
          <aside className="space-y-5 lg:sticky lg:top-[72px] lg:self-start">
            <HodnoceniProjektu stav={stav} />
            <details className="group rounded-[14px] border border-linka bg-plocha">
              <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 px-5 py-3 text-[14px] font-semibold text-inkoust">
                Co by hodnocení změnilo
                <Ikona nazev="dolu" velikost={13} tah={2} trida="text-tlum2 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-linka2 px-5 py-4">
                <div className="stitek mb-2">Směrem nahoru</div>
                <ol className="space-y-2.5">
                  {w.eskalacni.map((e) => (
                    <li key={e.cislo} className="text-[13.5px] leading-snug">
                      <span className="block font-semibold text-inkoust">{e.nazev}</span>
                      <span className="block text-tlum">{e.popis}</span>
                    </li>
                  ))}
                </ol>
                <div className="stitek mt-4 mb-2">Směrem dolů</div>
                <ul className="space-y-1.5">
                  {w.uklidnujici.map((u) => (
                    <li key={u} className="flex gap-2 text-[13.5px] leading-snug text-tlum"><span aria-hidden className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-tlum2" />{u}</li>
                  ))}
                </ul>
                <p className="mt-3 text-[12.5px] text-tlum2">Žádná z těchto věcí nemění hodnocení automaticky. Rozhoduje člověk podle metodiky.</p>
              </div>
            </details>
            <p className="px-1 text-[12.5px] leading-relaxed text-tlum2">
              Tento web není úřední zdroj ani varovný systém. V nouzi volejte 112. Úřední informace: <a href="https://www.hzscr.cz/" target="_blank" rel="noopener noreferrer" className="odkaz">HZS ČR</a>, <a href="https://www.mvcr.cz/" target="_blank" rel="noopener noreferrer" className="odkaz">MV ČR</a>.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
