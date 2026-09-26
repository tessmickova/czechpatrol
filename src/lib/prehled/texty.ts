import { kdyKratce, predKolika } from "../cas";
import type { Lokalita, VyhodnocenaInformace } from "./typy";

/*
  Texty Rychlého přehledu. Na jednom místě, aby šly číst celé najednou
  a aby test mohl hlídat zakázané formulace (testy/prehled-texty.test.ts).

  Zásady:
  - omezení stojí v NADPISU, ne v drobném písmu pod uklidňující větou;
  - z toho, že jsme nic nenašli, neplyne, že nic není — věty to říkají;
  - nikde neslibujeme, že na něco upozorníme; spolehlivost doručení
    zaručit neumíme;
  - pokyn k jednání jen z originálu vydavatele; vlastní rady nepřidáváme.
*/

/** Věty, které se na webu ani v upozorněních nesmí objevit (zadání 26. 9. 2026). */
export const ZAKAZANE_FORMULACE = [
  "jste v bezpečí",
  "nic vám nehrozí",
  "situace je pod kontrolou",
  "nemusíte nic dělat",
  "upozorníme vás",
  "dáme vám vědět",
  "aktualizováno před chvílí",
];

/** Oblast ve 4. pádě: „pro Jihomoravský kraj“, „pro hlavní město Prahu“. */
export function oblastProKoho(l: Lokalita): string {
  if (l.druh === "nenastaveno" || l.druh === "cr") return "celou ČR";
  if (l.kraj === "Hlavní město Praha") return "hlavní město Prahu";
  if (l.kraj === "Vysočina") return "kraj Vysočina";
  return `${l.kraj} kraj`;
}

/** Oblast v 1. pádě pro štítek. */
export function oblastNazev(l: Lokalita): string {
  if (l.druh === "nenastaveno") return "Oblast nezvolena";
  if (l.druh === "cr") return "Celá ČR";
  if (l.kraj === "Hlavní město Praha" || l.kraj === "Vysočina") return l.kraj === "Vysočina" ? "Kraj Vysočina" : l.kraj;
  return `${l.kraj} kraj`;
}

export const TEXT_LOKALITA_NENASTAVENA =
  "Oblast není zvolená, proto ukazujeme jen celostátní informace. Po zvolení kraje uvidíte i výstrahy, které k němu umíme přiřadit.";

export const TEXT_ODPOVEDNOST =
  "CzechPatrol není varovný systém ani úřad. Při ohrožení se řiďte pokyny HZS, obce a policie. V nouzi volejte 112.";

export const STITEK_ANALYZA = "Naše analýza — není to výstraha ani pokyn";
export const STITEK_UDALOST = "Potvrzená událost — bez pokynu obyvatelstvu";
export const STITEK_SHRNUTI = "Shrnutí CzechPatrol";
export const STITEK_ZNENI = "Znění vydavatele";

const kdy = (iso: string | null, ted: number) => (iso ? `${kdyKratce(iso, ted)} (${predKolika(iso, ted)})` : "zatím žádná");

export function textPlatnosti(i: Pick<VyhodnocenaInformace, "platiOd" | "platiDo" | "stav">, ted: number): string {
  if (i.stav === "nadchazejici" && i.platiOd) return `Začne platit ${kdyKratce(i.platiOd, ted)}${i.platiDo ? `, platí do ${kdyKratce(i.platiDo, ted)}` : ""}`;
  if (i.platiOd && i.platiDo) return `Platí od ${kdyKratce(i.platiOd, ted)} do ${kdyKratce(i.platiDo, ted)}`;
  if (i.platiDo) return `Platí do ${kdyKratce(i.platiDo, ted)}`;
  if (i.platiOd) return `Platí od ${kdyKratce(i.platiOd, ted)}, konec platnosti vydavatel neuvedl`;
  return "Dobu platnosti vydavatel neuvedl";
}

export function textUzemi(i: Pick<VyhodnocenaInformace, "uzemi">): string {
  const u = i.uzemi;
  if (u.druh === "cr") return "celá ČR";
  if (u.druh === "kraje") return u.kraje.map((k) => (k === "Hlavní město Praha" ? k : k === "Vysočina" ? "kraj Vysočina" : `${k} kraj`)).join(", ");
  if (u.druh === "cast") return u.popis;
  if (u.druh === "zahranici") return u.zeme;
  return u.popis ? `${u.popis} (přesný rozsah neznáme)` : "územní rozsah neznáme";
}

const vycet = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} a ${xs[xs.length - 1]}`);

export interface ParametryHlavniho {
  lokalita: Lokalita;
  ted: number;
  posledniKontrola: string | null;
  /** Zdroje, kvůli kterým je stav horší — názvy a jejich poslední úspěch. */
  problemove: { nazev: string; posledniUspech: string | null }[];
  vystrahy: VyhodnocenaInformace[];
}

export function textBezVystrahy(p: ParametryHlavniho) {
  return {
    nadpis: `V oficiálních zdrojích, které čteme, jsme pro ${oblastProKoho(p.lokalita)} nenašli platnou výstrahu.`,
    veta: `Poslední úspěšná kontrola: ${kdy(p.posledniKontrola, p.ted)}. Pokrytí je omezené — výstrahy ČHMÚ čteme, pokyny HZS, krajů a obcí zatím ne. Při přímém varování se řiďte pokyny HZS, obce a policie.`,
  };
}

export function textZpozdeni(p: ParametryHlavniho) {
  if (!p.problemove.length) {
    return {
      nadpis: "Kontrola zdrojů se zpožďuje — nedávnou změnu nemůžeme vyloučit.",
      veta: `Poslední úspěšná kontrola: ${kdy(p.posledniKontrola, p.ted)}. Tehdy jsme v čtených oficiálních zdrojích pro ${oblastProKoho(p.lokalita)} platnou výstrahu nenašli.`,
    };
  }
  const jeden = p.problemove.length === 1;
  return {
    nadpis: `${jeden ? "Zdroj" : "Zdroje"} ${vycet(p.problemove.map((z) => z.nazev))} ${jeden ? "je zpožděný" : "jsou zpožděné"} — nedávnou výstrahu z ${jeden ? "něj" : "nich"} nemůžeme vyloučit.`,
    veta: `${p.problemove.map((z) => `${z.nazev}: naposledy ${kdy(z.posledniUspech, p.ted)}`).join("; ")}. V ostatních zdrojích (kontrola ${kdy(p.posledniKontrola, p.ted)}) jsme pro ${oblastProKoho(p.lokalita)} platnou výstrahu nenašli.`,
  };
}

export function textVypadekZasadniho(p: ParametryHlavniho) {
  const jeden = p.problemove.length === 1;
  const nazvy = vycet(p.problemove.map((z) => z.nazev));
  return {
    nadpis: `${nazvy} teď ${jeden ? "nefunguje" : "nefungují"} — přehled je neúplný.`,
    veta: `Co ${jeden ? "tento zdroj" : "tyto zdroje"} od ${p.problemove.map((z) => (z.posledniUspech ? kdyKratce(z.posledniUspech, p.ted) : "začátku")).join(" / ")} ${jeden ? "vydal" : "vydaly"}, nevidíme; neznamená to, že nic ${jeden ? "nevydal" : "nevydaly"}. Ověřte to přímo u vydavatele. Ostatní zdroje: kontrola ${kdy(p.posledniKontrola, p.ted)}.`,
  };
}

export function textNelzePotvrdit(p: ParametryHlavniho) {
  return {
    nadpis: "Aktuálnost přehledu nelze potvrdit.",
    veta: `Poslední úspěšná kontrola zdrojů: ${kdy(p.posledniKontrola, p.ted)}. Co je níže, platilo tehdy. Oficiální informace hledejte přímo u HZS, ČHMÚ, obce a policie.`,
  };
}

export function textVypadekVseho(p: ParametryHlavniho) {
  return {
    nadpis: "Zdroje teď nedokážeme zkontrolovat.",
    veta: `Poslední pokus o kontrolu zásadních zdrojů selhal; poslední úspěšná proběhla ${kdy(p.posledniKontrola, p.ted)}. Údaje níže mohou být zastaralé. Oficiální informace hledejte přímo u HZS, ČHMÚ, obce a policie.`,
  };
}

export function textVystraha(p: ParametryHlavniho) {
  const v = p.vystrahy[0];
  return {
    nadpis: p.vystrahy.length === 1
      ? `Platí oficiální výstraha pro ${oblastProKoho(p.lokalita)}: ${v.titulek}`
      : `Pro ${oblastProKoho(p.lokalita)} platí ${p.vystrahy.length} oficiální výstrahy. Nejnovější: ${v.titulek}`,
    veta: `Vydal: ${v.vydavatel ?? "vydavatel neuveden"}. ${textPlatnosti(v, p.ted)}. Území: ${textUzemi(v)}. Řiďte se zněním u vydavatele.`,
  };
}

export function textPosledniZnama(p: ParametryHlavniho) {
  const v = p.vystrahy[0];
  return {
    nadpis: `Poslední známá výstraha pro ${oblastProKoho(p.lokalita)}: ${v.titulek}`,
    veta: `${textPlatnosti(v, p.ted)} (podle vydavatele). Jestli ji mezitím změnil nebo odvolal, teď neověříme — naše kontrola zdrojů se naposledy podařila ${kdy(p.posledniKontrola, p.ted)}. Aktuální znění hledejte u vydavatele: ${v.vydavatel ?? "neuveden"}.`,
  };
}

export function textVystrahaNejasna(p: ParametryHlavniho) {
  const v = p.vystrahy[0];
  const kde = p.lokalita.druh === "nenastaveno" ? "vašeho místa" : "zvolené oblasti";
  return {
    nadpis: `Platí oficiální výstraha, u níž nedokážeme spolehlivě určit, zda se týká ${kde}.`,
    veta: `${v.titulek}. Území podle vydavatele: ${textUzemi(v)}. ${textPlatnosti(v, p.ted)}. Rozsah ověřte v originále (${v.vydavatel ?? "vydavatel neuveden"}).`,
  };
}
