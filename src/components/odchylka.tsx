import type { OdchylkaKandidata } from "@/lib/odchylky";

/*
  Značka zdroje, který o téže události tvrdí něco zásadně jiného než ostatní
  (9. 11. 2026, provozovatelka: „označíme to jako podezřelé a barevně
  označíme minimalisticky, ale přehledně“). Jedna barva, žádná plocha:
  plná tečka = podezřelé, prázdný kroužek = liší se.
*/
export function ZnackaOdchylky({ uroven, text, trida = "" }: { uroven: OdchylkaKandidata["uroven"]; text?: string | null; trida?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 overflow-hidden whitespace-nowrap font-semibold text-stari-text ${trida}`}>
      <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${uroven === "podezrele" ? "bg-stari" : "border-[1.5px] border-stari"}`} />
      {text === null ? <span className="sr-only">{uroven === "podezrele" ? "podezřelé" : "liší se"}</span> : text ?? (uroven === "podezrele" ? "podezřelé" : "liší se")}
    </span>
  );
}

/** Co označení znamená — stejná věta všude, kde je vidět. */
export const VYZNAM_ODCHYLKY = "Označení neříká, že zpráva je nepravdivá — jen že to, co tvrdí, ostatní zdroje o téže události neuvádějí. Rozhoduje úřední zdroj.";
