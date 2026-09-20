import type { ReactNode } from "react";
import { JISTOTY, tokeny, UROVNE } from "@/lib/skala";
import { Ikona, type NazevIkony } from "./ikony";
import { ObalNapovedy } from "./napoveda-klient";
import { Znacka } from "./znacka";
import type { Jistota, Uroven } from "@/lib/typy";

/* ---------- nápověda ---------- */

/**
 * Nápověda dostupná myší, prstem i klávesnicí. Vlastní chování má klientská
 * komponenta — tady zůstává jen vstupní bod, aby se ostatní soubory nemusely
 * starat o to, co běží na serveru a co v prohlížeči.
 */
export function Napoveda({
  children, popis, vpravo = false, label = "Co to znamená?", cele = false,
}: { children: ReactNode; popis: ReactNode; vpravo?: boolean; label?: string; /** Spouštěč vyplní celou šířku (dlaždice). */ cele?: boolean }) {
  return (
    <ObalNapovedy popis={popis} vpravo={vpravo} label={label} cele={cele}>
      {children}
    </ObalNapovedy>
  );
}

/*
  Informační puntík.

  Jediné místo, kde se na webu schovávají vysvětlivky. Nadpis nese název,
  puntík vedle něj nese všechno ostatní — metodiku, období, definici množiny.
  Dřív ta vysvětlení stála jako odstavce pod nadpisy a čtenář je musel
  přeskakovat, i když je nechtěl.

  Obrysový kroužek v barvě akcentu: drží se značky, je malý a nekřičí.
  Není `aria-hidden` — vysvětlení musí být dostupné i čtečkou a klávesnicí,
  ne jen najetím myší.
*/
export function Otaznik({ popis, vpravo, label = "Vysvětlivka" }: { popis: ReactNode; vpravo?: boolean; label?: string }) {
  return (
    <Napoveda popis={popis} vpravo={vpravo} label={label}>
      <span className="inline-grid h-[15px] w-[15px] shrink-0 -translate-y-[1px] place-items-center rounded-full border border-akcent/55 align-middle text-[9.5px] font-semibold leading-none text-akcent transition-colors hover:border-akcent hover:bg-akcent/15">
        i
      </span>
    </Napoveda>
  );
}

/* ---------- úroveň ---------- */

/** Barevný čtvereček podle pásma. Na tmavém podkladu má vlastní odstín. */
export function Tecka({
  uroven, velka = false, naNoci = false,
}: { uroven: Uroven | null; velka?: boolean; naNoci?: boolean }) {
  const t = uroven ? tokeny(uroven) : null;
  const rozmer = velka ? "h-2.5 w-2.5" : "h-[7px] w-[7px]";
  const barva = t ? (naNoci ? t.teckaNoc : t.tecka) : naNoci ? "bg-white/20" : "bg-linka";
  return <span aria-hidden className={`inline-block shrink-0 rounded-[3px] ${rozmer} ${barva}`} />;
}

/**
 * Odznak úrovně. Nikdy nestojí sám — vždy má vedle sebe, čeho se týká.
 * Bez toho by věta „vysoké riziko“ neříkala vůbec nic.
 */
export function OdznakUrovne({
  uroven, cehoSe, velikost = "s", naNoci = false,
}: { uroven: Uroven | null; cehoSe?: string; velikost?: "s" | "m" | "l"; naNoci?: boolean }) {
  if (!uroven) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border border-dashed px-2.5 py-1 text-mikro font-medium ${
          naNoci ? "border-white/20 text-noc-tlum" : "border-linka text-tlum2"
        }`}
      >
        <Tecka uroven={null} naNoci={naNoci} /> Zatím nevyhodnoceno
      </span>
    );
  }
  const d = UROVNE[uroven];
  const t = tokeny(uroven);
  const rozmery = {
    s: "px-2 py-1 text-drobne gap-1.5",
    m: "px-2.5 py-1.5 text-male gap-2",
    l: "px-3 py-2 text-zaklad gap-2",
  }[velikost];
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${rozmery} ${
        naNoci ? `${t.ramecekNoc} ${t.pozadiNoc} ${t.textNoc}` : `${t.ramecek} ${t.pozadi} ${t.text}`
      }`}
    >
      <Tecka uroven={uroven} velka={velikost === "l"} naNoci={naNoci} />
      <span className="svit uppercase tracking-[0.05em]">{d.nazev}</span>
      {cehoSe && <span className="font-normal normal-case tracking-normal opacity-70">· {cehoSe}</span>}
    </span>
  );
}

/** Výklad úrovně do nápovědy — co znamená, co ne, co ji posune. */
export function VykladUrovne({ uroven }: { uroven: Uroven }) {
  const d = UROVNE[uroven];
  return (
    <span className="block space-y-2">
      <span className="block text-mikro font-semibold uppercase tracking-[0.09em] opacity-60">
        Úroveň {d.nazev}
      </span>
      <span className="block">{d.znamena}</span>
      <span className="block opacity-80">
        <b className="font-semibold">Typicky způsobuje:</b> {d.zpusobuje}
      </span>
      {d.neznamena !== "—" && (
        <span className="block opacity-80">
          <b className="font-semibold">Neznamená:</b> {d.neznamena}
        </span>
      )}
      {d.posunVys !== "—" && (
        <span className="block opacity-80">
          <b className="font-semibold">Posun výš by znamenal:</b> {d.posunVys}
        </span>
      )}
    </span>
  );
}

/* ---------- jistota ---------- */

/** Jistota je samostatná osa. Se závažností se nesmí míchat. */
export function OdznakJistoty({ jistota }: { jistota: Jistota }) {
  const j = JISTOTY[jistota];
  return (
    <Napoveda
      popis={
        <span className="block space-y-1.5">
          <span className="block text-mikro font-semibold uppercase tracking-[0.09em] opacity-60">
            Jistota informace
          </span>
          <span className="block">{j.popis}</span>
          <span className="block opacity-70">
            Jistota je nezávislá na závažnosti. Věc může být velmi závažná a špatně
            potvrzená — i naprosto potvrzená a málo závažná.
          </span>
        </span>
      }
    >
      <span className="inline-flex items-center gap-1.5 text-drobne font-medium text-tlum">
        <span aria-hidden className="flex gap-[3px]">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-[7px] w-[7px] rounded-full ${i <= j.body ? "bg-akcent " : "bg-linka"}`}
            />
          ))}
        </span>
        {j.nazev}
      </span>
    </Napoveda>
  );
}

/* ---------- typ obsahu ---------- */

export type TypObsahu = "fakt" | "odhad" | "scenar" | "nepotvrzeno";

const TYPY: Record<TypObsahu, { nazev: string; popis: string; tridy: string }> = {
  fakt: {
    nazev: "Fakt",
    popis: "Doloženo zdrojem uvedeným u záznamu.",
    tridy: "border-akcent/40 bg-akcent/10 text-akcent-svetla",
  },
  odhad: {
    nazev: "Odhad",
    popis: "Analytická interpretace dostupných informací. Není to fakt ani předpověď.",
    tridy: "border-fialova/40 bg-fialova/10 text-fialova-text",
  },
  scenar: {
    nazev: "Scénář",
    popis: "Možnost, nikoli předpověď. Nemusí nastat a nemusí následovat v uvedeném pořadí.",
    tridy: "border-tlum/40 bg-tlum/10 text-tlum",
  },
  nepotvrzeno: {
    nazev: "Nepotvrzeno",
    popis: "Informace existuje, ale nemáme dost důkazů. Nezvyšuje sama o sobě hodnocení.",
    tridy: "border-jantar/40 bg-jantar/10 text-jantar",
  },
};

/** Konzistentní odznak typu obsahu. Používá se všude stejně. */
export function OdznakTypu({ typ, vpravo }: { typ: TypObsahu; vpravo?: boolean }) {
  const t = TYPY[typ];
  return (
    <Napoveda popis={<span className="block">{t.popis}</span>} vpravo={vpravo}>
      <span className={`stitek-tmavy inline-flex items-center rounded-[18px] border px-1.5 py-[3px] ${t.tridy}`}>
        {t.nazev}
      </span>
    </Napoveda>
  );
}

export const VYKLAD_TYPU = TYPY;

/* ---------- stavební prvky ---------- */

export function Sekce({
  id, kicker, nadpis, popis, akce, children, tmava = false, prvni = false,
}: {
  id?: string; kicker?: string; nadpis: string; popis?: ReactNode;
  akce?: ReactNode; children: ReactNode; tmava?: boolean; prvni?: boolean;
}) {
  return (
    <section
      id={id}
      className={`nalet scroll-mt-[84px] ${
        tmava ? "noc relative overflow-hidden" : prvni ? "" : "border-t border-linka"
      }`}
    >
      {tmava && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="vrstva vzor-mrizka absolute inset-x-0 -inset-y-[35%]" />
        </div>
      )}
      <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 sm:py-28">
        <div className="mb-10 flex flex-col gap-5 sm:mb-14 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="max-w-[46rem]">
            {kicker && (
              <div className="mb-3.5 flex items-center gap-2">
                <Znacka velikost={28} tmave />
                <span className="stitek-znacky">{kicker}</span>
              </div>
            )}
            <h2 className={`titul-sekce ${tmava ? "text-noc-text" : ""}`}>{nadpis}</h2>
            {popis && <p className="uvodni-veta mt-4">{popis}</p>}
          </div>
          {akce && <div className="shrink-0">{akce}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Základní karta. Odstín se volí podle role, ne pro ozdobu. */
export function Karta({
  children, className = "", jako: Jako = "div", odstin = "bila", zdvih = false, id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  jako?: "div" | "li" | "article";
  odstin?: "bila" | "papir" | "modra" | "zelena" | "pisek" | "slez";
  zdvih?: boolean;
}) {
  const odstiny = {
    bila: "sklo",
    papir: "sklo-noc-slabe",
    modra: "sklo border-akcent/30 bg-mycka",
    zelena: "sklo border-klid/30 bg-list",
    pisek: "sklo border-jantar/30 bg-pisek",
    slez: "sklo border-fialova/30 bg-slez",
  }[odstin];
  return (
    <Jako id={id} className={`rounded-[22px] ${odstiny} ${zdvih ? "zdvih" : ""} ${className}`}>
      {children}
    </Jako>
  );
}

/** Prázdný stav. Web musí umět přiznat, že data nemá — a nevypadat u toho rozbitě. */
export function Prazdno({
  nadpis, popis, ikona = "radar",
}: { nadpis: string; popis: string; ikona?: NazevIkony }) {
  return (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden sklo rounded-[22px] border-akcent/30 bg-mycka px-6 py-9 text-center sm:flex-row sm:gap-5 sm:py-7 sm:text-left">
      <span
        aria-hidden
        className="srafy pointer-events-none absolute inset-x-0 top-0 h-[5px] text-akcent"
      />
      <span className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full border border-akcent/40 bg-akcent/10 text-akcent">
        <Ikona nazev={ikona} velikost={21} />
      </span>
      <span className="block">
        <span className="block text-velke font-bold uppercase tracking-[0.02em]">{nadpis}</span>
        <span className="mt-1.5 block max-w-[38rem] text-zaklad leading-relaxed text-tlum">
          {popis}
        </span>
      </span>
    </div>
  );
}

/** Hodnota, kterou sběrač zatím neověřil. Nikdy ji nedopočítáváme. */
export function Neovereno({ kratke = false }: { kratke?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-male font-medium text-tlum2">
      <span aria-hidden className="inline-block h-[7px] w-[7px] rounded-full border border-linka" />
      {kratke ? "neověřeno" : "Zatím neověřeno"}
    </span>
  );
}
