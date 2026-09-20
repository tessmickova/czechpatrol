import { datumCasPraha } from "@/lib/cas";
import { pokrytiPolozky, type PokrytiPolozky } from "@/lib/pokryti-stavu";
import type { NatoPolozka, PravniPolozka, ProvozniPolozka } from "@/lib/typy";

/*
  Rozbalený detail jednoho stavu.

  Vzniklo to podle ceny paliva: tam se po rozkliknutí ukáže víc čísel a lidem
  to dává smysl. Totéž jde udělat u ostatních položek — ale jen z toho, co
  opravdu máme. Žádné dopočítané „pravděpodobnosti" ani vymyšlené termíny.

  Ukazuje čtyři věci, na které se člověk ptá:
    1. co ta položka znamená,
    2. co plyne z poslední kontroly,
    3. kdy jsme se dívali a kde si to ověřit přímo u úřadu,
    4. co by se muselo stát, aby se stav změnil.

  Co tu naopak NENÍ: stupně pokrytí zdroji, seznam registrů, které nám chybí,
  a poznámky o úřadech odmítajících automatické dotazy. Je to pravda, ale je
  to popis naší práce, ne odpověď na čtenářovu otázku — a ubírá pozornost
  tomu podstatnému. Celý rozbor zůstává na stránce Zdroje.
*/

function Radek({ popisek, children }: { popisek: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <dt className="stitek pt-[3px]">{popisek}</dt>
      <dd className="text-male leading-snug text-tlum">{children}</dd>
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

      {p.zkontrolovano && (
        <Radek popisek="Kontrolováno">
          <span className="cislice">{datumCasPraha(p.zkontrolovano)}</span>
        </Radek>
      )}

      {/*
        Odkaz na úřad, který o věci rozhoduje — a zároveň adresa, kterou čte
        sběr. Dřív tu stály dvakrát: jednou jako „z čeho to víme", podruhé jako
        „ověřit u úřadu". Byly to tytéž odkazy.

        Kdo potřebuje jistotu teď hned, nemá čekat, až ji ověříme my.
      */}
      <Radek popisek="Ověřit u úřadu">
        {p.zdroje.length ? (
          /* Odkazy s výškou na prst: na mobilu se na ně klepe, ne kliká. */
          <span className="flex flex-wrap gap-x-3">
            {p.zdroje.map((z) => (
              <a key={z.klic} href={z.url} target="_blank" rel="noopener noreferrer" className="odkaz inline-flex min-h-[32px] items-center">
                {z.nazev} ↗
              </a>
            ))}
          </span>
        ) : (
          "Přímý úřední zdroj k téhle položce zatím nemáme."
        )}
      </Radek>

      {coByZmenilo && coByZmenilo.length > 0 && (
        <Radek popisek="Co by změnilo stav">
          <ul className="list-disc space-y-0.5 pl-4">
            {coByZmenilo.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </Radek>
      )}
    </dl>
  );
}
