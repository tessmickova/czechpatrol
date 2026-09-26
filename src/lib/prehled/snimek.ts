import { ZDROJE } from "../../../sber/zdroje";
import { UROVNE } from "../skala";
import type { CelkovyStav, Incident, Kandidat, Nepotvrzene, PravniPolozka, VystrahaSoubor } from "../typy";
import type { InformaceVstup, SnimekPrehledu, ZaznamZdroje, ZdrojVeSnimku } from "./typy";

/*
  Sestavení snímku pro Rychlý přehled — při buildu, ze souborů v data/.

  Snímek nese SUROVÉ časy (poslední úspěch zdroje, platnost výstrahy),
  ne hotové závěry. Závěr („aktuální“, „platí“) počítá až prohlížeč
  se skutečným časem (model.ts). Kdyby se závěr spočítal tady, zamrzl by
  v HTML — a stránka z cache by po výpadku sběru dál tvrdila „aktuální“.
*/

export interface VstupySnimku {
  generovano: string;
  posledniBeh: { kdy?: string; zdroje?: { klic: string; ok: boolean; chyba?: string; vysledek?: ZaznamZdroje["posledniVysledek"] }[] } | null;
  stavZdroju: Record<string, ZaznamZdroje>;
  sluzby: { aktualizovano?: string | null } | null;
  palivo: { aktualizovano?: string | null } | null;
  vystraha: VystrahaSoubor | null;
  pravni: PravniPolozka[];
  incidenty: Incident[];
  celkovy: CelkovyStav | null;
  kandidati: Kandidat[];
  nepotvrzene: Nepotvrzene[];
}

const DEN = 86_400_000;

export function sestavSnimek(v: VstupySnimku): SnimekPrehledu {
  const ted = new Date(v.generovano).getTime();
  const beh = v.posledniBeh;

  /*
    Stav zdroje: trvalý záznam ze sběru (zdroje-stav.json). Dokud ho sběr
    nezačne psát, odvodí se z posledního běhu — úspěch = čas běhu. To je
    konzervativní: bez historie nevíme o starším úspěchu, a zdroj, který
    teď selhal, proto vyjde jako nedostupný, ne jako „zpožděný“.
  */
  const zdroje: ZdrojVeSnimku[] = ZDROJE.map((z) => {
    const trvaly = v.stavZdroju[z.klic];
    const vBehu = beh?.zdroje?.find((x) => x.klic === z.klic);
    const odvozeny: ZaznamZdroje = {
      posledniUspech: vBehu?.ok && (vBehu.vysledek ?? "ok") === "ok" ? beh?.kdy ?? null : null,
      posledniPokus: vBehu ? beh?.kdy ?? null : null,
      posledniVysledek: vBehu ? (vBehu.ok ? vBehu.vysledek ?? "ok" : "chyba") : "chyba",
      chyba: vBehu?.chyba ?? (vBehu ? null : "v posledním běhu chybí"),
      neuspechuZaSebou: vBehu?.ok ? 0 : 1,
    };
    return {
      klic: z.klic,
      nazev: z.nazev,
      odkaz: z.odkaz ?? z.url,
      blokovany: Boolean(z.ocekavaneBlokovani),
      ...(trvaly ?? odvozeny),
    };
  });

  const informace: InformaceVstup[] = [];

  /* Výstraha z data/vystraha.json — oficiální jen s vydavatelem a originálem. */
  const zVystrahy = (a: NonNullable<VystrahaSoubor["aktivni"]>, konec?: { kdy: string; zpusob?: string }): InformaceVstup => {
    const oficialni = Boolean(a.vydavatel && a.originalUrl);
    return {
      id: `vystraha:${a.klic}`,
      typ: oficialni ? (a.pokyn ? "oficialni-pokyn" : "oficialni-vystraha") : "potvrzena-udalost",
      titulek: a.nadpis,
      text: a.text,
      textJe: a.textJe ?? "shrnuti-cp",
      pokyn: a.pokyn ?? null,
      vydavatel: a.vydavatel ?? null,
      odkaz: a.originalUrl ?? a.zdroje?.[0]?.url ?? null,
      vydano: a.vydano ?? a.kdy,
      platiOd: a.platiOd ?? null,
      // Vypršení nebo sundání bez odvolání = konec platnosti; odvolání se nese zvlášť.
      platiDo: konec && konec.zpusob !== "odvolano" ? konec.kdy : a.platiDo,
      odvolano: konec?.zpusob === "odvolano" ? konec.kdy : null,
      opraveno: a.opraveno ?? null,
      uzemi: a.uzemi ?? (oficialni ? { druh: "nezname" } : { druh: "nezname", popis: "viz text" }),
      coNevime: a.coToNeznamena ?? [],
      jistota: null,
      puvod: oficialni ? null : "ověřeno redakcí CzechPatrol z více zdrojů",
      detail: null,
    };
  };
  if (v.vystraha?.aktivni?.overeno && v.vystraha.aktivni.overil) informace.push(zVystrahy(v.vystraha.aktivni));
  for (const a of v.vystraha?.archiv ?? []) {
    // Jen nedávno skončené — aby čtenář viděl, že skončila, ne že zmizela.
    if (ted - new Date(a.sundano).getTime() <= 2 * DEN) informace.push(zVystrahy(a, { kdy: a.sundano, zpusob: a.zpusob }));
  }

  /* Vyhlášené stavy a opatření (pravni-stav.json): platí = true zapisuje jen člověk s úředním zdrojem. */
  for (const p of v.pravni.filter((x) => x.plati === true)) {
    const zdroj = (p.zdroje ?? []).find((z) => z.primarni) ?? p.zdroje?.[0];
    informace.push({
      id: `pravni:${p.klic}`,
      typ: "oficialni-opatreni",
      titulek: p.nazev,
      text: p.vysvetleni ?? "",
      textJe: "shrnuti-cp",
      pokyn: null,
      vydavatel: zdroj?.nazev?.split(" — ")[0] ?? null,
      odkaz: zdroj?.url ?? null,
      vydano: null,
      platiOd: null,
      platiDo: null,
      odvolano: null,
      opraveno: null,
      uzemi: { druh: "cr" },
      coNevime: [],
      jistota: null,
      puvod: null,
      detail: "/#cr",
    });
  }

  /* Potvrzené události v Česku za 7 dní — bez pokynu obyvatelstvu; max. 3 vybere model. */
  for (const i of v.incidenty) {
    if (i.kodZeme !== "CZ" || (i.druh ?? "pripad") !== "pripad") continue;
    if (!(i.lidskyOvereno || i.overeni === "automaticke")) continue;
    const kdy = i.datumZjisteni ?? i.datumUdalosti;
    if (ted - new Date(kdy).getTime() > 7 * DEN) continue;
    informace.push({
      id: `zaznam:${i.slug}`,
      typ: "potvrzena-udalost",
      titulek: i.kratkyTitulek || i.titulek,
      text: i.fakta?.[0] ?? i.titulek,
      textJe: "shrnuti-cp",
      pokyn: null,
      vydavatel: null,
      odkaz: i.zdroje?.[0]?.url ?? null,
      vydano: kdy,
      platiOd: null,
      platiDo: null,
      odvolano: null,
      opraveno: null,
      uzemi: { druh: "nezname", popis: "Česko" },
      coNevime: (i.neznameho ?? []).slice(0, 1),
      jistota: i.overeni === "automaticke" ? "doloženo úředním zdrojem" : "ověřeno člověkem",
      puvod: null,
      detail: `/incident/${i.slug}/`,
    });
  }

  /* Analýza: celkové hodnocení Evropy. Nikdy výstraha, nikdy pokyn. */
  if (v.celkovy?.uroven) {
    informace.push({
      id: "analyza:evropa",
      typ: "analyza",
      titulek: `Situace v Evropě: ${UROVNE[v.celkovy.uroven].nazev.toLowerCase()}${v.celkovy.mimoradny ? ", o stupeň výš kvůli mimořádnému signálu, který jsme vyhodnotili sami" : ""}`,
      text: v.celkovy.shrnuti,
      textJe: "shrnuti-cp",
      pokyn: null,
      vydavatel: null,
      odkaz: null,
      vydano: v.celkovy.aktualizovano,
      platiOd: null,
      platiDo: null,
      odvolano: null,
      opraveno: null,
      uzemi: { druh: "zahranici", zeme: "Evropa" },
      coNevime: v.celkovy.mimoradny ? [v.celkovy.mimoradny.mez] : [],
      jistota: "měření z ověřených případů za 14 dní, ne předpověď",
      puvod: "výpočet CzechPatrol (metodika)",
      detail: "/metodika/",
    });
  }

  return {
    verze: 1,
    generovano: v.generovano,
    beh: {
      kdy: beh?.kdy ?? null,
      zdroju: beh?.zdroje?.length ?? 0,
      ok: beh?.zdroje?.filter((z) => z.ok).length ?? 0,
    },
    zdroje,
    sluzby: { aktualizovano: v.sluzby?.aktualizovano ?? null },
    palivo: { aktualizovano: v.palivo?.aktualizovano ?? null },
    informace,
    neovereno: {
      signalu24h: v.kandidati.filter((k) => k.stav === "ceka" && ted - new Date(k.publikovano ?? k.zachyceno).getTime() <= DEN).length,
      vyvracenych: v.nepotvrzene.filter((n) => n.stav === "vyvraceno").length,
      oznacenoUradem: v.nepotvrzene.filter((n) => n.oznacenoUradem).length,
    },
  };
}
