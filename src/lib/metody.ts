/*
  Číselník metod manipulačních operací.

  Proč pevný číselník a ne volný text: teprve když je metoda pojmenovaná
  stejně v Česku, v Polsku i v Estonsku, jde se zeptat „dělají to jinde
  taky?“. Volné štítky by tuhle otázku znemožnily hned u druhé kampaně.

  Přidat metodu smí jen člověk a jen tehdy, když ji doloží aspoň u jedné
  kampaně. Prázdná kategorie do číselníku nepatří.
*/

export type Metoda =
  | "prunik-do-redakce"
  | "napodobeny-web"
  | "falesne-medium"
  | "podvrzeny-dokument"
  | "ukradena-identita"
  | "zneuzite-logo"
  | "falesna-demonstrace"
  | "obsah-z-ai"
  | "falesne-ucty"
  | "placena-propagace"
  | "zpetne-citovani";

export interface DefiniceMetody {
  nazev: string;
  /** Co to v praxi znamená. Jedna věta, běžnou češtinou. */
  popis: string;
  /** Co z toho plyne pro čtenáře — jak se tomu dá nesednout na lep. */
  jakPoznat: string;
}

export const METODY: Record<Metoda, DefiniceMetody> = {
  "prunik-do-redakce": {
    nazev: "Průnik do redakčního systému",
    popis: "Útočník se dostane do systému skutečné redakce a vydá zprávu jejím jménem.",
    jakPoznat: "Zpráva zmizí během minut a redakce se od ní veřejně distancuje.",
  },
  "napodobeny-web": {
    nazev: "Napodobený web redakce nebo úřadu",
    popis: "Stránka na zaměnitelné adrese, která kopíruje vzhled skutečného média nebo instituce.",
    jakPoznat: "Adresa se liší o jeden znak. Porovnejte ji s tou, kterou znáte.",
  },
  "falesne-medium": {
    nazev: "Vlastní falešné médium",
    popis: "Nově založený „místní zpravodajský server“, který míchá běžné zprávy s propagandou.",
    jakPoznat: "Redakce nemá dohledatelné jméno, adresu ani historii.",
  },
  "podvrzeny-dokument": {
    nazev: "Podvržený úřední dokument",
    popis: "Vymyšlený dopis, nóta nebo pokyn, který se tváří jako úřední listina.",
    jakPoznat: "Na webu úřadu dokument není. Úřady své listiny zveřejňují.",
  },
  "ukradena-identita": {
    nazev: "Ukradená identita úředníka",
    popis: "Profil nebo vyjádření vydávané za konkrétního diplomata, ministra či mluvčího.",
    jakPoznat: "Účet je nový a má málo kontaktů. Ověřte na webu úřadu.",
  },
  "zneuzite-logo": {
    nazev: "Zneužité logo instituce",
    popis: "Znak záchranného sboru, ministerstva nebo policie na cizím materiálu.",
    jakPoznat: "Pokyny pro krizi vydávají úřady na svých stránkách, ne v řetězových zprávách.",
  },
  "falesna-demonstrace": {
    nazev: "Svolávání k falešné demonstraci",
    popis: "Pozvánka na shromáždění, které nikdo neohlásil a nikdo nepořádá.",
    jakPoznat: "Shromáždění se ohlašuje na obci. Když tam o něm nevědí, není.",
  },
  "obsah-z-ai": {
    nazev: "Obsah vytvořený umělou inteligencí",
    popis: "Video, hlas nebo text vyrobený modelem, aby podvrh působil věrohodně.",
    jakPoznat: "Bývá bez originálu: nikde jinde záznam téhož vyjádření není.",
  },
  "falesne-ucty": {
    nazev: "Síť falešných účtů",
    popis: "Skupina nových profilů, které si navzájem sdílejí tentýž obsah.",
    jakPoznat: "Profilové fotky nasazené v jeden týden, pár desítek kontaktů.",
  },
  "placena-propagace": {
    nazev: "Placená propagace",
    popis: "Zaplacený dosah, aby se obsah dostal i k lidem, kteří ho nehledali.",
    jakPoznat: "U příspěvku je označení, že jde o reklamu.",
  },
  "zpetne-citovani": {
    nazev: "Zpětné citování státními médii",
    popis: "Vlastní podvrh se pak cituje jako „místní zdroj“, aby získal důvěryhodnost.",
    jakPoznat: "Řetěz odkazů se točí v kruhu a nikde nekončí u původního dokladu.",
  },
};

/** Pořadí ve filtru: od nejtvrdšího zásahu po doplňkové rozšíření. */
export const PORADI_METOD: Metoda[] = [
  "prunik-do-redakce",
  "podvrzeny-dokument",
  "napodobeny-web",
  "ukradena-identita",
  "zneuzite-logo",
  "falesne-medium",
  "falesna-demonstrace",
  "obsah-z-ai",
  "falesne-ucty",
  "placena-propagace",
  "zpetne-citovani",
];
