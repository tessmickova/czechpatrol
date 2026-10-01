import data from "../../data/kyber.json";
import { datumCas } from "@/lib/format";
import { CO_TO_JE, NADPIS_STAVU, stavKyber, TIPY_KYBER, VETA_STAVU, ZDROJE_KYBER_POPIS, type SnimekKyber } from "@/lib/kyber";
import { Ikona } from "./ikony";

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

export function InternetBanner({ ted }: { ted: number }) {
  const cerstve = snimek.nacteno && ted - new Date(snimek.nacteno).getTime() <= MAX_STARI_H * 3_600_000;
  if (!cerstve) return null;
  const stav = stavKyber(snimek.zpravy, ted);
  const posledni = snimek.zpravy.filter((z) => ted - new Date(z.kdy).getTime() <= 72 * 3_600_000).slice(0, 3);

  if (stav === "klid") {
    return (
      <details id="internet" className="group mt-4 scroll-mt-20 rounded-[14px] border border-linka px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-mikro text-tlum">
          <Ikona nazev="zamek" velikost={13} tah={2} trida="shrink-0 text-klid-text" />
          <span className="flex-1"><b className="font-semibold text-inkoust">{NADPIS_STAVU.klid}</b> · jak se chránit</span>
          <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <Tipy />
      </details>
    );
  }

  const utok = stav === "utok";
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
              <span className="block text-drobne text-tlum2">{z.uredni ? "úřad" : "médium"}{z.vydavatel ? ` · ${z.vydavatel}` : ""} · {datumCas(z.kdy)}</span>
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
      <p className="mt-2 text-drobne text-tlum2">Automaticky ze zpráv, člověk to neověřoval. {ZDROJE_KYBER_POPIS}</p>
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
