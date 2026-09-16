import rada from "../../data/palivo.json";

/*
  Cena paliva: co je změřené, ne co se čeká.

  Proč to na bezpečnostním webu je: „palivo a čerpací stanice“ je jedna
  z položek dopadu na běžný život a mezi tím, co by její stav změnilo, už stojí
  „skokový růst cen bez omezení dostupnosti“. Tohle je k tomu měřidlo.

  Proč se tu NEPÍŠE, že cena poroste: je to předpověď a pravidlo č. 3c ji
  zakazuje. U paliva to navíc není akademické — bezpečnostní web, který napíše
  „bude dráž, natankujte“, spustí nájezd na pumpy. Panika u pump je přesně ta
  škoda, kterou § 357 řeší, a položka „palivo“ sama návštěvníkům říká, že
  panické nakupování situaci vždy zhorší.

  Co se říct smí a co čtenáři stačí: kolik palivo stojí teď, o kolik se to
  změnilo za týden a za čtvrtletí, a jestli je to nejdráž za nějakou dobu.
  Z toho se každý rozhodne sám — a je to fakt, ne věštba.

  Zdroj je úřední: týdenní šetření průměrných spotřebitelských cen ČSÚ.
*/

/** Skok za týden, od kterého to stojí za zmínku. Běžný pohyb bývá do půl koruny. */
export const PRAH_SKOKU = 0.5;
/*
  Skok, který patří i do kanálu jako samostatná zpráva.

  Celá koruna na litru je změna, kterou člověk pozná na jedné nádrži — o té
  má smysl dát vědět. Haléře do kanálu nepatří, z těch by byl šum, ve kterém
  zapadne skutečný skok. Na webu se zmíní dřív (od padesáti haléřů): tam si
  údaj někdo vyhledá sám, kdežto zpráva do telefonu přijde, ať chce nebo ne.
*/
export const PRAH_ZPRAVY = 1.0;

export type DruhPaliva = "nafta" | "benzin95";

export const NAZVY_PALIV: Record<DruhPaliva, string> = {
  nafta: "Nafta",
  benzin95: "Benzin 95",
};

export interface TydenCeny {
  /** Týden podle ISO, například 2026-W37. */
  tyden: string;
  /** Datum konce šetřeného týdne. */
  konec: string;
  nafta: number | null;
  benzin95: number | null;
}

export interface RadaCen {
  /** Kdy se řada naposledy povedlo stáhnout. null = nikdy. */
  aktualizovano: string | null;
  zdroj: { nazev: string; url: string; typ: string; primarni: boolean };
  poznamka: string;
  rada: TydenCeny[];
  /** Když se stažení nepovedlo, tady je důvod. Prázdno není totéž co „v pořádku“. */
  chyba?: string | null;
  /** Kdy se naposledy zkoušelo stahovat — ať už to dopadlo jakkoli. */
  pokus?: string | null;
  /**
   * Doložený skok, který stojí za samostatnou zprávu do kanálu.
   *
   * Skládá ho sběr, protože jen on vidí čerstvě staženou řadu; rozhlas ji
   * pak jen odešle a zapamatuje si týden, aby neposlal totéž dvakrát.
   */
  zprava?: ZpravaOPalivu | null;
}

export interface ZpravaOPalivu {
  /** Týden, ke kterému se zpráva vztahuje. Slouží i jako klíč proti opakování. */
  tyden: string;
  /** Hotový text. Jen změřené údaje, žádný výhled a žádná rada. */
  text: string;
}

export interface StavPaliva {
  druh: DruhPaliva;
  nazev: string;
  /** Poslední změřená cena v Kč za litr. null = nemáme. */
  cena: number | null;
  /** Ke kterému týdnu se cena vztahuje. */
  tyden: string | null;
  konec: string | null;
  /** Změna proti předchozímu týdnu v Kč. */
  zaTyden: number | null;
  /** Změna proti stavu před třinácti týdny (zhruba čtvrtletí). */
  zaCtvrtleti: number | null;
  /**
   * Jak daleko zpět je potřeba jít, aby bylo dráž (nebo levněji).
   * null = v celé řadě se nic vyššího nenašlo, pak platí `odZacatku`.
   */
  mesicuNaMaximu: number | null;
  /** True, když je současná cena nejvyšší v celé sledované řadě. */
  odZacatku: boolean;
  /** Týdenní pohyb přesáhl práh — stojí za zmínku. */
  skok: boolean;
  /** Týdenní pohyb přesáhl práh pro samostatnou zprávu do kanálu. */
  proZpravu: boolean;
}

const DATA = rada as RadaCen;

/** Celá řada tak, jak je v repozitáři. Seřazená od nejstaršího. */
export function radaCen(): RadaCen {
  return DATA;
}

function zaokrouhli(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Stav jednoho paliva.
 *
 * Kde data chybí, vrací null — nikdy se nedopočítává. Jeden chybějící týden
 * v řadě nesmí vyrobit vymyšlenou změnu.
 */
export function stavPaliva(druh: DruhPaliva, data: RadaCen = DATA): StavPaliva {
  const prazdny: StavPaliva = {
    druh,
    nazev: NAZVY_PALIV[druh],
    cena: null,
    tyden: null,
    konec: null,
    zaTyden: null,
    zaCtvrtleti: null,
    mesicuNaMaximu: null,
    odZacatku: false,
    skok: false,
    proZpravu: false,
  };

  // Jen týdny, kde tohle palivo opravdu má číslo.
  const body = data.rada.filter((t) => typeof t[druh] === "number").sort((a, b) => a.konec.localeCompare(b.konec));
  if (!body.length) return prazdny;

  const posledni = body.at(-1)!;
  const cena = posledni[druh] as number;

  /*
    Změna se počítá podle DATA, ne podle pořadí v řadě.

    ČSÚ některé týdny nešetří — kolem Nového roku a Velikonoc jsou v řadě
    mezery čtrnácti- i jednadvacetidenní. Kdyby se brala prostě předchozí
    položka, vyšla by dvoutýdenní změna vydávaná za týdenní: mezera
    2024-12-22 → 2025-01-05 by takhle hlásila „za týden −2,26 Kč" a při
    prahu dvou korun by to odešlo i do kanálu. Tvrzení o týdnu musí být
    o týdnu, jinak se neřekne nic.
  */
  const dniMezi = (a: TydenCeny, b: TydenCeny) =>
    Math.round((new Date(b.konec).getTime() - new Date(a.konec).getTime()) / 86_400_000);

  const predchozi = body.at(-2);
  const zaTyden =
    predchozi && Math.abs(dniMezi(predchozi, posledni) - 7) <= 2
      ? zaokrouhli(cena - (predchozi[druh] as number))
      : null;

  /*
    Čtvrtletí: vezme se bod nejbližší devadesáti jedna dnům zpět a přijme se
    jen tehdy, když do tří týdnů od té hranice opravdu leží. Třináctý záznam
    odzadu je v řadě s mezerami něco jiného než čtvrtletí.
  */
  const cil = new Date(posledni.konec).getTime() - 91 * 86_400_000;
  const ctvrtletiZpet = body
    .slice(0, -1)
    .reduce<TydenCeny | null>((nej, t) => {
      const rozdil = Math.abs(new Date(t.konec).getTime() - cil);
      return !nej || rozdil < Math.abs(new Date(nej.konec).getTime() - cil) ? t : nej;
    }, null);
  const zaCtvrtleti =
    ctvrtletiZpet && Math.abs(new Date(ctvrtletiZpet.konec).getTime() - cil) <= 21 * 86_400_000
      ? zaokrouhli(cena - (ctvrtletiZpet[druh] as number))
      : null;

  /*
    „Nejvyšší za X měsíců“: jdeme zpět, dokud nenarazíme na týden, kdy bylo
    dráž. Vzdálenost k němu je ta odpověď. Když se nenajde nic, je to maximum
    celé řady a řekne se to jinak — „za X měsíců“ by u nejstaršího záznamu
    tvrdilo víc, než kolik dat máme.
  */
  let mesicuNaMaximu: number | null = null;
  let odZacatku = false;
  const drivDraz = [...body.slice(0, -1)].reverse().find((t) => (t[druh] as number) >= cena);
  if (drivDraz) {
    const dni = (new Date(posledni.konec).getTime() - new Date(drivDraz.konec).getTime()) / 86_400_000;
    mesicuNaMaximu = Math.max(1, Math.round(dni / 30.4));
  } else if (body.length > 1) {
    odZacatku = true;
  }

  const skok = zaTyden !== null && Math.abs(zaTyden) >= PRAH_SKOKU;

  return {
    ...prazdny,
    cena,
    tyden: posledni.tyden,
    konec: posledni.konec,
    zaTyden,
    zaCtvrtleti,
    mesicuNaMaximu,
    odZacatku,
    skok,
    proZpravu: zaTyden !== null && Math.abs(zaTyden) >= PRAH_ZPRAVY,
  };
}

/** Obě paliva najednou. Nafta první — ptá se na ni víc lidí. */
export function stavPaliv(data: RadaCen = DATA): StavPaliva[] {
  return (["nafta", "benzin95"] as DruhPaliva[]).map((d) => stavPaliva(d, data));
}

/**
 * Jedna věta o ceně, složená jen ze změřených údajů.
 *
 * Vrací null, když nemáme co říct. Věta o tom, že nic nevíme, na dlaždici
 * nepatří — od toho je stav „zatím nemáme data“.
 */
export function vetaOCene(s: StavPaliva): string | null {
  if (s.cena === null) return null;

  const casti: string[] = [`${s.nazev} ${s.cena.toFixed(2).replace(".", ",")} Kč/l`];

  if (s.zaTyden !== null && s.zaTyden !== 0) {
    const znak = s.zaTyden > 0 ? "+" : "−";
    casti.push(`za týden ${znak}${Math.abs(s.zaTyden).toFixed(2).replace(".", ",")} Kč`);
  }

  if (s.odZacatku) casti.push("nejvýš za celou sledovanou dobu");
  else if (s.mesicuNaMaximu !== null && s.mesicuNaMaximu >= 3) {
    casti.push(`nejvýš za ${s.mesicuNaMaximu} ${s.mesicuNaMaximu >= 5 ? "měsíců" : "měsíce"}`);
  }

  return `${casti.join(" · ")}.`;
}

/** Datum jako „7. 9. 2026“. Bez časové zóny — je to kalendářní den šetření. */
function den(iso: string): string {
  const [r, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}. ${m}. ${r}`;
}

/**
 * Zpráva do kanálu, když cena skokově vyskočila nebo spadla.
 *
 * Vrací null, dokud se nic takového nestane — kanál nemá být týdenní
 * ceník. Text je složený jen z čísel, která v řadě opravdu jsou, a končí
 * větou, která říká, co zpráva NENÍ. Bez ní by si ji každý druhý čtenář
 * přeložil jako „běž natankovat“, a přesně to na bezpečnostním webu být nesmí.
 */
export function zpravaOPalivu(data: RadaCen = DATA): ZpravaOPalivu | null {
  const skoky = stavPaliv(data).filter((s) => s.proZpravu);
  if (!skoky.length) return null;

  const vety = skoky.map(vetaOCene).filter((v): v is string => Boolean(v));
  if (!vety.length) return null;

  const konec = skoky[0].konec;
  const text = [
    "Skokový pohyb ceny pohonných hmot",
    "",
    ...vety,
    "",
    `Průměrné spotřebitelské ceny za týden do ${konec ? den(konec) : "—"} podle týdenního šetření Českého statistického úřadu.`,
    "Je to změřený údaj za uplynulý týden, ne předpověď. Kam ceny půjdou dál, nevíme a netvrdíme to.",
  ].join("\n");

  return { tyden: skoky[0].tyden ?? konec ?? "", text };
}
