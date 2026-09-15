import { normalizuj } from "./nacti";
import type { Nalez, RegistrZdroj } from "./typy";

export interface Stazeno {
  zdroj: RegistrZdroj;
  ok: boolean;
  text: string;
  polozky: { nadpis: string; odkaz: string; publikovano: string | null; shrnuti: string }[];
  chyba?: string;
  stav: number | null;
}

/*
  Co smí automat o stavu opatření tvrdit.

  Původní verze vracela `ciste: overeno.length > 0 && !tvrdy` — stačilo stáhnout
  jeden relevantní zdroj a nenajít v něm frázi o vyhlášení, a sběr přepsal
  právní stav na „neplatí", stav NATO na „neaktivní“ a provoz na „běžný“,
  a k tomu obnovil datum ověření. To je odvozování bezpečného stavu z absence
  klíčových slov. Taková cesta umí bez jediného dokladu zrušit opatření, které
  platí, a výpadek jiného potřebného zdroje ji nezastaví.

  Nový model odděluje čtyři různé věci, které se dřív slévaly do jedné:

    1. zdroj se stáhl          — HTTP odpověď přišla
    2. obsah se dal zpracovat  — nebyla to prázdná stránka ani JS skořápka
    3. kontrola proběhla       — všechny povinné zdroje položky prošly 1 a 2
    4. stav je věcně ověřený   — ke kroku 3 navíc existuje ÚPLNÝ autoritativní
                                 seznam pro dané území a typ opatření

  Teprve čtvrtý stupeň smí říct „neplatí“. Úvodní HTML stránka úřadu, na které
  není hledané slovo, takový seznam není: nevyhlášení z ní neplyne, plyne z ní
  jen to, že o něm ta stránka nepíše. Proto dnes žádný náš zdroj čtvrtého
  stupně nedosahuje a web to musí přiznat, ne dopočítat.

  Aktivní opatření se navíc nikdy neruší mlčením. Ukončit ho smí jen doložené
  ukončení nebo uplynutí výslovné platnosti — ne to, že o něm zdroj přestal psát.
*/

/** Jak spolehlivě je položka pokrytá v tomhle běhu. Pořadí je stupnice. */
export type Pokryti =
  /** Povinný zdroj se nestáhl nebo z něj nešel přečíst obsah. Nevíme nic nového. */
  | "nedostupne"
  /** Zdroje jsme přečetli, ale žádný z nich není úplný seznam. Nález ano, nenález ne. */
  | "orientacni"
  /** Úplný autoritativní seznam pro dané území a typ opatření. Smí doložit i zápor. */
  | "autoritativni";

export interface Rozhodnuti {
  /** Zdroje, které odpověděly. */
  stazeno: string[];
  /** Zdroje, z nichž se dal přečíst použitelný obsah. */
  zpracovano: string[];
  /** Zdroje, které selhaly nebo vrátily nepoužitelný obsah. */
  selhalo: string[];
  /** Prošly všechny povinné zdroje položky? */
  kontrolaDokoncena: boolean;
  pokryti: Pokryti;
  /** Našla se fráze o vyhlášení? Nález platí i při orientačním pokrytí. */
  signal: boolean;
  /**
   * Smí se zápis přepsat na „neplatí / neaktivní / běžný“ a obnovit datum
   * věcného ověření? Jen při autoritativním pokrytí a bez signálu.
   */
  vecneOvereno: boolean;
  /** Krátké vysvětlení do logu i do dat. Prázdno se špatně dohledává. */
  duvod: string;
  nalezy: Nalez[];
}

/**
 * Kolik znaků textu je ještě „prázdná stránka“.
 *
 * Úřad, který vrátí HTTP 200 a v těle JS skořápku, nedoložil vůbec nic.
 * Bez tohohle prahu by se skořápka počítala jako úspěšná kontrola.
 */
export const MIN_ZNAKU_OBSAHU = 400;

function najdi(text: string, slova: string[] | undefined): string[] {
  if (!slova?.length) return [];
  const t = normalizuj(text);
  return slova.filter((k) => t.includes(normalizuj(k)));
}

/** Fráze o vyhlášení. Nález blokuje potvrzení záporu. */
export function shody(s: Stazeno): string[] {
  if (!s.ok) return [];
  return najdi(s.text, s.zdroj.klicova);
}

/** Tematická slova. Nález jde jen do fronty, zápor neblokuje. */
export function mekkeShody(s: Stazeno): string[] {
  if (!s.ok) return [];
  return najdi(s.text, s.zdroj.sledovana);
}

/** Krátký výřez okolo prvního výskytu — aby bylo ve frontě vidět, o co jde. */
export function vyrez(s: Stazeno, klic: string): string {
  const i = normalizuj(s.text).indexOf(normalizuj(klic));
  if (i < 0) return "";
  return s.text.slice(Math.max(0, i - 120), i + 180).trim();
}

/** Dal se z odpovědi vůbec přečíst obsah? HTTP 200 sám o sobě nestačí. */
export function maObsah(s: Stazeno): boolean {
  if (!s.ok) return false;
  if (s.polozky.length > 0) return true;
  return s.text.trim().length >= MIN_ZNAKU_OBSAHU;
}

/**
 * Posoudí, co se o položce dá po tomhle běhu říct.
 *
 * Nikdy nevrací „ověřeno“ z toho, že se něco nenašlo. K tomu je potřeba
 * zdroj označený `autoritativni` — tedy úplný seznam pro dané území a typ
 * opatření, ne tisková stránka úřadu.
 */
export function rozhodni(klic: string, stazene: Stazeno[]): Rozhodnuti {
  const relevantni = stazene.filter((s) => s.zdroj.tyka?.includes(klic));
  const stazeno: string[] = [];
  const zpracovano: string[] = [];
  const selhalo: string[] = [];
  const nalezy: Nalez[] = [];
  let signal = false;

  for (const s of relevantni) {
    if (!s.ok) {
      selhalo.push(s.zdroj.klic);
      continue;
    }
    stazeno.push(s.zdroj.klic);
    if (!maObsah(s)) {
      // Odpověď přišla, ale nebylo v ní nic k přečtení. To není kontrola.
      selhalo.push(s.zdroj.klic);
      continue;
    }
    zpracovano.push(s.zdroj.klic);

    const tvrde = shody(s);
    const mekke = mekkeShody(s);
    if (tvrde.length) signal = true;

    const trefy = tvrde.length ? tvrde : mekke;
    if (trefy.length) {
      nalezy.push({
        zdroj: s.zdroj.klic,
        nazev: s.zdroj.nazev,
        polozka: {
          nadpis: tvrde.length ? `Možné vyhlášení u položky „${klic}“` : `Zmínka u položky „${klic}“`,
          odkaz: s.zdroj.odkaz ?? s.zdroj.url,
          publikovano: null,
          shrnuti: vyrez(s, trefy[0]),
        },
        shody: trefy,
        tyka: [klic],
      });
    }
  }

  /*
    Povinné zdroje: ty, bez kterých kontrola položky neproběhla. Zdroj, o němž
    dopředu víme, že automaty odmítá, povinný není — jinak by položka byla
    trvale „nedostupná“ a hlášení by ztratilo význam.
  */
  const povinne = relevantni.filter((s) => !s.zdroj.ocekavaneBlokovani).map((s) => s.zdroj.klic);
  const chybejici = povinne.filter((k) => !zpracovano.includes(k));
  const kontrolaDokoncena = povinne.length > 0 && chybejici.length === 0;

  const autoritativni = relevantni.filter((s) => s.zdroj.autoritativni && zpracovano.includes(s.zdroj.klic));

  let pokryti: Pokryti;
  let duvod: string;
  if (!kontrolaDokoncena) {
    pokryti = "nedostupne";
    duvod = povinne.length
      ? `nepodařilo se přečíst: ${chybejici.join(", ")}`
      : "položka nemá žádný dostupný zdroj";
  } else if (autoritativni.length) {
    pokryti = "autoritativni";
    duvod = `úplný seznam: ${autoritativni.map((s) => s.zdroj.klic).join(", ")}`;
  } else {
    pokryti = "orientacni";
    duvod = `přečteno ${zpracovano.join(", ")}; žádný z nich není úplný seznam, zápor z nich neplyne`;
  }

  return {
    stazeno,
    zpracovano,
    selhalo,
    kontrolaDokoncena,
    pokryti,
    signal,
    vecneOvereno: pokryti === "autoritativni" && !signal,
    duvod,
    nalezy,
  };
}
