/*
  Text psaný česky? Stejné pravidlo jako nastroje/rozhlas.mjs (držet obě kopie shodné).

  3. 11. 2026: ve sloupci Signály z médií stály maďarské a slovenské titulky.
  Maďarština prošla přes á/é a člen „a“, slovenština přes ť/ň/ď, které má
  taky. Cizí znaky proto rozhodnou dřív než společná diakritika: slovenština
  (ľ ô ŕ ĺ), polština, němčina, maďarština (ő ű), francouzština a italština
  (à è ê ç). Mezi předložkami není „a“ — je to maďarský člen.
*/
export function jeCesky(text: string | null | undefined): boolean {
  const t = String(text ?? "");
  if (/[ľôŕĺłąęśźżäöüßőűàèêçùâî]/i.test(t)) return false;
  if (/[ěřůňťď]/i.test(t)) return true;
  /* Hranice slova přes \p{L}, ne \b: to je jen ASCII a v „Átvizsgálták“ by našlo „k“ za á. */
  return /[áéíýúž]/i.test(t) && /(^|[^\p{L}])(v|ve|na|se|je|z|ze|o|k|do|po|za|pro|při|u)(?=[^\p{L}]|$)/iu.test(t);
}
