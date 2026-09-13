import { describe, expect, it } from "vitest";
import { duvodOdmitnuti, kandidatId, obsahujeSlovo, odhadniTemata, odhadniZemi, otisk, relevantni } from "../sber/udalosti";
import { normalizuj } from "../sber/nacti";

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

/*
  Vzdušná obrana. 13. 9. 2026 v noci aktivovalo polské letectvo stroje kvůli
  ruskému úderu na Ukrajinu a na východě Polska zněly sirény — a v kandidátech
  to nebylo. Tyhle testy drží obojí: že se takové titulky zachytí, a hlavně že
  se přitom nezačnou chytat pouhá prohlášení a plány.
*/
describe("vzlet stíhaček a letecký poplach", () => {
  const zachyceno = (t: string) => odhadniTemata(t).akty.length > 0;

  it.each([
    "Rusko a Ukrajina hlásí mrtvé a raněné po útocích, v Polsku vzlétly stíhačky",
    "Poplach v Polsku: Armáda vyslala do vzduchu stíhačky, na východě zněly sirény",
    "Poland scrambles aircraft in response to Russian attack on Ukraine",
    "Drony nad Polskem odhalil Patriot. Vzlétly F-16, F-35 i letoun AWACS",
    "Kvůli ruskému náletu vzlétly polské stíhačky, pomohly i české vrtulníky",
  ])("zachytí vykonané opatření: %s", (t) => {
    expect(zachyceno(t)).toBe(true);
  });

  it.each([
    "Polsko zvažuje posílení protivzdušné obrany, řekl ministr",
    "Vláda chce příští rok nakoupit nové stíhačky",
    "Ceny pohonných hmot klesly, vzlétly akcie leteckých firem",
  ])("nechytá prohlášení, plány ani jmenovce: %s", (t) => {
    expect(zachyceno(t)).toBe(false);
  });

  it("v seznamu nezůstal zápis s diakritikou, který se nikdy netrefí", () => {
    // normalizuj() diakritiku odstraňuje, takže „vzlétly“ v seznamu byl mrtvý
    // zápis. Test hlídá, že se taková past nevrátí.
    expect(obsahujeSlovo(normalizuj("v Polsku vzlétly stíhačky"), "vzletly stihacky")).toBe(true);
  });
});

/*
  Odmítnuté zprávy.

  Síto na klíčová slova neumí posoudit zprávu, která je vážná, ale napsaná
  mizerně. Tyhle testy drží dvě věci: že se důvod odmítnutí pozná správně
  (aby člověk ve správě viděl, čím to spadlo), a hlavně že se taková zpráva
  NEZAHODÍ — protože právě ona je ten případ, kvůli kterému přehled vznikl.
*/
describe("důvod odmítnutí", () => {
  it("vyloučené téma pozná i nad bezpečnostním slovem", () => {
    expect(duvodOdmitnuti("Sněmovna schválila rozpočet na obranu")).toBe("vylouceno-tematem");
  });

  it("zpráva bez skutku spadne na chybějícím skutku", () => {
    expect(duvodOdmitnuti("Ministr v Polsku mluvil o bezpečnosti regionu")).toBe("bez-skutku");
  });

  it("skutek bez místa spadne na chybějícím místě", () => {
    expect(duvodOdmitnuti("Došlo k sabotáži na železnici")).toBe("bez-mista");
  });

  it("co projde, nemá důvod odmítnutí", () => {
    expect(duvodOdmitnuti("Russian drone violated Romanian airspace near Tulcea")).toBeNull();
    expect(duvodOdmitnuti("Poplach v Polsku: Armáda vyslala do vzduchu stíhačky")).toBeNull();
  });

  it("relevantni a duvodOdmitnuti se nesmějí rozejít", () => {
    const vzorky = [
      "Russian drone violated Romanian airspace near Tulcea",
      "Sněmovna schválila rozpočet na obranu",
      "Ministr v Polsku mluvil o bezpečnosti regionu",
      "Došlo k sabotáži na železnici",
      "Fotbalová liga zná vítěze",
    ];
    for (const v of vzorky) expect(relevantni(v)).toBe(duvodOdmitnuti(v) === null);
  });

  it("blbě napsaná vážná zpráva se odmítne — ale s důvodem, takže se neztratí", () => {
    // Přesně ten případ, kvůli kterému přehled odmítnutých vznikl: titulek
    // neříká nic a síto na slova nemá čeho se chytit. Podstatné je, že se
    // zpráva nezahodí — dostane důvod a jde člověku na stůl.
    const duvod = duvodOdmitnuti("Začínáme. Co jsme viděli dnes ráno, si budeme pamatovat celý život");
    expect(duvod).not.toBeNull();
    expect(["bez-skutku", "bez-mista", "vylouceno-tematem"]).toContain(duvod);
  });
});
