/*
  Co se stane s návrhem po schválení.

  Ve Správě se kliká na Schválit, ale nebylo vidět, co tím odejde odběratelům.
  Rozhodnutí „pustit to ven" se tak dělalo naslepo — a u zprávy, která jde
  tisícům lidí do telefonu, je to málo.

  Pravidlo je tu opsané z nastroje/rozhlas.mjs, protože rozhlas běží v Node
  nad celým repozitářem a v prohlížeči se spustit nedá. Aby se obě strany
  nerozešly, hlídá je testy/kam-odejde.test.ts.
*/

/** Po kolika dnech od události se do kanálu už nic neposílá. */
export const NEJSTARSI_DNI = 14;

export type Kam = "hned" | "kratce" | "souhrn" | "ticho";

export interface Vysledek {
  kam: Kam;
  /** Věta pro člověka, který se chystá kliknout. */
  vysvetleni: string;
}

interface Navrh {
  zavaznost?: string | null;
  druh?: string | null;
  puvodce?: string | null;
  datumUdalosti?: string | null;
  archivniZaznam?: boolean | null;
  titulek?: string | null;
  kratkyTitulek?: string | null;
  kodZeme?: string | null;
  kategorie?: string[] | null;
}

/** Vážné případy jsou O a R; G a Y do okamžitého rozeslání nepatří. */
const vazne = (z: string) => /^[OR]/.test(z);
/** Článek 4 nebo 5 NATO v titulku — stejný vzor jako CLANEK_4_5 v rozhlasu. */
const CLANEK_4_5 = /(^|[^\p{L}])(čl\.|článe?k\p{L}*|article)\s*[45](?!\d)/iu;

export function kamOdejde(n: Navrh, ted: number = Date.now()): Vysledek {
  const druh = n.druh ?? (n.puvodce ? "pripad" : "reakce");
  const zavaznost = n.zavaznost ?? "";

  if (n.archivniZaznam) {
    return { kam: "ticho", vysvetleni: "Archivní záznam — do kanálu nejde, jen na web." };
  }

  const kdy = n.datumUdalosti ? new Date(n.datumUdalosti).getTime() : Number.NaN;
  if (Number.isFinite(kdy) && kdy < ted - NEJSTARSI_DNI * 86_400_000) {
    return {
      kam: "ticho",
      vysvetleni: `Událost je starší než ${NEJSTARSI_DNI} dní — do kanálu nejde, aby archiv nevypadal jako novinka.`,
    };
  }

  const proCesko = n.kodZeme === "CZ" || (n.kategorie ?? []).includes("cr");
  if (CLANEK_4_5.test(`${n.titulek ?? ""} ${n.kratkyTitulek ?? ""}`)) {
    return { kam: "hned", vysvetleni: "Článek 4 nebo 5 NATO — po schválení odejde do veřejného kanálu hned." };
  }
  if (druh === "pripad" && vazne(zavaznost)) {
    return { kam: "hned", vysvetleni: `Vážný případ (${zavaznost}) — po schválení odejde do veřejného kanálu hned.` };
  }
  if (druh === "opatreni" && proCesko) {
    return { kam: "hned", vysvetleni: "Opatření platné v Česku — po schválení odejde do veřejného kanálu hned." };
  }
  if (druh === "pripad" && /^Y/.test(zavaznost)) {
    return {
      kam: "kratce",
      vysvetleni: "Malý signál — odejde jako dvouřádková zpráva (nejvýš jedna za 4 hodiny), jinak v přehledu v 7:30 nebo 19:30.",
    };
  }

  return {
    kam: "souhrn",
    vysvetleni: "Do kanálu nejde hned, přidá se do přehledu v 7:30 nebo 19:30.",
  };
}
