import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ctiRss, normalizuj, polozkyZeStranky, stahni } from "./nacti";
import { ZDROJE_UDALOSTI, type ZdrojUdalosti } from "./zdroje-udalosti";
import { dostupnyPoskytovatel, strukturovane } from "./model";
import { vyrezZeStranky, type VyrezZdroje } from "./text-zdroje";
import { ctenaProfily } from "./socialni";
import { ctiProfil } from "./cteni-socialni";
import type { Polozka } from "./typy";

/*
  Automatický sběr událostí.

  Každou hodinu projde RSS kanály, vybere zprávy, které odpovídají
  sledovaným tématům, odhadne zemi a oblast a zapíše je do
  data/kandidati.json. Web je ukáže hned — jako „automaticky zachyceno,
  čeká na ověření“. Do počtů a hodnocení nevstupují, dokud je člověk
  nepřevezme do data/incidenty.json (nastroje/prijmi-kandidata.mjs).

  Je-li k dispozici ANTHROPIC_API_KEY, model každého nového kandidáta
  přečte, vyřadí nerelevantní a doplní český titulek, shrnutí, zemi
  a oblast. Bez klíče se použijí jen pravidla podle klíčových slov.
*/

export interface Kandidat {
  id: string;
  zachyceno: string;
  publikovano: string | null;
  zdroj: { nazev: string; url: string; typ: "primary" | "wire" | "media" | "social"; primarni: boolean };
  titulek: string;
  titulekPuvodni: string;
  shrnuti: string;
  kodZeme: string | null;
  zeme: string | null;
  kategorie: string[];
  druhOdhad: "pripad" | "opatreni" | "reakce" | "neurceno";
  /** „clovek“ = vytáhl to člověk z odmítnutých, proti sítu. */
  klasifikace: "pravidla" | "model" | "clovek";
  /*
    Kandidát z profilu na sociální síti. Je to SIGNÁL, ne doklad: nesmí sám
    vytvořit záznam ani zvýšit jistotu. Člověk k němu musí dohledat nezávislé
    potvrzení — a u podvrženého profilu je tím potvrzením i to, že příspěvek
    vůbec existuje.
  */
  zeSite?: { kdo: string; role: string; sit: string } | null;
  /*
    Výřez ze zdrojového článku, stažený v Actions. Ověřovací rutina běží
    v sandboxu, kde jsou zpravodajské domény blokované — ověřuje proto
    z tohohle textu, ne ze sítě (pravidlo č. 4b). null = ještě nestahováno.
  */
  vyrez?: VyrezZdroje | null;
  shody: string[];
  /*
    Naléhavý kandidát. Je to jediná věc, kterou sběr kolem mimořádné výstrahy
    umí: označit zprávu, kterou má člověk vidět první. Výstrahu samotnou
    nezapíná a zapnout nemůže — od toho je nastroje/vystraha.mjs a člověk.
    Kdyby to uměl automat, stačila by jedna podvržená zpráva k tomu, aby web
    sám vyhlásil mobilizaci.
  */
  naliehave?: Naliehavost | null;
  stav: "ceka";
}

const KOREN = path.join(process.cwd(), "data");
const SOUBOR = path.join(KOREN, "kandidati.json");
const SOUBOR_ODMITNUTYCH = path.join(KOREN, "fronta", "odmitnute.json");
const DNI_ZPET = 21;
const MAX_KANDIDATU = 300;
/*
  Paměť rozhodnutých zpráv.

  Do 23. 9. 2026 se rozhodnutá zpráva vracela: kandidát se stavem „vyrizen"
  zůstával v kandidati.json jen do chvíle, než ho ze stropu fronty vytlačily
  novější zprávy. Pak o něm sběr nevěděl nic, Google News ho v okně 21 dní
  nabídl znovu a do fronty přišel jako nový „ceka". Patrol tak tytéž
  zprávy rozhodoval den co den (viz jeho odpovědi z 21.–22. 9.).

  Poplachové systémy to řeší pamětí „už viděno", která žije déle než okno
  sběru. Tady je to týž princip: adresa a otisk titulku každé rozhodnuté
  zprávy se drží DNI_PAMETI dní, i když kandidát z fronty odejde.
*/
const SOUBOR_VYRIZENYCH = path.join(KOREN, "fronta", "vyrizene.json");
const DNI_PAMETI = 60;
/*
  Kolik článků se za běh stáhne kvůli výřezu. Strop je tu proto, že běh nemá
  trvat věčnost a redakce nemají být zbytečně zatěžované; nedotažení se dohoní
  příští běh, protože se doplňuje jen to, co chybí.
*/
const MAX_VYREZU_ZA_BEH = 12;

/*
  Odmítnuté zprávy.

  Síto na klíčová slova neumí posoudit zprávu, která je vážná, ale napsaná
  mizerně — titulek „Začínáme“ nad textem o vypuknutí války se do žádného
  seznamu slov netrefí. Dokud se odmítnuté zprávy zahazovaly, nebylo jak to
  zachytit ani zpětně zjistit, že nám něco uteklo.

  Proto se teď nic nezahazuje: co síto nepustí, jde sem. Levný model tomu dá
  druhé čtení a označí, co vypadá vážně; člověk pak může ručně vytáhnout, co
  má. Je to podklad pro rozhodnutí člověka, ne druhá cesta na web — do počtů,
  hodnocení ani na veřejné stránky tenhle soubor nevstupuje nikdy.
*/
const MAX_ODMITNUTYCH = 500;
const DNI_ODMITNUTYCH = 7;
/** Strop pro jeden běh, aby posouzení modelem nemohlo utéct do nákladů. */
const MAX_POSUZOVANYCH = 120;

export type DuvodOdmitnuti = "vylouceno-tematem" | "bez-skutku" | "bez-mista";

export interface Odmitnuty {
  id: string;
  zachyceno: string;
  publikovano: string | null;
  zdroj: { nazev: string; url: string; typ: "primary" | "wire" | "media" | "social"; primarni: boolean };
  titulek: string;
  shrnuti: string;
  duvod: DuvodOdmitnuti;
  /** Co v textu síto našlo — pro člověka, který posuzuje, proč to spadlo. */
  kategorie: string[];
  /**
   * Druhé čtení modelem. null = neposouzeno (chybí klíč nebo došel strop).
   * Nikdy se nedopočítává: neposouzené se v přehledu tak i označí.
   */
  posouzeni: { podezreni: "vysoke" | "stredni" | "zadne"; duvod: string; kdy: string } | null;
}

/*
  Co sem patří a co ne.

  Web není zpravodajství. Sbírá jen skutky, které mění bezpečnostní situaci,
  a úřední rozhodnutí, která ji mění formálně — nebo doložený a konkrétní krok
  k nim. Prohlášení, sliby, plány, jednání vlády o cenách nebo důchodech sem
  nepatří, i když v nich zazní slovo „bezpečnost“.

  Proto je podmínka dvojí: zpráva musí obsahovat SKUTEK (seznam `AKTY`)
  a musí mít místo (zemi nebo alianci). Ostatní slova (`KONTEXT`) samy o sobě
  nestačí, jen zprávě přidají oblast.
*/

/** Skutky a úřední rozhodnutí. Bez aspoň jednoho z nich se zpráva nezachytí. */
const AKTY: { kategorie: string; slova: string[] }[] = [
  { kategorie: "sabotaz", slova: [
    "sabotage", "sabotaz", "arson", "incendiary device", "zhar", "zharstvi", "zapalna lahev",
    "explosion", "vybuch", "vybusnina", "naloz", "bomb", "poskozeni kabelu", "preruseny kabel",
    "prestrizeny", "vykolejeni", "derailment",
  ] },
  { kategorie: "drony", slova: [
    "airspace violation", "violated airspace", "narusil vzdusny prostor", "naruseni vzdusneho prostoru",
    "sestrel", "shot down", "dopad dronu", "drone crash", "drone incursion",
    "uzavreni letiste", "airport closed", "pozastavila provoz letiste", "grounded flights",
  ] },
  /*
    Obranná opatření státu, která se opravdu stala.

    Doplněno 13. 9. 2026: v noci aktivovalo polské letectvo stroje kvůli
    ruskému úderu na Ukrajinu, na východě zněly sirény — a sběrač to nezachytil.
    Skupina „drony“ výš totiž vyžaduje NARUŠENÍ (sestřel, dopad, uzavření
    letiště); preventivní vzlet se netrefil do ničeho a slova „vzdušný prostor“
    a „dron“ jsou jen KONTEXT, který sám nestačí.

    Přitom vzlet stíhaček i spuštění sirén JSOU skutky, ne prohlášení: stát je
    vykonal a sám je oznámil. Patří tedy do sběru podle pravidla č. 0 bodu (c).

    Pozor na hranici: zachytává se vykonané opatření, ne připravované. Proto tu
    není „pohotovost“ ani „zvažuje“ — to jsou stavy a plány. A zachycení není
    zveřejnění: kandidát jde do fronty a člověk rozhodne. Takový záznam patří
    do druhu „opatreni“, ne „pripad“, aby nenafukoval počty incidentů.
  */
  { kategorie: "drony", slova: [
    "scrambl", "preventivni vzlet",
    "uzavrel vzdusny prostor", "uzavreni vzdusneho prostoru", "uzavrela vzdusny prostor",
    "airspace closed", "closed its airspace", "closed airspace",
    "letecky poplach", "air raid alert", "air raid siren", "protiletecky poplach",
    "zněly sireny", "znely sireny", "spustily sireny", "rozeznely se sireny",
  ] },
  { kategorie: "kyber", slova: [
    "cyberattack", "cyber attack", "kyberneticky utok", "kyberutok", "ransomware", "ddos utok", "ddos attack",
    "hacknut", "hacked", "data breach", "unik dat", "vyrazen z provozu",
  ] },
  { kategorie: "infrastruktura", slova: [
    "poskozen plynovod", "damaged pipeline", "vypadek proudu", "power outage", "blackout",
    "poskozena rozvodna", "utok na rozvodnu", "prerusena dodavka", "zastavena dodavka",
    "undersea cable damage", "subsea cable cut", "cable damaged", "poskozeny podmorsky kabel",
  ] },
  /*
    Plošný výpadek sítí a služeb.

    Doplněno 22. 9. 2026: 21. 9. ráno hlásily stovky lidí výpadky O2 a Vodafonu
    (internet, televize) a iROZHLAS o tom psal v 9:02 — síto zprávu zahodilo
    jako „bez skutku", protože se v ní nestřílí, nic nepadá a nikdo nikoho
    nezadržel. Přitom je to přesně to, co si člověk v Česku ověřuje jako první,
    když se něco děje: jde zavolat, zaplatit, připojit se?

    Výpadek je skutek — něco přestalo fungovat — a příčina se do něj nepíše.
    Zachycení neznamená, že za tím někdo stojí; to smí říct až ověření
    a záznam nese původce „neznámý", dokud provozovatel nebo úřad neřekne víc.
    Kmen „vypad" tu schválně není: trefil by „vypadá" v každé druhé větě.
  */
  { kategorie: "infrastruktura", slova: [
    "vypadek site", "vypadek siti", "vypadky site", "vypadky siti", "vypadek sluzeb", "vypadky sluzeb",
    "vypadek internetu", "vypadek mobilni site", "vypadek signalu", "vypadek plateb", "vypadek platebnich",
    "potykaji s vypadky", "potyka s vypadky", "hlasi vypadek", "hlasi vypadky", "rozsahly vypadek", "plosny vypadek",
    "sluzby jsou nedostupne", "nedostupne sluzby", "nefunguje internet", "nejde internet", "bez signalu",
    "nefunguji platby", "nejdou platby", "nefunguje internetove bankovnictvi",
    "network outage", "service outage", "internet outage", "mobile network down", "nationwide outage",
    "widespread outage", "major outage", "payment outage", "banking outage",
  ] },
  { kategorie: "zpravodajske", slova: [
    // Kmeny bez koncovky, aby čeština fungovala: „obvin“ najde obviněn i obvinilo.
    "zadrz", "zatc", "obvin", "obzalov", "odsoud", "arrested", "charged with", "indicted",
    "vyhost", "expelled diplomat", "odhalena sit", "spy network", "spionazni sit",
  ] },
  { kategorie: "pravo", slova: [
    "state of emergency", "vyhlasil nouzovy stav", "vyhlasila nouzovy stav", "nouzovy stav byl vyhlasen",
    "stav ohrozeni statu", "valecny stav", "vyjimecny stav", "martial law", "stanne pravo",
    "mobilizace vyhlasena", "vyhlasil mobilizaci", "castecna mobilizace", "mobilisation ordered",
    "branna povinnost", "odvody",
  ] },
  { kategorie: "nato", slova: [
    "article 4", "article 5", "clanek 4", "clanku 4", "clanek 5", "clanku 5",
    "aktivovala clanek", "invoked article", "nato scrambled", "vzletly stihacky",
    "rozmisteni sil", "deployment of troops", "posili vychodni kridlo", "reinforce eastern flank",
  ] },
  { kategorie: "hranice", slova: [
    // Kontroly na hranicích a vojáci u nich jsou pro čtenáře v Česku to nejviditelnější,
    // co stát dělá. Seznam proto pokrývá i české tvary a cvičení — zachytit se to musí,
    // roztřídit na skutečné zavedení a na nácvik umí až ověření.
    "uzavreni hranic", "uzavrela hranice", "closed the border", "border closure",
    "hranicni kontroly", "kontroly na hranici", "kontroly na hranicich", "kontrol na hranicich",
    "znovuzavedeni kontrol", "znovuzavedeni hranicnich kontrol", "obnovi kontroly", "obnovila kontroly",
    "zavede kontroly", "zavedla kontroly", "namatkove kontroly", "ostraha hranic", "ochrana hranic",
    "border checks", "border controls", "checks at the border",
    "cviceni na hranici", "cviceni na statni hranici", "cviceni ke znovuzavedeni", "hranicni cviceni",
    "evakuace obyvatel", "evacuation ordered",
  ] },
  { kategorie: "vojsko", slova: [
    "nasazeni vojaku", "nasadi vojaky", "nasadila vojaky", "vojaci na hranicich", "armada na hranicich",
    "aktivni zaloha", "povolani zalohy", "troops deployed", "deploy troops", "soldiers deployed",
    "military deployment", "mimoradna pohotovost",
  ] },
  { kategorie: "hybridni", slova: [
    "utok na", "attack on", "strela dopadla", "missile struck", "raketa dopadla", "ostrelovani",
  ] },
  /*
    Svolané mimořádné jednání o bezpečnosti.

    Doplněno 18. 9. 2026: francouzský prezident svolal na pátek předsedy
    parlamentních stran kvůli „rychlému zhoršení" mezinárodní situace a jejím
    důsledkům pro bezpečnost a energetiku Francie. Sběrač to minul — v takové
    zprávě se nestřílí, nic nepadá a žádný stav se nevyhlašuje, takže spadla
    jako „bez skutku". Přitom je to přesně ten krok, kterým stát dává najevo,
    že situaci považuje za vážnou, a čtenář v Česku má právo vědět, že ho
    sousední země udělala a naše zatím ne.

    Hranice proti běžné politice je v tom, že se svolává MIMOŘÁDNĚ a kvůli
    BEZPEČNOSTI. „Ministr vnitra jednal v Berlíně s partnery o bezpečnosti"
    je pracovní cesta a sítem dál neprojde; „svolal mimořádné jednání
    bezpečnostní rady" je vykonaný krok, který někdo musel nařídit.

    Prohlášení a výzvy sem nepatří ani teď: „opozice vyzvala premiéra, ať
    schůzku svolá" je návrh, ne svolaná schůzka. Zachytí se až samotné
    svolání. Takový záznam patří do druhu „opatreni“ nebo „reakce“, ne
    „pripad“, aby nenafukoval počty incidentů.
  */
  { kategorie: "diplomacie", slova: [
    "bezpecnostni rada statu", "jednani bezpecnostni rady", "zasedani bezpecnostni rady",
    "national security council", "conseil de defense", "conseil de securite",
    "narodni bezpecnostni poradce", "national security adviser", "national security advisor",
    "mimoradny summit", "emergency summit", "extraordinary summit",
    "emergency meeting", "crisis meeting", "crisis talks",
  ] },

  /*
    Zahájené krizové vysílání je skutek, ne prohlášení: někdo přepnul rádio do
    jiného režimu. Pro člověka v Česku je to praktická informace — znamená to
    „pusť si rádio“. Bez téhle skupiny by taková zpráva propadla sítem jako
    „bez skutku“, protože se v ní nestřílí ani nic nepadá.
  */
  { kategorie: "cr", slova: [
    "mimoradne vysilani", "krizove vysilani", "mimoradny vysilaci rezim", "krizovy rezim vysilani",
    "zahajil mimoradne vysilani", "zahajila mimoradne vysilani", "prechazi na mimoradne vysilani",
    "emergency broadcast", "emergency broadcasting",
  ] },
];

/**
 * Dvojice slov, které samy o sobě nic neznamenají, ale spolu ano.
 *
 * Čeština si slova přehazuje: „policie chystá na hranici se Slovenskem cvičení“
 * neobsahuje souvislou frázi „cvičení na hranici“, a hledání celých frází to
 * proto minulo. Stačí, když se v textu potkají slova z obou sloupců.
 */
const AKTY_KOMBINACE: { kategorie: string; a: string[]; b: string[]; c?: string[] }[] = [
  {
    /*
      Svolání mimořádného jednání o bezpečnosti, ať už jsou slova v jakémkoli
      pořadí: „svolává na pátek předsedy stran kvůli bezpečnostní situaci",
      „mimořádné jednání vlády o obraně", „convened party leaders on security".

      V `a` je jen svolání a mimořádnost, ne holé „jednání" — to by zachytilo
      každou pracovní schůzku ministra. V `b` je bezpečnostní kontext, aby
      neprošlo mimořádné jednání o rozpočtu nebo o cenách energií.
    */
    kategorie: "diplomacie",
    a: ["svolal", "svolala", "svolava", "svolani", "mimoradne jednani", "mimoradna schuze",
        "mimoradne zasedani", "convened", "convenes", "summoned", "convie"],
    b: ["bezpecnost", "obran", "security", "defence", "defense",
        "predsedy stran", "predsedu stran", "sefu stran", "lidry stran", "party leaders",
        "ustavnich cinitelu", "bezpecnostni rady"],
  },
  {
    kategorie: "hranice",
    a: ["hranic", "border", "prechod"],
    b: ["kontrol", "cviceni", "uzavr", "vojak", "vojaci", "armad", "celnic", "zaloh", "checks", "closed", "exercise", "troops", "soldiers"],
  },
  {
    /*
      „violated Romanian airspace“, „narušil polský vzdušný prostor“ — mezi
      slovesem a předmětem stojí přívlastek, takže fráze „violated airspace“
      v seznamu AKTY se netrefí. Přitom je to nejběžnější způsob, jak se
      o narušení vzdušného prostoru píše.
    */
    kategorie: "drony",
    a: ["violat", "narusil", "narusila", "narusily", "breach", "incursion"],
    b: ["airspace", "vzdusny prostor", "vzdusneho prostoru"],
  },
  {
    /*
      Dron, který spadl, byl nalezen nebo se po něm pátrá.

      Chybělo to celé: česká věta „nedaleko letiště německé armády se zřítil
      dron“ neobsahuje ani jednu frázi ze seznamu (ty míří na sestřelení
      a na narušení vzdušného prostoru), takže ji síto zahodilo jako zprávu
      bez skutku. Přitom je to přesně ten druh události, kvůli kterému tenhle
      web vznikl.

      Sloveso a předmět zvlášť, každé jako kmen — čeština mezi ně vkládá
      přívlastek („zřítil se podezřelý dron“) a slova skloňuje.
    */
    kategorie: "drony",
    a: ["dron", "drone", "uav", "bezpilotn"],
    b: ["zritil", "spadl", "havaroval", "nalezen", "nalezli", "naslo", "patraji", "patrala",
      "dopadl", "zasahl", "crashed", "crashes", "fell", "recovered"],
  },
  {
    /*
      Dron, kvůli kterému stojí letiště.

      Doplněno 23. 9. 2026: „Unauthorized Drones Disrupt Operations at
      Luxembourg Airport" síto zahodilo jako „bez skutku" — fráze „airport
      closed" a „uzavření letiště" se netrefily, protože se píše „disrupt",
      „suspended", „přerušen provoz". Stejně propadala polská letiště Lublin
      a Rzeszów, která 9., 16., 17. a 18. 9. přerušila provoz kvůli ruským
      dronům nad Ukrajinou. Dron i letiště musí být obojí, samo „letiště"
      je každodenní doprava.
    */
    kategorie: "drony",
    a: ["dron", "drone", "uav", "bezpilotn"],
    b: ["letist", "airport", "flights", "lety", "letovy provoz", "leteckeho provozu", "leteckou dopravu", "air traffic"],
    c: ["disrupt", "suspend", "halt", "closed", "closure", "divert", "uzavr", "prerus", "pozastav", "zastav", "omez", "stopped"],
  },
  {
    /*
      Nalezené trosky dronu nebo střely.

      Doplněno 23. 9. 2026: rumunská pobřežní stráž a námořnictvo 11. a 20. 9.
      vylovily trosky ruských dronů, civilista našel 1. 9. trosky ozbrojeného
      dronu — nic z toho síto nezachytilo, protože „trosky" nejsou „spadl"
      ani „sestřelen". Nález trosek je doklad, že dron na území byl.
    */
    kategorie: "drony",
    a: ["debris", "wreckage", "fragment", "trosk", "ulomk", "remains of"],
    b: ["dron", "drone", "uav", "bezpilotn", "missile", "strel", "raket", "geran", "shahed", "gerbera"],
  },
  {
    /*
      Požár nebo výbuch ve zbrojovce a skladu munice.

      Doplněno 23. 9. 2026: požár v muniční továrně MSM Group na Slovensku
      (16. 9.) propadl sítem úplně. „Požár" v seznamu skutků není schválně —
      hoří každý den a bez bezpečnostního rozměru. Ve zbrojovce, která
      dodává na Ukrajinu, je ale požár přesně ten vzorec, který se v Evropě
      od roku 2024 opakuje (EMCO, WB Electronics). Proto jen ve dvojici.
    */
    kategorie: "sabotaz",
    a: ["pozar", "hori", "vzplal", "fire", "blaze", "explosion", "vybuch", "explod"],
    b: ["zbrojovk", "munic", "ammunition", "munitions", "arms factory", "arms plant", "weapons plant",
      "weapons factory", "defence plant", "defense plant", "zbrojni", "vojensky sklad", "military depot", "arms depot"],
  },
  {
    /*
      Incident s válečnou lodí nebo ponorkou.

      Doplněno 23. 9. 2026: ruská fregata 14. 9. vypálila dvě světlice směrem
      k dánskému vojenskému vrtulníku. Loď a akce musí být obojí — samotná
      „fregata" je i zpráva o nákupu techniky.
    */
    kategorie: "hybridni",
    a: ["fregat", "frigate", "warship", "valecna lod", "valecne lodi", "corvette", "korvet", "submarine", "ponork", "destroyer", "torpedoborec"],
    b: ["flare", "svetlic", "fired", "vystrelil", "vypalil", "harass", "obtezov", "narusil", "violat", "territorial waters",
      "teritorialni vody", "vrtulnik", "helicopter", "sledoval", "shadowed", "zabranil", "prevented"],
  },
  {
    // „Vzlétly polské stíhačky“ — mezi slovy stojí přívlastek, takže se to
    // nedá hledat jako jedna fráze. Sloveso i technika musí být obojí.
    kategorie: "drony",
    a: ["stihac", "stihack", "vrtulnik", "letectv", "letoun", "fighter jet", "f-16", "f-35", "awacs"],
    b: ["vzletl", "vzlet", "vyslal", "vyslala", "vyslalo", "scrambl", "aktivoval", "aktivovalo", "zvedl"],
  },
  {
    kategorie: "vojsko",
    a: ["vojak", "vojaci", "armad", "zaloh", "troops", "soldiers"],
    b: ["nasazen", "nasadi", "povolan", "hlidk", "deployed", "deploy", "mobiliz"],
  },
  {
    /*
      Vyhlášení mobilizace. Bez téhle kombinace síto zprávu „Rusko vyhlásilo
      všeobecnou mobilizaci“ zahodilo jako „bez skutku“: v seznamu frází byly
      jen tvary „vyhlásil mobilizaci“ a „částečná mobilizace“, a čeština si
      slova přehazuje a skloňuje.
    */
    kategorie: "pravo",
    a: ["vyhlasil", "vyhlasila", "vyhlasilo", "vyhlaseni", "naridil", "naridila", "naridilo",
      "podepsal", "ukaz", "dekret", "ordered", "orders", "declared", "declares", "announces", "signed"],
    b: ["mobilizac", "mobilisation", "mobilization"],
  },
  {
    /*
      Změny branné legislativy a odvodů. Nejsou to mobilizace, ale jsou to
      kroky, které jí předcházejí — a zkušební běh ukázal, že věta „Rusko
      zvýšilo věk odvodů" propadla sítem jako zpráva bez skutku.
    */
    kategorie: "pravo",
    a: ["odvod", "branna povinnost", "brannou povinnost", "conscription", "reservist", "zalozn", "mobilizacn"],
    b: ["zvys", "rozsir", "schvalil", "schvalila", "prijal", "prijala", "zmen", "povolav",
      "raises", "expands", "approved", "extends", "introduces"],
  },
  {
    /* Rušení navigace. U Baltu se hlásí opakovaně a dotýká se civilních letů. */
    kategorie: "infrastruktura",
    a: ["gps", "navigac", "galileo"],
    b: ["ruseni", "rusi", "vypadek", "jamming", "spoofing", "disrupted", "interference"],
  },
  {
    /* Stínová flotila: zadržený nebo zabavený tanker. */
    kategorie: "hybridni",
    a: ["tanker", "shadow fleet", "stinove flotily", "stinova flotila", "stinovou flotilu"],
    b: ["zadrz", "zabav", "detained", "seized", "boarded", "impounded", "odstavil"],
  },
  {
    /* Nařízená evakuace personálu nebo obyvatel. */
    kategorie: "diplomacie",
    a: ["evakuac", "evacuation"],
    b: ["naridil", "naridila", "naridilo", "zahajil", "zahajila", "zahajilo", "ordered", "begins", "started"],
  },
];

/** Slova, která zprávě jen přidají oblast. Samy o sobě nikdy nestačí. */
const KONTEXT: { kategorie: string; slova: string[] }[] = [
  { kategorie: "drony", slova: ["dron", "drone", "uav", "vzdusny prostor", "airspace"] },
  { kategorie: "kyber", slova: ["nukib", "kybernetick", "cyber"] },
  { kategorie: "infrastruktura", slova: [
    "plynovod", "pipeline", "rozvodna", "substation", "power grid", "podmorsky kabel",
    "undersea cable", "subsea cable", "zeleznic", "railway", "elektrarna", "power plant",
    "kriticka infrastruktura", "critical infrastructure",
  ] },
  { kategorie: "zpravodajske", slova: ["spionaz", "espionage", "gru", "fsb", "bezpecnostni informacni sluzba", "kontrarozvedka"] },
  { kategorie: "hybridni", slova: ["hybridni", "hybrid warfare", "ruska stopa", "russia-linked", "kremlin-linked"] },
  { kategorie: "nato", slova: ["nato", "aliance", "vychodni kridlo", "eastern flank"] },
  { kategorie: "hranice", slova: ["hranice", "hranicni prechod", "schengen", "border"] },
  { kategorie: "vojsko", slova: ["armada", "vojak", "vojaci", "policie", "celnici"] },
  { kategorie: "rusko", slova: ["rusk", "russia", "kreml", "kremlin"] },
  { kategorie: "cr", slova: ["cesky rozhlas", "ceskeho rozhlasu", "radiozurnal", "irozhlas", "ceska televize", "rozhlas"] },
];

/**
 * Témata, která do bezpečnostního přehledu nepatří, i kdyby v textu skutek zazněl.
 * Domácí politika a ekonomika jsou plné slov jako „útok“ nebo „krize“.
 */
const VYLOUCIT = [
  // sport, kultura, spotřeba
  "fotbal", "football", "hokej", "hockey", "zapas", "film", "koncert", "concert",
  "recept", "recipe", "horoskop", "celebrity", "smartphone", "sleva",
  // domácí politika a ekonomika
  "ceny pohonnych hmot", "pohonnych hmot", "benzin", "nafta zdrazila", "duchod", "duchodu", "duchodova reforma",
  "rozpocet", "rozpoctu", "inflace", "dotace",
  "koalice", "opozice", "snemovna", "volby", "volebni", "kampan", "ministr financi",
  "skolstvi", "zdravotnictvi", "pojistovna", "hypoteky", "akcie", "burza", "kurz koruny",
  // předpovědi počasí a nehody bez bezpečnostního rozměru
  "pocasi", "predpoved pocasi", "dopravni nehoda", "srazka aut",
];

/*
  Krátká slova vyloučených témat se smějí trefit jen celá.

  Do 23. 9. 2026 byla v seznamu výš „dane" a „dani" (daně) s povolenou
  koncovkou — a trefovaly se do „Danish" a „Danes". Každá anglická zpráva
  o Dánsku tak padala jako domácí politika, včetně ruské fregaty, která
  14. 9. vypálila světlice k dánskému vrtulníku. „gol" sedělo na „Golf"
  i „Golan", „sale" na „Salem", „liga" na „ligament". Je to týž případ jako
  „bis" v „Babiš" a „oslo" v „došlo".
*/
const VYLOUCIT_PRESNE = [
  "dane", "dani", "danemi", "mzdy", "platy", "gol", "goly", "liga", "ligy", "lize", "sale",
];

/*
  `presna` jsou zkratky, které se smějí trefit jen jako celé slovo. „uk“
  s povolenou koncovkou se totiž trefí do „ukaz“, „ukrajina“ i „ukonceni“ —
  a zpráva o ruském ukazu o mobilizaci se pak označí jako Spojené království.
  Je to týž případ jako dřívější „bis“ uvnitř „Babiš“ a „oslo“ uvnitř „došlo“,
  jen s dražším následkem: špatná země u zrovna té zprávy, kvůli které tenhle
  web existuje.
*/
/*
  Sídla moci se počítají jako místo.

  Doplněno 18. 9. 2026: zprávy o svolaném jednání píšou často o budově, ne
  o zemi („jednání v Elysejském paláci", „na Downing Street"). Jména politiků
  tu schválně nejsou — mění se s volbami a jednou už nás podobný seznam
  (názvy redakcí) dostal k tomu, že se každý článek iROZHLASu označil jako
  český. Budova sídla vlády se nepřejmenovává.
*/
const ZEME: { kod: string; nazev: string; slova: string[]; presna?: string[] }[] = [
  /*
      „cr" muselo mezi přesné tokeny ze stejného důvodu jako „uk": s povolenou
      koncovkou sedělo na „crash", „crisis" i „critical infrastructure", takže
      anglické zprávy o dronech a kritické infrastruktuře web označoval jako
      české. V datech tak například stálo, že ruský dron nad Moldavskem
      a Rumunskem je zpráva z Česka.
    */
    { kod: "CZ", nazev: "Česko", /*
      „cesk" místo tří tvarů („cesko", „ceska republika", „ceske"): výčet
      koncovek vždycky nějakou vynechá. Chyběla zrovna ta nejběžnější —
      „česká vláda" a „český premiér" se sítu nezdály být o Česku a zpráva
      padala jako „bez místa". Kmen pokryje všechny tvary naráz.

      „cesti" je tam navíc kvůli češtině: v množném čísle se k mění na t
      („čeští vojáci"), a to kmen s tolerancí koncovky nedožene.
    */
    slova: ["czech", "cesk", "cesti", "policie cr", "praha", "praze", "prahou", "prahy", "prague", "brno", "brne", "ostrav", "strakova akademie", "kramarova vila",
      /*
        Provozovatelé českých sítí. „O2 i Vodafone se od rána potýkají s výpadky"
        je česká zpráva bez jediného slova o Česku, a síto ji proto shodilo jako
        „bez místa". CETIN a Výpadky24 jsou jen české; O2 je i v Británii
        a Německu, ale v české zprávě znamená prakticky vždy českého operátora —
        a zachycení není zveřejnění, místo ještě ověří člověk.
      */
      "cetin", "vypadky24"], presna: ["cr", "o2"] },
  { kod: "SK", nazev: "Slovensko", slova: ["slovak", "slovensk", "bratislav", "kosic"] },
  { kod: "PL", nazev: "Polsko", slova: ["poland", "polish", "polsk", "polac", "warsaw", "varsav", "rzeszow", "gdansk"] },
  { kod: "DE", nazev: "Německo", slova: ["germany", "german", "nemeck", "berlin", "hamburg", "leipzig", "munich", "mnichov", "bundeswehr"] },
  { kod: "AT", nazev: "Rakousko", slova: ["austria", "rakousk", "vienna", "viden"] },
  { kod: "HU", nazev: "Maďarsko", slova: ["hungary", "hungarian", "madarsk", "budapest"] },
  { kod: "LT", nazev: "Litva", slova: ["lithuania", "litv", "vilnius", "klaipeda"] },
  { kod: "LV", nazev: "Lotyšsko", slova: ["latvia", "lotys", "riga"] },
  { kod: "EE", nazev: "Estonsko", slova: ["estonia", "estonsk", "tallinn", "narva"] },
  { kod: "FI", nazev: "Finsko", slova: ["finland", "finnish", "finsk", "helsinki", "helsink"] },
  { kod: "SE", nazev: "Švédsko", slova: ["sweden", "swedish", "svedsk", "stockholm", "gotland"] },
  { kod: "NO", nazev: "Norsko", slova: ["norway", "norwegian", "norsk", "oslo"] },
  { kod: "DK", nazev: "Dánsko", slova: ["denmark", "danish", "dansk", "copenhagen", "kodan"] },
  { kod: "NL", nazev: "Nizozemsko", slova: ["netherlands", "dutch", "nizozem", "amsterdam", "hague", "haag"] },
  { kod: "BE", nazev: "Belgie", slova: ["belgium", "belgian", "belgi", "brussels", "brusel"] },
  { kod: "LU", nazev: "Lucembursko", slova: ["luxembourg", "luxemburg", "lucembur", "findel"] },
  { kod: "FR", nazev: "Francie", slova: ["france", "french", "francie", "francouz", "paris", "pariz", "elysee", "elysejsk"] },
  { kod: "GB", nazev: "Spojené království", slova: ["britain", "british", "united kingdom", "britsk", "britani", "velka britanie", "london", "londyn", "downing street"], presna: ["uk"] },
  { kod: "RO", nazev: "Rumunsko", slova: ["romania", "rumunsk", "bucharest", "bukurest"] },
  { kod: "BG", nazev: "Bulharsko", slova: ["bulgaria", "bulharsk", "sofia"] },
  { kod: "MD", nazev: "Moldavsko", slova: ["moldova", "moldav", "chisinau"] },
  { kod: "UA", nazev: "Ukrajina", slova: ["ukraine", "ukrainian", "ukrajin", "kyiv", "kyjev", "odesa", "lviv"] },
  { kod: "RU", nazev: "Rusko", slova: ["russia", "russian", "rusk", "moscow", "moskv", "kremlin", "kreml"] },
  { kod: "BY", nazev: "Bělorusko", slova: ["belarus", "belorus", "minsk"] },
  { kod: "IT", nazev: "Itálie", slova: ["italy", "italian", "itali", "rome"], presna: ["rim"] },
  { kod: "ES", nazev: "Španělsko", slova: ["spain", "spanish", "spanel", "madrid"] },
  { kod: "EU", nazev: "EU", slova: ["european union", "european commission", "evropska unie", "evropska komise"], presna: ["eu"] },
];

const nyni = () => new Date().toISOString();

function ctiKandidaty(): Kandidat[] {
  if (!fs.existsSync(SOUBOR)) return [];
  try {
    const stare = JSON.parse(fs.readFileSync(SOUBOR, "utf-8")) as Kandidat[];
    // Id se odvozuje z adresy; starší zápisy se přepočítají a duplicitní adresy se nechají jen jednou.
    const podleAdresy = new Map<string, Kandidat>();
    for (const k of stare) if (!podleAdresy.has(k.zdroj.url)) podleAdresy.set(k.zdroj.url, { ...k, id: kandidatId(k.zdroj.url) });
    return [...podleAdresy.values()];
  } catch { return []; }
}

/**
 * Id kandidáta z adresy. Otisk (hash) místo začátku adresy: odkazy z Google
 * News začínají stejně a zkrácený začátek dával všem stejné id.
 */
export function kandidatId(url: string): string {
  return `k-${createHash("sha256").update(url).digest("hex").slice(0, 16)}`;
}

/** Otisk titulku: prvních osm slov bez diakritiky — stejná zpráva z více redakcí se nezapíše dvakrát. */
export function otisk(titulek: string): string {
  return normalizuj(titulek).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
}

export function odhadniZemi(text: string): { kod: string; nazev: string } | null {
  const t = normalizuj(text);
  /*
    Slovo se hledá od začátku slova, ne kdekoli uvnitř — stejně jako u klíčových
    slov. Prosté `includes` tu totiž dělalo tichou škodu: „došlo“ obsahuje
    „oslo“, takže každá česká zpráva se slovem „došlo“ (a to je skoro každá
    zpráva o incidentu) se označila jako Norsko. Je to týž případ jako dřívější
    „bis“ uvnitř jména „Babiš“.
  */
  /*
    Krizové vysílání Českého rozhlasu je česká událost i bez zmínky o místě.
    Samotný název redakce ale značkou země být nesmí: iROZHLAS píše i o Litvě
    a jeho jméno je pod každým takovým článkem — chvíli kvůli tomu web tvrdil,
    že zastavené letiště v Litvě je zpráva z Česka.
  */
  if (naliehavost(text)?.druh === "krizove-vysilani") return { kod: "CZ", nazev: "Česko" };
  const shody = ZEME.filter(
    (z) => z.slova.some((sl) => obsahujeSlovo(t, sl.trim())) || (z.presna ?? []).some((sl) => obsahujeToken(t, sl)),
  );
  const jina = shody.find((z) => z.kod !== "RU" && z.kod !== "UA" && z.kod !== "BY");
  const v = jina ?? shody[0];
  return v ? { kod: v.kod, nazev: v.nazev } : null;
}

/**
 * Hledá slovo od začátku slova, ne kdekoli uvnitř. Bez toho se „bis“
 * (Bezpečnostní informační služba) trefilo doprostřed jména „Babiš“ a web
 * si od vlády o důchodech udělal zpravodajskou zprávu. Koncovka je povolená,
 * aby čeština fungovala: „sabotaz“ najde i „sabotáže“ a „sabotáží“.
 */
export function obsahujeSlovo(text: string, slovo: string): boolean {
  const vzor = slovo.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${vzor}[a-z]*([^a-z0-9]|$)`).test(text);
}

/** Slovo přesně, bez povolené koncovky. Pro zkratky jako „uk“, „eu“ nebo „cr“. */
export function obsahujeToken(text: string, slovo: string): boolean {
  const vzor = slovo.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${vzor}([^a-z0-9]|$)`).test(text);
}

/*
  Naléhavé spouštěče.

  Tabulka místo šesti zvláštních funkcí: každý řádek říká, co se musí v textu
  potkat, aby šlo o tuhle věc. Sloveso a předmět zvlášť, každé jako kmen —
  čeština mezi ně vkládá přívlastek a slova skloňuje, takže hledání celých
  frází míjí („Rusko vyhlásilo VŠEOBECNOU mobilizaci“).

  Stupeň 1 jde hned do telegramového kanálu jako NEOVĚŘENÝ signál.
  Stupeň 2 jde jen nahoru ve frontě ke kontrole. Rozdíl je v tom, jestli má
  smysl budit člověka: vyhlášená mobilizace ano, změna branného zákona ne.

  Naléhavost nikdy nic nezveřejní jako fakt a nezapíná mimořádnou výstrahu.
  To umí jen člověk — viz nastroje/vystraha.mjs.
*/
export type DruhNaliehavosti =
  | "mobilizace-rusko"
  | "priprava-mobilizace"
  | "krizove-vysilani"
  | "clanek-nato"
  | "pravni-stav-cr"
  | "hranice-cr"
  | "vzdusny-prostor-nato";

export interface Naliehavost {
  druh: DruhNaliehavosti;
  /** 1 = hned do kanálu, 2 = nahoru ve frontě. */
  stupen: 1 | 2;
  /** Co se v textu potkalo. Pro člověka, který se ptá „proč zrovna tohle“. */
  proc: string;
}

const RUSKO = ["rusk", "russia", "russian", "kreml", "kremlin", "putin", "moskv", "moscow"];
const CESKO = ["cesko", "ceska republika", "ceske", "cesku", "czech", "vlada cr", "praha"];
const NATO_STATY = [
  "polsk", "poland", "litv", "lithuania", "lotys", "latvia", "estonsk", "estonia",
  "finsk", "finland", "norsk", "norway", "rumunsk", "romania", "nemeck", "germany",
  "slovensk", "slovakia", "cesko", "czech", "dansk", "denmark", "svedsk", "sweden",
  "nizozem", "netherlands", "belgi", "belgium", "spanel", "spain", "italsk", "italy",
];

const SPOUSTECE: {
  druh: DruhNaliehavosti;
  stupen: 1 | 2;
  sloveso: string[];
  predmet: string[];
  /** Aspoň jedno slovo odtud musí být v textu taky. Prázdné = nevyžaduje se. */
  kontext: string[];
}[] = [
  {
    /* Vyhlášená mobilizace v Rusku. Nejtvrdší spouštěč, jaký tenhle web má. */
    druh: "mobilizace-rusko",
    stupen: 1,
    sloveso: ["vyhlasil", "vyhlasila", "vyhlasilo", "vyhlaseni", "naridil", "naridila", "naridilo",
      "podepsal", "ukaz", "dekret", "ordered", "orders", "declared", "declares", "announces", "signed"],
    predmet: ["mobilizac", "mobilisation", "mobilization"],
    kontext: RUSKO,
  },
  {
    /*
      Přípravy. Samy o sobě nic neznamenají — branný zákon se mění i v klidu —
      ale jsou to kroky, které mobilizaci předcházejí, a mají být vidět dřív
      než ona. Proto stupeň 2: do fronty nahoru, do kanálu ne.
    */
    druh: "priprava-mobilizace",
    stupen: 2,
    sloveso: ["rozsir", "zvys", "zmen", "schvalil", "schvalila", "zavadi", "prijal", "povolav",
      "expands", "raises", "approved", "introduces", "extends", "widens"],
    predmet: ["branna povinnost", "brannou povinnost", "odvod", "zalozn", "rezervist", "mobilizacn",
      "conscription", "draft age", "reservist", "call-up", "mobilisation law", "mobilization law"],
    kontext: RUSKO,
  },
  {
    /* Krizové vysílání: praktická informace — pusť si rádio. */
    druh: "krizove-vysilani",
    stupen: 1,
    sloveso: ["zahajil", "zahajila", "zahajilo", "prechazi", "prechazi na", "spustil", "spustila", "vyhlasil"],
    predmet: ["mimoradne vysilani", "krizove vysilani", "mimoradny vysilaci rezim", "krizovy rezim vysilani",
      "emergency broadcast", "emergency broadcasting"],
    kontext: ["cesky rozhlas", "ceskeho rozhlasu", "radiozurnal", "irozhlas", "ceska televize", "rozhlas"],
  },
  {
    /* Článek 4 nebo 5 Washingtonské smlouvy. */
    druh: "clanek-nato",
    stupen: 1,
    sloveso: ["aktivoval", "aktivovala", "aktivovalo", "aktivace", "pozadal", "pozadala", "vyvolal",
      "invoked", "invoke", "invoking", "triggered", "requested"],
    predmet: ["clanek 4", "clanku 4", "clanek 5", "clanku 5", "article 4", "article 5"],
    kontext: ["nato", "aliance", "alliance", "severoatlantick", "north atlantic"],
  },
  {
    /* Mimořádný právní stav v Česku. */
    druh: "pravni-stav-cr",
    stupen: 1,
    sloveso: ["vyhlasil", "vyhlasila", "vyhlasilo", "vyhlaseni", "vyhlasen", "declared"],
    predmet: ["nouzovy stav", "stav ohrozeni statu", "valecny stav", "stav nebezpeci", "state of emergency"],
    kontext: CESKO,
  },
  {
    /* Uzavření hranic ČR. Ne kontroly — ty jsou běžné a řeší se ve frontě. */
    druh: "hranice-cr",
    stupen: 1,
    sloveso: ["uzavrel", "uzavrela", "uzavrelo", "uzavreni", "closed", "closes", "shut"],
    predmet: ["hranic", "hranicni prechod", "border"],
    kontext: CESKO,
  },
  {
    /*
      Dron nebo letoun ve vzdušném prostoru členského státu Aliance. Stává se
      to opakovaně a pokaždé to neznamená eskalaci, proto stupeň 2.
    */
    druh: "vzdusny-prostor-nato",
    stupen: 2,
    sloveso: ["narusil", "narusila", "narusily", "vnikl", "vnikla", "violated", "violates", "breached", "entered"],
    predmet: ["vzdusny prostor", "vzdusneho prostoru", "airspace"],
    kontext: NATO_STATY,
  },
];

/**
 * Je to zpráva, kterou má člověk vidět první?
 *
 * Vrací jen značku pro pořadí ve frontě a pro rozhodnutí, jestli o ní dát
 * vědět do kanálu. Nic nezveřejňuje jako ověřené a do žádného počtu
 * nevstupuje — kandidát zůstává „čeká na ověření“ jako každý jiný.
 */
export function naliehavost(text: string): Naliehavost | null {
  const t = normalizuj(text);
  const nalez = SPOUSTECE.map((s) => {
    const sloveso = s.sloveso.find((w) => obsahujeSlovo(t, w));
    const predmet = s.predmet.find((w) => obsahujeSlovo(t, w));
    const kontext = !s.kontext.length || s.kontext.some((w) => obsahujeSlovo(t, w));
    return sloveso && predmet && kontext ? { druh: s.druh, stupen: s.stupen, proc: `${sloveso}+${predmet}` } : null;
  }).filter((x): x is Naliehavost => x !== null);
  /* Když sedí víc spouštěčů, rozhoduje ten naléhavější. */
  return nalez.sort((a, b) => a.stupen - b.stupen)[0] ?? null;
}

export function odhadniTemata(text: string): { kategorie: string[]; shody: string[]; akty: string[] } {
  const t = normalizuj(text);
  const kategorie: string[] = [];
  const shody: string[] = [];
  const akty: string[] = [];
  for (const skupina of AKTY) {
    const s = skupina.slova.filter((w) => obsahujeSlovo(t, w));
    if (s.length) { kategorie.push(skupina.kategorie); shody.push(...s); akty.push(...s); }
  }
  for (const k of AKTY_KOMBINACE) {
    const prvni = k.a.find((w) => obsahujeSlovo(t, w));
    const druhy = k.b.find((w) => obsahujeSlovo(t, w));
    // Třetí sloupec je nepovinný: u letiště nestačí dron a letiště, musí se i něco zastavit.
    const treti = k.c ? k.c.find((w) => obsahujeSlovo(t, w)) : "";
    if (prvni && druhy && treti !== undefined) {
      const shoda = [prvni, druhy, treti].filter(Boolean).join("+");
      kategorie.push(k.kategorie); shody.push(shoda); akty.push(shoda);
    }
  }
  for (const skupina of KONTEXT) {
    const s = skupina.slova.filter((w) => obsahujeSlovo(t, w));
    if (s.length) { kategorie.push(skupina.kategorie); shody.push(...s); }
  }
  return { kategorie: [...new Set(kategorie)], shody: [...new Set(shody)], akty: [...new Set(akty)] };
}

/**
 * Zpráva se zachytí, jen když jde o skutek nebo úřední rozhodnutí a je jasné,
 * kde se to stalo. Prohlášení, sliby a plány jsou pro tenhle web šum, i když
 * mluví o bezpečnosti — do záznamů je smí zapsat jen člověk, a to jen tehdy,
 * když se vážou ke konkrétní věci.
 */
export function relevantni(text: string): boolean {
  return duvodOdmitnuti(text) === null;
}

/**
 * Proč zpráva neprošla — nebo null, když prošla.
 *
 * Důvod se ukládá k odmítnuté zprávě, aby člověk v přehledu viděl, čím to
 * spadlo, a poznal, jestli je chyba v sítu, nebo ve zprávě.
 */
export function duvodOdmitnuti(text: string): DuvodOdmitnuti | null {
  const t = normalizuj(text);
  if (VYLOUCIT.some((w) => obsahujeSlovo(t, w)) || VYLOUCIT_PRESNE.some((w) => obsahujeToken(t, w))) return "vylouceno-tematem";
  const { akty, kategorie } = odhadniTemata(text);
  if (!akty.length) return "bez-skutku";
  // Skutek bez místa je půlka informace. Alianční kontext místo nahradí.
  if (!odhadniZemi(text) && !kategorie.includes("nato")) return "bez-mista";
  return null;
}

/*
  Kolik kanálů se stahuje naráz.

  Katalog má přes sto kanálů a většina z nich vede na jeden server (Google
  News). Stáhnout je všechny naráz je nejrychlejší způsob, jak si vysloužit
  odmítnutí kvůli rychlosti — a odmítnutý kanál vypadá úplně stejně jako
  klid. Šest naráz projde celý katalog v jednotkách desítek sekund a server
  to nedráždí.
*/
const NARAZ = 6;

/** Zpracuje pole po dávkách, aby se nestahovalo všechno naráz. */
async function poDavkach<T, R>(polozky: T[], kolik: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const vysledky: R[] = [];
  for (let i = 0; i < polozky.length; i += kolik) {
    vysledky.push(...(await Promise.all(polozky.slice(i, i + kolik).map(f))));
  }
  return vysledky;
}

async function stahniZdroj(z: ZdrojUdalosti) {
  try {
    const { stav, telo } = await stahni(z.url, 2);
    if (stav >= 400) return { z, ok: false, polozky: [], chyba: `HTTP ${stav}` };
    const polozky = ctiRss(telo);
    /*
      Když z adresy nepřijde RSS, zkusí se přečíst jako obyčejná stránka.
      Úřady si kanály stěhují a ruší — a zpráva z úřadu má dorazit i tehdy,
      když se kanál rozbije. Viz polozkyZeStranky v sber/nacti.ts.
    */
    if (!polozky.length && /<a\b/i.test(telo)) return { z, ok: true, polozky: polozkyZeStranky(telo, z.url) };
    return { z, ok: true, polozky };
  } catch (e) {
    return { z, ok: false, polozky: [], chyba: String(e instanceof Error ? e.message : e) };
  }
}

/** Uveřejněné adresy a otisky titulků — co už je v incidentech, nesmí být znovu kandidát. */
function znameZIncidentu(): { adresy: Set<string>; otisky: Set<string> } {
  const inc = JSON.parse(fs.readFileSync(path.join(KOREN, "incidenty.json"), "utf-8")) as { titulek: string; zdroje: { url: string }[] }[];
  return {
    adresy: new Set(inc.flatMap((i) => i.zdroje.map((s) => s.url)).filter(Boolean)),
    otisky: new Set(inc.map((i) => otisk(i.titulek))),
  };
}

/**
 * Doplnění modelem: vyřadí nerelevantní a přeloží do češtiny.
 * Bez klíče se přeskočí. Model nikdy nerozhoduje o zveřejnění — to dělá člověk.
 */
async function doplnModelem(nove: Kandidat[]): Promise<Kandidat[]> {
  if (!dostupnyPoskytovatel() || !nove.length) return nove;
  const { z } = await import("zod");

  const Vysledek = z.object({
    polozky: z.array(z.object({
      id: z.string(),
      relevantni: z.boolean(),
      titulekCs: z.string(),
      shrnutiCs: z.string(),
      kodZeme: z.string().nullable(),
      zeme: z.string().nullable(),
      kategorie: z.array(z.string()),
      druhOdhad: z.enum(["pripad", "opatreni", "reakce", "neurceno"]),
    })),
  });

  const POKYNY = [
    "Třídíš zprávy pro český bezpečnostní přehled. Relevantní jsou jen SKUTEČNÉ události z Evropy: sabotáže, žhářství, útoky na infrastrukturu, narušení vzdušného prostoru, kybernetické útoky s dopadem, zatčení agentů, oficiální atribuce, kroky NATO/EU/vlád, mimořádná právní opatření.",
    "Nerelevantní: komentáře, analýzy bez nové skutečnosti, sport, kultura, obecná politika, běžné denní údery na Ukrajině bez dopadu na NATO/EU, stará událost bez nového faktu. Z války na Ukrajině je relevantní jen neobvyklé: výrazný postup fronty, vpád nebo útok z nového směru (Bělorusko, Podněstří, nové pobřeží), první použití nového druhu zbraně, úder na jadernou elektrárnu.",
    "Pro relevantní napiš věcný český titulek (co se stalo, kde), jednu větu shrnutí bez hodnocení, kód země ISO-2 místa události (EU pro instituce EU, null neurčeno), český název země, oblasti z: cr, nato, hybridni, sabotaz, infrastruktura, drony, hranice, pravo, rusko, diplomacie, kyber, vysetrovani, zpravodajske; druhOdhad: pripad = reálná událost, opatreni = oficiální krok státu/aliance, reakce = prohlášení/varování, neurceno.",
    "Nic si nedomýšlej. Když zpráva neříká zemi, dej null. Vrať každé id přesně jednou.",
  ].join(" ");

  const vystup: Kandidat[] = [];
  for (let i = 0; i < nove.length; i += 25) {
    const davka = nove.slice(i, i + 25);
    const vysledek = await strukturovane({
      system: POKYNY,
      vstup: davka.map((k) => ({ id: k.id, titulek: k.titulekPuvodni, shrnuti: k.shrnuti, zdroj: k.zdroj.nazev })),
      schema: Vysledek,
      ucel: "třídění kandidátů",
      maxTokens: 16000,
    });

    // Bez modelu zůstávají pravidla — kandidát se nezahodí.
    if (!vysledek) { vystup.push(...davka); continue; }

    const podleId = new Map(vysledek.polozky.map((x) => [x.id, x]));
    for (const k of davka) {
      const v = podleId.get(k.id);
      if (!v) { vystup.push(k); continue; }
      if (!v.relevantni) continue;
      vystup.push({
        ...k,
        titulek: v.titulekCs || k.titulek,
        shrnuti: v.shrnutiCs || k.shrnuti,
        kodZeme: v.kodZeme ?? k.kodZeme,
        zeme: v.zeme ?? k.zeme,
        kategorie: v.kategorie.length ? v.kategorie : k.kategorie,
        druhOdhad: v.druhOdhad,
        klasifikace: "model",
      });
    }
  }
  return vystup;
}

interface Vyrizeny { url: string; otisk: string; kdy: string; duvod: string | null }

function ctiVyrizene(): Vyrizeny[] {
  if (!fs.existsSync(SOUBOR_VYRIZENYCH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SOUBOR_VYRIZENYCH, "utf-8")) as Vyrizeny[];
  } catch {
    return [];
  }
}

/** Doplní paměť o kandidáty, o kterých už někdo rozhodl, a zapomene nejstarší. */
export function aktualizujPamet(pamet: Vyrizeny[], kandidati: { zdroj: { url: string }; titulekPuvodni?: string; titulek: string; stav: string; vyrizeni?: { kdy?: string; duvod?: string } | null }[], ted = Date.now()): Vyrizeny[] {
  const podleUrl = new Map(pamet.map((v) => [v.url, v]));
  for (const k of kandidati) {
    if (k.stav === "ceka" || podleUrl.has(k.zdroj.url)) continue;
    podleUrl.set(k.zdroj.url, {
      url: k.zdroj.url,
      otisk: otisk(k.titulekPuvodni ?? k.titulek),
      kdy: k.vyrizeni?.kdy ?? new Date(ted).toISOString(),
      duvod: k.vyrizeni?.duvod ?? null,
    });
  }
  const hranice = ted - DNI_PAMETI * 86_400_000;
  return [...podleUrl.values()].filter((v) => new Date(v.kdy).getTime() >= hranice);
}

function ctiOdmitnute(): Odmitnuty[] {
  if (!fs.existsSync(SOUBOR_ODMITNUTYCH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SOUBOR_ODMITNUTYCH, "utf-8")) as Odmitnuty[];
  } catch {
    return [];
  }
}

/**
 * Druhé čtení odmítnutých zpráv levným modelem.
 *
 * Úkol je jediný a úzký: najít mezi šumem zprávu, která je vážná, i když se
 * do seznamu slov netrefila. Model nic nezveřejňuje a nic nepřeklápí — jen
 * označí, co si zaslouží lidský pohled.
 *
 * Bez klíče se přeskočí a `posouzeni` zůstane null; přehled to pak tak i
 * napíše. Neposouzeno není totéž co „nic vážného“.
 */
async function posudOdmitnute(polozky: Odmitnuty[]): Promise<Odmitnuty[]> {
  const kPosouzeni = polozky.filter((o) => !o.posouzeni).slice(0, MAX_POSUZOVANYCH);
  if (!dostupnyPoskytovatel() || !kPosouzeni.length) return polozky;

  const { z } = await import("zod");
  const Vysledek = z.object({
    polozky: z.array(z.object({
      id: z.string(),
      podezreni: z.enum(["vysoke", "stredni", "zadne"]),
      duvod: z.string(),
    })),
  });

  const POKYNY = [
    "Tyhle zprávy neprošly automatickým sítem českého bezpečnostního přehledu. Tvůj jediný úkol je najít mezi nimi ty, které jsou přesto vážné a měl by si je přečíst člověk.",
    "podezreni: vysoke = zpráva popisuje závažnou bezpečnostní událost v Evropě (útok, sabotáž, výbuch, narušení vzdušného prostoru, zásah do kritické infrastruktury, mobilizace, vyhlášení mimořádného stavu, ozbrojený incident), i když je titulek nejasný, vtipný nebo neinformativní; stredni = může jít o bezpečnostní událost, ale z titulku to nelze poznat; zadne = zjevně nic z toho (sport, kultura, ekonomika, komentář, běžná politika).",
    "Posuzuj obsah, ne styl. Špatně napsaný titulek nad vážnou zprávou je přesně to, co hledáme. Naopak dramatický titulek nad ničím je zadne.",
    "duvod: nejvýš 12 slov česky, věcně. Nic si nedomýšlej — co v textu není, o tom netvrď, že tam je.",
    "Vrať každé id přesně jednou.",
  ].join(" ");

  const podleId = new Map<string, { podezreni: "vysoke" | "stredni" | "zadne"; duvod: string }>();

  for (let i = 0; i < kPosouzeni.length; i += 40) {
    const davka = kPosouzeni.slice(i, i + 40);
    const vysledek = await strukturovane({
      system: POKYNY,
      vstup: davka.map((o) => ({ id: o.id, titulek: o.titulek, shrnuti: o.shrnuti, zdroj: o.zdroj.nazev })),
      schema: Vysledek,
      ucel: "posouzení odmítnutých",
    });
    // Když model vypadne, zbytek zůstane neposouzený — a přehled to přizná.
    if (!vysledek) break;
    for (const v of vysledek.polozky) podleId.set(v.id, { podezreni: v.podezreni, duvod: v.duvod });
  }

  const kdy = nyni();
  return polozky.map((o) => {
    const v = podleId.get(o.id);
    return v ? { ...o, posouzeni: { ...v, kdy } } : o;
  });
}

export async function sbirejUdalosti(): Promise<{ novych: number; celkem: number; nedostupne: string[]; odmitnutych: number; podezrelych: number; sVyrezem: number; zeSiti: number }> {
  const stazene = await poDavkach(ZDROJE_UDALOSTI, NARAZ, stahniZdroj);

  /*
    Profily představitelů a institucí. Ministr často řekne věc nejdřív na svém
    profilu a teprve potom v tiskové zprávě; kdo profily nesleduje, dozví se to
    o hodiny později. Čtou se ale jen ty s doloženou pravostí — a co z nich
    přijde, je kandidát ke kontrole, nikdy hotový záznam.
  */
  const profily = await Promise.all(ctenaProfily().map((p) => ctiProfil(p)));
  /* Týž tvar jako u zpravodajských zdrojů, aby se zbytek sběru nemusel měnit. */
  type Zdrojovy = { z: ZdrojUdalosti; ok: boolean; polozky: Polozka[]; chyba?: string };
  const zeSiti: Zdrojovy[] = profily
    .filter((v): v is typeof v => v.polozky.length > 0)
    .map((v) => ({
      z: {
        klic: v.profil.klic,
        nazev: `${v.profil.kdo} (${v.profil.role}) — ${v.profil.sit}`,
        url: v.profil.odkaz,
        jazyk: (v.profil.jazyk === "cs" ? "cs" : "en") as "cs" | "en",
        primarni: false,
        typ: "social" as const,
      },
      ok: true,
      polozky: v.polozky,
    }));
  const chybyProfilu = profily.filter((v) => Boolean(v.chyba)).map((v) => `${v.profil.klic}: ${v.chyba}`);

  const nedostupne = [...stazene.filter((s) => !s.ok).map((s) => `${s.z.klic}: ${s.chyba}`), ...chybyProfilu];
  const stare = ctiKandidaty();
  const zname = znameZIncidentu();
  const hranice = Date.now() - DNI_ZPET * 86_400_000;
  const pamet = aktualizujPamet(ctiVyrizene(), stare as unknown as Parameters<typeof aktualizujPamet>[1]);
  const adresy = new Set([...stare.map((k) => k.zdroj.url), ...pamet.map((v) => v.url)]);
  const otisky = new Set([...stare.map((k) => otisk(k.titulekPuvodni)), ...pamet.map((v) => v.otisk)]);

  const stareOdmitnute = ctiOdmitnute();
  const znameOdmitnute = new Set(stareOdmitnute.map((o) => o.zdroj.url));
  const noveOdmitnute: Odmitnuty[] = [];

  const nove: Kandidat[] = [];
  for (const s of [...stazene, ...zeSiti]) {
    if (!s.ok) continue;
    for (const p of s.polozky) {
      if (!p.odkaz || adresy.has(p.odkaz) || zname.adresy.has(p.odkaz)) continue;
      if (p.publikovano && new Date(p.publikovano).getTime() < hranice) continue;
      const text = `${p.nadpis} ${p.shrnuti}`;
      const duvod = duvodOdmitnuti(text);
      if (duvod) {
        /*
          Nic se nezahazuje: odmítnuté jde do přehledu pro člověka. S jednou
          výjimkou — položky vytažené z obyčejné stránky. Je mezi nimi i
          navigace („Prohlášení o přístupnosti“, „Pracovní a poradní orgány“)
          a jeden běh jí do přehledu nasypal přes sto. Přehled odmítnutých je
          pracovní seznam, který má někdo projít; zaplavený je k ničemu.
        */
        if (!p.zeStranky && !znameOdmitnute.has(p.odkaz)) {
          znameOdmitnute.add(p.odkaz);
          noveOdmitnute.push({
            id: kandidatId(p.odkaz),
            zachyceno: nyni(),
            publikovano: p.publikovano,
            zdroj: { nazev: s.z.nazev, url: p.odkaz, typ: s.z.typ, primarni: s.z.primarni },
            titulek: p.nadpis,
            shrnuti: p.shrnuti.slice(0, 300),
            duvod,
            kategorie: odhadniTemata(text).kategorie,
            posouzeni: null,
          });
        }
        continue;
      }
      const o = otisk(p.nadpis);
      if (otisky.has(o) || zname.otisky.has(o)) continue;
      const zeme = odhadniZemi(text);
      const { kategorie, shody } = odhadniTemata(text);
      const id = kandidatId(p.odkaz);
      nove.push({
        id,
        zachyceno: nyni(),
        publikovano: p.publikovano,
        zdroj: { nazev: s.z.nazev, url: p.odkaz, typ: s.z.typ, primarni: s.z.primarni },
        titulek: p.nadpis,
        titulekPuvodni: p.nadpis,
        shrnuti: p.shrnuti.slice(0, 300),
        kodZeme: zeme?.kod ?? null,
        zeme: zeme?.nazev ?? null,
        kategorie,
        druhOdhad: "neurceno",
        klasifikace: "pravidla",
        /*
          U kandidáta ze sítě si necháme, čí profil to byl. Člověk pak vidí,
          jestli mluví ministerstvo, nebo anonymní účet — a hlavně to, že
          k tomuhle kandidátovi musí dohledat nezávislé potvrzení, protože
          příspěvek sám nedokládá ani to, že se něco stalo.
        */
        zeSite: s.z.typ === "social" ? { kdo: s.z.nazev, role: "profil na síti", sit: s.z.klic } : null,
        shody,
        /*
          Naléhavý signál jen u zprávy, u které víme, kdy vyšla.

          Signál odchází bez schválení, do hodiny od zachycení. Zpráva
          z výpisu na stránce úřadu ale datum nemusí mít — a pak je stejně
          stará jako nová. 20. 9. 2026 se takhle do fronty dostalo hlášení
          estonské policie z 5. 9. 2024; kdyby v něm stálo slovo „mobilizace",
          odešlo by jako poplach. Bez data se proto zpráva do fronty dostane,
          ale poplach z ní není.
        */
        naliehave: p.publikovano ? naliehavost(text) : null,
        stav: "ceka",
      });
      adresy.add(p.odkaz);
      otisky.add(o);
    }
  }

  const doplnene = await doplnModelem(nove);
  // Staří kandidáti odcházejí, když jsou starší než okno nebo už byli zveřejněni jako záznam.
  const zivi = stare.filter((k) => new Date(k.publikovano ?? k.zachyceno).getTime() >= hranice && !zname.adresy.has(k.zdroj.url) && !zname.otisky.has(otisk(k.titulek)));
  /*
    Strop fronty. Naléhavé napřed — kdyby se fronta zaplnila běžnými zprávami,
    vytlačila by z ní zrovna tu jednu, kvůli které tu celý sběr je.
  */
  /*
    Čekající mají přednost před rozhodnutými: strop fronty nesmí vytlačit
    nerozhodnutou zprávu kvůli té, o které už někdo rozhodl. Rozhodnuté
    stejně drží paměť (vyrizene.json), takže se nevrátí.
  */
  const ceka = (k: Kandidat) => ((k as { stav: string }).stav === "ceka" ? 1 : 0);
  const vse = [...doplnene, ...zivi]
    .sort((a, b) => ceka(b) - ceka(a) || (b.naliehave ? 1 : 0) - (a.naliehave ? 1 : 0) || (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, MAX_KANDIDATU);
  /*
    Výřezy ze zdrojů. Tohle je ta část, kvůli které sběr vůbec k něčemu je:
    bez ní ověřovací rutina nemá co číst, protože na zpravodajské weby sama
    nedosáhne. Doplňuje se jen to, co chybí, a od nejnovějšího.
  */
  const bezVyrezu = vse.filter((k) => !k.vyrez).slice(0, MAX_VYREZU_ZA_BEH);
  for (const k of bezVyrezu) {
    k.vyrez = await vyrezZeStranky(k.zdroj.url);
  }
  const sVyrezem = vse.filter((k) => k.vyrez?.text).length;

  fs.writeFileSync(SOUBOR, JSON.stringify(vse, null, 2) + "\n", "utf-8");
  fs.mkdirSync(path.dirname(SOUBOR_VYRIZENYCH), { recursive: true });
  fs.writeFileSync(SOUBOR_VYRIZENYCH, JSON.stringify(aktualizujPamet(pamet, vse as unknown as Parameters<typeof aktualizujPamet>[1]), null, 2) + "\n", "utf-8");

  /*
    Odmítnuté: krátká paměť a pevný strop. Je to pracovní přehled pro člověka,
    ne archiv — po týdnu položka odchází a do repozitáře se nesmí vejít víc,
    než co se dá projít.
  */
  const hraniceOdmitnutych = Date.now() - DNI_ODMITNUTYCH * 86_400_000;
  const zbyvajici = stareOdmitnute.filter(
    (o) => new Date(o.publikovano ?? o.zachyceno).getTime() >= hraniceOdmitnutych && !zname.adresy.has(o.zdroj.url),
  );
  const vseOdmitnute = [...noveOdmitnute, ...zbyvajici]
    .sort((a, b) => (b.publikovano ?? b.zachyceno).localeCompare(a.publikovano ?? a.zachyceno))
    .slice(0, MAX_ODMITNUTYCH);

  const posouzene = await posudOdmitnute(vseOdmitnute);
  fs.mkdirSync(path.dirname(SOUBOR_ODMITNUTYCH), { recursive: true });
  fs.writeFileSync(SOUBOR_ODMITNUTYCH, JSON.stringify(posouzene, null, 2) + "\n", "utf-8");

  const podezrelych = posouzene.filter((o) => o.posouzeni?.podezreni === "vysoke").length;
  const zeSitiPocet = doplnene.filter((k) => k.zdroj.typ === "social").length;
  return { novych: doplnene.length, celkem: vse.length, nedostupne, odmitnutych: posouzene.length, podezrelych, sVyrezem, zeSiti: zeSitiPocet };
}
