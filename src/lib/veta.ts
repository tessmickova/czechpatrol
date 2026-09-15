import { UROVNE } from "./skala";
import type { PravniPolozka, ProvozniPolozka, Uroven } from "./typy";

/*
  Jedna věta nad budíky.

  Čtenář, který přijde na web poprvé, potřebuje nejdřív odpověď na dvě otázky:
  „musím dnes něco dělat jinak?“ a „co se vlastně děje kolem?“. Budíky obojí
  ukazují, ale barvou a jedním slovem — to se dá přečíst špatně.

  Věta se nikdy nepíše ručně. Skládá se z toho, co je v datech: první část
  jen z úředních položek, druhá z hodnocení pro Evropu. Kde ověření chybí,
  věta to řekne — nedopočítává se a neuklidňuje bez podkladu.

  Proč tu nestojí kategorické „dnes neplatí žádné mimořádné omezení": takové
  tvrzení by znamenalo, že máme úplný seznam všech opatření v zemi. Nemáme ho.
  Sledujeme konkrétní úřední zdroje, a když v nich nic není, je pravdivé jen
  to slabší: v kontrolovaných zdrojích doložené celostátní omezení nemáme.
  Rozdíl je podstatný hlavně pro člověka, kterého se týká místní opatření —
  ten se nesmí z úvodní věty dozvědět, že se ho nic netýká.
*/

export interface HlavniVeta {
  /** Co platí pro čtenáře v Česku. Tohle je ta zásadní část — sází se tučně. */
  cesko: string;
  /** Čím se liší okolí. Doplněk, ne varování. */
  evropa: string;
  /** Kolik položek nemá ověření. Nula = celá věta stojí na ověřených datech. */
  neovereno: number;
}

function vyjmenuj(nazvy: string[]): string {
  if (nazvy.length === 1) return nazvy[0];
  return `${nazvy.slice(0, -1).join(", ")} a ${nazvy.at(-1)}`;
}

export function hlavniVeta(
  pravni: PravniPolozka[],
  provoz: ProvozniPolozka[],
  evropa: Uroven | null,
): HlavniVeta {
  const plati = pravni.filter((p) => p.plati === true);
  const naruseno = provoz.filter((p) => p.stav === "narusen");
  const sledujeme = provoz.filter((p) => p.stav === "sledujeme");
  const neovereno = pravni.filter((p) => p.plati === null).length + provoz.filter((p) => p.stav === "bez-zdroje").length;


  /*
    Kategorický zápor smí padnout jen z autoritativního pokrytí — tedy
    z úplného seznamu. Jinak se píše, co v kontrolovaných zdrojích není.
  */
  const doloženýZápor = pravni.some((p) => p.plati === false && p.pokryti === "autoritativni");
  const kontrolaProbehla = pravni.some((p) => p.pokryti && p.pokryti !== "nedostupne");

  const bezOmezeni = doloženýZápor
    ? "Pro běžný život v Česku dnes neplatí žádné mimořádné omezení."
    : kontrolaProbehla
      ? "V kontrolovaných zdrojích žádné celostátní omezení. Místní situace se může lišit."
      : "Úřední stav Česka se dnes nepodařilo zkontrolovat.";

  const cesko = plati.length
    ? `V Česku platí ${vyjmenuj(plati.map((p) => p.nazev.toLowerCase()))}.`
    : naruseno.length
      ? `Hlásíme narušení: ${vyjmenuj(naruseno.map((p) => p.nazev.toLowerCase()))}.`
      : sledujeme.length
        ? `${bezOmezeni} U ${vyjmenuj(sledujeme.map((p) => p.nazev.toLowerCase()))} prověřujeme hlášení.`
        : bezOmezeni;

  const pasmo = evropa ? UROVNE[evropa].pasmo : null;
  const evropaVeta =
    pasmo === null
      ? "Hodnocení pro Evropu zatím nebylo stanoveno."
      : pasmo === "zelena"
        ? "V Evropě je aktivita na běžné úrovni."
        : pasmo === "zluta"
          ? "V Evropě ale sledujeme zvýšenou hybridní aktivitu."
          : pasmo === "prechod"
            ? "V Evropě ale sledujeme výrazně zvýšenou hybridní aktivitu."
            : pasmo === "oranzova"
              ? "V Evropě je hybridní aktivita vysoká a týká se i sousedních zemí."
              : "V Evropě je situace vážná a mění se rychle.";

  return { cesko, evropa: evropaVeta, neovereno };
}
