import { cerstvost, datumCasPraha, stariSlovy, type Cerstvost } from "@/lib/cas";
import { Ikona, type NazevIkony } from "./ikony";

const VZHLED: Record<Cerstvost, { slovo: string; tridy: string; ikona: NazevIkony }> = {
  cerstve: { slovo: "ověřeno", tridy: "text-[#256b45]", ikona: "fajfka" },
  starsi: { slovo: "starší ověření", tridy: "text-[#8a6d0b]", ikona: "hodiny" },
  zastarale: { slovo: "zastaralé", tridy: "text-[#a8401a]", ikona: "vystraha" },
  nezname: { slovo: "neověřeno", tridy: "text-tlum2", ikona: "info" },
};

/** Stáří podkladu u jednotlivého stavu. Neověřené nikdy nevypadá jako čerstvé. */
export function StariPodkladu({ overeno, ted }: { overeno: string | null | undefined; ted?: number }) {
  const c = cerstvost(overeno, ted);
  const v = VZHLED[c];
  return (
    <span className={`inline-flex items-center gap-1 text-[12.5px] ${v.tridy}`} title={overeno ? datumCasPraha(overeno) : undefined}>
      <Ikona nazev={v.ikona} velikost={12} tah={2} />
      {v.slovo}{overeno ? ` ${stariSlovy(overeno, ted)}` : ""}
    </span>
  );
}

/** Pruh nad obsahem, když jsou podklady starší než den. Neobnovuje se sám na zelenou. */
export function BannerStari({ overeno }: { overeno: string | null }) {
  const c = cerstvost(overeno);
  if (c === "cerstve") return null;
  return (
    <div role="status" className="border-b border-[#c96a1e]/40 bg-[#c96a1e]/10">
      <div className="mx-auto flex max-w-[1200px] items-start gap-2.5 px-4 py-2.5 text-[14px] text-[#a3541a] sm:px-6">
        <Ikona nazev="vystraha" velikost={16} tah={2} trida="mt-[2px] shrink-0" />
        <span>
          {c === "nezname"
            ? "Automatické ověření zatím neproběhlo. Stavy níže jsou z posledních ručně zapsaných podkladů."
            : `Podklady jsou ${stariSlovy(overeno)} staré. Zobrazujeme poslední známý stav — ne aktuální potvrzení.`}
        </span>
      </div>
    </div>
  );
}
