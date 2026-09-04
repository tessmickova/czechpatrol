import type { Metadata } from "next";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { ScenarovaCesta, WatchlistPanel } from "@/components/panely";
import { Sekce } from "@/components/zaklad";
import { watchlist } from "@/lib/data";

export const metadata: Metadata = {
  title: "Watchlist 72 h",
  description: "Konkrétní institucionální a právní spouštěče, které mohou hodnocení zvýšit nebo uklidnit.",
};

export default function WatchlistStranka() {
  return (
    <>
      <HlavickaStranky
        ikona="oko"
        stitek="Watchlist"
        nadpis="Co může hodnocení změnit do 72 hodin"
        popis="Konkrétní kroky institucí, ne dojmy. V obou směrech."
      />
      <Obsah>
        <WatchlistPanel watchlist={watchlist()} />
      </Obsah>
      <Sekce
        kicker="Scénář"
        nadpis="Kam až by se to mohlo posunout"
        popis="Orientační sled kroků. Žádný z nich nenásleduje automaticky."
      >
        <ScenarovaCesta />
      </Sekce>
    </>
  );
}
