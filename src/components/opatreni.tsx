import type { NatoPolozka, PravniPolozka, ProvozniPolozka } from "@/lib/typy";
import { StariPodkladu } from "./cerstvost";
import { Ikona, type NazevIkony } from "./ikony";
import { SeznamZdroju } from "./zdroje";

/*
  Oficiální opatření a stav služeb.

  Jeden seznam, každý řádek říká větou, co konkrétně sledujeme a co
  o tom víme. „NE“ bez kontextu nestačí: „Omezení vycestování z ČR:
  není vyhlášeno“ ano. U každého řádku je stáří ověření, protože přegenerování
  stránky není ověření.
*/

type Stav = "plati" | "neplati" | "sledujeme" | "narusen" | "neovereno";

/*
  Vybarvené je jen „platí" — vyhlášené opatření. Ostatní stavy se poznají
  po ikoně a slově; tři různě tónované štítky v jednom seznamu znamenaly, že
  vybarvené je skoro všechno, a tím vybarvení přestalo něco znamenat.
*/
const VZHLED: Record<Stav, { slovo: string; tridy: string; ikona: NazevIkony }> = {
  plati: { slovo: "platí", tridy: "border-akcent/40 bg-akcent/10 text-akcent-svetla", ikona: "vystraha" },
  narusen: { slovo: "narušeno", tridy: "border-linka bg-plocha2 text-inkoust", ikona: "vystraha" },
  sledujeme: { slovo: "sledujeme", tridy: "border-linka bg-plocha2 text-tlum", ikona: "oko" },
  neplati: { slovo: "není vyhlášeno", tridy: "border-linka text-tlum", ikona: "fajfka" },
  neovereno: { slovo: "neověřeno", tridy: "border-dashed border-linka text-tlum2", ikona: "info" },
};

const VETY_PRAVNI: Record<string, { co: string; ano: string; ne: string }> = {
  "stav-ohrozeni": { co: "Stav ohrožení státu", ano: "vyhlášen Parlamentem", ne: "není vyhlášen" },
  "valecny-stav": { co: "Válečný stav", ano: "vyhlášen", ne: "není vyhlášen" },
  mobilizace: { co: "Mobilizace ozbrojených sil", ano: "vyhlášena", ne: "není vyhlášena" },
  "nouzovy-stav": { co: "Nouzový stav (celostátní)", ano: "vyhlášen", ne: "není vyhlášen" },
  vycestovani: { co: "Omezení vycestování z ČR", ano: "platí", ne: "žádné omezení není vyhlášeno" },
  hranice: { co: "Mimořádné uzavření hranic ČR", ano: "platí", ne: "hranice jsou v běžném režimu" },
  "schuze-parlamentu": { co: "Mimořádná bezpečnostní schůze Parlamentu", ano: "svolána", ne: "není svolána" },
};
const VETY_NATO: Record<string, { co: string; ano: string; ne: string }> = {
  "clanek-4": { co: "Konzultace podle článku 4 NATO", ano: "probíhají", ne: "nejsou vyžádány" },
  "clanek-5": { co: "Kolektivní obrana podle článku 5 NATO", ano: "aktivována", ne: "není aktivována" },
  readiness: { co: "Mimořádná změna pohotovosti NATO", ano: "oznámena", ne: "bez veřejně oznámené změny" },
  evakuace: { co: "Evakuace personálu NATO a rodin", ano: "oznámena", ne: "bez veřejně oznámené změny" },
  "vychodni-kridlo": { co: "Mimořádné posílení východního křídla", ano: "oznámeno", ne: "bez veřejně oznámené změny" },
};

function Radek({
  co, stav, hodnota, vysvetleni, overeno, zdroje, prvni,
}: { co: string; stav: Stav; hodnota: string; vysvetleni: string; overeno: string | null; zdroje: PravniPolozka["zdroje"]; prvni?: string[] }) {
  const v = VZHLED[stav];
  // Klidný stav je jen text s ověřením; barevný odznak dostávají jen stavy, které si zaslouží pozornost.
  const odznak = stav !== "neplati";
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-[44px] cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:bg-plocha">
          <span className="min-w-[200px] flex-1 text-zaklad leading-snug">
            <span className="font-semibold text-inkoust">{co}</span>
            <span className="text-tlum">: {hodnota}</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-3">
            {odznak && (
              <span className={`inline-flex items-center gap-1.5 rounded-[12px] border px-2 py-1 text-drobne font-semibold ${v.tridy}`}>
                <Ikona nazev={v.ikona} velikost={12} tah={2.2} /> {v.slovo}
              </span>
            )}
            <StariPodkladu overeno={overeno} />
            <span aria-hidden className="text-tlum2 transition-transform group-open:rotate-180"><Ikona nazev="dolu" velikost={13} tah={2} /></span>
          </span>
        </summary>
        <div className="space-y-3 py-3 pl-1 text-zaklad leading-relaxed text-tlum">
          <p>{vysvetleni}</p>
          {prvni && prvni.length > 0 && (
            <div>
              <div className="stitek mb-1.5">Co by změnu signalizovalo jako první</div>
              <ul className="list-disc space-y-1 pl-5">{prvni.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
          {zdroje.length > 0 && <SeznamZdroju zdroje={zdroje.slice(0, 3)} husty />}
        </div>
      </details>
    </li>
  );
}

export function Opatreni({
  pravni, nato, provoz,
}: { pravni: PravniPolozka[]; nato: NatoPolozka[]; provoz: ProvozniPolozka[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="nadpis-boxu mb-1">Oficiální opatření v ČR a NATO</h3>
        <p className="mb-2 text-male text-tlum">Právní stav podle úředních sbírek a oznámení. Změna nenastává sama od sebe — vyhlašuje ji vláda, Parlament nebo Aliance.</p>
        <ul>
          {pravni.map((p) => {
            const v = VETY_PRAVNI[p.klic] ?? { co: p.nazev, ano: "platí", ne: "není vyhlášeno" };
            return (
              <Radek key={p.klic} co={v.co} stav={p.plati === null ? "neovereno" : p.plati ? "plati" : "neplati"} hodnota={p.plati === null ? "zatím neověřeno" : p.plati ? v.ano : v.ne} vysvetleni={p.vysvetleni} overeno={p.overeno} zdroje={p.zdroje} />
            );
          })}
          {nato.map((p) => {
            const v = VETY_NATO[p.klic] ?? { co: p.nazev, ano: "aktivní", ne: "neaktivní" };
            return (
              <Radek key={p.klic} co={v.co} stav={p.aktivni === null ? "neovereno" : p.aktivni ? "plati" : "neplati"} hodnota={p.aktivni === null ? "zatím neověřeno" : p.aktivni ? v.ano : v.ne} vysvetleni={p.vysvetleni} overeno={p.overeno} zdroje={p.zdroje} />
            );
          })}
        </ul>
      </div>
      <div>
        <h3 className="nadpis-boxu mb-1">Dopad na běžný život</h3>
        <p className="mb-2 text-male text-tlum">Služby, kterých by se změna dotkla. Kde chybí veřejný zdroj, je to napsané — nedopočítáváme.</p>
        <ul>
          {provoz.map((p) => (
            <Radek
              key={p.klic}
              co={p.nazev}
              stav={p.stav === "bez-zdroje" ? "neovereno" : p.stav === "bezny" ? "neplati" : p.stav === "sledujeme" ? "sledujeme" : "narusen"}
              hodnota={p.stav === "bez-zdroje" ? "bez ověřeného zdroje" : p.hodnota}
              vysvetleni={p.detail}
              overeno={p.overeno}
              zdroje={p.zdroje}
              prvni={p.coByZmenilo}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
