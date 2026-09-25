import { describe, expect, it } from "vitest";
import { aktualizujPamet, duvodOdmitnuti, kandidatId, obsahujeSlovo, odhadniTemata, odhadniZemi, otisk, relevantni } from "../sber/udalosti";
import { normalizuj, ocistiText, polozkyZeStranky } from "../sber/nacti";

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

  /*
    21. 9. 2026: výpadek O2 a Vodafonu se stovkami hlášení propadl sítem jako
    „bez skutku". Plošný výpadek je skutek a zpráva o českém operátorovi je
    z Česka i bez slova „Česko".
  */
  it("plošný výpadek sítí a služeb je skutek s místem", () => {
    const t = "Některé služby jsou nedostupné. O2 i Vodafone se od rána potýkají s výpadky, stížností jsou stovky";
    expect(duvodOdmitnuti(t)).toBeNull();
    expect(odhadniTemata(t).kategorie).toContain("infrastruktura");
    expect(odhadniZemi(t)?.kod).toBe("CZ");
    expect(duvodOdmitnuti("Nationwide mobile network outage hits Poland, operator says")).toBeNull();
  });

  it("slovo „vypadá“ není výpadek", () => {
    expect(duvodOdmitnuti("Situace v Polsku vypadá klidně, řekl ministr")).toBe("bez-skutku");
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

describe("dron, který spadl nebo se po něm pátrá", () => {
  /*
    15. 9. 2026 v 17:43 napsaly Novinky, že se nedaleko letiště německé armády
    zřítil dron. Web o tom nenapsal nic — a nebylo to zpožděním. Věta
    neobsahovala ani jednu frázi ze seznamu skutků (ty mířily na sestřelení
    a na narušení vzdušného prostoru), takže ji síto zahodilo jako zprávu
    „bez skutku".
  */
  it.each([
    "Nedaleko letiště německé armády se zřítil dron",
    "Policisté v Německu pátrají po dalším podezřelém dronu",
    "Drone crashes near German air force base",
    "U základny v Německu byl nalezen bezpilotní letoun",
  ])("projde sítem: %s", (v) => {
    expect(relevantni(v), duvodOdmitnuti(v) ?? "").toBe(true);
  });

  it("skutek bez místa se zahodí i tak — půlka informace nestačí", () => {
    // Pravidlo webu, ne chyba: „u základny byl nalezen dron“ neříká kde.
    expect(duvodOdmitnuti("U základny byl nalezen bezpilotní letoun")).toBe("bez-mista");
  });

  it("dron v článku o zemědělství skutek není", () => {
    expect(relevantni("Researchers found drone technology useful in farming")).toBe(false);
  });
});

describe("zkratky zemí se nesmějí trefit doprostřed anglických slov", () => {
  /*
    „cr" s povolenou koncovkou sedělo na „crash", „crisis" i „critical", takže
    anglické zprávy web označoval jako české. V datech kvůli tomu stálo, že
    ruský dron nad Moldavskem a Rumunskem je zpráva z Česka.
  */
  it.each([
    ["Drone crashes near German air force base", "DE"],
    ["Attack on critical infrastructure in Poland", "PL"],
    ["Nad Prahou zadržela policie muže s dronem", "CZ"],
  ])("%s → %s", (veta, kod) => {
    expect(odhadniZemi(veta)?.kod).toBe(kod);
  });

  it("anglická zpráva bez místa se neoznačí jako česká", () => {
    expect(odhadniZemi("Baltic crisis deepens after cable damage")?.kod).not.toBe("CZ");
  });
});

describe("shrnutí z RSS", () => {
  /*
    Popisky v kanálech Google News jsou zakódované dvojitě, takže po prvním
    průchodu zůstal v textu vypsaný odkaz i s base64 adresou. Chodilo to do
    rozpoznávání i na web: čtenář viděl v shrnutí kandidáta „<a href=…CBMilAF…"
    a rozpoznávání zemí v tom nacházelo zkratky, protože pomlčky a podtržítka
    v base64 se chovají jako mezery.
  */
  it("z popisku zmizí značky i adresa", () => {
    const vstup = '&lt;a href="https://news.google.com/rss/articles/CBMilAFBVV95cUxO-cr_uk"&gt;Deník N&lt;/a&gt;&amp;nbsp;Litva';
    expect(ocistiText(vstup)).toBe("Deník N Litva");
  });

  it("poradí si i s ořízlou značkou bez uzavření", () => {
    // Starší zápisy mají shrnutí oříznuté na 600 znaků uprostřed odkazu.
    expect(ocistiText('<a href="https://news.google.com/rss/articles/CBMilAF')).toBe("");
  });

  it("běžný text zůstane beze změny", () => {
    expect(ocistiText("Dron se zřítil u letiště v Německu.")).toBe("Dron se zřítil u letiště v Německu.");
  });
});

describe("čtení stránky, když kanál RSS nefunguje", () => {
  /*
    15. 9. 2026 vrátily všechny čtyři úřední kanály (NATO, Policie ČR, NÚKIB,
    vláda) chybu 404 nebo prázdno. Sběr běžel bez jediného primárního zdroje
    a nikdo si toho nevšiml: „nula zpráv z úřadu" vypadá stejně jako klid.
  */
  const stranka = `
    <nav><a href="/">Úvod</a> <a href="/kontakty">Kontakty</a></nav>
    <ul>
      <li><a href="/clanek/dron-u-zakladny">U letiště armády se zřítil neznámý dron</a></li>
      <li><a href="https://jiny.example/x">Policie zadržela muže podezřelého ze sabotáže</a></li>
      <li><a href="/clanek/dron-u-zakladny">U letiště armády se zřítil neznámý dron</a></li>
    </ul>`;

  it("vybere články a přeskočí navigaci", () => {
    const p = polozkyZeStranky(stranka, "https://policie.example/aktuality/");
    expect(p).toHaveLength(2);
    expect(p[0].nadpis).toBe("U letiště armády se zřítil neznámý dron");
    // Krátké odkazy jako „Úvod" nebo „Kontakty" články nejsou.
    expect(p.some((x) => x.nadpis === "Úvod")).toBe(false);
  });

  it("doplní celou adresu a nezopakuje týž odkaz", () => {
    const p = polozkyZeStranky(stranka, "https://policie.example/aktuality/");
    expect(p[0].odkaz).toBe("https://policie.example/clanek/dron-u-zakladny");
    expect(new Set(p.map((x) => x.odkaz)).size).toBe(p.length);
  });

  it("stránka bez článků nevrátí nic", () => {
    expect(polozkyZeStranky("<nav><a href=\"/\">Úvod</a></nav>", "https://x.example/")).toHaveLength(0);
  });
});

describe("navigace z úřední stránky nekazí přehled odmítnutých", () => {
  it("položka ze stránky je označená, aby se poznala", () => {
    /*
      První běh se čtením stránek nasypal do přehledu odmítnutých přes sto
      položek jako „Prohlášení o přístupnosti" nebo „Zahrada Strakovy
      akademie". Ten přehled je pracovní seznam, který má někdo projít —
      zaplavený je k ničemu.
    */
    const p = polozkyZeStranky('<a href="/a">Prohlášení o přístupnosti webu vlády</a>', "https://x.example/");
    expect(p[0].zeStranky).toBe(true);
  });

  it("z textu zmizí i konec HTML komentáře", () => {
    // Bez toho zůstávalo v titulcích „--> " z konce komentáře.
    const p = polozkyZeStranky('<!-- menu --><a href="/b">Vláda projednala návrh rozpočtu obrany</a>', "https://x.example/");
    expect(p[0].nadpis.startsWith("-->")).toBe(false);
    expect(p[0].nadpis).toBe("Vláda projednala návrh rozpočtu obrany");
  });
});

describe("svolané mimořádné jednání o bezpečnosti", () => {
  /*
    Třetí zpráva v řadě, kterou síto minulo jako „bez skutku". Svolání
    mimořádného jednání je vykonaný krok — někdo ho musel nařídit a rozeslat
    pozvánky — a pro čtenáře v Česku je to informace o tom, jak vážně situaci
    berou vlády kolem něj.
  */
  it("zachytí svolané mimořádné jednání o bezpečnosti", () => {
    expect(relevantni("Francouzský prezident svolal na pátek předsedy parlamentních stran kvůli bezpečnostní situaci")).toBe(true);
    /* Sídlo moci stačí jako místo — zprávy píšou o budově, ne vždy o zemi. */
    expect(relevantni("Mimořádné jednání o bezpečnosti svolal Elysejský palác na pátek")).toBe(true);
    expect(relevantni("Česká vláda svolala mimořádné jednání Bezpečnostní rady státu")).toBe(true);
    expect(relevantni("Polish government convened an emergency meeting on security after the incident")).toBe(true);
    expect(relevantni("Německo svolává mimořádné zasedání k obraně východního křídla")).toBe(true);
  });

  it("běžná pracovní jednání se dál nesbírají", () => {
    /* Hranice proti zpravodajství: mimořádnost a bezpečnost, ne každá schůzka. */
    expect(relevantni("Ministr vnitra jednal v Berlíně s partnery o bezpečnosti")).toBe(false);
    expect(relevantni("Vláda svolala mimořádné jednání o cenách energií v Česku")).toBe(false);
    expect(relevantni("Premiér svolal poradu o rozpočtu, uvedla vláda v Praze")).toBe(false);
  });

  it("výzva ke svolání není svolání", () => {
    /*
      „Opozice žádá, ať premiér schůzku svolá" je návrh, ne vykonaný krok.
      Zachytí se až samotné svolání — jinak by web hlásil jako opatření něco,
      co se nestalo.
    */
    expect(relevantni("Opozice v Česku vyzvala premiéra, aby jednal o bezpečnosti")).toBe(false);
  });

  it("svolání bez místa se zahodí jako každý jiný skutek", () => {
    expect(relevantni("Svolal mimořádné jednání o bezpečnosti")).toBe(false);
  });
});

describe("české tvary jako místo", () => {
  it("česká vláda i český premiér jsou Česko", () => {
    /* Výčet koncovek vynechal zrovna tu nejběžnější a zpráva padala „bez místa". */
    expect(odhadniZemi("Česká vláda svolala mimořádné jednání Bezpečnostní rady státu")?.kod).toBe("CZ");
    expect(odhadniZemi("Český premiér odmítl formát koordinačních schůzek")?.kod).toBe("CZ");
    expect(odhadniZemi("Čeští vojáci posílili ostrahu")?.kod).toBe("CZ");
  });
  it("sídlo moci stačí jako místo", () => {
    expect(odhadniZemi("Jednání v Elysejském paláci potrvá dvě hodiny")?.kod).toBe("FR");
    expect(odhadniZemi("Downing Street svolala poradu")?.kod).toBe("GB");
  });
});

describe("síto nesmí zahodit skutečné události ze září 2026", () => {
  /*
    Titulky, které síto do 23. 9. 2026 zahodilo nebo vůbec nezachytilo, i když
    šlo o přesně ty události, kvůli kterým sběr běží.
  */
  const musiProjit = [
    "Unauthorized Drones Disrupt Operations at Luxembourg Airport - Dronelife",
    "Lotnisko w Rzeszowie: Poland suspends flights at Lublin and Rzeszów airports over Russian drone attack",
    "Romanian Coast Guard found three pieces of drone debris in the Black Sea",
    "Rumunské námořnictvo vylovilo trosky ruských dronů v rumunské výlučné ekonomické zóně",
    "Požár v muniční továrně MSM Group na Slovensku, polícia začala vyšetřovanie",
    "Fire breaks out at Slovak ammunition plant of MSM Group",
    "Russian frigate fired two flares towards Danish military helicopter",
    "Russian drone violated Moldovan airspace near Cioburciu",
  ];
  for (const t of musiProjit) {
    it(t, () => expect(duvodOdmitnuti(t)).toBeNull());
  }

  it("samotné letiště bez dronu a bez přerušení provozu je doprava, ne událost", () => {
    expect(duvodOdmitnuti("Letiště v Lucemburku otevřelo nový terminál")).not.toBeNull();
    expect(duvodOdmitnuti("Drone show at Luxembourg airport celebrates anniversary")).not.toBeNull();
  });

  it("Lucembursko je místo", () => {
    expect(odhadniZemi("Drones disrupt Luxembourg airport")?.kod).toBe("LU");
  });
});

describe("paměť rozhodnutých zpráv", () => {
  const k = (url: string, stav: string, titulek = "Titulek zprávy o dronu nad letištěm v Lucemburku") =>
    ({ zdroj: { url }, titulek, titulekPuvodni: titulek, stav, vyrizeni: stav === "ceka" ? null : { kdy: "2026-09-20T10:00:00Z", duvod: "neudalost" } });

  it("rozhodnutý kandidát se zapamatuje, čekající ne", () => {
    const p = aktualizujPamet([], [k("https://a", "vyrizen"), k("https://b", "ceka")], Date.parse("2026-09-23T00:00:00Z"));
    expect(p.map((v) => v.url)).toEqual(["https://a"]);
    expect(p[0].duvod).toBe("neudalost");
  });

  it("paměť přežije, že kandidát z fronty odejde, a zapomíná až po 60 dnech", () => {
    const p1 = aktualizujPamet([], [k("https://a", "vyrizen")], Date.parse("2026-09-23T00:00:00Z"));
    const p2 = aktualizujPamet(p1, [], Date.parse("2026-10-30T00:00:00Z"));
    expect(p2.map((v) => v.url)).toEqual(["https://a"]);
    const p3 = aktualizujPamet(p1, [], Date.parse("2026-11-30T00:00:00Z"));
    expect(p3).toEqual([]);
  });
});

describe("vyloučená témata nesmí trefit cizí slovo", () => {
  it("„daně“ nejsou „Danish“", () => {
    expect(duvodOdmitnuti("Danish police arrested man suspected of sabotage in Copenhagen")).toBeNull();
    expect(duvodOdmitnuti("Vláda schválila daně a sabotáž rozpočtu v Praze")).toBe("vylouceno-tematem");
  });
});

describe("omezení pohybu u hranice", () => {
  // ERR 21. 9. 2026 — sběr to zahodil jako „bez skutku“.
  it("úřední omezení pohybu u hranice je skutek", () => {
    const t = "Russia imposes temporary movement restrictions on other side of Estonian border. Russia's Federal Security Service (FSB) has imposed temporary movement restrictions in two districts across the border from Estonia.";
    expect(duvodOdmitnuti(t)).toBeNull();
  });
  it("zákaz vycházení u hranice česky", () => {
    expect(duvodOdmitnuti("Rusko zavedlo zákaz vycházení v okresech u hranice s Estonskem")).toBeNull();
  });

  it("varování před konkrétním útokem je skutek, obecná nálada ne (24. 9. 2026)", () => {
    expect(relevantni("Rusko připravuje útoky na tři středomořské státy. Použijí drony ukryté v kontejneru na lodi, píše španělský list")).toBe(true);
    expect(relevantni("US intelligence warns Russia is preparing drone attacks on Mediterranean states from container ships")).toBe(true);
    expect(relevantni("Hrozba ze strany Ruska podle analytiků roste")).toBe(false);
  });

  it("zadržení bez bezpečnostního kontextu neprojde, se špionáží ano (25. 9. 2026)", () => {
    expect(relevantni("Celníci z Ostravy zadrželi stovky kilogramů kebabu. Řidič je převážel bez chlazení")).toBe(false);
    expect(relevantni("Polská policie zadržela muže podezřelého ze špionáže pro Rusko")).toBe(true);
  });
  it("výrok vedení Ruska o Pobaltí se zachytí (25. 9. 2026)", () => {
    expect(relevantni("Putin: V Pobaltí se porušují práva ruských menšin")).toBe(true);
    expect(relevantni("Putin claims Russian speakers' rights are violated in Baltic states")).toBe(true);
  });
});
