import { casPraha, cerstvost, datumCasPraha, stariSlovy, type Cerstvost } from "@/lib/cas";
import { Ikona, type NazevIkony } from "./ikony";

const VZHLED: Record<Cerstvost, { slovo: string; tridy: string; ikona: NazevIkony }> = {
  cerstve: { slovo: "ověřeno", tridy: "text-klid-text", ikona: "fajfka" },
  starsi: { slovo: "starší ověření", tridy: "text-pozor-text", ikona: "hodiny" },
  zastarale: { slovo: "zastaralé", tridy: "text-stari-text2", ikona: "vystraha" },
  nezname: { slovo: "neověřeno", tridy: "text-tlum2", ikona: "info" },
  // Čas z budoucnosti je chyba dat nebo hodin. Zelená by z ní udělala ověření.
  budoucnost: { slovo: "čas z budoucnosti", tridy: "text-stari-text2", ikona: "vystraha" },
};

/** Stáří podkladu u jednotlivého stavu. Neověřené nikdy nevypadá jako čerstvé. */
export function StariPodkladu({ overeno, ted }: { overeno: string | null | undefined; ted?: number }) {
  const c = cerstvost(overeno, ted);
  const v = VZHLED[c];
  return (
    <span className={`inline-flex items-center gap-1 text-[12.5px] ${v.tridy}`} title={overeno ? datumCasPraha(overeno) : undefined}>
      <Ikona nazev={v.ikona} velikost={12} tah={2} />
      {v.slovo}{overeno ? ` ${stariSlovy(overeno, ted)}` : ""}
    </span>
  );
}

/**
 * Pruh nad obsahem, když podklady nejsou aktuální.
 *
 * Rozlišuje dvě různé věci, které dřív splývaly: `overeno` je věcné ověření
 * stavu, `zkontrolovano` je poslední pohled do zdrojů. Web dnes věcné ověření
 * u úředních stavů nemá (žádný náš zdroj není úplný seznam), takže tenhle pruh
 * musí říct pravdu: kontrola běží, ale zápor z ní neplyne.
 */
export function BannerStari({ overeno, zkontrolovano }: { overeno: string | null; zkontrolovano?: string | null }) {
  const cOvereno = cerstvost(overeno, undefined, "provoz");
  const cKontrola = cerstvost(zkontrolovano, undefined, "provoz");
  if (cOvereno === "cerstve") return null;

  /*
    Pruh nahoře má jednu práci: říct, jestli kontrola běží. Tři řádky
    vysvětlování, proč z nenálezu neplyne nepřítomnost opatření, tu nikoho
    neuklidnily ani nepoučily — patří k jednotlivým stavům, kde se to dá
    rozkliknout, a na stránku Zdroje. Tady stačí pár slov.
  */
  const zprava =
    cKontrola === "budoucnost" || cOvereno === "budoucnost"
      ? "Chybný čas u části podkladů."
      : cKontrola === "cerstve" || cKontrola === "starsi"
        ? `Zkontrolováno ${casPraha(zkontrolovano!)} · bez nálezu`
        : zkontrolovano
          ? `Aktuálnost neověřena · naposledy ${datumCasPraha(zkontrolovano)}`
          : "Aktuálnost zatím neověřena.";

  // Běžný stav kontroly není poplach — barví se jen to, co je opravdu v nepořádku.
  const poplach = cKontrola === "zastarale" || cKontrola === "nezname" || cKontrola === "budoucnost";

  return (
    <div
      role="status"
      className={poplach ? "border-b border-stari/40 bg-stari/10" : "border-b border-linka2 bg-plocha"}
    >
      <div
        className={`mx-auto flex max-w-[1200px] items-start gap-2.5 px-4 py-2.5 text-[14px] sm:px-6 ${
          poplach ? "text-stari-text" : "text-tlum"
        }`}
      >
        <Ikona nazev={poplach ? "vystraha" : "info"} velikost={16} tah={2} trida="mt-[2px] shrink-0" />
        <span>{zprava}</span>
      </div>
    </div>
  );
}
