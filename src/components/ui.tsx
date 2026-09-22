import Link from "next/link";
import type { ReactNode } from "react";
import { datumPraha } from "@/lib/cas";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Uroven } from "@/lib/typy";
import { Ikona, type NazevIkony } from "./ikony";
import { OdznakNove } from "./odznak-nove";
import { Vlajka } from "./zeme";

/*
  Stavebnice rozhraní.

  Jedno pravidlo, kvůli kterému tenhle soubor vznikl: co nese stejný druh
  údaje, musí vypadat stejně. Datum události, země, druh záznamu a titulek
  se na webu opakují v pěti různých sekcích — a dokud měla každá vlastní
  odsazení, vlastní tvar tečky a vlastní tlačítko, musel si je čtenář pokaždé
  přečíst znovu jako nový druh obsahu.

  Rozvržení se lišit smí (sloupec, mřížka, široká karta). Stavební prvky ne.

  Zdůraznění zůstává: závažnost nese barevná tečka a odznak, ne velikost
  písma ani jiný rám. Klidný záznam a vážný záznam mají stejný tvar a liší
  se jen tím, co na nich svítí.
*/

/* ---------------- tón ---------------- */

/** Jediná tónová škála webu. Barvy vycházejí z pásem závažnosti. */
export type Ton = "klid" | "pozor" | "vazne" | "neutral" | "akcent";

/*
  Tón sdělení.

  Stejné pravidlo jako u pásem závažnosti (src/lib/skala.ts): barva je
  značka, ne plocha. Stavba odznaku i rámečku je u všech tónů shodná —
  vlasová linka, tmavá plocha, inkoustové písmo. Tón se pozná po tečce
  u odznaku a po barvě ikony u rámečku; obojí je malé.

  Dřív se tón podepisoval do písma, rámečku i pozadí naráz, takže zelený,
  žlutý a červený odznak vedle sebe rozsvítily celý řádek. Rozlišit je šlo
  i tak, ale přehled to nepřipomínalo.
*/
const TONY: Record<Ton, { text: string; ramecek: string; pozadi: string; tecka: string; ikona: NazevIkony }> = {
  klid: { text: "text-tlum", ramecek: "border-linka2", pozadi: "bg-plocha2", tecka: "bg-klid", ikona: "fajfka" },
  pozor: { text: "text-tlum", ramecek: "border-linka2", pozadi: "bg-plocha2", tecka: "bg-pozor", ikona: "vykricnik" },
  vazne: { text: "text-tlum", ramecek: "border-linka2", pozadi: "bg-plocha2", tecka: "bg-akcent", ikona: "sirena" },
  neutral: { text: "text-tlum", ramecek: "border-linka2", pozadi: "bg-plocha2", tecka: "bg-tlum2", ikona: "info" },
  akcent: { text: "text-tlum", ramecek: "border-linka2", pozadi: "bg-plocha2", tecka: "bg-akcent", ikona: "radar" },
};

/** Barva ikony podle tónu. Jediné barevné místo v rámečku sdělení. */
const IKONA_TONU: Record<Ton, string> = {
  klid: "text-klid",
  pozor: "text-pozor",
  vazne: "text-akcent",
  neutral: "text-tlum2",
  akcent: "text-akcent",
};

/* ---------------- tlačítka ---------------- */

/*
  Čtyři varianty a nic víc. Každá má jednu úlohu, takže se dá poznat, co je
  na stránce to hlavní:
    plny        — jediná nejdůležitější akce na desce (odběr).
    zvyrazneny  — hlavní akce uvnitř bloku.
    obrys       — druhá akce vedle ní.
    tichy       — akce, která má být po ruce, ale nemá křičet.
  Tvar je vždy pilulka, jako u značky.
*/
type Varianta = "plny" | "zvyrazneny" | "obrys" | "tichy";
type Velikost = "s" | "m" | "l";

const VARIANTY: Record<Varianta, string> = {
  plny: "bg-akcent text-papir hover:bg-akcent-svetla",
  zvyrazneny: "border border-akcent/60 bg-akcent/15 text-akcent-svetla hover:bg-akcent/25",
  obrys: "border border-linka text-inkoust hover:border-akcent",
  tichy: "text-tlum hover:bg-plocha2 hover:text-inkoust",
};

const VELIKOSTI: Record<Velikost, string> = {
  s: "min-h-[36px] gap-1.5 px-3.5 text-drobne",
  m: "min-h-[44px] gap-2 px-5 text-zaklad",
  l: "min-h-[48px] gap-2.5 px-6 text-zaklad",
};

export function Tlacitko({
  kam, onKlik, varianta = "obrys", velikost = "m", ikona, ikonaVpravo, naTmavem = false, trida = "", nove = false, children,
}: {
  /** Vnitřní odkaz, vnější adresa, kotva — nebo nic a pak je to tlačítko. */
  kam?: string;
  onKlik?: () => void;
  varianta?: Varianta;
  velikost?: Velikost;
  ikona?: NazevIkony;
  ikonaVpravo?: NazevIkony;
  /** Na tmavé desce je obrysová varianta světlá, ne inkoustová. */
  naTmavem?: boolean;
  trida?: string;
  /** Otevřít v novém okně (vnější adresa). */
  nove?: boolean;
  children: ReactNode;
}) {
  const tridy = `inline-flex items-center justify-center rounded-full font-bold transition-colors ${
    varianta === "obrys" && naTmavem ? "border border-linka text-noc-text hover:border-akcent" : VARIANTY[varianta]
  } ${VELIKOSTI[velikost]} ${trida}`;
  const obsah = (
    <>
      {ikona && <Ikona nazev={ikona} velikost={velikost === "s" ? 13 : 15} tah={2} trida="shrink-0" />}
      {children}
      {ikonaVpravo && <Ikona nazev={ikonaVpravo} velikost={velikost === "s" ? 12 : 14} tah={2} trida="shrink-0" />}
    </>
  );
  if (!kam) return <button type="button" onClick={onKlik} className={tridy}>{obsah}</button>;
  if (nove || kam.startsWith("http") || kam.endsWith(".xml")) {
    return <a href={kam} target={nove ? "_blank" : undefined} rel={nove ? "nofollow noopener noreferrer" : undefined} className={tridy}>{obsah}</a>;
  }
  return <Link href={kam} onClick={onKlik} className={tridy}>{obsah}</Link>;
}

/* ---------------- odznaky ---------------- */

/*
  Jeden odznak pro všechno, co se na webu vyznačuje pilulkou: úroveň
  závažnosti, „úřední zdroj“, stav kampaně, druh záznamu. Dvě sytosti —
  `jemny` je běžný stav, `silny` je to, co má čtenáře zastavit.
*/
export function Odznak({
  ton = "neutral", duraz = "jemny", ikona, trida = "", children,
}: {
  ton?: Ton; duraz?: "jemny" | "silny"; ikona?: NazevIkony; trida?: string; children: ReactNode;
}) {
  const t = TONY[ton];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-mikro font-semibold leading-none ${
        duraz === "silny" ? `border ${t.ramecek} ${t.pozadi} ${t.text}` : `${t.text}`
      } ${trida}`}
    >
      {/*
        Tečka místo barevného písma. Odznak tak zůstane čitelný a tón je
        pořád vidět — jen zabírá 5 px a ne celé slovo. U vlastní ikony
        a u neutrálního tónu se nekreslí: tam by nic nepřidala.
      */}
      {!ikona && ton !== "neutral" && (
        <span aria-hidden className={`h-[5px] w-[5px] shrink-0 rounded-full ${t.tecka}`} />
      )}
      {ikona && <Ikona nazev={ikona} velikost={12} tah={2} trida="shrink-0" />}
      {children}
    </span>
  );
}

/** Odznak úrovně závažnosti. Slovo, číslo i barva — nikdy jen barva. */
export function OdznakZavaznosti({ uroven, duraz = "jemny" }: { uroven: Uroven; duraz?: "jemny" | "silny" }) {
  const u = UROVNE[uroven];
  const pasmo = u.pasmo;
  const ton: Ton = pasmo === "zelena" ? "klid" : pasmo === "zluta" || pasmo === "prechod" ? "pozor" : "vazne";
  return <Odznak ton={ton} duraz={duraz}>{u.nazev.toLowerCase()}</Odznak>;
}

/** Tečka závažnosti. Plná u případu, obrysová u všeho ostatního. */
export function TeckaZavaznosti({ uroven, plna = true, velikost = 9 }: { uroven?: Uroven | null; plna?: boolean; velikost?: number }) {
  const barva = uroven ? PASMA[UROVNE[uroven].pasmo].tecka : "bg-tlum2";
  return (
    <span
      aria-hidden
      style={{ width: velikost, height: velikost }}
      className={`mt-[6px] shrink-0 rounded-full ${plna ? barva : "border border-tlum2"}`}
    />
  );
}

/* ---------------- sdělení ---------------- */

/*
  Rámeček s vysvětlením. Dřív jich bylo na webu pět různých — jednou
  čárkovaný, jednou s ikonou, jednou jen šedý odstavec — a čtenář z toho
  nepoznal, které je varování a které poznámka. Teď rozhoduje jen tón.
*/
export function Sdeleni({
  ton = "neutral", ikona, nadpis, carkovane = false, trida = "", children,
}: {
  ton?: Ton; ikona?: NazevIkony; nadpis?: string; carkovane?: boolean; trida?: string; children: ReactNode;
}) {
  const t = TONY[ton];
  return (
    <p className={`flex items-start gap-2.5 rounded-[18px] border ${carkovane ? "border-dashed" : ""} ${t.ramecek} ${t.pozadi} px-4 py-3 text-male leading-relaxed text-tlum ${trida}`}>
      <span className={`mt-[1px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full ${IKONA_TONU[ton]}`}>
        <Ikona nazev={ikona ?? t.ikona} velikost={15} tah={2} />
      </span>
      <span>
        {nadpis && <b className="font-semibold text-inkoust">{nadpis}</b>}{nadpis && " "}
        {children}
      </span>
    </p>
  );
}

/* ---------------- seznam záznamů ---------------- */

/** Obsah jednoho řádku. Stejná pole ve všech sekcích, stejné pořadí. */
export interface ObsahRadku {
  /** Datum zjištění v ISO. Vždy první sloupec, vždy stejně široký. */
  datum: string;
  /** Barevná tečka závažnosti nebo jiná značka druhu. */
  tecka?: ReactNode;
  kodZeme?: string | null;
  zeme?: string | null;
  /** Druh, úroveň, zdroj — oddělují se tečkou, ne čárkou. */
  meta?: ReactNode[];
  titulek: ReactNode;
  /** ISO pro odznak „nové“. */
  cerstvost?: string;
  /** Pilulky pod titulkem. */
  znacky?: ReactNode;
  popis?: ReactNode;
}

const SIRKA_DATA = { husta: "w-[42px]", normalni: "w-[84px]" } as const;

/*
  Datum v seznamu.

  Letošní rok se nepíše — v seznamu, kde je nadpisem ročníku „2026“, by se
  opakoval u každé řádky a jen ubíral místo titulku. U staršího záznamu se
  rok naopak napsat musí, protože právě ten nese informaci.
*/
function datumRadku(iso: string): string {
  const cele = datumPraha(iso);
  const letos = String(new Date().getUTCFullYear());
  return cele.endsWith(letos) ? cele.replace(/ \d{4}$/, "") : cele;
}

function TeloRadku({ o, hustota }: { o: ObsahRadku; hustota: "husta" | "normalni" }) {
  const husta = hustota === "husta";
  return (
    <>
      <span className={`cislice ${SIRKA_DATA[hustota]} shrink-0 whitespace-nowrap ${husta ? "" : "pt-[2px]"} text-drobne leading-[1.5] text-tlum2`}>
        {datumRadku(o.datum)}
      </span>
      {o.tecka}
      <span className="min-w-0 flex-1">
        {!husta && (o.kodZeme || o.meta?.length) && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-drobne leading-[1.5] text-tlum">
            {o.kodZeme && (
              <span className="inline-flex items-center gap-1.5">
                <Vlajka kod={o.kodZeme} /> {o.kodZeme === "CZ" ? "Česko" : o.zeme}
              </span>
            )}
            {o.meta?.filter(Boolean).map((m, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {(i > 0 || o.kodZeme) && <span aria-hidden className="text-tlum2">·</span>}
                {m}
              </span>
            ))}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {husta && o.kodZeme && <Vlajka kod={o.kodZeme} />}
          {o.cerstvost && <OdznakNove kdy={o.cerstvost} />}
          <span className={`font-semibold leading-snug text-inkoust ${husta ? "min-w-0 flex-1 truncate text-male" : "text-zaklad"}`}>
            {o.titulek}
          </span>
        </span>
        {o.znacky && <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">{o.znacky}</span>}
        {o.popis && <span className="mt-1 block text-male leading-relaxed text-tlum">{o.popis}</span>}
      </span>
    </>
  );
}

/** Obal seznamu. `karta` = ohraničená deska, `holy` = řádky jen s linkou. */
export function SeznamPolozek({ varianta = "karta", children }: { varianta?: "karta" | "holy"; children: ReactNode }) {
  return (
    <ol className={varianta === "karta" ? "divide-y divide-linka2 overflow-hidden rounded-[22px] border border-linka2 bg-plocha" : ""}>
      {children}
    </ol>
  );
}

export function RadekSeznamu({
  o, kam, onKlik, aktivni = false, hustota = "normalni", varianta = "karta", detail,
}: {
  o: ObsahRadku;
  kam?: string;
  onKlik?: () => void;
  aktivni?: boolean;
  hustota?: "husta" | "normalni";
  varianta?: "karta" | "holy";
  /** Když je vyplněný, řádek se rozbaluje místo prokliku. */
  detail?: ReactNode;
}) {
  const husta = hustota === "husta";
  const zaklad = `flex w-full items-start gap-2.5 text-left transition-colors hover:bg-plocha2 ${
    husta ? "px-3 py-1.5" : varianta === "karta" ? "px-4 py-3 sm:px-5" : "py-2.5"
  } ${aktivni ? "bg-plocha2" : ""} ${varianta === "holy" ? "border-b border-linka2" : ""}`;

  if (detail) {
    return (
      <li>
        <details className={`group ${varianta === "holy" ? "border-b border-linka2" : ""}`}>
          <summary className={`${zaklad} cursor-pointer list-none ${varianta === "holy" ? "border-b-0" : ""}`}>
            <TeloRadku o={o} hustota={hustota} />
            <Ikona nazev="dolu" velikost={13} tah={2} trida="mt-1.5 shrink-0 text-tlum2 transition-transform group-open:rotate-180" />
          </summary>
          <div className={`pb-4 ${husta ? "pl-3" : "pl-4 sm:pl-5"}`}>{detail}</div>
        </details>
      </li>
    );
  }
  if (onKlik) {
    return <li><button type="button" onClick={onKlik} aria-expanded={aktivni} className={zaklad}><TeloRadku o={o} hustota={hustota} /></button></li>;
  }
  return (
    <li>
      <Link href={kam ?? "#"} className={zaklad}><TeloRadku o={o} hustota={hustota} /></Link>
    </li>
  );
}
