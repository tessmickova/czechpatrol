import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NadpisSekce, HlavickaStranky } from "@/components/nadpisy";
import { Odznak, Sdeleni, Tlacitko } from "@/components/ui";
import type { Ton } from "@/components/ui";
import { WEB } from "@/config/web";
import { KATEGORIE } from "@/lib/kategorie";
import { incidenty, urovenObcanu, celkovyStav, zapocitatelne } from "@/lib/data";
import { JAZYKY, jazyk as najdiJazyk, nazevZeme } from "@/lib/jazyky";
import { cislem, prumerNaOkno } from "@/lib/porovnani";
import { nactiPreklad, type Preklad } from "@/lib/preklady";
import { UROVNE, zDeseti } from "@/lib/skala";
import type { Uroven } from "@/lib/typy";

/*
  Cizojazyčný přehled.

  Proč jen přehled a ne celý web: překládají se popisky a číselníky, ne fakta
  u jednotlivých událostí. Cizojazyčná stránka tak nemůže tvrdit něco jiného
  než česká a nemůže zastarat — když přibude událost, umí ji zobrazit hned,
  protože ji skládá z týchž číselníků. Podrobnosti a zdroje jsou u českého
  detailu, na který se odsud odkazuje.

  Právní stránky (podmínky, soukromí) se nepřekládají vůbec. Druhé znění
  právního textu, které si může s tím českým odporovat, je horší než žádné.
*/

export const dynamicParams = false;

/** Kolik událostí se v přehledu vypisuje. Víc patří na český seznam. */
const KOLIK_UDALOSTI = 12;
const OKNO_DNI = 90;

export async function generateStaticParams() {
  return JAZYKY.map((j) => ({ jazyk: j.kod }));
}

export async function generateMetadata({ params }: { params: Promise<{ jazyk: string }> }): Promise<Metadata> {
  const { jazyk } = await params;
  if (!najdiJazyk(jazyk)) return { title: "Not found", robots: { index: false, follow: false } };
  const p = nactiPreklad(jazyk);

  return {
    // absolute: název webu je už v přeloženém titulku, šablona by ho zopakovala.
    title: { absolute: p.rozhrani["meta.titulek"] },
    description: p.rozhrani["meta.popis"],
    alternates: {
      canonical: `${WEB.url}/${jazyk}/`,
      languages: {
        // Česká verze je ta závazná, proto je i výchozí pro vyhledávače.
        cs: `${WEB.url}/`,
        "x-default": `${WEB.url}/`,
        ...Object.fromEntries(JAZYKY.map((j) => [j.kod, `${WEB.url}/${j.kod}/`])),
      },
    },
    openGraph: {
      type: "website",
      locale: jazyk,
      siteName: WEB.nazev,
      title: p.rozhrani["meta.titulek"],
      description: p.rozhrani["meta.popis"],
    },
  };
}

/** Události, které se v přehledu vypisují: skutečné případy, od nejnovější. */
function posledniUdalosti() {
  return incidenty()
    .filter((i) => (i.druh ?? "pripad") === "pripad")
    .sort(
      (a, b) =>
        new Date(b.datumZjisteni ?? b.datumUdalosti).getTime() - new Date(a.datumZjisteni ?? a.datumUdalosti).getTime(),
    )
    .slice(0, KOLIK_UDALOSTI);
}

/** Datum v jazyce čtenáře. Formát si řídí Intl, my mu jen dáme ISO. */
function datumJazyka(iso: string, kod: string): string {
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat(kod, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/*
  Odznak závažnosti v jazyce čtenáře.

  Sdílený OdznakZavaznosti tiskne český název ze stupnice; vedle přeloženého
  slova by stálo totéž dvakrát a napůl česky. Barvu i pásmo bere odsud, jen
  slovo je přeložené — barva se pořád odvozuje z úrovně, nikdy naopak.
*/
function ZavaznostSlovy({ uroven, slovo }: { uroven: Uroven; slovo: string }) {
  const pasmo = UROVNE[uroven].pasmo;
  const ton: Ton = pasmo === "zelena" ? "klid" : pasmo === "zluta" || pasmo === "prechod" ? "pozor" : "vazne";
  return (
    <Odznak ton={ton} duraz="silny">
      {slovo.toLowerCase()} · {zDeseti(uroven)}/10
    </Odznak>
  );
}

function Udaj({ popisek, children }: { popisek: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-tlum2">{popisek}</dt>
      <dd className="mt-1 text-[13.5px] text-tlum">{children}</dd>
    </div>
  );
}

function Odrazky({ body }: { body: string[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {body.map((b) => (
        <li key={b} className="flex gap-2.5 text-[14px] leading-relaxed text-tlum">
          <span aria-hidden className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-akcent" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function PrepinacJazyku({ aktivni, p }: { aktivni: string; p: Preklad }) {
  return (
    <nav aria-label={p.rozhrani["paticka.jazyky"]} className="mt-12 border-t border-linka2 pt-7">
      <h2 className="text-[11.5px] font-semibold uppercase tracking-wide text-tlum2">{p.rozhrani["paticka.jazyky"]}</h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13.5px]">
        <li>
          <Link href="/" className="font-semibold text-akcent hover:underline" hrefLang="cs">
            Čeština
          </Link>
        </li>
        {JAZYKY.map((j) => (
          <li key={j.kod}>
            {j.kod === aktivni ? (
              <span aria-current="page" className="font-semibold text-inkoust">
                {j.nazev}
              </span>
            ) : (
              <Link href={`/${j.kod}/`} className="text-tlum hover:text-inkoust hover:underline" hrefLang={j.kod}>
                {j.nazev}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default async function Stranka({ params }: { params: Promise<{ jazyk: string }> }) {
  const { jazyk } = await params;
  const j = najdiJazyk(jazyk);
  if (!j) notFound();

  const p = nactiPreklad(jazyk);
  const t = (k: keyof Preklad["rozhrani"]) => p.rozhrani[k];

  const ted = Date.now();
  const vse = zapocitatelne();
  const hranice = ted - OKNO_DNI * 86_400_000;
  const za90 = vse.filter((z) => new Date(z.kdy).getTime() >= hranice).length;
  const prumer = prumerNaOkno(
    vse.map((z) => z.kdy),
    OKNO_DNI,
    ted,
  );

  const obcane = urovenObcanu();
  const evropa = celkovyStav().uroven;
  const udalosti = posledniUdalosti();

  /** Název úrovně v jazyce čtenáře. Bez překladu zůstává česky, ne prázdný. */
  const urovenSlovy = (kod: keyof typeof UROVNE) => {
    const cesky = UROVNE[kod].nazev;
    return p.urovne[cesky as keyof typeof p.urovne] ?? cesky;
  };

  return (
    <div lang={j.kod} className="mx-auto w-full max-w-[64rem] px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <HlavickaStranky stitek={j.nazev} nadpis={t("meta.titulek")} uvod={t("co.text")} />

      <div className="mt-7 space-y-3">
        <Sdeleni ton="pozor" ikona="info" carkovane>
          {t("strojove.upozorneni")}{" "}
          <Link href="/" hrefLang="cs" className="font-semibold text-inkoust underline">
            {t("strojove.cesky")}
          </Link>
        </Sdeleni>
        <Sdeleni ton="neutral" ikona="info">
          {t("co.neni")}
        </Sdeleni>
      </div>

      <section className="mt-14">
        <NadpisSekce nadpis={t("nikdy.nadpis")} znacka={false} />
        <Odrazky body={[t("nikdy.zdroj"), t("nikdy.cesta"), t("nikdy.varovani")]} />
      </section>

      <section className="mt-14">
        <NadpisSekce nadpis={t("cisla.nadpis")} znacka={false} />
        <dl className="grid gap-5 rounded-[22px] border border-linka2 bg-plocha p-5 sm:grid-cols-3 sm:p-6">
          <Udaj popisek={t("cisla.za90")}>
            <span className="text-[30px] font-bold leading-none text-inkoust">{za90}</span>
          </Udaj>
          <Udaj popisek={t("cisla.celkem")}>
            <span className="text-[30px] font-bold leading-none text-inkoust">{vse.length}</span>{" "}
            <span className="text-[12.5px] text-tlum2">{t("cisla.od")}</span>
          </Udaj>
          {/*
            Slovní porovnání („mírně vyšší“) se sem nedává: existuje jen česky
            a přeložené by bylo jen odhadem. Číslo mluví samo a ve všech
            jazycích stejně. Průměr chybí, dokud není dost historie.
          */}
          <Udaj popisek={t("cisla.oproti")}>
            {prumer === null ? "—" : <span className="text-[30px] font-bold leading-none text-inkoust">{cislem(Math.round(prumer * 10) / 10)}</span>}
          </Udaj>
        </dl>
      </section>

      <section className="mt-14">
        <NadpisSekce nadpis={t("uroven.nadpis")} znacka={false} popis={t("uroven.stupnice")} />
        <dl className="grid gap-5 rounded-[22px] border border-linka2 bg-plocha p-5 sm:grid-cols-2 sm:p-6">
          <Udaj popisek={t("uroven.cesko")}>
            <span className="font-semibold text-inkoust">{urovenSlovy(obcane.uroven)}</span>{" "}
            <span className="text-tlum2">{zDeseti(obcane.uroven)}/10</span>
          </Udaj>
          <Udaj popisek={t("uroven.evropa")}>
            {evropa ? (
              <>
                <span className="font-semibold text-inkoust">{urovenSlovy(evropa)}</span>{" "}
                <span className="text-tlum2">{zDeseti(evropa)}/10</span>
              </>
            ) : (
              "—"
            )}
          </Udaj>
        </dl>
        <Sdeleni ton="neutral" ikona="info" trida="mt-3">
          {t("uroven.hodnoceni")}
        </Sdeleni>
      </section>

      <section className="mt-14">
        <NadpisSekce nadpis={t("udalosti.nadpis")} znacka={false} />
        {udalosti.length === 0 ? (
          <Sdeleni ton="neutral" ikona="info">
            {t("udalosti.zadne")}
          </Sdeleni>
        ) : (
          <ol className="divide-y divide-linka2 overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
            {udalosti.map((i) => (
              <li key={i.slug} className="px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-semibold text-inkoust">{nazevZeme(i.zeme, j.kod, p.zvlastniZeme)}</span>
                  <ZavaznostSlovy uroven={i.zavaznost} slovo={urovenSlovy(i.zavaznost)} />
                  {i.kategorie.slice(0, 3).map((k) => (
                    <Odznak key={k} ton="neutral">
                      {p.kategorie[k] ?? KATEGORIE[k].nazev}
                    </Odznak>
                  ))}
                </div>

                <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-4">
                  <Udaj popisek={t("udalosti.datum")}>{datumJazyka(i.datumUdalosti, j.kod)}</Udaj>
                  {i.datumZjisteni && i.datumZjisteni !== i.datumUdalosti && (
                    <Udaj popisek={t("udalosti.zjisteno")}>{datumJazyka(i.datumZjisteni, j.kod)}</Udaj>
                  )}
                  <Udaj popisek={t("udalosti.stav")}>{p.stavy[i.stav]}</Udaj>
                  {i.puvodce && <Udaj popisek={t("udalosti.puvodce")}>{p.puvodci[i.puvodce]}</Udaj>}
                </dl>

                {/*
                  Titulek zůstává česky a je to tak označené. Přeložený titulek
                  by byl tvrzení o události, které nikdo neověřil — a fakta
                  o incidentu se nesmějí lišit podle jazyka.
                */}
                <p className="mt-3 text-[13.5px] leading-relaxed text-tlum2" lang="cs">
                  {i.titulek}
                </p>

                <Link
                  href={`/incident/${i.slug}/`}
                  hrefLang="cs"
                  className="mt-2 inline-block text-[13px] font-semibold text-akcent hover:underline"
                >
                  {t("udalosti.detail")} →
                </Link>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-5">
          <Tlacitko kam="/udalosti/" varianta="obrys" velikost="s">
            {t("udalosti.vice")}
          </Tlacitko>
        </div>
      </section>

      <section className="mt-14">
        <NadpisSekce nadpis={t("overovani.nadpis")} znacka={false} />
        <Odrazky body={[t("overovani.sber"), t("overovani.clovek"), t("overovani.zverejneni")]} />
        <Sdeleni ton="neutral" ikona="info" trida="mt-4">
          {t("overovani.neovereno")}
        </Sdeleni>
      </section>

      <section className="mt-14">
        <NadpisSekce nadpis={t("odber.nadpis")} znacka={false} />
        <p className="text-[14px] leading-relaxed text-tlum">{t("odber.telegram")}</p>
        <div className="mt-4">
          <Tlacitko kam="/odber/" varianta="plny" velikost="m">
            {t("odber.nadpis")}
          </Tlacitko>
        </div>
      </section>

      <PrepinacJazyku aktivni={j.kod} p={p} />
    </div>
  );
}
