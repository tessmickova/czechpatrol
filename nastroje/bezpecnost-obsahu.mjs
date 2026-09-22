/**
 * Bezpečnost obsahu: co se do veřejných dat nesmí dostat.
 *
 * CzechPatrol je pro civilní připravenost. Nesmí se stát nástrojem, který
 * dá protivníkovi lepší operační obraz než má sám. Pravidla jsou v
 * docs/BEZPECNOST-OBSAHU.md; tohle je jejich strojová část — levná síta,
 * která zachytí to nejhorší dřív, než to projde na web:
 *
 *   - souřadnice GPS v textu (stačí kraj nebo okres, ne bod),
 *   - popis pohybu či rozmístění jednotek a zasahujících složek,
 *   - počty zasahujících osob, interní kontakty, přístupové údaje.
 *
 * Síto neumí posoudit kontext — proto dává varování, ne chybu, s výjimkou
 * souřadnic a přístupových údajů, které v našich datech nemají co dělat.
 */

/** Dvojice souřadnic v desetinném tvaru (50.0755, 14.4378) nebo se stupni. */
const SOURADNICE = /\b-?\d{1,2}\.\d{3,}\s*[,;]\s*-?\d{1,3}\.\d{3,}\b|\b\d{1,2}°\s?\d{1,2}['′]\s?\d{1,2}(?:\.\d+)?["″]?\s?[NSEW]\b/u;

/** Přístupové údaje a interní kanály. */
const PRISTUPY = /\b(heslo|password|passwd|api[_ -]?key|token|přístupov[áé] údaje|přihlašovac[íi] údaje)\s*[:=]/iu;

/*
  Pohyb a rozmístění jednotek. Slova, která v záznamu o civilní situaci
  skoro nikdy nejsou potřeba — a když jsou, má to posoudit člověk.
  Úřední oznámení typu „armáda posiluje přechody" projde: neříká kolik,
  kde přesně, ani kdy se přesouvají.
*/
const POHYB_JEDNOTEK = [
  /\bpřesun(?:y|u|ů)?\s+(?:jednot|vojsk|techniky|kolon)/iu,
  /\brozmístěn[íi]\s+(?:jednot|policist|vojáků|hlídek)/iu,
  /\bkolona\s+(?:vojensk|policejn)/iu,
  /\b(?:trasa|trase|trasu)\s+(?:přesunu|konvoje|kolony)/iu,
  /\bstanoviště\s+(?:hlídek|jednotek|odstřelovač)/iu,
  /\b(?:počet|počty)\s+(?:zasahujících|nasazených)\s+(?:policist|hasič|vojáků)/iu,
  /\b\d{2,}\s+(?:policistů|vojáků|hasičů)\s+(?:nasazen|zasahuj|hlídkuj)/iu,
];

/** Neveřejné kapacity a slabá místa infrastruktury. */
const INFRASTRUKTURA = [
  /\bslab[éá]\s+míst[oa]\s+(?:sítě|infrastruktury|elektrárny|rozvodny)/iu,
  /\b(?:zásob[ya]|kapacit[ay])\s+(?:paliva|nafty|munice|krve)\s+(?:v|ve|na)\s+skladu/iu,
  /\bneveřejn[ýáé]\s+(?:sklad|evakuační|kontakt)/iu,
];

export function prohledej(text) {
  const t = String(text ?? "");
  const nalezy = [];
  if (SOURADNICE.test(t)) nalezy.push({ druh: "souradnice", zavaznost: "chyba", proc: "souřadnice GPS — stačí kraj nebo okres" });
  if (PRISTUPY.test(t)) nalezy.push({ druh: "pristup", zavaznost: "chyba", proc: "přístupové údaje nebo interní kanál" });
  for (const r of POHYB_JEDNOTEK) if (r.test(t)) { nalezy.push({ druh: "pohyb-jednotek", zavaznost: "varovani", proc: "pohyb, rozmístění nebo počty zasahujících — posoudit, jestli to civilista potřebuje" }); break; }
  for (const r of INFRASTRUKTURA) if (r.test(t)) { nalezy.push({ druh: "infrastruktura", zavaznost: "varovani", proc: "kapacity nebo slabá místa infrastruktury" }); break; }
  return nalezy;
}

/** Všechny textové části záznamu nebo návrhu, které jdou na web. */
export function textyZaznamu(z) {
  const casti = [z.titulek, z.kratkyTitulek, ...(z.fakta ?? []), ...(z.neznameho ?? []), z.vyznam, ...(z.historie ?? []).map((h) => h?.text)];
  const d = z.praktickyDopad;
  if (d) casti.push(...(d.coJePotvrzeno ?? []), d.kde, ...(d.coMuzeBytOvlivneno ?? []), ...(d.coFunguje ?? []), ...(d.coNefunguje ?? []), ...(d.coUdelat ?? []), ...(d.coNedelat ?? []), ...(d.coDoporucujeUrad ?? []).map((x) => x?.text));
  if (z.dopadNaCr) casti.push(z.dopadNaCr.procRelevantni, z.dopadNaCr.dopad, z.dopadNaCr.sledujeme);
  return casti.filter((x) => typeof x === "string" && x);
}

export function zkontrolujZaznam(z) {
  const out = [];
  for (const t of textyZaznamu(z)) for (const n of prohledej(t)) out.push({ ...n, ukazka: t.slice(0, 80) });
  return out;
}
