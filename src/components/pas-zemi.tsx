import Link from "next/link";
import { pripady, type Zaznam } from "@/lib/agregace";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Kampan, Uroven } from "@/lib/typy";
import { sklon, Vlajka } from "./zeme";
import { PasBeh } from "./pas-beh-klient";

/*
  Běžící pás zemí nahoře.

  Každá země: vlajka, počet incidentů za 90 dnů a jedna tečka podle nejvyšší
  závažnosti v tom období. Nic víc — podrobnosti jsou na stránce země.

  Pás sám pomalu jede a zároveň se dá chytit a odtáhnout — viz PasBeh.
  Při omezení pohybu v systému stojí a jen se roluje.

  Manipulační operace se počítají taky. Jinak by pás hlásil u Česka nulu
  ve chvíli, kdy o dva centimetry níž budík hlásí operaci proti občanům —
  a čtenář by nevěděl, čemu věřit.
*/

export function PasZemi({ vse, kampane = [], ted = Date.now() }: { vse: Zaznam[]; kampane?: Kampan[]; ted?: number }) {
  const dni90 = pripady(vse, { dni: 90, ted });
  const kampane90 = kampane.filter((k) => ted - new Date(k.odhaleno).getTime() <= 90 * 86_400_000);
  const kody = [...new Set([...dni90.map((i) => i.kodZeme), ...kampane90.flatMap((k) => k.kodyZemi), "CZ"])];
  const zeme = kody.map((kod) => {
    const p = dni90.filter((i) => i.kodZeme === kod);
    const kp = kampane90.filter((k) => k.kodyZemi.includes(kod));
    const urovne: Uroven[] = [...p.map((i) => i.zavaznost), ...kp.map((k) => k.zavaznost)];
    const nej = urovne.reduce<Uroven | null>((m, u) => (!m || UROVNE[u].poradi > UROVNE[m].poradi ? u : m), null);
    return {
      kod, nazev: kod === "CZ" ? "Česko" : p[0]?.zeme ?? vse.find((i) => i.kodZeme === kod)?.zeme ?? kod,
      pocet: p.length + kp.length, kampani: kp.length, nej,
    };
  }).sort((a, b) => (a.kod === "CZ" ? -1 : b.kod === "CZ" ? 1 : b.pocet - a.pocet));

  const polozky = (sufix: string) => zeme.map((z) => {
    const t = z.nej ? PASMA[UROVNE[z.nej].pasmo] : null;
    return (
      <Link
        key={`${z.kod}${sufix}`}
        href={`/zeme/${z.kod.toLowerCase()}/`}
        title={`${z.nazev}: ${z.pocet} ${sklon(z.pocet, "incident", "incidenty", "incidentů")} za 90 dnů${z.kampani ? ` (z toho ${z.kampani} ${sklon(z.kampani, "operace proti občanům", "operace proti občanům", "operací proti občanům")})` : ""}${z.nej ? `, nejvyšší závažnost ${UROVNE[z.nej].nazev}` : ""}`}
        className="mx-1 inline-flex h-[34px] shrink-0 items-center gap-2 rounded-[12px] border border-linka2 bg-plocha px-2.5 text-drobne hover:bg-plocha2"
      >
        <Vlajka kod={z.kod} />
        <span className="font-semibold text-inkoust">{z.nazev}</span>
        <span className="cislice text-zaklad font-bold text-inkoust">{z.pocet}</span>
        {/*
          Jedna tečka na dlaždici, a to je všechno.

          Dřív nesla každá dlaždice šest barevných signálů naráz: barevný
          rámeček, tónované pozadí, barevný počet, až tři červené vykřičníky
          a tři tečky posledních záznamů. Dvacet takových dlaždic v jedné
          řadě nahoře na stránce byla duha, ve které se nedalo poznat, která
          země je na tom zle — a právě to měl pás říkat.

          Zůstává nejvyšší závažnost za devadesát dní jako tečka. Počty,
          druhy a jednotlivé záznamy jsou na stránce země, kam dlaždice vede;
          plné znění je v title.
        */}
        <span
          aria-hidden
          className={`h-[7px] w-[7px] shrink-0 rounded-full ${t ? t.tecka : "border border-linka"}`}
        />
      </Link>
    );
  });

  const celkem = zeme.reduce((n, z) => n + z.pocet, 0);

  return (
    /*
      Odsazení stejné jako u zbytku stránky (px-4 sm:px-6). Bez něj lišta
      začínala u kraje okna, zatímco všechno pod ní o kus dál — vypadala
      širší než web.
    */
    <div className="pas-obal border-b border-linka bg-papir" aria-label="Země za posledních 90 dnů">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        {/*
          Popisek nad řadou, ne vedle ní.

          Dřív tu stálo jen „90 dnů" a vedle toho čísla. Z toho se nedalo
          poznat, co ta čísla jsou — a na úzkém displeji se popisek skrýval
          úplně, takže tam běžela řada čísel bez jakéhokoli vysvětlení.
          Věta nad řadou se vejde vždycky a přečte se jako první.
        */}
        <p className="stitek pt-2 text-tlum2">
          Incidenty a operace proti občanům za posledních 90 dní
          {celkem > 0 && <span className="text-tlum"> · celkem {celkem}</span>}
        </p>
        <div className="flex items-center pb-1.5">
          <PasBeh>
            {polozky("")}
            {/* druhá kopie jen kvůli plynulému běhu; čtečce se neoznamuje */}
            <span aria-hidden className="contents">{polozky("-2")}</span>
          </PasBeh>
        </div>
      </div>
    </div>
  );
}
