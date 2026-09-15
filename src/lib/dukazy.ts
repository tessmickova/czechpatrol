/*
  Může tenhle dokument doložit tuhle událost?

  Odkud to pravidlo je: u záznamu o uzavření moldavského vzdušného prostoru
  (8. 9. 2026) stál jako úřední zdroj dokument norské vlády ze 13. 2. 2025 —
  obecné odsouzení narušování moldavského vzdušného prostoru, které o zářijové
  události roku 2026 neříká nic. V datech u něj přitom bylo napsané datum
  9. 9. 2026 a záznam z něj měl úřední připsání odpovědnosti.

  Úřední doména, funkční odkaz ani odpověď HTTP 200 nejsou doklad obsahu.
  Tohle je nejlevnější kontrola, která tenhle druh chyby zachytí: dokument
  vydaný dlouho před událostí ji popisovat nemůže.
*/

/** Do kolika dní před událostí je dřívější vydání běžné (časové pásmo, avízo cesty). */
export const DNI_TOLERANCE = 1;
/** Od kolika dní před událostí už dokument nemůže být jejím dokladem. */
export const DNI_VYLOUCENO = 30;

export type StavDokladu = "doklada" | "overit" | "nemuze-dokladat";

/**
 * Posoudí časový vztah dokumentu a události.
 *
 * Neříká, že zdroj je pravdivý — říká jen, jestli vůbec mohl vzniknout
 * jako popis té události. Neznámé datum se nehodnotí; chybějící údaj není
 * důkaz v žádnou stranu.
 */
export function stavDokladu(datumUdalosti: string, publikovano: string | null | undefined): StavDokladu {
  if (!publikovano) return "doklada";
  const u = new Date(datumUdalosti).getTime();
  const z = new Date(publikovano).getTime();
  if (!Number.isFinite(u) || !Number.isFinite(z)) return "doklada";

  const dniPred = (u - z) / 86_400_000;
  if (dniPred > DNI_VYLOUCENO) return "nemuze-dokladat";
  if (dniPred > DNI_TOLERANCE) return "overit";
  return "doklada";
}
