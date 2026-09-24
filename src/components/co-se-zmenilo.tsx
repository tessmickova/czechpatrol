"use client";

import { HlavickaWidgetu } from "./widgety";
import Link from "next/link";
import { druh, kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { lidskaZmena } from "@/lib/archiv-text";
import { datumPraha } from "@/lib/cas";
import { NAZVY_PALIV, radaCen, PRAH_SKOKU, type DruhPaliva } from "@/lib/palivo";
import { PASMA, UROVNE } from "@/lib/skala";
import { SLOVA_SMERU, smerCeny, smerZmeny, type SmerZmeny } from "@/lib/smer";
import type { Snimek } from "@/lib/typy";
import { PanelNahledu, useNahled, type Nahled } from "./nahled-radku";
import { Tlacitko } from "./ui";
import { Vlajka } from "./zeme";
import { Otaznik } from "./zaklad";

/*
  Co se změnilo — v Česku, na hranicích a u sousedů.

  Vedle mřížky úředních stavů dřív stál seznam nových událostí. Ten ale
  odpovídal na jinou otázku než mřížka: mřížka říká „co právě platí",
  seznam říkal „co se kde stalo". Události mají svůj sloupec v úvodu
  a svou stránku; tady patří to, co se týká přímo života v Česku —
  změny úředních stavů, cena paliva, opatření tady a u sousedů.

  Tři druhy řádků, každý s vlastním slovem, ne jen barvou:
    stav      — změna v mřížce vedle (z archivu snímků, jen skutečné změny),
    ceny      — týdenní měření ČSÚ: kolik stojí nafta a benzin a o kolik
                se to pohnulo (změřeno, ne výhled),
    opatření  — úřední opatření v Česku, u sousedů a v EU (záznamy druhu
                „opatření", ne případy ani prohlášení).

  Formát je stejný jako v Aktualitách: tečka, vlajka, datum, text na dvě
  řádky, náhled u kurzoru. Kdo umí číst jeden sloupec, umí číst oba.
*/

/** Česko, sousedé a EU: to, co se dotkne hranic nebo pravidel tady. */
const ZEME_OPATRENI = new Set(["CZ", "DE", "AT", "PL", "SK", "EU"]);

/** Nejvíc řádků; zbytek je ve Vývoji a v Událostech. */
const NEJVYS = 12;

type Druh = "stav" | "ceny" | "opatreni";

interface Radek {
  klic: string;
  kdy: string;
  druh: Druh;
  /** Zlepšení, zhoršení, nebo bez směru. Opatření je bez směru: je to krok státu, ne samo o sobě špatná zpráva. */
  smer: SmerZmeny;
  kodZeme: string | null;
  zeme: string | null;
  text: string;
  kam: string;
  tecka: string;
  nahled: Nahled;
  /** Kolik stejných položek po sobě se do řádku sloučilo (revize 24. 9. 2026). */
  pocet?: number;
}

/*
  Stejná změna několik dní po sobě je jeden řádek, ne tři.

  „Letiště Lublin a Rzeszów zastavena“ stálo v seznamu 16., 17. i 18. 9.
  jako tři samostatné řádky; čtenář viděl tři události, byla jedna
  opakovaná. Slučují se jen sousední položky se stejným textem, druhem
  a zemí; řádek nese nejnovější datum a počet.
*/
function sloucOpakovani(radky: Radek[]): Radek[] {
  const out: Radek[] = [];
  for (const r of radky) {
    const p = out[out.length - 1];
    if (p && p.druh === r.druh && p.kodZeme === r.kodZeme && p.text === r.text) {
      const n = (p.pocet ?? 1) + 1;
      out[out.length - 1] = {
        ...p,
        pocet: n,
        nahled: { ...p.nahled, radky: [`${n}× po sobě, ${datumPraha(r.kdy)} – ${datumPraha(p.kdy)}`, ...p.nahled.radky.slice(1)] },
      };
    } else out.push({ ...r });
  }
  return out;
}

const SLOVO: Record<Druh, string> = { stav: "stav", ceny: "ceny", opatreni: "opatření" };

const kc = (n: number) => n.toFixed(2).replace(".", ",");
const rozdil = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${kc(Math.abs(n))}`;

/*
  Změny úředních stavů z archivu snímků.

  Snímek nese i „zveřejněné události: 96 → 101" — to je počet záznamů,
  ne stav, a do tohohle sloupce nepatří (události jsou jinde). Nepatří
  sem ani „bez ověřeného zdroje → běžný provoz": to se změnilo naše
  pokrytí, ne svět. Zůstávají změny úrovní, právního stavu, NATO a
  provozu. Starší snímky mají zápis surový („provoz — hranice: …"),
  proto se každý prožene překladem pro čtenáře.
*/
function zeSnimku(snimky: Snimek[]): Radek[] {
  return snimky.flatMap((s) =>
    s.zmeny
      .filter((z) => !/^zveřejněné události/u.test(z) && !/^začátek archivu/u.test(z))
      .map((z) => lidskaZmena(z))
      .filter((z) => !z.includes("bez ověřeného zdroje") && !z.includes("neověřeno"))
      .map((z, i): Radek => ({
        klic: `stav-${s.kdy}-${i}`,
        kdy: s.kdy,
        druh: "stav",
        smer: smerZmeny(z),
        kodZeme: "CZ",
        zeme: "Česko",
        text: z,
        kam: "/vyvoj/",
        /* Zelená tečka pro zlepšení, červená pro zhoršení, šedá bez směru — barva jen jako tečka. */
        tecka: smerZmeny(z) === "zlepseni" ? "bg-klid" : smerZmeny(z) === "zhorseni" ? "bg-akcent" : "bg-tlum2",
        nahled: {
          titulek: z,
          radky: [datumPraha(s.kdy), `změna úředního stavu · ${SLOVA_SMERU[smerZmeny(z)]}`],
          poznamka: "Zapsáno při kontrole zdrojů. Celý archiv změn je na stránce Vývoj.",
        },
      })),
  );
}

/*
  Týdenní ceny paliva.

  Každý týden šetření ČSÚ je jeden řádek: cena a pohyb za týden u obou
  paliv. Jen týdny z posledních 90 dnů — starší už nejsou „co se změnilo".
  Kde týden nemá číslo, řádek se nevyrábí: chybějící měření není nula.
*/
function zCen(ted: number): Radek[] {
  const body = radaCen().rada.filter((t) => typeof t.nafta === "number" && typeof t.benzin95 === "number").sort((a, b) => a.konec.localeCompare(b.konec));
  const radky: Radek[] = [];
  for (let i = 1; i < body.length; i++) {
    const t = body[i];
    const kdy = `${t.konec}T12:00:00Z`;
    if (ted - new Date(kdy).getTime() > 90 * 86_400_000) continue;
    const p = body[i - 1];
    const cast = (d: DruhPaliva) => `${NAZVY_PALIV[d].toLowerCase()} ${kc(t[d] as number)} Kč (${rozdil((t[d] as number) - (p[d] as number))})`;
    const dNafta = (t.nafta as number) - (p.nafta as number);
    const dBenzin = (t.benzin95 as number) - (p.benzin95 as number);
    const skok = Math.abs(dNafta) >= PRAH_SKOKU || Math.abs(dBenzin) >= PRAH_SKOKU;
    /* Směr podle většího pohybu z obou paliv; pod prahem bez směru. */
    const smer = smerCeny(Math.abs(dNafta) >= Math.abs(dBenzin) ? dNafta : dBenzin, PRAH_SKOKU);
    radky.push({
      klic: `ceny-${t.tyden}`,
      kdy,
      druh: "ceny",
      smer,
      kodZeme: "CZ",
      zeme: "Česko",
      text: `Palivo za litr: ${cast("nafta")}, ${cast("benzin95")} za týden`,
      kam: "#palivo",
      tecka: smer === "zhorseni" ? "bg-pozor" : smer === "zlepseni" ? "bg-klid" : "bg-tlum2",
      nahled: {
        titulek: `Průměrné ceny pohonných hmot, týden ${t.tyden} (do ${datumPraha(kdy)})`,
        radky: ["Český statistický úřad", "týdenní šetření"],
        udaje: [
          { popisek: "Nafta", hodnota: `${kc(t.nafta as number)} Kč/l · ${rozdil(dNafta)} za týden` },
          { popisek: "Benzin 95", hodnota: `${kc(t.benzin95 as number)} Kč/l · ${rozdil(dBenzin)} za týden` },
        ],
        poznamka: skok ? `Pohyb nad půl koruny za týden (${SLOVA_SMERU[smer]}). Změřená cena, ne výhled.` : "Změřená cena, ne výhled.",
      },
    });
  }
  return radky;
}

/* Úřední opatření v Česku, u sousedů a v EU. Případy a prohlášení ne. */
function zOpatreni(zaznamy: Zaznam[]): Radek[] {
  return zaznamy
    .filter((z) => druh(z) === "opatreni" && ZEME_OPATRENI.has(z.kodZeme))
    .map((z): Radek => {
      const zeme = z.kodZeme === "CZ" ? "Česko" : z.zeme;
      const t = PASMA[UROVNE[z.zavaznost].pasmo];
      const titulek = z.kratkyTitulek || z.titulek;
      const bez = titulek.toLowerCase().startsWith(`${z.zeme.toLowerCase()}:`) ? titulek.slice(z.zeme.length + 1).trim() : titulek;
      return {
        klic: `opatreni-${z.id}`,
        kdy: kdyZjisteno(z),
        druh: "opatreni",
        smer: "neutral",
        kodZeme: z.kodZeme,
        zeme,
        text: bez.charAt(0).toUpperCase() + bez.slice(1),
        kam: `/incident/${z.slug}/`,
        tecka: t.tecka,
        nahled: {
          titulek: z.titulek,
          radky: [datumPraha(kdyZjisteno(z)), zeme],
          udaje: [
            ...(z.vykonal ? [{ popisek: "Provedl", hodnota: z.vykonal }] : []),
            { popisek: "Závažnost", hodnota: UROVNE[z.zavaznost].nazev },
            { popisek: "Zdroj", hodnota: z.zdroje[0] ? `${z.zdroje[0].nazev.split(" — ")[0]}${z.zdroje.length > 1 ? ` +${z.zdroje.length - 1}` : ""}` : "bez odkazu" },
          ],
          poznamka: "Úřední opatření. Klepnutím se otevře záznam i se zdroji.",
        },
      };
    });
}

/** Souhrn za 7 dní pro náhled rozklikávací oblasti na úvodní straně. */
export function souhrnZmen(zaznamy: Zaznam[], snimky: Snimek[], ted: number) {
  const vsechny = sloucOpakovani([...zeSnimku(snimky), ...zCen(ted), ...zOpatreni(zaznamy)].sort((a, b) => b.kdy.localeCompare(a.kdy)));
  const tyden = vsechny.filter((r) => ted - new Date(r.kdy).getTime() <= 7 * 86_400_000);
  return {
    zlepseni: tyden.filter((r) => r.smer === "zlepseni").length,
    zhorseni: tyden.filter((r) => r.smer === "zhorseni").length,
    opatreni: tyden.filter((r) => r.druh === "opatreni").length,
    paleta: tyden.slice(0, 16).map((r) => ({ nazev: r.text, tecka: r.tecka, slovo: SLOVO[r.druh] })),
  };
}

export function CoSeZmenilo({ zaznamy, snimky, ted, vnoreny = false, osa = false }: { zaznamy: Zaznam[]; snimky: Snimek[]; ted: number; vnoreny?: boolean; /** Svislá časová osa místo tabulky, šest položek (úvod v2). */ osa?: boolean }) {
  const { nahled, kde, ukaz, skryj, pohyb } = useNahled();

  const vsechny = sloucOpakovani([...zeSnimku(snimky), ...zCen(ted), ...zOpatreni(zaznamy)].sort((a, b) => b.kdy.localeCompare(a.kdy)));
  const radky = vsechny.slice(0, osa ? 6 : NEJVYS);
  /*
    Týden v hlavičce: zlepšení, zhoršení i opatření, každé zvlášť. Dřív
    tu stálo jen „N zhoršení“ a každé opatření se počítalo jako zhoršení —
    sloupec pak vypadal, že se všechno jen kazí. Zelená a červená jen jako
    tečky, slovo vždycky u nich.
  */
  const tyden = vsechny.filter((r) => ted - new Date(r.kdy).getTime() <= 7 * 86_400_000);
  const zlepseni7 = tyden.filter((r) => r.smer === "zlepseni").length;
  const zhorseni7 = tyden.filter((r) => r.smer === "zhorseni").length;
  const opatreni7 = tyden.filter((r) => r.druh === "opatreni").length;

  const posledniKontrola = snimky.length ? snimky[snimky.length - 1].kdy : null;
  const zmenStavu = zeSnimku(snimky).filter((r) => ted - new Date(r.kdy).getTime() <= 90 * 86_400_000).length;

  return (
    <section
      aria-label="Co se změnilo"
      className={`relative flex flex-col overflow-hidden ${vnoreny ? "" : "rounded-[22px] border border-linka2 bg-plocha"}`}
      onPointerLeave={skryj}
    >
      {!vnoreny && (
        <HlavickaWidgetu
          ikona="osa"
          nazev="Co se změnilo"
          napoveda={<span className="block">{posledniKontrola ? `Úřední stavy kontrolovány ${datumPraha(posledniKontrola)}.` : "Bez záznamu o kontrole."}{posledniKontrola && zmenStavu === 0 ? " Za 90 dní beze změny." : ""}</span>}
          meta={
            <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
              {zlepseni7 > 0 && <span className="flex items-center gap-1"><span aria-hidden className="h-[6px] w-[6px] rounded-full bg-klid" />{zlepseni7} zlepšení</span>}
              {zhorseni7 > 0 && <span className="flex items-center gap-1"><span aria-hidden className="h-[6px] w-[6px] rounded-full bg-akcent" />{zhorseni7} zhoršení</span>}
              {opatreni7 > 0 && <span>{opatreni7} opatření</span>}
              <span>{zlepseni7 + zhorseni7 + opatreni7 > 0 ? "za 7 dní" : "za 7 dní beze změny"}</span>
            </span>
          }
        />
      )}

      {radky.length > 0 ? (
        <ol className={osa ? "relative ml-[22px] mr-3 my-3 border-l border-linka2" : "divide-y divide-linka2"}>
          {radky.map((r) => (
            <li key={r.klic} className={osa ? "relative" : undefined} onPointerEnter={(e) => ukaz(r.nahled, e)} onPointerMove={pohyb}>
              <Link
                href={r.kam}
                className={osa ? "flex items-start gap-2.5 py-2 pl-4 pr-2 hover:bg-plocha2" : "flex items-start gap-2.5 px-4 py-2 hover:bg-plocha2"}
                onFocus={(e) => { const b = e.currentTarget.getBoundingClientRect(); ukaz(r.nahled, { clientX: b.right, clientY: b.top }); }}
              >
                <span aria-hidden className={osa ? `absolute -left-[5px] top-[15px] h-[9px] w-[9px] rounded-full ring-2 ring-plocha ${r.tecka}` : `mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full ${r.tecka}`} />
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  <span className="w-[18px] shrink-0 leading-[20px]" title={r.zeme ?? undefined} aria-label={r.zeme ?? undefined}>
                    {r.kodZeme ? <Vlajka kod={r.kodZeme} /> : null}
                  </span>
                  <span className="cislice w-[80px] shrink-0 whitespace-nowrap pt-[3px] text-mikro text-tlum2">{datumPraha(r.kdy)}</span>
                  <span className="line-clamp-2 text-male leading-[20px] text-inkoust">
                    <span className="stitek mr-1.5 text-tlum2">{SLOVO[r.druh]}</span>
                    {r.text}
                    {r.pocet && r.pocet > 1 ? <span className="cislice ml-1.5 text-mikro text-tlum2">{r.pocet}×</span> : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        /* Prázdný stav se píše, ne skrývá — prázdný rámeček vypadá jako chyba. */
        <p className="px-4 py-3 text-male leading-snug text-tlum2">Za posledních 90 dní se v úředních stavech, cenách paliva ani opatřeních nic nezměnilo.</p>
      )}

      <PanelNahledu nahled={nahled} kde={kde} />

      {/* Kdy se stavy kontrolovaly, říká puntík u nadpisu; patička nese jen cestu dál. */}
      <div className="mt-auto flex items-center justify-end border-t border-linka2 px-4 py-2">
        <Tlacitko kam="/vyvoj/" varianta="tichy" velikost="s" ikonaVpravo="nahoru" trida="[&>svg:last-child]:rotate-90">celý vývoj</Tlacitko>
      </div>
    </section>
  );
}
