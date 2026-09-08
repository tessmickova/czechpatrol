import { describe, expect, it } from "vitest";
import { kandidatId, obsahujeSlovo, odhadniTemata, odhadniZemi, otisk, relevantni } from "../sber/udalosti";

describe("automatický sběr událostí — pravidla", () => {
  it("pozná zemi události, i když je zmíněné Rusko jako původce", () => {
    expect(odhadniZemi("Russian drone violates Romanian airspace near Tulcea")?.kod).toBe("RO");
    expect(odhadniZemi("Policie ČR zadržela v Praze muže podezřelého ze sabotáže")?.kod).toBe("CZ");
    expect(odhadniZemi("Kremlin comments on sanctions")?.kod).toBe("RU");
    expect(odhadniZemi("Weather forecast for tomorrow")).toBeNull();
  });
  it("přiřadí oblasti podle klíčových slov", () => {
    const t = odhadniTemata("Sabotage suspected after fire at substation; undersea cable also damaged");
    expect(t.kategorie).toEqual(expect.arrayContaining(["sabotaz", "infrastruktura"]));
  });
  it("zachytí se jen skutek nebo úřední rozhodnutí, a musí být jasné kde", () => {
    expect(relevantni("Arson attack on warehouse in Poland linked to Russian intelligence, police say")).toBe(true);
    expect(relevantni("NATO scrambled jets after airspace violation by drone")).toBe(true);
    expect(relevantni("Litva vyhlásila nouzový stav po výbuchu na plynovodu")).toBe(true);
    expect(relevantni("Německá policie zadržela muže podezřelého ze sabotáže na železnici v Berlíně")).toBe(true);
    expect(relevantni("Estonsko obvinilo občana Ruska ze špionáže")).toBe(true);
    // Skutek bez místa je půlka informace.
    expect(relevantni("Zadržený muž se přiznal k sabotáži")).toBe(false);
  });
  it("prohlášení, sliby a domácí politika se nezachytí — nejsme zpravodajství", () => {
    expect(relevantni("Rostoucími cenami pohonných hmot se v pondělí bude zabývat vláda, řekl Babiš")).toBe(false);
    expect(relevantni("Vláda do konce září rozhodne o růstu důchodů i podobě rozpočtu")).toBe(false);
    expect(relevantni("Babiš: Česko je pravděpodobně cílem ruských kybernetických útoků")).toBe(false);
    expect(relevantni("Ministr vnitra jednal v Berlíně s partnery o bezpečnosti")).toBe(false);
    expect(relevantni("Opozice obvinila vládu z chyb v rozpočtu")).toBe(false);
    expect(relevantni("Football club in Poland buys new drone for training videos")).toBe(false);
    expect(relevantni("Drone show lights up the night sky at festival in Prague")).toBe(false);
  });
  it("klíčové slovo se hledá od začátku slova, ne doprostřed jména", () => {
    // Kvůli tomuhle se z vládního jednání o důchodech stala „zpravodajská“ zpráva.
    expect(obsahujeSlovo("rekl babis vlada bude resit", "bis")).toBe(false);
    expect(obsahujeSlovo("varovala bis pred sabotazemi", "bis")).toBe(true);
    // Česká koncovka se povoluje: kmen najde i skloňovaný tvar.
    expect(obsahujeSlovo("policie vysetruje sabotaze na zeleznici", "sabotaz")).toBe(true);
    expect(obsahujeSlovo("estonsko obvinilo obcana", "obvin")).toBe(true);
  });
  it("id kandidáta je jedinečné i pro adresy se stejným začátkem", () => {
    const a = kandidatId("https://news.google.com/rss/articles/CBMiAAAA?oc=5");
    const b = kandidatId("https://news.google.com/rss/articles/CBMiBBBB?oc=5");
    expect(a).not.toBe(b);
    expect(a).toBe(kandidatId("https://news.google.com/rss/articles/CBMiAAAA?oc=5"));
    expect(a).toMatch(/^k-[0-9a-f]{16}$/);
  });
  it("otisk titulku srovná stejnou zprávu z různých redakcí", () => {
    expect(otisk("Copenhagen Airport closed as police investigate drone activity — Bloomberg")).toBe(otisk("Copenhagen airport closed as police investigate drone activity!"));
    expect(otisk("Munich airport drones")).not.toBe(otisk("Oslo airport drones"));
  });

  it("kontroly na hranici a vojáci u nich se zachytí i při přehozeném pořadí slov", () => {
    // Tohle pravidla původně minula: web o cvičení na hranici se Slovenskem nevěděl.
    expect(relevantni("Policie chystá na hranici se Slovenskem cvičení, zapojí se i vojáci a celníci")).toBe(true);
    expect(relevantni("Cvičení na státní hranici se Slovenskem potrvá 24 hodin")).toBe(true);
    expect(relevantni("Česko obnoví kontroly na hranicích se Slovenskem")).toBe(true);
    expect(relevantni("Německo prodloužilo hraniční kontroly s Polskem")).toBe(true);
    expect(relevantni("Polsko nasadilo vojáky na hranici s Běloruskem")).toBe(true);
    // A pořád nesmí projít běžné zpravodajství.
    expect(relevantni("Fotbalisté v Polsku hráli na hranici svých sil")).toBe(false);
    expect(relevantni("Ministr jednal v Berlíně s partnery o bezpečnosti")).toBe(false);
  });
});
