import { IkonaKruh } from "./widgety";
import type { NazevIkony } from "./ikony";
import type { ReactNode } from "react";
import { Znacka } from "./znacka";
import { Otaznik } from "./zaklad";

/*
  Nadpisy webu. Tři velikosti a jedno pravidlo: čtenář má z velikosti poznat,
  co je stránka, co sekce a co odstavec.

  Nad nadpisem stojí značka a štítek v barvě značky — ne šedý popisek. Značka
  se tím opakuje po celém webu, takže se stránka pozná i podle výřezu.
*/

/** Hlavička stránky. Používá se jednou nahoře, nese h1. */
export function HlavickaStranky({
  stitek,
  nadpis,
  uvod,
  akce,
  id,
}: {
  stitek: string;
  nadpis: ReactNode;
  uvod?: ReactNode;
  akce?: ReactNode;
  id?: string;
}) {
  return (
    <header id={id} className="nalet scroll-mt-[84px] pb-2">
      <div className="flex items-center gap-2.5">
        <Znacka velikost={30} tmave />
        <span className="stitek-znacky">{stitek}</span>
      </div>
      <h1 className="titul-strany mt-5">{nadpis}</h1>
      {uvod && <p className="uvodni-veta mt-5">{uvod}</p>}
      {akce && <div className="mt-7 flex flex-wrap items-center gap-3">{akce}</div>}
    </header>
  );
}

/**
 * Nadpis sekce uvnitř stránky. Kotva `id` je pro odkazy z obsahu i z kanálů,
 * proto má odsazení od horní lišty.
 */
export function NadpisSekce({
  id,
  stitek,
  nadpis,
  popis,
  akce,
  znacka = true,
  ikona,
}: {
  id?: string;
  stitek?: string;
  /** Ikona v kroužku místo značky: sekce dostane vlastní znak (revize 24. 9. 2026). */
  ikona?: NazevIkony;
  nadpis: ReactNode;
  popis?: ReactNode;
  akce?: ReactNode;
  znacka?: boolean;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 scroll-mt-[84px] sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-8" id={id}>
      <div className="max-w-[46rem]">
        {stitek && (
          <div className="mb-3.5 flex items-center gap-2">
            {ikona ? <IkonaKruh ikona={ikona} /> : znacka && <Znacka velikost={28} tmave />}
            <span className="stitek-znacky">{stitek}</span>
          </div>
        )}
        {/*
          Vysvětlivka je v puntíku vedle nadpisu, ne odstavcem pod ním.
          Kdo nadpis zná, jde rovnou na obsah; kdo potřebuje vědět, za jaké
          období a z jaké množiny to je, si to rozklikne.
        */}
        {/*
          Puntík drží u posledního slova pevná mezera. Ve flexboxu se totiž
          choval jako samostatná položka a u delšího nadpisu spadl na vlastní
          řádek, kde vypadal jako zapomenutá tečka.
        */}
        <h2 className="titul-sekce">
          {nadpis}
          {popis && (
            <>
              {"\u00A0"}
              <Otaznik popis={popis} label="Co tahle sekce ukazuje" />
            </>
          )}
        </h2>
      </div>
      {akce && <div className="shrink-0">{akce}</div>}
    </div>
  );
}

/** Menší nadpis uvnitř sekce — tam, kde by velký titul přebíjel obsah. */
export function NadpisBloku({
  id,
  nadpis,
  popis,
  akce,
}: {
  id?: string;
  nadpis: ReactNode;
  popis?: ReactNode;
  akce?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 scroll-mt-[84px] sm:flex-row sm:items-end sm:justify-between sm:gap-6" id={id}>
      <div className="max-w-[44rem]">
        <h3 className="titul-mensi">
          {nadpis}
          {popis && (
            <>
              {"\u00A0"}
              <Otaznik popis={popis} label="Co tenhle blok ukazuje" />
            </>
          )}
        </h3>
      </div>
      {akce && <div className="shrink-0">{akce}</div>}
    </div>
  );
}

/** Prázdné místo mezi sekcemi. Jedna hodnota pro celý web, ne odhad v každé stránce. */
export function Oddech({ deleni = false }: { deleni?: boolean }) {
  return <div aria-hidden className={`h-14 sm:h-20 ${deleni ? "border-b border-linka2" : ""}`} />;
}
