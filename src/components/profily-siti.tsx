import { SLEDOVANE_PROFILY, type SledovanyProfil } from "../../sber/socialni";
import { casPraha, datumPraha } from "@/lib/cas";
import type { Kandidat } from "@/lib/typy";
import { Sdeleni } from "./ui";
import { ZnackaKanalu, type Znacka } from "./znacky";

/*
  Profily úřadů a představitelů na sociálních sítích.

  Ministr nebo úřad často řeknou věc nejdřív na svém profilu. Tenhle box
  ukazuje, které profily se čtou, a co z nich za poslední dny přišlo —
  bez jakéhokoli předstírání: příspěvek je NEOVĚŘENÝ signál, ne záznam.
  Do žádného počtu nevstupuje a závažnost nezvyšuje.

  Dvě skupiny, ne jedna: úřady a instituce zvlášť, vládní představitelé
  zvlášť. Soukromé osoby tu nejsou vůbec — účet obyčejného člověka není
  zdroj, ať má sledujících kolik chce. Registr to vynucuje (sber/socialni.ts).

  Box se ukazuje vždycky, i když je registr krátký nebo profil zatím
  neověřený. Skrytý box by tvrdil, že se sítě nesledují; box, který říká
  „tenhle profil čeká na ověření", říká pravdu.
*/

const NAZVY_SITI: Record<SledovanyProfil["sit"], string> = { mastodon: "Mastodon", bluesky: "Bluesky", telegram: "Telegram" };
const SKUPINY: { klic: SledovanyProfil["skupina"]; nazev: string }[] = [
  { klic: "urad", nazev: "Úřady a instituce" },
  { klic: "osoba", nazev: "Vládní představitelé" },
];

function stavProfilu(p: SledovanyProfil): { slovo: string; tecka: string } {
  if (!p.pravostDolozena) return { slovo: "pravost nedoložena", tecka: "border border-linka" };
  if (!p.overenaAdresa) return { slovo: "čeká na ověření adresy", tecka: "bg-pozor" };
  return { slovo: "čte se", tecka: "bg-klid" };
}

export function ProfilySiti({ kandidati, maxPrispevku = 4 }: { kandidati: Kandidat[]; maxPrispevku?: number }) {
  const prispevky = kandidati
    .filter((k) => k.zdroj.typ === "social")
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, maxPrispevku);
  const ctenych = SLEDOVANE_PROFILY.filter((p) => p.pravostDolozena && p.overenaAdresa).length;

  return (
    <section aria-label="Profily úřadů a představitelů" className="overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
      <div className="flex items-center justify-between gap-2 border-b border-linka2 px-4 py-3">
        <span className="flex items-center gap-2">
          <span aria-hidden className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-akcent/50">
            <span className="h-[6px] w-[6px] rounded-full bg-akcent" />
          </span>
          <h3 className="stitek">Profily na sítích</h3>
        </span>
        <span className="text-mikro text-tlum2">{ctenych ? `čte se ${ctenych} z ${SLEDOVANE_PROFILY.length}` : "zatím se nečte žádný"}</span>
      </div>

      {SKUPINY.map((sk) => {
        const profily = SLEDOVANE_PROFILY.filter((p) => p.skupina === sk.klic);
        return (
          <div key={sk.klic} className="border-b border-linka2">
            <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
              <span className="stitek text-tlum2">{sk.nazev}</span>
              <span className="text-mikro text-tlum2">{profily.length ? `${profily.length}` : "žádný"}</span>
            </div>
            {profily.length ? (
              <ul className="divide-y divide-linka2">
                {profily.map((p) => {
                  const st = stavProfilu(p);
                  return (
                    <li key={p.klic}>
                      <a href={p.odkaz} target="_blank" rel="nofollow noopener noreferrer" className="flex items-start gap-2.5 px-4 py-2 hover:bg-plocha2">
                        <span className="mt-[2px] shrink-0"><ZnackaKanalu znacka={p.sit as Znacka} velikost={16} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-male leading-[20px] text-inkoust">{p.kdo}</span>
                          <span className="line-clamp-1 text-mikro leading-snug text-tlum2">{p.role} · {NAZVY_SITI[p.sit]}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 pt-[3px] text-mikro text-tlum2">
                          <span aria-hidden className={`h-[6px] w-[6px] rounded-full ${st.tecka}`} />
                          {st.slovo}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 pb-2.5 text-mikro leading-snug text-tlum2">Zatím žádný profil s doloženou pravostí.</p>
            )}
          </div>
        );
      })}

      {prispevky.length > 0 && (
        <>
          <div className="px-4 pt-3">
            <Sdeleni ton="neutral" ikona="info">Příspěvek na profilu je signál, ne doklad. Do počtů nevstupuje a závažnost nezvyšuje.</Sdeleni>
          </div>
          <ol className="divide-y divide-linka2">
            {prispevky.map((k) => {
              const kdy = k.publikovano ?? k.zachyceno;
              return (
                <li key={k.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 text-mikro text-tlum2">
                    <span className="truncate">{k.zdroj.nazev}</span>
                    <span aria-hidden>·</span>
                    <span className="cislice shrink-0">{datumPraha(kdy)} {casPraha(kdy)}</span>
                  </div>
                  <a href={k.zdroj.url} target="_blank" rel="nofollow noopener noreferrer" className="mt-1 block text-male leading-snug text-inkoust hover:text-akcent-svetla">{k.titulek}</a>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {/*
        Pravidlo, které box drží, se říká nahlas: co se čte a co ne. Bez
        věty by tři profily vypadaly jako výběr, ne jako hranice.
      */}
      <p className="px-4 py-2.5 text-mikro leading-snug text-tlum2">
        Čtou se jen účty úřadů a vládních představitelů s doloženou pravostí — Mastodon, Bluesky a veřejné kanály Telegramu.
        Soukromé účty nikdy. Facebook a X veřejné čtení neumožňují.
      </p>
    </section>
  );
}
