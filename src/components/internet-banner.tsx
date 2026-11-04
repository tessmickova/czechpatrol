import data from "../../data/kyber.json";
import { datumCas } from "@/lib/format";
import { CO_TO_JE, NADPIS_STAVU, stavKyber, TIPY_KYBER, VETA_STAVU, type SnimekKyber } from "@/lib/kyber";
import { Ikona } from "./ikony";
import { RadaKTypu } from "./rada-k-typu";
import { IkonaKruh } from "./widgety";
import { Napoveda } from "./zaklad";
import { Vlajka } from "./zeme";
import type { SouhrnInternetu } from "@/lib/kyber-souhrn";

/*
  Banner „Internet v Česku“ (1. 10. 2026). Pro seniora i dítě: jedna věta,
  co se děje, co to znamená a co dělat. V klidu jen jeden tenký řádek
  s tipy na rozkliknutí; při zvýšené pozornosti nebo vlně útoků rámeček
  s posledními zprávami a zdroji.

  Stav se počítá znovu z času prohlížeče (ted), ne při sestavení: stránka
  z mezipaměti tak sama „vychladne“. Data starší než den = nezjištěno,
  nikdy „klid“.
*/
const snimek = data as SnimekKyber;
const MAX_STARI_H = 24;

/*
  Box do postranního panelu (4. 11. 2026, provozovatelka): místo „Právě
  ověřujeme“ vedle Souhrnu situace. Stejná stavba jako Souhrn: nadpis,
  stav jedním slovem, počet zpráv; zprávy, tipy a rady až po najetí.
  Bez čerstvých dat box říká „bez údaje“ — nikdy „klid“.
*/
export function InternetBox({ data }: { data?: SouhrnInternetu }) {
  const stav = data?.cerstve ? data.stav : null;
  const radky = data?.radky ?? [];
  const posledni = data?.posledni ?? [];
  const slovo = stav === "utok" ? "Probíhá vlna útoků" : stav === "pozor" ? "Zvýšená pozornost" : stav === "klid" ? "V Česku bez hlášených útoků" : "Bez údaje";
  const tecka = stav === "utok" ? "bg-akcent" : stav === "pozor" ? "bg-jantar" : stav === "klid" ? "bg-klid" : "bg-tlum2";
  return (
    <Napoveda cele plna vpravo popis={<span className="block">
      <span className="block text-inkoust">{stav ? VETA_STAVU[stav] : "Zprávy o internetu v Česku se v posledním dni nepodařilo přečíst."}</span>
      {posledni.length > 0 && (
        <span className="mt-1.5 block space-y-1">
          {posledni.map((z) => (
            <span key={z.id} className="block">
              <a href={z.odkaz} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold text-inkoust underline decoration-linka underline-offset-4 hover:decoration-akcent">{z.titulek}</a>
              <span className="block text-tlum2">{CO_TO_JE[z.druh].slovo} · {z.vydavatel ?? (z.uredni ? "úřad" : "médium")} · {datumCas(z.kdy)}</span>
            </span>
          ))}
        </span>
      )}
      <span className="mt-2 block border-t border-linka/60 pt-2 text-tlum">
        {TIPY_KYBER.map((t, i) => <span key={t} className="block">{i + 1}. {t}</span>)}
      </span>
      <span className="mt-1.5 block text-tlum2">Automaticky ze zpráv · neověřeno</span>
    </span>}>
      <span role="status" aria-label="Internet v Česku" className="flex h-full min-h-[118px] w-full flex-col rounded-[22px] border border-linka bg-plocha2/40 px-3.5 py-3 text-left">
        <span className="flex min-h-[34px] items-center gap-2"><IkonaKruh ikona="zamek" velikost="s" /><span className="nadpis-boxu leading-tight">Internet v Česku</span></span>
        <span className="mt-2 flex items-start gap-2 text-male font-bold leading-snug text-inkoust"><span aria-hidden className={`mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full ${tecka}`} />{slovo}</span>
        {/*
          Co se děje a kde (4. 11. 2026, provozovatelka): krátké názvy
          s vlajkou místo počtu — „🇫🇷 útok na krevní banky“ říká na první
          pohled, že to není v Česku. Bez poznané země je tečka, ne hádání.
        */}
        {radky.length > 0 ? (
          <span className="mt-1 block space-y-0.5 text-mikro leading-snug text-tlum">
            {radky.map((r) => (
              <span key={`${r.kodZeme}|${r.co}`} className="flex items-start gap-1.5">
                <span className="w-[16px] shrink-0 text-center leading-none">{r.kodZeme ? <Vlajka kod={r.kodZeme} /> : <span aria-hidden className="text-tlum2">·</span>}</span>
                <span className="min-w-0">{r.co}{r.pocet > 1 ? ` ×${r.pocet}` : ""}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="mt-1 block text-mikro leading-snug text-tlum">{data?.cerstve ? "žádná zpráva za 72 h" : "data starší než den"}</span>
        )}
        <span className="mt-auto pt-2 text-mikro text-tlum2">jak se chránit →</span>
      </span>
    </Napoveda>
  );
}

export function InternetBanner({ ted, jenUtok = false }: { ted: number; /** Jen rámeček při vlně útoků; klidový řádek je v postranním panelu. */ jenUtok?: boolean }) {
  const cerstve = snimek.nacteno && ted - new Date(snimek.nacteno).getTime() <= MAX_STARI_H * 3_600_000;
  if (!cerstve) return null;
  const stav = stavKyber(snimek.zpravy, ted);
  if (jenUtok && stav !== "utok") return null;
  const posledni = snimek.zpravy.filter((z) => ted - new Date(z.kdy).getTime() <= 72 * 3_600_000).slice(0, 3);

  /*
    Rámeček jen při probíhající vlně útoků. „Zvýšená pozornost“ (pár zpráv
    o podvodech) bývala velký jantarový box nad vším ostatním — 2. 11. 2026
    zastínil zprávy o posílení hranice u Kaliningradu. Teď je to jeden
    řádek s tečkou; zprávy a tipy jsou po rozkliknutí.
  */
  if (stav !== "utok") {
    const pozor = stav === "pozor";
    return (
      <details id="internet" className="group mt-4 scroll-mt-20 rounded-[14px] border border-linka px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-mikro text-tlum">
          <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${pozor ? "bg-jantar" : "bg-klid"}`} />
          <span className="flex-1"><b className="font-semibold text-inkoust">{NADPIS_STAVU[stav]}</b>{pozor && posledni.length ? ` · ${posledni.length} ${posledni.length === 1 ? "zpráva" : posledni.length < 5 ? "zprávy" : "zpráv"}` : " · jak se chránit"}</span>
          <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        {pozor && <p className="mt-2 text-male leading-snug text-tlum">{VETA_STAVU.pozor}</p>}
        {pozor && posledni.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {posledni.map((z) => (
              <li key={z.id} className="text-male leading-snug">
                <span className="font-semibold text-inkoust">{CO_TO_JE[z.druh].slovo}:</span>{" "}
                <a href={z.odkaz} target="_blank" rel="nofollow noopener noreferrer" className="text-tlum underline decoration-linka underline-offset-2 hover:text-inkoust">{z.titulek}</a>
                <span className="text-drobne text-tlum2"> · {z.vydavatel ?? (z.uredni ? "úřad" : "médium")} · {datumCas(z.kdy)}</span>
                {" "}<RadaKTypu druh={z.druh} />
              </li>
            ))}
          </ul>
        )}
        <Tipy />
        <p className="mt-2 text-drobne text-tlum2">Automaticky ze zpráv · neověřeno</p>
      </details>
    );
  }

  const utok = true;
  return (
    <section id="internet" aria-label="Internet v Česku" className={`mt-4 scroll-mt-20 rounded-[18px] border px-4 py-3.5 ${utok ? "border-akcent/55 bg-akcent/[0.07]" : "border-jantar/55 bg-jantar/[0.06]"}`}>
      <div className="flex items-start gap-2.5">
        <Ikona nazev="zamek" velikost={18} tah={2} trida={`mt-0.5 shrink-0 ${utok ? "text-akcent" : "text-jantar"}`} />
        <div className="min-w-0">
          <h2 className="text-zaklad font-bold leading-snug text-inkoust">{NADPIS_STAVU[stav]}</h2>
          <p className="mt-1 text-male leading-snug text-tlum">{VETA_STAVU[stav]}</p>
        </div>
      </div>
      {posledni.length > 0 && (
        <ul className="mt-3 space-y-2">
          {posledni.map((z) => (
            <li key={z.id} className="text-male leading-snug">
              <span className="font-semibold text-inkoust">{CO_TO_JE[z.druh].slovo}:</span>{" "}
              <a href={z.odkaz} target="_blank" rel="nofollow noopener noreferrer" className="text-tlum underline decoration-linka underline-offset-2 hover:text-inkoust">{z.titulek}</a>
              <span className="block text-drobne text-tlum2">{z.uredni ? "úřad" : "médium"}{z.vydavatel ? ` · ${z.vydavatel}` : ""} · {datumCas(z.kdy)} <RadaKTypu druh={z.druh} /></span>
            </li>
          ))}
        </ul>
      )}
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-male font-semibold text-inkoust">Co dělat <span aria-hidden className="inline-block transition-transform group-open:rotate-180">▾</span></summary>
        <Tipy />
        <dl className="mt-3 space-y-1.5 text-drobne leading-snug text-tlum">
          {[...new Set(posledni.map((z) => z.druh))].map((d) => (
            <div key={d}><dt className="inline font-semibold text-inkoust">{CO_TO_JE[d].slovo}: </dt><dd className="inline">{CO_TO_JE[d].vysvetleni}</dd></div>
          ))}
        </dl>
      </details>
      <p className="mt-2 text-drobne text-tlum2">Automaticky ze zpráv · neověřeno</p>
    </section>
  );
}

function Tipy() {
  return (
    <ol className="mt-2 space-y-1 pl-1 text-male leading-snug text-tlum">
      {TIPY_KYBER.map((t, i) => <li key={t} className="flex gap-2"><span className="cislice font-semibold text-inkoust">{i + 1}.</span><span>{t}</span></li>)}
    </ol>
  );
}
