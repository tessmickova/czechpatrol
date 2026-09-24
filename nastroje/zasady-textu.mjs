/**
 * Zásady textu — strojová část pravidel č. 0.5 a 0.6 v CLAUDE.md.
 *
 * Co se dá hlídat strojově, hlídá se tady: sankcionovaná média jako zdroj
 * (chyba) a hanlivé nálepky v textu (varování — rozhodne člověk, protože
 * slovo může stát v doslovné citaci úřadu). Zbytek pravidel je v pokynech
 * pro model (POKYNY_TEXTU) a v rukou toho, kdo záznam čte.
 */

/*
  Média na sankčním seznamu EU (nařízení Rady 833/2014, čl. 2f, ve znění
  pozdějších balíčků). Seznam se mění — při každém novém balíčku ho musí
  člověk porovnat s aktuálním zněním. Jsou tu jen domény, u kterých je
  zařazení jisté.
*/
const SANKCIONOVANE = [
  "rt.com", "russian.rt.com", "sputniknews.com", "sputnikglobe.com", "sputniknews.cz",
  "ria.ru", "iz.ru", "rg.ru", "1tv.ru", "vesti.ru", "smotrim.ru", "ntv.ru", "ren.tv",
  "tvzvezda.ru", "tsargrad.tv", "voiceofeurope.com", "orientalreview.org", "journal-neo.su", "katehon.com",
];

function hostitel(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

/** Vede odkaz na médium ze sankčního seznamu EU? */
export function jeSankcionovane(url) {
  const h = hostitel(url);
  if (!h) return false;
  return SANKCIONOVANE.some((d) => h === d || h.endsWith(`.${d}`));
}

/*
  Hanlivé nálepky. Varování, ne chyba: stejné slovo může stát v doslovné
  citaci úřadu nebo v úředním označení („teroristická organizace“ podle
  rozhodnutí vlády). Člověk rozhodne, jestli je to citace s původcem.
*/
const NALEPKY = [
  "okupant", "orkové", "orky", "rusák", "rusáci", "banderovc", "fašist", "nacist", "zrádc", "kolaborant",
  "teroristé", "terorista", "zločinný režim", "putinovc", "dezolát", "šváb", "agent kremlu",
];

/** Najde hanlivé nálepky v textu (bez ohledu na velikost písmen). */
export function nalepkyVTextu(text) {
  const t = (text ?? "").toLowerCase();
  // Od začátku slova: „orky“ nesmí najít „ponorky“.
  return NALEPKY.filter((n) => new RegExp(`(^|[^\\p{L}])${n}`, "u").test(t));
}

/*
  Řeči bez skutku (rozhodnutí provozovatelky 24. 9. 2026): projev, výzva,
  varování nebo komentář politika či instituce (OSN, prezident, ministr…)
  není událost, dokud z něj neplyne konkrétní bezpečnostní následek,
  změna nebo rozhodnutí. Posuzuje se TITULEK: slovesa řeči bez slovesa
  činu. „Prezident vyhlásil nouzový stav“ projde (vyhlásil), „prezident
  varoval před hrozbou“ ne.
*/
const SLOVESA_RECI = [
  "řekl", "řekla", "uvedl", "uvedla", "prohlásil", "prohlásila", "připomněl", "připomněla", "vyzval", "vyzvala",
  "varoval", "varovala", "apeloval", "kritizoval", "míní", "tvrdí", "podle prezidenta", "podle premiéra", "podle ministra",
  "v projevu", "v rozhovoru", "na valném shromáždění", "v osn", "v komentáři", "označil", "zdůraznil", "vzkázal", "sdělil",
  "žádá", "žádal", "žádala", "vyzývá", "apeluje", "navrhuje", "chce, aby", "vzkazuje", "míní, že", "komentoval", "reagoval", "reaguje",
  "said", "says", "urged", "warned", "called on", "calls on", "calls for", "demands", "told", "stated", "in speech", "remarks", "slammed", "blasted", "criticized", "criticised", "reacts",
];
const SLOVESA_CINU = [
  "vyhlásil", "vyhlásila", "vyhlášen", "schválil", "schválila", "schválen", "rozhodl", "rozhodla", "rozhodnut", "zavedl", "zavedla", "zaveden",
  "nařídil", "nařídila", "uzavřel", "uzavřela", "uzavřen", "zakázal", "zakázala", "zakázán", "omezil", "omezila", "omezen", "nasadil", "nasazen",
  "zadržel", "zadržela", "zadržen", "zatkl", "zatčen", "obvinil", "obviněn", "odsoudil", "odsouzen", "vyhostil", "vyhoštěn", "sestřelil", "sestřelen",
  "vzlétl", "vzlétly", "útok", "útoku", "výbuch", "exploz", "sabotáž", "výpadek", "narušil", "narušen", "mobilizac", "evakuac", "podepsal", "ratifikoval",
  "zrušil", "přerušil", "pozastavil", "sankce", "vypověděl", "oznámil zavedení", "aktivoval", "spustil", "zahájil cvičení", "poslal vojáky", "vyslal",
  "declared", "approved", "ordered", "closed", "banned", "imposed", "deployed", "arrested", "detained", "charged", "expelled", "shot down", "scrambled",
  "attack", "explosion", "blast", "sabotage", "outage", "violated", "mobilis", "mobiliz", "evacuat", "signed", "ratified", "suspended", "sanction", "launched", "activated", "sent troops",
];
function normal(t) { return (t ?? "").toLowerCase().normalize("NFC"); }

/** Titulek je jen řeč (projev, výzva, varování) bez činu. */
export function jeJenProjev(titulek) {
  const t = normal(titulek);
  if (!t) return false;
  const rec = SLOVESA_RECI.some((s) => t.includes(s));
  if (!rec) return false;
  return !SLOVESA_CINU.some((s) => t.includes(s));
}

/** Pokyny pro model — přidávají se ke každému zadání, které píše text pro čtenáře. */
export const POKYNY_TEXTU = [
  "Zásady textu (závazné): Shrnuj jen to, co zpráva opravdu říká, vlastními slovy a zkráceně.",
  "Nepřidávej žádné nové tvrzení, závěr, motiv, příčinu, souvislost ani číslo, které ve zprávě není.",
  "Nezesiluj: „podezřelý“ zůstane podezřelý, „údajně“ a „podle …“ zůstanou; obviněný není pachatel.",
  "Každé tvrzení přiřaď tomu, kdo ho řekl. Tvrzení strany sporu nebo konfliktu označ jako její tvrzení.",
  "Piš věcně a s úctou ke všem stranám: žádné nadávky, hanlivé přezdívky ani nálepky o státech, národech, skupinách či lidech.",
  "Neuváděj jména soukromých osob, polohu ani pohyb jednotek, podrobnosti vyšetřování nad rámec oznámení úřadu, ani návody.",
  "Titulek nesmí být silnější než text zprávy.",
  "Projev, výzva, varování nebo komentář politika či instituce (OSN, prezident, ministr) není událost; zapisuje se jen konkrétní bezpečnostní následek, změna nebo rozhodnutí.",
].join(" ");
