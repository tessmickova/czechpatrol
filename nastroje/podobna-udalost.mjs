/*
  Stejná událost podruhé (31. 10. 2026).

  Požár stanice Starlinku ve Wole Krobowské se 24. 9. 2026 zveřejnil
  automaticky dvakrát — ráno ze tří redakcí, odpoledne ze tří jiných.
  Zveřejnění hlídalo jen shodu id, a každý návrh měl jiné. Na webu tak
  stály dva záznamy o jedné události („jedna událost = jeden signál“).

  Tahle funkce najde už zveřejněný případ, který je nejspíš tatáž událost:
  stejná země, datum události nejvýš dva dny od sebe, a buď společný
  odkaz na zdroj, nebo výrazná shoda slov v titulku. Automat takový návrh
  nezveřejní; nechá ho ve frontě se značkou pro člověka.
*/

const DEN = 86_400_000;

/** Kmeny slov z titulku: bez diakritiky, slova od pěti písmen, prvních pět znaků. */
export function kmenyTitulku(text) {
  return new Set(
    String(text ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((s) => s.length >= 5)
      .map((s) => s.slice(0, 5)),
  );
}

const odkaz = (u) => String(u ?? "").replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();

/*
  Počítají se jen vzácná slova. Drony v Moldavsku a Rumunsku mají titulky
  plné stejných slov („dron“, „dopadl“, „hraniční policie“) a lišit je
  jde jen podle jmen míst a věcí. Kmen, který je ve víc než 3 % titulků
  případů (aspoň ve čtyřech), se nepočítá.
*/
function vzacne(zverejnene) {
  const pripady = zverejnene.filter((i) => (i.druh ?? "pripad") === "pripad");
  const df = new Map();
  for (const i of pripady) for (const k of kmenyTitulku(i.titulek)) df.set(k, (df.get(k) ?? 0) + 1);
  const mez = Math.max(3, Math.floor(pripady.length * 0.03));
  return (k) => (df.get(k) ?? 0) <= mez;
}

export function podobnaUdalost(navrh, zverejnene) {
  if ((navrh.druh ?? "pripad") !== "pripad") return null;
  const kdy = new Date(navrh.datumUdalosti ?? navrh.datumZjisteni ?? "").getTime();
  if (Number.isNaN(kdy)) return null;
  const odkazy = new Set((navrh.zdroje ?? []).map((z) => odkaz(z.url)).filter((u) => u && !u.includes("news.google.com")));
  const jeVzacne = vzacne(zverejnene);
  const kmeny = new Set([...kmenyTitulku(navrh.titulek)].filter(jeVzacne));
  for (const i of zverejnene) {
    if ((i.druh ?? "pripad") !== "pripad" || i.id === navrh.id || i.kodZeme !== navrh.kodZeme) continue;
    const jejich = new Date(i.datumUdalosti ?? i.datumZjisteni ?? "").getTime();
    if (Number.isNaN(jejich) || Math.abs(jejich - kdy) > 2 * DEN) continue;
    /* Společný článek sám nestačí: jeden text bývá o dvou událostech téhož dne (Turnow a Bergheim 1. 9.). */
    const druhe = kmenyTitulku(i.titulek);
    const spolecne = [...kmeny].filter((k) => druhe.has(k)).length;
    const spolecnyZdroj = (i.zdroje ?? []).some((z) => odkazy.has(odkaz(z.url)));
    if (spolecne >= 3 || (spolecnyZdroj && spolecne >= 1)) return i;
  }
  return null;
}
