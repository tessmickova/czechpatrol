"use client";

import { useEffect, useMemo, useState } from "react";
import { kdyKratce, predKolika } from "@/lib/cas";
import { useZiveHodiny } from "@/lib/cas-klient";
import { jeSnimek, prijmiSnimek, sestavPrehled, type KonfiguraceCerstvosti } from "@/lib/prehled/model";
import * as T from "@/lib/prehled/texty";
import { KRAJE, type Kraj, type Lokalita, type SnimekPrehledu, type StavInformace, type StavZdroje, type TypInformace, type VyhodnocenaInformace, type VyhodnocenyZdroj } from "@/lib/prehled/typy";
import { Ikona } from "./ikony";

/*
  Rychlý přehled — první, co člověk na úvodu uvidí (zadání 26. 9. 2026).

  Odpovídá na čtyři otázky v tomhle pořadí: platí pro mé místo oficiální
  výstraha? jak čerstvě to víme a co nefunguje? co se potvrzeně stalo? kde
  jsou podrobnosti? Je konečný: nic se nepřidává samo, nic neodpočítává,
  další zprávy si člověk otevře sám.

  Stav se počítá v prohlížeči se skutečným časem (src/lib/prehled/model.ts).
  Stránka, která visí v kartě nebo v cache, proto sama zešedne, když sběr
  stojí; a když je k dispozici novější snímek, stáhne si ho.
*/

const KLIC_LOKALITY = "cp:lokalita";
const OBNOVA_MS = 5 * 60_000;
const MAX_POLOZEK = 5;

function ctiLokalitu(): Lokalita {
  try {
    const v = localStorage.getItem(KLIC_LOKALITY);
    if (v === "cr") return { druh: "cr" };
    if (v && (KRAJE as readonly string[]).includes(v)) return { druh: "kraj", kraj: v as Kraj };
  } catch { /* soukromé okno, zakázané úložiště — lokalita prostě není zvolená */ }
  return { druh: "nenastaveno" };
}

function ulozLokalitu(l: Lokalita) {
  try {
    if (l.druh === "nenastaveno") localStorage.removeItem(KLIC_LOKALITY);
    else localStorage.setItem(KLIC_LOKALITY, l.druh === "cr" ? "cr" : l.kraj);
  } catch { /* nevadí — volba platí do zavření stránky */ }
}

const TYP: Record<TypInformace, string> = {
  "oficialni-pokyn": "Oficiální pokyn",
  "oficialni-vystraha": "Oficiální výstraha",
  "oficialni-opatreni": "Vyhlášené opatření",
  "potvrzena-udalost": "Potvrzená událost",
  analyza: "Naše analýza",
};
const STAV_INFO: Record<StavInformace, string> = {
  platna: "platí", nadchazejici: "začne platit", ukoncena: "skončila", odvolana: "odvolána", opravena: "platí · opravena", nejasna: "nelze ověřit",
};
const STAV_ZDROJE: Record<StavZdroje, { text: string; znak: string }> = {
  aktualni: { text: "aktuální", znak: "✓" },
  zpozdeny: { text: "zpožděný", znak: "◔" },
  nedostupny: { text: "nedostupný", znak: "✕" },
  neuplny: { text: "nečekaná odpověď", znak: "!" },
  neoveritelny: { text: "automat se nedostane", znak: "–" },
};

export function RychlyPrehled({ snimek: vychozi, konfigurace, ted: tedServer }: { snimek: SnimekPrehledu; konfigurace: KonfiguraceCerstvosti; ted: number }) {
  const ted = useZiveHodiny(tedServer);
  const [snimek, setSnimek] = useState(vychozi);
  const [lokalita, setLokalita] = useState<Lokalita>({ druh: "nenastaveno" });

  useEffect(() => setLokalita(ctiLokalitu()), []);

  /* Novější snímek: po načtení, při návratu na kartu a po pěti minutách. Chyba = zůstane starý a model ho podle času sám zhorší. */
  useEffect(() => {
    let zruseno = false;
    const nacti = () => {
      fetch("/prehled.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (!zruseno && jeSnimek(j)) setSnimek((s) => prijmiSnimek(s, j)); })
        .catch(() => {});
    };
    nacti();
    const t = setInterval(nacti, OBNOVA_MS);
    const vid = () => { if (document.visibilityState === "visible") nacti(); };
    document.addEventListener("visibilitychange", vid);
    return () => { zruseno = true; clearInterval(t); document.removeEventListener("visibilitychange", vid); };
  }, []);

  const p = useMemo(() => sestavPrehled(snimek, lokalita, konfigurace, ted), [snimek, lokalita, konfigurace, ted]);
  const zmenLokalitu = (hodnota: string) => {
    const l: Lokalita = hodnota === "" ? { druh: "nenastaveno" } : hodnota === "cr" ? { druh: "cr" } : { druh: "kraj", kraj: hodnota as Kraj };
    setLokalita(l);
    ulozLokalitu(l);
  };

  const ramecek = p.hlavni.ton === "vystraha"
    ? "border-akcent/70 bg-akcent/[0.06]"
    : p.hlavni.ton === "pozor" ? "border-dashed border-jantar/70 bg-jantar/[0.06]" : "border-linka bg-plocha";
  const ikona = p.hlavni.ton === "vystraha" ? "vystraha" : p.hlavni.ton === "pozor" ? "hodiny" : "info";
  const stitekStavu = p.hlavni.ton === "vystraha" ? "Oficiální výstraha" : p.hlavni.ton === "pozor" ? "Omezená aktuálnost" : "Stav zdrojů";
  const aktualnich = p.zdroje.filter((z) => z.stav === "aktualni").length;
  const testovanych = p.zdroje.filter((z) => z.stav !== "neoveritelny").length;

  return (
    <section aria-labelledby="rp-nadpis" className="mt-4 rounded-[22px] border border-linka bg-plocha p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="rp-nadpis" className="nadpis-boxu">Rychlý přehled</h2>
        <label className="flex items-center gap-2 text-mikro text-tlum">
          <span>Oblast</span>
          <select
            value={p.lokalita.druh === "kraj" ? p.lokalita.kraj : p.lokalita.druh === "cr" ? "cr" : ""}
            onChange={(e) => zmenLokalitu(e.target.value)}
            className="min-h-[36px] rounded-[10px] border border-linka bg-papir px-2 text-male text-inkoust focus-visible:outline focus-visible:outline-2 focus-visible:outline-akcent"
          >
            <option value="">Nezvolena</option>
            <option value="cr">Celá ČR</option>
            {KRAJE.map((k) => <option key={k} value={k}>{k === "Hlavní město Praha" || k === "Vysočina" ? (k === "Vysočina" ? "Kraj Vysočina" : k) : `${k} kraj`}</option>)}
          </select>
        </label>
      </div>

      {p.lokalita.druh === "nenastaveno" && <p className="mt-2 text-male leading-snug text-tlum">{T.TEXT_LOKALITA_NENASTAVENA}</p>}

      {/* Hlavní sdělení. Čtečka ohlásí jen změnu nadpisu, ne tikání minut ve větě. */}
      <div className={`mt-3 rounded-[16px] border px-3.5 py-3 ${ramecek}`}>
        <p className="flex items-center gap-1.5 text-mikro font-semibold uppercase tracking-wide text-tlum">
          <Ikona nazev={ikona} velikost={14} tah={2} /> {stitekStavu}
        </p>
        <p className="mt-1 text-zaklad font-bold leading-snug text-inkoust">{p.hlavni.nadpis}</p>
        <p className="mt-1 text-male leading-relaxed text-tlum">{p.hlavni.veta}</p>
        <p className="sr-only" role="status" aria-live="polite">{p.hlavni.nadpis}</p>
      </div>

      {/* Oficiální informace pro oblast — konečný seznam, žádné dočítání. */}
      {p.oficialni.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Oficiální výstrahy, pokyny a opatření">
          {p.oficialni.slice(0, MAX_POLOZEK).map((i) => <OficialniPolozka key={i.id} i={i} ted={ted} />)}
        </ul>
      )}
      {/* Konečný přehled: nad pět položek se další rozbalí vědomě, nic se nedočítá samo. */}
      {p.oficialni.length > MAX_POLOZEK && (
        <details className="mt-2">
          <summary className="cursor-pointer text-male font-semibold text-akcent focus-visible:outline focus-visible:outline-2 focus-visible:outline-akcent">Další oficiální informace ({p.oficialni.length - MAX_POLOZEK})</summary>
          <ul className="mt-2 space-y-2">{p.oficialni.slice(MAX_POLOZEK).map((i) => <OficialniPolozka key={i.id} i={i} ted={ted} />)}</ul>
        </details>
      )}
      {p.mimoOblast > 0 && (
        <p className="mt-2 text-mikro text-tlum2">Mimo zvolenou oblast: {p.mimoOblast} {p.mimoOblast === 1 ? "oficiální výstraha" : "oficiální výstrahy"}.</p>
      )}

      {/* Čerstvost a rozpis zdrojů. Čas je čas kontroly zdrojů, nikdy čas buildu nebo stránky. */}
      <details className="group mt-3 rounded-[14px] bg-plocha2/50 px-3 py-2">
        <summary className="cursor-pointer list-none text-male text-tlum focus-visible:outline focus-visible:outline-2 focus-visible:outline-akcent">
          <span className="font-semibold text-inkoust">Kontrola zdrojů: </span>
          {p.posledniKontrola ? `${kdyKratce(p.posledniKontrola, ted)} (${predKolika(p.posledniKontrola, ted)})` : "zatím žádná úspěšná"}
          {" · "}{aktualnich} z {testovanych} aktuálních
          <span className="ml-1 text-akcent underline-offset-2 group-open:hidden">rozpis</span>
          <span className="ml-1 hidden text-akcent group-open:inline">skrýt</span>
        </summary>
        <RozpisZdroju zdroje={p.zdroje} ted={ted} necteme={p.pokryti.necteme} />
      </details>

      {/* Potvrzené události a analýza — oddělené od výstrah a označené. */}
      {p.udalosti.length > 0 && (
        <div className="mt-3">
          <h3 className="text-mikro font-semibold text-tlum">{T.STITEK_UDALOST} · Česko, 7 dní</h3>
          <ul className="mt-1 space-y-1.5">
            {p.udalosti.map((u) => (
              <li key={u.id} className="text-male leading-snug">
                <a href={u.detail ?? u.odkaz ?? "#"} className="font-semibold text-inkoust underline-offset-2 hover:underline">{u.titulek}</a>
                <span className="block text-mikro text-tlum2">
                  {u.vydano ? kdyKratce(u.vydano, ted) : ""}{u.jistota ? ` · ${u.jistota}` : ""}{u.coNevime[0] ? ` · Nevíme: ${u.coNevime[0]}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.analyza && (
        <p className="mt-3 text-male leading-snug text-tlum">
          <span className="font-semibold text-inkoust">{T.STITEK_ANALYZA}.</span>{" "}
          {p.analyza.titulek} ({p.analyza.jistota}). <a href={p.analyza.detail ?? "/metodika/"} className="text-akcent underline-offset-2 hover:underline">Jak počítáme</a>
        </p>
      )}
      <p className="mt-2 text-mikro leading-snug text-tlum2">
        Neověřené zprávy z médií ({p.neovereno.signalu24h} za 24 h) řadíme zvlášť a do přehledu nevstupují.
        {p.neovereno.vyvracenych > 0 && <> Vyvrácené: <a href="/udalosti/?overeni=neprosle" className="text-akcent underline-offset-2 hover:underline">{p.neovereno.vyvracenych}</a>{p.neovereno.oznacenoUradem > 0 ? `, z toho ${p.neovereno.oznacenoUradem} označil úřad za nepravdivé či poplašné` : ""}.</>}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-linka pt-3">
        <p className="text-mikro leading-snug text-tlum">{T.TEXT_ODPOVEDNOST}</p>
        <a href="#podrobny-monitoring" className="text-male font-semibold text-akcent underline-offset-2 hover:underline">Podrobný monitoring</a>
      </div>
    </section>
  );
}

function OficialniPolozka({ i, ted }: { i: VyhodnocenaInformace; ted: number }) {
  const aktivni = i.stav === "platna" || i.stav === "nadchazejici" || i.stav === "opravena";
  return (
    <li className={`rounded-[14px] border px-3 py-2.5 ${aktivni && i.vztah === "v-uzemi" ? "border-akcent/60" : "border-linka"}`}>
      <p className="text-mikro font-semibold text-tlum">{TYP[i.typ]} · {STAV_INFO[i.stav]}{i.vztah === "nelze-urcit" ? " · územní rozsah nejistý" : ""}</p>
      <p className={`mt-0.5 text-male font-bold leading-snug ${aktivni ? "text-inkoust" : "text-tlum line-through decoration-1"}`}>{i.titulek}</p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-mikro leading-snug text-tlum">
        <dt>Vydal</dt><dd className="text-inkoust">{i.vydavatel ?? "neuvedeno"}</dd>
        <dt>Území</dt><dd>{T.textUzemi(i)}</dd>
        <dt>Platnost</dt><dd>{T.textPlatnosti(i, ted)}</dd>
        {i.vydano && <><dt>Vydáno</dt><dd>{kdyKratce(i.vydano, ted)}</dd></>}
      </dl>
      {i.text && <p className="mt-1.5 text-mikro leading-relaxed text-tlum"><span className="font-semibold">{i.textJe === "zneni-vydavatele" ? T.STITEK_ZNENI : T.STITEK_SHRNUTI}:</span> {i.text}</p>}
      {/* Pokyn jen doslova z originálu; když v originále není, nic se nedoplňuje. */}
      {i.pokyn && <p className="mt-1.5 text-male leading-snug text-inkoust"><span className="font-semibold">Pokyn vydavatele:</span> „{i.pokyn}“</p>}
      {i.zmenuNelzeOverit && <p className="mt-1.5 text-mikro font-semibold text-inkoust">Novější změnu ani odvolání teď neověříme.</p>}
      {i.odkaz && <a href={i.odkaz} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-mikro font-semibold text-akcent underline-offset-2 hover:underline">Originál u vydavatele</a>}
    </li>
  );
}

function RozpisZdroju({ zdroje, ted, necteme }: { zdroje: VyhodnocenyZdroj[]; ted: number; necteme: string[] }) {
  const skupiny = [...new Map(zdroje.map((z) => [z.skupina, z.nazevSkupiny])).entries()];
  return (
    <div className="mt-2 space-y-2">
      {skupiny.map(([klic, nazev]) => (
        <div key={klic}>
          <h3 className="text-mikro font-semibold text-inkoust">{nazev}{zdroje.find((z) => z.skupina === klic)?.zasadni ? " · zásadní pro přehled" : ""}</h3>
          <ul className="mt-0.5">
            {zdroje.filter((z) => z.skupina === klic).map((z) => (
              <li key={z.klic} className="grid grid-cols-[14px_1fr] gap-x-1.5 py-0.5 text-mikro leading-snug text-tlum">
                <span aria-hidden className="text-center">{STAV_ZDROJE[z.stav].znak}</span>
                <span>
                  <span className="text-inkoust">{z.nazev}</span>
                  <span className="block">{STAV_ZDROJE[z.stav].text}{z.stav !== "neoveritelny" && <span className="text-tlum2"> · naposledy {z.posledniUspech ? kdyKratce(z.posledniUspech, ted) : "nikdy"}</span>}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <h3 className="text-mikro font-semibold text-inkoust">Co zatím nečteme</h3>
        <ul className="mt-0.5 list-disc pl-4 text-mikro leading-snug text-tlum">{necteme.map((n) => <li key={n}>{n}</li>)}</ul>
      </div>
      <p className="text-mikro text-tlum2">Výstrahy ČHMÚ čteme strojově i s územím a platností; ostatní úřady podle klíčových slov. <a href="/zdroje/" className="text-akcent underline-offset-2 hover:underline">Všechny zdroje</a></p>
    </div>
  );
}
