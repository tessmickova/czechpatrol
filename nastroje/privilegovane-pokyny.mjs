/*
  Privilegované pokyny — deterministická kontrola, žádný jazykový model.

  Nejhorší selhání CzechPatrolu není výpadek, ale falešný pokyn podaný jako
  úřední: „Evakuujte se“, „Nepijte vodu“, „Nebezpečí pominulo“. Takovou větu
  smí web nebo kanál nést jen tehdy, když ji doložitelně vydal úřad
  a schválil ji člověk. Text napsaný modelem nebo převzatý automaticky
  (i z úředního webu, který mohl být napaden) se s ní ven nedostane.

  Tady je jen rozpoznání. Co s nálezem udělat, rozhoduje volající:
  automatická cesta se zastaví a věc čeká na člověka.

  Vzory se schválně drží širší (i „opusťte“ bez „obec“) — falešně pozitivní
  nález jen zdrží automat, falešně negativní by pustil pokyn ven.
*/

const bezDiakritiky = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Kategorie privilegovaných pokynů a jejich vzory (nad textem bez diakritiky). */
export const PRIVILEGOVANE = {
  EVACUATE: [/\bevakuuj/, /\bevakuac\w* (obyvatel|oblast|obce|mesta|budov)/, /\bevacuat(e|ion order)/, /\bmust evacuate\b/],
  LEAVE_AREA: [/\bopustte\b/, /\bodejdete\b/, /\bleave the (area|city|town)\b/],
  SHELTER_IN_PLACE: [/\bukryjte se\b/, /\bvyhledejte (ukryt|kryt)/, /\bjdete do (krytu|ukrytu)/, /\bshelter in place\b/, /\btake shelter\b/],
  STAY_INDOORS: [/\bnevychazejte\b/, /\bzustante (doma|uvnitr|v budov)/, /\bstay (indoors|inside|at home)\b/],
  CLOSE_WINDOWS: [/\bzavrete okna\b/, /\buzavrete okna\b/, /\bclose (your )?windows\b/],
  DO_NOT_DRINK_WATER: [/\bnepijte\b/, /\bvoda (neni|je ne)pitna\b/, /\bvodu (nepijte|neni mozne pit)/, /\bdo not drink\b/, /\bboil (your )?water\b/, /\bprevarujte vodu\b/],
  AVOID_AREA: [/\bvyhnete se\b/, /\bnevstupujte\b/, /\bnepribl(i|y)zujte se\b/, /\bavoid the area\b/, /\bdo not enter\b/],
  PUBLIC_HEALTH_INSTRUCTION: [/\bnoste respirator/, /\bnasadte si\b/, /\buzijte jod/, /\bjodid draseln/, /\btake iodine\b/],
  ALL_CLEAR: [/\bnebezpeci (pominulo|skoncilo|zazehnano)\b/, /\bmuzete se vratit\b/, /\bodvolani (poplachu|evakuace)\b/, /\ball clear\b/, /\bdanger (has )?passed\b/],
};

/**
 * Najde privilegované pokyny v textu. Vrací kategorie, prázdné pole = nic.
 * @param {...(string|null|undefined|Array<string>)} texty
 */
export function privilegovanePokyny(...texty) {
  const t = bezDiakritiky(texty.flat().filter(Boolean).join(" \n "));
  return Object.entries(PRIVILEGOVANE)
    .filter(([, vzory]) => vzory.some((v) => v.test(t)))
    .map(([k]) => k);
}

/** Texty záznamu nebo návrhu, které jdou ven (web, kanál). */
export const textyZaznamu = (z) => [z?.titulek, z?.kratkyTitulek, ...(z?.fakta ?? []), ...(z?.neznameho ?? []), z?.vyznam];
