import { snimekPrehledu } from "@/lib/prehled/data";

export const dynamic = "force-static";

/**
 * Snímek pro Rychlý přehled (src/lib/prehled/snimek.ts).
 *
 * Otevřená stránka si ho stahuje znovu (při návratu na kartu a po pár
 * minutách), aby neukazovala jen to, co bylo v HTML při načtení. Závěry
 * z něj počítá až prohlížeč se skutečným časem — soubor sám nic „aktuálního“
 * netvrdí, jen nese časy posledních úspěchů zdrojů.
 */
export function GET() {
  return Response.json(snimekPrehledu());
}
