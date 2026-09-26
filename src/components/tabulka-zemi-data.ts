import { podleZemi, pripady } from "@/lib/agregace";
import { incidenty, tlakZeme } from "@/lib/data";
import type { RadekTabulkyZemi } from "@/components/tabulka-zemi";

/** Řádky tabulky zemí — jen na serveru, do klientské komponenty jdou hotové. */
export function radkyTabulkyZemi(maxZemi = 12): RadekTabulkyZemi[] {
  return podleZemi(pripady(incidenty()))
    .filter((z) => z.pripady > 0)
    .slice(0, maxZemi)
    .map((z) => ({
      kodZeme: z.kodZeme,
      zeme: z.zeme,
      pripady: z.pripady,
      podle: Object.fromEntries(tlakZeme(z.kodZeme).podkategorie.map((o) => [o.klic, o.uroven])),
    }));
}
