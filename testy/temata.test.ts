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

  it("akce vedené z moře proti zemím NATO a Evropy patří k vodám (20. 11. 2026)", () => {
    expect(temaZpravy(z("IT", "Rusko připravuje dronové útoky z moře na Itálii, Francii a Španělsko", ["drony", "hybridni"]))).toBe("vody");
    expect(temaZpravy({ ...z("IT", "El Mundo: Rusko chystá útoky na Itálii", ["drony"]), fakta: ["Možný scénář: drony Gerbera vypuštěné z lodí, ukryté v kontejnerech."] })).toBe("vody");
    expect(temaZpravy(z("DK", "Drones launched from a tanker flew over Aalborg airport", ["drony"]))).toBe("vody");
    expect(temaZpravy(z("DE", "Ruská válečná loď vypálila světlice proti německému vrtulníku", ["hybridni"]))).toBe("vody");
    expect(temaZpravy(z("FI", "GPS jamming over the Gulf of Finland disrupts flights", ["kyber"]))).toBe("vody");
  });

  it("ruská plavidla jen tehdy, když akce míří na NATO nebo Evropu", () => {
    expect(temaZpravy(z("RU", "Russian warship shadowed off the Dutch coast, escorted by Netherlands navy", ["rusko"]))).toBe("vody");
    expect(temaZpravy(z("RU", "Russian Navy Day: warships parade at sea in St Petersburg", ["rusko"]))).toBeNull();
  });

  it("české pády moří a zálivů: v Baltském moři, ve Finském zálivu, u dánského pobřeží", () => {
    expect(jeNamorni("Poškozený kabel v Baltském moři")).toBe(true);
    expect(jeNamorni("Tanker kotví ve Finském zálivu")).toBe(true);
    expect(jeNamorni("Drony u dánského pobřeží")).toBe(true);
    expect(jeNamorni("Plavidlo ve výlučné ekonomické zóně Norska")).toBe(true);
  });

  it("námořník obviněný ze špionáže není incident na moři", () => {
    expect(temaZpravy(z("GB", "Royal Navy sailor charged with spying for Russia", ["zpravodajske"]))).toBeNull();
  });
});
