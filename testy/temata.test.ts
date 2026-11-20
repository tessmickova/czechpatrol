import { describe, expect, it } from "vitest";
import { jeNamorni, temaZpravy, ZEME_HRANIC } from "../src/lib/temata";

/*
  Boxy témat na úvodu (20. 11. 2026): Incidenty na hranicích a Mezinárodní
  vody. Pravidla jsou pevná; testy hlídají hlavně, co do boxů nepatří.
*/
const z = (kodZeme: string | null, titulek: string, kategorie: string[] = [], druh?: string) => ({ kodZeme, titulek, kategorie, naliehave: druh ? { druh } : null });

describe("témata: hranice NATO a mezinárodní vody", () => {
  it("narušení polského vzdušného prostoru patří k hranicím", () => {
    expect(temaZpravy(z("PL", "Mogło dojść do naruszenia przestrzeni powietrznej Polski", ["drony"]))).toBe("hranice");
    expect(temaZpravy(z("EE", "Estonsko od prosince zavře hranice s Ruskem", ["hranice"], "hranice-nato"))).toBe("hranice");
  });

  it("hranice jen u zemí NATO na hranici; Česko, Ukrajina a Rusko ne", () => {
    expect(temaZpravy(z("CZ", "Celníci na hranici zadrželi zásilku", ["hranice"]))).toBeNull();
    expect(temaZpravy(z("UA", "Russian drones hit border town", ["drony", "hranice"]))).toBeNull();
    expect(temaZpravy(z("RU", "Russia closes border crossing", ["hranice"]))).toBeNull();
    expect(ZEME_HRANIC).toEqual(["PL", "LT", "LV", "EE", "FI", "NO", "RO"]);
  });

  it("moře, mořské dno a plavidlo s incidentem patří k vodám — i když je země hraniční", () => {
    expect(temaZpravy(z("RO", "Rumunsko: v Černém moři hoří nákladní loď", ["drony", "hranice"]))).toBe("vody");
    expect(temaZpravy(z("FI", "Poškozený podmořský kabel ve Finském zálivu", ["infrastruktura"]))).toBe("vody");
    expect(jeNamorni("Danish navy escorted a shadow fleet tanker")).toBe(true);
  });

  it("slovo „loď“ nebo „ship“ samo nestačí, „relationship“ ani „support“ nejsou moře", () => {
    expect(jeNamorni("Poland and Lithuania strengthen relationship")).toBe(false);
    expect(jeNamorni("Ministr navštívil loď v muzeu")).toBe(false);
    expect(jeNamorni("NATO support for the eastern flank")).toBe(false);
  });

  it("válka na Ukrajině v Černém moři u ukrajinských přístavů do boxu nepatří", () => {
    expect(temaZpravy(z("UA", "Russian strike hits cargo ship in Odesa port on the Black Sea", ["drony"]))).toBeNull();
  });
});
