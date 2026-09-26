import { Napoveda } from "./zaklad";

/*
  TIP k rádiu: technologie ASA (26. 9. 2026, na přání provozovatelky).

  ASA (Automatic Safety Alert) v digitálním vysílání DAB+ umí při krizi
  zapnout přijímač z pohotovostního režimu, přepnout na Radiožurnál
  a přehrát varování pro zasaženou oblast. Český rozhlas ho v září 2026
  celoplošně testoval. Modely jen ty, které Český rozhlas výslovně uvádí
  jako potvrzené — nic se nedomýšlí; u ostatních rozhoduje logo ASA.

  Ukáže se u každé položky přípravy, která má v názvu rádio (jeRadio),
  takže nové rádiové položky dostanou tip samy.
*/
export const jeRadio = (text: string) => /r[áa]di[oa]/i.test(text);

const ZDROJ = "https://informace.rozhlas.cz/cesky-rozhlas-a-ceske-radiokomunikace-otestuji-celoplosne-varovani-obyvatelstva-9642099";

export function TipAsa() {
  return (
    <span className="mt-1 block text-drobne leading-snug text-tlum">
      <b className="font-semibold text-akcent">TIP:</b> Pořiďte si{" "}
      <Napoveda
        label="Které modely podporují ASA"
        popis={
          <span className="block">
            <b className="font-semibold">Potvrzené modely</b> (podle Českého rozhlasu): Telestar TOP 300, TechniSat DIGITRADIO 3 ASA.
            <br />
            U dalších hledejte na krabici <b className="font-semibold">logo ASA</b> — znamená nezávislý test podle normy ETSI TS 104 090.
            Rádio musí zůstat v pohotovostním režimu (v zásuvce nebo s bateriemi), úplně vypnuté se nezapne.{" "}
            <a href={ZDROJ} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">Český rozhlas ↗</a>
          </span>
        }
      >
        <span className="font-semibold text-inkoust underline decoration-dotted underline-offset-2">rádio s podporou technologie ASA</span>
      </Napoveda>
      . Při krizi se samo zapne, přepne na Radiožurnál a přehraje varování pro vaši oblast (přes DAB+).
    </span>
  );
}
