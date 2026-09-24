/** Text psaný česky? Hlídá se česká diakritika a vylučují se polské a německé znaky. Stejné jako nastroje/rozhlas.mjs. */
export function jeCesky(text: string | null | undefined): boolean {
  const t = String(text ?? "");
  if (/[ěřůňťď]/i.test(t)) return true;
  if (/[łąęśźż]/i.test(t) || /[äöüß]/i.test(t)) return false;
  return /[áéíýúž]/i.test(t) && /\b(a|v|ve|na|se|je|z|ze|o|k|do|po|za|pro|při|u)\b/i.test(t);
}
