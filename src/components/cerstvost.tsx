import { cerstvost, datumCasPraha, stariSlovy, type Cerstvost } from "@/lib/cas";
import { Ikona, type NazevIkony } from "./ikony";

const VZHLED: Record<Cerstvost, { slovo: string; tridy: string; ikona: NazevIkony }> = {
  cerstve: { slovo: "ověřeno", tridy: "text-klid-text", ikona: "fajfka" },
  starsi: { slovo: "starší ověření", tridy: "text-pozor-text", ikona: "hodiny" },
  zastarale: { slovo: "zastaralé", tridy: "text-stari-text2", ikona: "vystraha" },
  nezname: { slovo: "neověřeno", tridy: "text-tlum2", ikona: "info" },
  // Čas z budoucnosti je chyba dat nebo hodin. Zelená by z ní udělala ověření.
  budoucnost: { slovo: "čas z budoucnosti", tridy: "text-stari-text2", ikona: "vystraha" },
};

/** Stáří podkladu u jednotlivého stavu. Neověřené nikdy nevypadá jako čerstvé. */
export function StariPodkladu({ overeno, ted }: { overeno: string | null | undefined; ted?: number }) {
  const c = cerstvost(overeno, ted);
  const v = VZHLED[c];
  return (
    <span className={`inline-flex items-center gap-1 text-drobne ${v.tridy}`} title={overeno ? datumCasPraha(overeno) : undefined}>
      <Ikona nazev={v.ikona} velikost={12} tah={2} />
      {v.slovo}{overeno ? ` ${stariSlovy(overeno, ted)}` : ""}
    </span>
  );
}
