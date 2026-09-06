"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { druh, kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import { KATEGORIE, PORADI_KATEGORII } from "@/lib/kategorie";
import { zaznamejUdalost } from "@/lib/mereni";
import { UROVNE } from "@/lib/skala";
import type { Kategorie } from "@/lib/typy";
import { Ikona } from "./ikony";
import { Vlajka } from "./zeme";

/*
  Můj přehled — předvolby jen v tomto zařízení.

  Uloženo v localStorage, nikam se neposílá. Bez polohy: web nepotřebuje
  vědět, kde jste, aby ukázal, co sledujete. Když úložiště nefunguje
  (soukromé okno), stránka to řekne a funguje bez ukládání.
*/

const KLIC = "czechpatrol:muj-prehled:v1";

interface Predvolby {
  zeme: string[];
  temata: Kategorie[];
  ulozene: string[];
}

const VYCHOZI: Predvolby = { zeme: [], temata: [], ulozene: [] };

function nacti(): Predvolby | null {
  try {
    const s = localStorage.getItem(KLIC);
    if (!s) return VYCHOZI;
    const p = JSON.parse(s) as Partial<Predvolby>;
    return { zeme: p.zeme ?? [], temata: (p.temata ?? []).filter((t): t is Kategorie => (PORADI_KATEGORII as string[]).includes(t)), ulozene: p.ulozene ?? [] };
  } catch {
    return null;
  }
}

export function jeUlozeno(slug: string): boolean {
  return nacti()?.ulozene.includes(slug) ?? false;
}

export function MujPrehledKlient({ zaznamy }: { zaznamy: Zaznam[] }) {
  const [p, setP] = useState<Predvolby>(VYCHOZI);
  const [ulozisteFunguje, setUlozisteFunguje] = useState(true);
  const [nacteno, setNacteno] = useState(false);

  useEffect(() => {
    const n = nacti();
    if (n) setP(n); else setUlozisteFunguje(false);
    setNacteno(true);
  }, []);

  const uloz = (nove: Predvolby) => {
    setP(nove);
    try {
      localStorage.setItem(KLIC, JSON.stringify(nove));
      zaznamejUdalost("preference_save");
    } catch {
      setUlozisteFunguje(false);
    }
  };

  const zeme = useMemo(() => {
    const m = new Map<string, string>();
    for (const z of zaznamy) m.set(z.kodZeme, z.kodZeme === "CZ" ? "Česko" : z.zeme);
    return [...m.entries()].sort((a, b) => (a[0] === "CZ" ? -1 : b[0] === "CZ" ? 1 : a[1].localeCompare(b[1], "cs")));
  }, [zaznamy]);
  const temata = useMemo(() => {
    const s = new Set<Kategorie>();
    for (const z of zaznamy) for (const k of z.kategorie) s.add(k);
    return PORADI_KATEGORII.filter((k) => s.has(k));
  }, [zaznamy]);

  const maVyber = p.zeme.length > 0 || p.temata.length > 0;
  const vybrane = useMemo(() => zaznamy
    .filter((z) => (!p.zeme.length || p.zeme.includes(z.kodZeme)) && (!p.temata.length || z.kategorie.some((k) => p.temata.includes(k))))
    .slice(0, 10), [zaznamy, p]);
  const ulozene = p.ulozene.map((s) => zaznamy.find((z) => z.slug === s)).filter((z): z is Zaznam => Boolean(z));

  const prepni = <T extends string>(pole: T[], h: T) => (pole.includes(h) ? pole.filter((x) => x !== h) : [...pole, h]);
  const cip = (aktivni: boolean) => `inline-flex min-h-[40px] items-center gap-1.5 rounded-[12px] border px-3 text-[13.5px] font-semibold transition-colors ${aktivni ? "border-akcent/60 bg-akcent/15 text-akcent-svetla" : "border-linka text-tlum hover:border-akcent/50 hover:text-inkoust"}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-8">
        <p role="status" className="inline-flex items-center gap-2 rounded-[12px] border border-linka bg-plocha px-3 py-2 text-[13px] text-tlum">
          <Ikona nazev="zamek" velikost={13} tah={2} />
          {ulozisteFunguje ? "Uloženo v tomto zařízení. Nikam se neposílá, poloha se nezjišťuje." : "Úložiště prohlížeče není dostupné — výběr platí jen do zavření stránky."}
        </p>

        <section aria-labelledby="mp-zeme">
          <h2 id="mp-zeme" className="text-[18px] font-bold">Země, které sleduji</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {zeme.map(([kod, nazev]) => (
              <button key={kod} type="button" aria-pressed={p.zeme.includes(kod)} onClick={() => uloz({ ...p, zeme: prepni(p.zeme, kod) })} className={cip(p.zeme.includes(kod))}>
                <Vlajka kod={kod} /> {nazev}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="mp-temata">
          <h2 id="mp-temata" className="text-[18px] font-bold">Témata</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {temata.map((k) => (
              <button key={k} type="button" aria-pressed={p.temata.includes(k)} onClick={() => uloz({ ...p, temata: prepni(p.temata, k) })} className={cip(p.temata.includes(k))}>
                {KATEGORIE[k].nazev}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="mp-vyber">
          <div className="flex items-end justify-between gap-3">
            <h2 id="mp-vyber" className="text-[18px] font-bold">Poslední záznamy podle mého výběru</h2>
            {maVyber && (
              <Link href={`/udalosti/?${new URLSearchParams({ ...(p.zeme.length === 1 ? { zeme: p.zeme[0] } : {}), ...(p.temata.length === 1 ? { tema: p.temata[0] } : {}) }).toString()}`} className="text-[13.5px] font-semibold text-akcent hover:text-akcent-svetla">
                Otevřít v Událostech
              </Link>
            )}
          </div>
          {!nacteno ? null : !maVyber ? (
            <p className="mt-2 text-[14px] text-tlum">Zatím nic nesledujete. Vyberte zemi nebo téma výše.</p>
          ) : vybrane.length ? (
            <ol className="mt-3 divide-y divide-linka2 border-y border-linka2">
              {vybrane.map((z) => (
                <li key={z.id}>
                  <Link href={`/incident/${z.slug}/`} className="flex min-h-[44px] items-center gap-3 py-2 hover:bg-plocha">
                    <span className="cislice w-[92px] shrink-0 text-[12.5px] text-tlum">{datumPraha(kdyZjisteno(z))}</span>
                    <Vlajka kod={z.kodZeme} />
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-inkoust">{z.kratkyTitulek || z.titulek}</span>
                    <span className="hidden shrink-0 text-[12px] text-tlum2 sm:inline">{druh(z) === "pripad" ? UROVNE[z.zavaznost].nazev : druh(z)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-[14px] text-tlum">Pro tento výběr není zveřejněný žádný záznam.</p>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section aria-labelledby="mp-ulozene" className="rounded-[22px] border border-linka bg-plocha p-5">
          <h2 id="mp-ulozene" className="text-[16px] font-bold">Uložené události</h2>
          <p className="mt-1 text-[13px] text-tlum">Uložit jde tlačítkem na stránce události.</p>
          {ulozene.length ? (
            <ul className="mt-3 space-y-2">
              {ulozene.map((z) => (
                <li key={z.slug} className="flex items-start gap-2">
                  <Link href={`/incident/${z.slug}/`} className="min-w-0 flex-1 text-[14px] font-semibold text-inkoust hover:text-akcent-svetla">{z.kratkyTitulek || z.titulek}</Link>
                  <button type="button" onClick={() => uloz({ ...p, ulozene: p.ulozene.filter((s) => s !== z.slug) })} className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-tlum2 hover:bg-plocha2 hover:text-inkoust" aria-label={`Odebrat ${z.kratkyTitulek || z.titulek}`}>
                    <Ikona nazev="krizek" velikost={12} tah={2.4} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-[14px] text-tlum2">Zatím žádná.</p>}
        </section>
        <section className="rounded-[22px] border border-linka bg-plocha p-5">
          <h2 className="text-[16px] font-bold">Odběr bez účtu</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-tlum">RSS kanál obsahuje všechny zveřejněné záznamy. Filtrovaný odběr podle tohoto výběru zatím není — neslibujeme ho.</p>
          <Link href="/odber/" className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-[13.5px] font-semibold text-akcent hover:text-akcent-svetla">Odběr a RSS</Link>
        </section>
        {(maVyber || p.ulozene.length > 0) && (
          <button type="button" onClick={() => uloz(VYCHOZI)} className="min-h-[44px] text-[13.5px] text-tlum underline underline-offset-4 hover:text-inkoust">
            Smazat vše uložené v tomto zařízení
          </button>
        )}
      </aside>
    </div>
  );
}

/** Tlačítko na stránce události. */
export function UlozitUdalost({ slug }: { slug: string }) {
  const [ulozeno, setUlozeno] = useState(false);
  const [nacteno, setNacteno] = useState(false);
  useEffect(() => { setUlozeno(jeUlozeno(slug)); setNacteno(true); }, [slug]);
  const prepni = () => {
    const p = nacti() ?? VYCHOZI;
    const nove = { ...p, ulozene: p.ulozene.includes(slug) ? p.ulozene.filter((s) => s !== slug) : [...p.ulozene, slug] };
    try { localStorage.setItem(KLIC, JSON.stringify(nove)); zaznamejUdalost("preference_save", { slug }); } catch { /* bez úložiště jen pro tuto stránku */ }
    setUlozeno(nove.ulozene.includes(slug));
  };
  if (!nacteno) return null;
  return (
    <button type="button" onClick={prepni} aria-pressed={ulozeno} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[12px] border border-linka px-3 text-[13.5px] font-semibold text-tlum hover:border-akcent hover:text-inkoust">
      <Ikona nazev={ulozeno ? "fajfka" : "plus"} velikost={12} tah={2.4} /> {ulozeno ? "Uloženo v Mém přehledu" : "Uložit do Mého přehledu"}
    </button>
  );
}
