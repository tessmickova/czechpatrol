import { UROVNE } from "./skala";
import type { PravniPolozka, ProvozniPolozka, Uroven } from "./typy";

/*
  Jedna věta nad budíky.

  Čtenář, který přijde na web poprvé, potřebuje nejdřív odpověď na dvě otázky:
  „musím dnes něco dělat jinak?“ a „co se vlastně děje kolem?“. Budíky obojí
  ukazují, ale barvou a jedním slovem — to se dá přečíst špatně.

  Věta se nikdy nepíše ručně. Skládá se z toho, co je v datech: první část
  jen z ověřených úředních položek, druhá z hodnocení pro Evropu. Kde ověření
  chybí, věta to řekne — nedopočítává se a neuklidňuje bez podkladu.
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

  // Zápor smí web tvrdit jen tam, kde ho někdo ověřil v úřední sbírce.
  const overenoDost = pravni.some((p) => p.plati === false);

  const cesko = plati.length
    ? `V Česku platí ${vyjmenuj(plati.map((p) => p.nazev.toLowerCase()))}.`
    : naruseno.length
      ? `Pro běžný život v Česku dnes neplatí mimořádné opatření, ale hlásíme narušení: ${vyjmenuj(naruseno.map((p) => p.nazev.toLowerCase()))}.`
      : sledujeme.length
        ? `Pro běžný život v Česku dnes neplatí žádné mimořádné omezení; u ${vyjmenuj(sledujeme.map((p) => p.nazev.toLowerCase()))} sledujeme možné výpadky.`
        : overenoDost
          ? "Pro běžný život v Česku dnes neplatí žádné mimořádné omezení."
          : "Úřední stav Česka se dnes nepodařilo ověřit — nic z toho proto netvrdíme.";

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
