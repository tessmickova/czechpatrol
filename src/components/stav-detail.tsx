import { datumCasPraha } from "@/lib/cas";
import { pokrytiPolozky, STUPNE, type PokrytiPolozky } from "@/lib/pokryti-stavu";
import type { NatoPolozka, PravniPolozka, ProvozniPolozka } from "@/lib/typy";

/*
  Rozbalený detail jednoho stavu.

  Vzniklo to podle ceny paliva: tam se po rozkliknutí ukáže víc čísel a lidem
  to dává smysl. Totéž jde udělat u ostatních položek — ale jen z toho, co
  opravdu máme. Žádné dopočítané „pravděpodobnosti" ani vymyšlené termíny.

  Ukazuje čtyři věci, na které se člověk ptá:
    1. co ta položka znamená,
    2. z čeho to víme (konkrétní zdroje s odkazy),
    3. kdy jsme se tam naposledy dívali,
    4. co by se muselo stát, aby se stav změnil.

  Pátá věc je nejdůležitější a nikde jinde na webu není: co nám k doložení
  chybí. Bez ní vypadá „vyhlášení nedoloženo" jako naše chyba, a přitom je to
  poctivý popis toho, co z veřejných zdrojů jde a nejde zjistit.
*/

const BARVA_STUPNE: Record<PokrytiPolozky["stupen"], string> = {
  uplne: "text-klid-text",
  vicezdrojove: "text-tlum",
  jednozdrojove: "text-pozor-text",
  chybi: "text-stari-text",
};

function Radek({ popisek, children }: { popisek: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <dt className="stitek pt-[3px]">{popisek}</dt>
      <dd className="text-[13.5px] leading-snug text-tlum">{children}</dd>
    </div>
  );
}

export function StavDetail({
  polozka,
  skupina,
  vysvetleni,
  stavVysvetleni,
  coByZmenilo,
}: {
  polozka: PravniPolozka | NatoPolozka | ProvozniPolozka;
  skupina: PokrytiPolozky["skupina"];
  /** Co položka znamená. Nemění se podle běhu sběru. */
  vysvetleni: string;
  /** Co plyne z POSLEDNÍ kontroly. Tohle se mění každý běh. */
  stavVysvetleni: string;
  coByZmenilo?: string[];
}) {
  const p = pokrytiPolozky(polozka, skupina);

  return (
    <dl className="grid gap-3 border-t border-linka2 px-3 py-3">
      <Radek popisek="Co to je">{vysvetleni}</Radek>

      {/*
        Dvě různé věci, které se dřív slévaly: co položka znamená (stálé)
        a co plyne z poslední kontroly (mění se každý běh).
      */}
      <Radek popisek="Po poslední kontrole">{stavVysvetleni}</Radek>

      <Radek popisek="Z čeho to víme">
        {p.zdroje.length ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {p.zdroje.map((z) => (
              <li key={z.klic}>
                <a href={z.url} target="_blank" rel="noopener noreferrer" className="odkaz">
                  {z.nazev}
                </a>
                {z.primarni && <span className="ml-1 text-[12px] text-tlum2">úřední</span>}
              </li>
            ))}
          </ul>
        ) : (
          "Zatím z ničeho, co by šlo číst automaticky."
        )}
        {p.blokujici.length > 0 && (
          <span className="mt-1 block text-[12.5px] text-tlum2">
            {p.blokujici.map((z) => z.nazev).join(", ")} — odmítá automatické dotazy, čte se ručně.
          </span>
        )}
      </Radek>

      <Radek popisek="Pokrytí zdroji">
        <span className={BARVA_STUPNE[p.stupen]}>{STUPNE[p.stupen].nazev}.</span> {STUPNE[p.stupen].popis}
      </Radek>

      {p.zkontrolovano && (
        <Radek popisek="Kontrolováno">
          <span className="cislice">{datumCasPraha(p.zkontrolovano)}</span>
        </Radek>
      )}

      {coByZmenilo && coByZmenilo.length > 0 && (
        <Radek popisek="Co by změnilo stav">
          <ul className="list-disc space-y-0.5 pl-4">
            {coByZmenilo.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </Radek>
      )}

      {p.chybi && <Radek popisek="Co nám chybí">{p.chybi}</Radek>}
    </dl>
  );
}
