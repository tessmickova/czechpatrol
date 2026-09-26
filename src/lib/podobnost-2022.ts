/** Ručně udržované srovnání výroků, nikoli vstup do hodnocení bezpečnosti. */
export type VyrokSrovnani = {
  datum: string;
  autor: string;
  text: string;
  citace?: boolean;
  zdroj: { nazev: string; url: string };
};

export type SrovnaniVyroku = {
  id: string;
  nazev: string;
  stav: "podobny" | "castecny" | "nedolozeno";
  drive: VyrokSrovnani;
  nyni: VyrokSrovnani | null;
  kontext: string;
};

export const PODOBNOST_OVERENA = "2026-09-26";

const ubezpeceni2026: VyrokSrovnani = {
  datum: "2026-09-08",
  autor: "Vladimir Putin — podle poradce Jurije Ušakova",
  text: "Podle Ušakovova popisu telefonátu s Trumpem Putin ujistil, že Rusko nemá agresivní plány vůči Evropě.",
  zdroj: {
    nazev: "AP / Local 10",
    url: "https://www.local10.com/news/world/2026/09/08/putin-assures-trump-that-moscow-doesnt-have-aggressive-plans-toward-europe-kremlin-says/",
  },
};

export const SROVNANI_VYROKU: readonly SrovnaniVyroku[] = [
  {
    id: "valku-nechceme",
    nazev: "Válku nechceme",
    stav: "castecny",
    drive: {
      datum: "2022-02-15",
      autor: "Vladimir Putin · prezident",
      text: "Chceme válku, nebo ne? Samozřejmě že ne.",
      citace: true,
      zdroj: { nazev: "Euronews / AP", url: "https://www.euronews.com/2022/02/15/ukraine-crisis-germany-s-scholz-meets-putin-in-moscow-to-address-burning-issues" },
    },
    nyni: ubezpeceni2026,
    kontext: "Podobné ujištění o úmyslech, ale jiné znění i územní rámec. V roce 2022 šlo o veřejnou odpověď při jednání se Scholzem; v roce 2026 máme zprostředkovaný popis hovoru, nikoli Putinovu přímou citaci. Tento telefonát je uveden i u popření plánů invaze níže; nejde o další samostatný výrok.",
  },
  {
    id: "stazeni-vojsk",
    nazev: "Stahování části vojsk",
    stav: "nedolozeno",
    drive: {
      datum: "2022-02-15",
      autor: "Vladimir Putin · prezident",
      text: "Ano, bylo rozhodnuto stáhnout část vojsk.",
      citace: true,
      zdroj: { nazev: "FactCheck.org", url: "https://www.factcheck.org/2022/02/russian-rhetoric-ahead-of-attack-against-ukraine-deny-deflect-mislead/" },
    },
    nyni: null,
    kontext: "Srovnáváme oznámení stažení sil, nikoli to, zda se stažení skutečně uskutečnilo. Ve zdrojích prověřených k uvedenému datu nemáme srovnatelný výrok z roku 2026. To neznamená, že neexistuje.",
  },
  {
    id: "diplomacie",
    nazev: "Otevřenost diplomacii",
    stav: "castecny",
    drive: {
      datum: "2022-02-23",
      autor: "Vladimir Putin · prezident",
      text: "Putin deklaroval otevřenost dialogu a diplomatickým řešením. Zároveň uvedl, že o ruských zájmech a bezpečnosti občanů nebude vyjednávat.",
      zdroj: { nazev: "The Moscow Times / AFP", url: "https://www.themoscowtimes.com/2022/02/23/putin-says-russias-interests-non-negotiable-a76531" },
    },
    nyni: {
      datum: "2026-09-03",
      autor: "Vladimir Putin · prezident",
      text: "Putin uvedl, že podle něj existuje šance na dohodu o ukončení války na Ukrajině.",
      zdroj: { nazev: "Reuters", url: "https://www.reuters.com/world/europe/putin-cites-chance-peace-deal-says-ukrainian-aviation-warning-makes-it-harder-2026-09-03/" },
    },
    kontext: "Společným tématem je diplomatické řešení. V roce 2022 šlo o vyjádření před rozsáhlou invazí, v roce 2026 o ukončení již probíhající války. Nejde o shodný slib nenapadení ani o důkaz stejného záměru.",
  },
  {
    id: "nezautocime",
    nazev: "Popírání útočných úmyslů",
    stav: "podobny",
    drive: {
      datum: "2022-01-19",
      autor: "Sergej Rjabkov · náměstek ministra zahraničí",
      text: "Rjabkov v rozhovoru s CNN výslovně odmítl, že Rusko na Ukrajinu zaútočí nebo do ní vpadne.",
      zdroj: { nazev: "CNN · přepis vysílání 20. 1.", url: "https://transcripts.cnn.com/show/cnr/date/2022-01-20/segment/19" },
    },
    nyni: {
      datum: "2026-09-21",
      autor: "Dmitrij Peskov · mluvčí Kremlu",
      text: "Rusko neohrožuje Francii ani žádnou jinou evropskou zemi.",
      citace: true,
      zdroj: { nazev: "Reuters", url: "https://www.reuters.com/world/europe/kremlin-rejects-le-penbardella-rebuke-says-russia-is-no-threat-france-2026-09-21/" },
    },
    kontext: "Podobnost spočívá v kategorickém odmítnutí hrozby. Mluvčí i předmět výroku se liší: Rjabkov hovořil o útoku na Ukrajinu, Peskov o ohrožování evropských zemí. Ani jeden z těchto dvou výroků nepronesl Putin osobně.",
  },
  {
    id: "zadne-plany",
    nazev: "Popírání plánů útoku",
    stav: "podobny",
    drive: {
      datum: "2022-02-20",
      autor: "Anatolij Antonov · velvyslanec v USA",
      text: "Žádná invaze není a žádné takové plány neexistují.",
      citace: true,
      zdroj: { nazev: "CBS · rozhovor", url: "https://www.cbsnews.com/news/russia-ukraine-ambassador-anatoly-antonov-no-such-plans-invasion-face-the-nation/" },
    },
    nyni: ubezpeceni2026,
    kontext: "Obě sdělení popírají existenci útočných plánů. Liší se mluvčí, území i způsob doložení: Antonovův rozhovor versus Ušakovův popis Putinova hovoru. Záznam hovoru z roku 2026 nemáme; dokládáme, co o něm uvedl Kreml.",
  },
];
