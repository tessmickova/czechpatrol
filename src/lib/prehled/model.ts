import { kdyKratce } from "../cas";
import * as T from "./texty";
import type {
  DruhHlavniho, InformaceVstup, Lokalita, Prehled, SnimekPrehledu, StavDat, StavInformace, StavZdroje,
  Uzemi, VyhodnocenaInformace, VyhodnocenyZdroj, VysledekPokusu, VztahKLokalite, ZaznamZdroje, ZdrojVeSnimku,
} from "./typy";

/*
  Stavový model Rychlého přehledu. Čisté funkce: vstupem je snímek dat,
  lokalita a SKUTEČNÝ čas prohlížeče. Stáří se tak počítá vždycky znovu —
  stránka ze včerejšího buildu (nebo z cache) sama zešedne, i když ji nikdo
  nepřestaví. Proto se tu nikde nečte Date.now(): čas přichází zvenku.
*/

export interface KonfiguraceCerstvosti {
  beh: { kadenceMin: number; zpozdenoPoMin: number; nelzePotvrditPoMin: number };
  skupiny: { klic: string; nazev: string; zasadni: boolean; zdroje: string[]; zpozdenoPoMin: number; nedostupnePoMin: number }[];
  sluzby: { zpozdenoPoMin: number; nedostupnePoMin: number };
  palivo: { zpozdenoPoMin: number; nedostupnePoMin: number };
  mediaZaHodin: number;
  podilProNelzePotvrdit: number;
}

const MIN = 60_000;
const cas = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);

/* ---------- 1. stav zdrojů ---------- */

/**
 * Sloučí výsledky jednoho běhu sběru do trvalého stavu zdrojů.
 *
 * Monotonní: výsledek běhu, který začal DŘÍV než už zapsaný pokus, se
 * zahodí. Dva běhy se můžou překrýt (worker + záložní plánovač GitHubu)
 * a pozdě doručený starší výsledek nesmí přepsat novější — jinak by
 * úspěch z rána „opravil“ výpadek z poledne.
 */
export function slucStavZdroju(
  stary: Record<string, ZaznamZdroje>,
  vysledky: { klic: string; vysledek: VysledekPokusu; chyba?: string | null }[],
  kdyZacal: string,
): Record<string, ZaznamZdroje> {
  const novy: Record<string, ZaznamZdroje> = { ...stary };
  for (const v of vysledky) {
    const s = stary[v.klic];
    if (s?.posledniPokus && cas(s.posledniPokus) > cas(kdyZacal)) continue;
    const ok = v.vysledek === "ok";
    novy[v.klic] = {
      posledniUspech: ok ? kdyZacal : s?.posledniUspech ?? null,
      posledniPokus: kdyZacal,
      posledniVysledek: v.vysledek,
      chyba: ok ? null : v.chyba ?? (v.vysledek === "obsah" ? "nečekaný obsah" : "neznámá chyba"),
      neuspechuZaSebou: ok ? 0 : (s?.neuspechuZaSebou ?? 0) + 1,
    };
  }
  return novy;
}

/**
 * Byl obsah úspěšné odpovědi takový, jaký čekáme?
 * HTTP 200 s prázdnou nebo cizí stránkou (chybová stránka CDN, přesměrování
 * na úvod) se NESMÍ počítat jako „zdroj odpověděl, nic tam není“.
 */
export function vysledekPokusu(r: { ok: boolean; format: "rss" | "html" | "json"; polozek: number; znaku: number }, minZnaku: number): VysledekPokusu {
  if (!r.ok) return "chyba";
  if (r.format === "rss") return r.polozek > 0 ? "ok" : "obsah";
  return r.znaku >= minZnaku ? "ok" : "obsah";
}

export function stavZdroje(z: ZdrojVeSnimku, meze: { zpozdenoPoMin: number; nedostupnePoMin: number }, ted: number): StavZdroje {
  if (z.blokovany) return "neoveritelny";
  if (!z.posledniUspech || Number.isNaN(cas(z.posledniUspech))) return "nedostupny";
  const stari = (ted - cas(z.posledniUspech)) / MIN;
  if (stari > meze.nedostupnePoMin) return "nedostupny";
  if (z.posledniVysledek === "obsah") return "neuplny";
  if (stari > meze.zpozdenoPoMin) return "zpozdeny";
  return "aktualni";
}

export function vyhodnotZdroje(s: SnimekPrehledu, k: KonfiguraceCerstvosti, ted: number): VyhodnocenyZdroj[] {
  const podleKlice = new Map(s.zdroje.map((z) => [z.klic, z]));
  const vysledek: VyhodnocenyZdroj[] = [];
  for (const sk of k.skupiny) {
    for (const klic of sk.zdroje) {
      const z = podleKlice.get(klic);
      // Zdroj v konfiguraci, který snímek nezná, je nedostupný — ne tiše vynechaný.
      const zaklad: ZdrojVeSnimku = z ?? { klic, nazev: klic, odkaz: "", blokovany: false, posledniUspech: null, posledniPokus: null, posledniVysledek: "chyba", chyba: "zdroj chybí v datech sběru", neuspechuZaSebou: 0 };
      vysledek.push({ ...zaklad, skupina: sk.klic, nazevSkupiny: sk.nazev, zasadni: sk.zasadni, stav: stavZdroje(zaklad, sk, ted) });
    }
  }
  return vysledek;
}

/* ---------- 2. stav dat pro hlavní souhrn ---------- */

export function stavDat(s: SnimekPrehledu, zdroje: VyhodnocenyZdroj[], k: KonfiguraceCerstvosti, ted: number): { stav: StavDat; problemove: VyhodnocenyZdroj[] } {
  const testovatelne = zdroje.filter((z) => z.zasadni && z.stav !== "neoveritelny");
  const spatne = testovatelne.filter((z) => z.stav === "nedostupny" || z.stav === "neuplny");
  const zpozdene = testovatelne.filter((z) => z.stav === "zpozdeny");
  const behStari = (ted - cas(s.beh.kdy)) / MIN;

  // Všechny zásadní zdroje při posledním pokusu selhaly — nejhorší případ.
  const posledniVseSelhalo = testovatelne.length > 0 && testovatelne.every((z) => z.posledniVysledek !== "ok");
  if (posledniVseSelhalo) return { stav: "vypadek-vseho", problemove: testovatelne };
  if (!s.beh.kdy || Number.isNaN(behStari) || behStari > k.beh.nelzePotvrditPoMin) return { stav: "nelze-potvrdit", problemove: [] };
  if (!testovatelne.length || spatne.length / testovatelne.length >= k.podilProNelzePotvrdit) return { stav: "nelze-potvrdit", problemove: spatne };
  if (spatne.length) return { stav: "vypadek-zasadniho", problemove: spatne };
  if (zpozdene.length || behStari > k.beh.zpozdenoPoMin) return { stav: "zpozdeni", problemove: zpozdene };
  return { stav: "aktualni", problemove: [] };
}

/** Nejnovější úspěch mezi zásadními zdroji. Čas buildu ani stránky to není nikdy. */
export function posledniKontrola(zdroje: VyhodnocenyZdroj[]): string | null {
  const casy = zdroje.filter((z) => z.zasadni && z.posledniUspech).map((z) => z.posledniUspech!).sort();
  return casy.length ? casy[casy.length - 1] : null;
}

/* ---------- 3. stav informace ---------- */

export function stavInformace(i: InformaceVstup, ted: number): StavInformace {
  if (i.odvolano && cas(i.odvolano) <= ted) return "odvolana";
  if (i.platiDo && cas(i.platiDo) < ted) return "ukoncena";
  if (i.platiOd && cas(i.platiOd) > ted) return "nadchazejici";
  // Oficiální informace bez vydavatele nebo odkazu na originál nejde ověřit.
  if (i.typ !== "analyza" && i.typ !== "potvrzena-udalost" && (!i.vydavatel || !i.odkaz)) return "nejasna";
  if (i.opraveno) return "opravena";
  return "platna";
}

/* ---------- 4. vztah k lokalitě ---------- */

export function vztahKLokalite(u: Uzemi, l: Lokalita): VztahKLokalite {
  if (u.druh === "cr") return "v-uzemi";
  if (u.druh === "zahranici") return "mimo";
  if (u.druh === "nezname") return "nelze-urcit";
  // Regionální informace: bez zvoleného kraje nevíme, jestli se čtenáře týká.
  if (l.druh === "nenastaveno") return "nelze-urcit";
  if (l.druh === "cr") return "v-uzemi";
  if (u.druh === "kraje") return u.kraje.includes(l.kraj) ? "v-uzemi" : "mimo";
  // Část území (okres, obec): v kraji čtenáře je, ale jestli i u něj, nevíme.
  if (!u.kraje.length) return "nelze-urcit";
  return u.kraje.includes(l.kraj) ? "nelze-urcit" : "mimo";
}

/* ---------- 5. celek ---------- */

const JE_OFICIALNI = new Set(["oficialni-pokyn", "oficialni-vystraha", "oficialni-opatreni"]);
const AKTIVNI: StavInformace[] = ["platna", "nadchazejici", "opravena", "nejasna"];
/** Ukončené a odvolané se ukážou ještě den — čtenář musí vidět, že skončily, ne že zmizely. */
const DOBEH_UKONCENYCH_MIN = 24 * 60;

export const NECTEME = [
  "Regionální a okresní výstrahy ČHMÚ (čteme jen titulní stránku podle klíčových slov)",
  "Výstrahy a pokyny krajů a obcí",
  "Zprávy partnerů IZS v aplikaci (vidí jen přihlášení)",
];

export function sestavPrehled(s: SnimekPrehledu, lokalita: Lokalita, k: KonfiguraceCerstvosti, ted: number): Prehled {
  const zdroje = vyhodnotZdroje(s, k, ted);
  const { stav: sd, problemove } = stavDat(s, zdroje, k, ted);
  const kontrola = posledniKontrola(zdroje);
  const nelzeOverovat = sd !== "aktualni";

  const vyhodnocene: VyhodnocenaInformace[] = s.informace.map((i) => ({
    ...i,
    stav: stavInformace(i, ted),
    vztah: vztahKLokalite(i.uzemi, lokalita),
    zmenuNelzeOverit: nelzeOverovat && JE_OFICIALNI.has(i.typ),
  }));

  const oficialniVse = vyhodnocene.filter((i) => JE_OFICIALNI.has(i.typ));
  const vidi = (i: VyhodnocenaInformace) =>
    AKTIVNI.includes(i.stav) ||
    ((i.stav === "ukoncena" || i.stav === "odvolana") && ted - cas(i.odvolano ?? i.platiDo) <= DOBEH_UKONCENYCH_MIN * MIN);
  const oficialni = oficialniVse
    .filter((i) => i.vztah !== "mimo" && vidi(i))
    .sort((a, b) => poradiInformace(a) - poradiInformace(b) || (b.vydano ?? "").localeCompare(a.vydano ?? ""));
  const mimoOblast = oficialniVse.filter((i) => i.vztah === "mimo" && AKTIVNI.includes(i.stav)).length;

  const platne = oficialni.filter((i) => AKTIVNI.includes(i.stav));
  const vUzemi = platne.filter((i) => i.vztah === "v-uzemi");
  const nejasne = platne.filter((i) => i.vztah === "nelze-urcit");

  const p: T.ParametryHlavniho = {
    lokalita, ted, posledniKontrola: kontrola,
    problemove: problemove.map((z) => ({ nazev: z.nazev, posledniUspech: z.posledniUspech })),
    vystrahy: vUzemi.length ? vUzemi : nejasne,
  };

  let druh: DruhHlavniho;
  let text: { nadpis: string; veta: string };
  if (vUzemi.length) {
    druh = nelzeOverovat ? "posledni-znama" : "vystraha";
    text = nelzeOverovat ? T.textPosledniZnama(p) : T.textVystraha(p);
  } else if (nejasne.length) {
    druh = "vystraha-nejasna";
    text = T.textVystrahaNejasna(p);
    if (nelzeOverovat) text = { ...text, veta: `${text.veta} Novější změnu teď neověříme — kontrola zdrojů se naposledy podařila ${kontrola ? kdyKratce(kontrola, ted) : "nikdy"}.` };
  } else {
    druh = sd === "aktualni" ? "bez-vystrahy" : sd;
    text = {
      "bez-vystrahy": T.textBezVystrahy,
      zpozdeni: T.textZpozdeni,
      "vypadek-zasadniho": T.textVypadekZasadniho,
      "nelze-potvrdit": T.textNelzePotvrdit,
      "vypadek-vseho": T.textVypadekVseho,
    }[druh as Exclude<DruhHlavniho, "vystraha" | "posledni-znama" | "vystraha-nejasna">](p);
  }

  const ton = druh === "vystraha" || druh === "posledni-znama" ? "vystraha" : druh === "bez-vystrahy" ? "neutralni" : "pozor";

  const udalosti = vyhodnocene
    .filter((i) => i.typ === "potvrzena-udalost" && i.vztah !== "mimo")
    .sort((a, b) => (b.vydano ?? "").localeCompare(a.vydano ?? ""))
    .slice(0, 3);
  const analyza = vyhodnocene.find((i) => i.typ === "analyza") ?? null;

  return {
    lokalita,
    oblastText: T.oblastNazev(lokalita),
    stavDat: sd,
    hlavni: { druh, ...text, ton },
    posledniKontrola: kontrola,
    zdroje,
    pokryti: {
      zahrnuto: zdroje.filter((z) => z.stav === "aktualni").map((z) => z.nazev),
      nelzeOverit: zdroje.filter((z) => z.stav !== "aktualni").map((z) => z.nazev),
      necteme: NECTEME,
    },
    oficialni,
    mimoOblast,
    udalosti,
    analyza,
    neovereno: s.neovereno,
  };
}

/** Pokyn před výstrahou před opatřením; aktivní před skončenými. */
function poradiInformace(i: VyhodnocenaInformace): number {
  const typ = { "oficialni-pokyn": 0, "oficialni-vystraha": 1, "oficialni-opatreni": 2, "potvrzena-udalost": 3, analyza: 4 }[i.typ];
  return (AKTIVNI.includes(i.stav) ? 0 : 10) + (i.vztah === "v-uzemi" ? 0 : 5) + typ;
}

/**
 * Má prohlížeč nahradit zobrazený snímek nově staženým?
 *
 * Jen když je novější podle běhu sběru, a při stejném běhu podle buildu.
 * Pomalá odpověď na dřívější dotaz (nebo stará kopie z cache/CDN) tak
 * nepřepíše novější stav, který už stránka ukazuje.
 */
export function prijmiSnimek(soucasny: SnimekPrehledu, novy: unknown): SnimekPrehledu {
  if (!jeSnimek(novy)) return soucasny;
  const behA = cas(soucasny.beh.kdy), behB = cas(novy.beh.kdy);
  if (!Number.isNaN(behA) && (Number.isNaN(behB) || behB < behA)) return soucasny;
  if (behB === behA && cas(novy.generovano) <= cas(soucasny.generovano)) return soucasny;
  return novy;
}

/** Kontrola tvaru staženého snímku — chybný nebo cizí obsah se nepoužije. */
export function jeSnimek(x: unknown): x is SnimekPrehledu {
  const s = x as SnimekPrehledu;
  return Boolean(s && s.verze === 1 && typeof s.generovano === "string" && s.beh && Array.isArray(s.zdroje) && Array.isArray(s.informace) && s.neovereno);
}
