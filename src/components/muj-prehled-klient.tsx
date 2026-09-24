"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { druh, kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import { KATEGORIE, PORADI_KATEGORII } from "@/lib/kategorie";
import { zaznamejUdalost } from "@/lib/mereni";
import { UROVNE } from "@/lib/skala";
import type { Kategorie } from "@/lib/typy";
import { UCTY_ZAPNUTE } from "@/config/web";
import { useUcet } from "@/lib/ucet";
import { Ikona } from "./ikony";
import { Sdeleni, Tlacitko } from "./ui";
import { Vlajka } from "./zeme";

/*
  Můj přehled — funkce po přihlášení, předvolby jen v tomto zařízení.

  Stránka se otevře jen přihlášenému. Výběr se přesto ukládá do
  localStorage a nikam se neposílá: účet slouží jako klíč ke dveřím, ne
  jako místo, kam by se posílalo, co kdo sleduje. Bez polohy: web
  nepotřebuje vědět, kde jste, aby ukázal, co sledujete. Když úložiště
  nefunguje (soukromé okno), stránka to řekne a funguje bez ukládání.
*/

/** Co vidí nepřihlášený místo obsahu: zámek, jedna věta, cesta k přihlášení. */
export function Zamceno({ co }: { co: string }) {
  return (
    <div className="rounded-[22px] bg-plocha p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent"><Ikona nazev="zamek" velikost={18} tah={2} /></span>
        <div className="min-w-0">
          <p className="text-vetsi font-bold text-inkoust">{co} je pro přihlášené</p>
          <p className="mt-1 text-male text-tlum">
            {UCTY_ZAPNUTE ? "Účet je bez jména a e-mailu, passkey v zařízení. Založení trvá minutu." : "Účty zatím neběží. Až poběží, otevře se tu."}
          </p>
          {UCTY_ZAPNUTE && (
            <p className="mt-3"><Tlacitko kam="/ucet/" varianta="plny" velikost="m" ikona="zamek">Přihlásit nebo založit účet</Tlacitko></p>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const { ucet, nacita } = useUcet();
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
  const cip = (aktivni: boolean) => `inline-flex min-h-[40px] items-center gap-1.5 rounded-[12px] border px-3 text-male font-semibold transition-colors ${aktivni ? "border-akcent/60 bg-akcent/15 text-akcent-svetla" : "border-linka text-tlum hover:border-akcent/50 hover:text-inkoust"}`;

  /* Až po všech hoocích: pořadí hooků se nesmí měnit podle stavu přihlášení. */
  if (nacita) return <Sdeleni ikona="zamek">Ověřuji přihlášení…</Sdeleni>;
  if (!ucet) return <Zamceno co="Můj přehled" />;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-x-14">
      <div className="min-w-0 space-y-8">
        <p role="status" className="inline-flex items-center gap-2 rounded-[12px] border border-linka bg-plocha px-3 py-2 text-male text-tlum">
          <Ikona nazev="zamek" velikost={13} tah={2} />
          {ulozisteFunguje ? "Uloženo v tomto zařízení. Nikam se neposílá, poloha se nezjišťuje." : "Úložiště prohlížeče není dostupné — výběr platí jen do zavření stránky."}
        </p>

        <section aria-labelledby="mp-zeme">
          <h2 id="mp-zeme" className="text-velke font-bold">Země, které sleduji</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {zeme.map(([kod, nazev]) => (
              <button key={kod} type="button" aria-pressed={p.zeme.includes(kod)} onClick={() => uloz({ ...p, zeme: prepni(p.zeme, kod) })} className={cip(p.zeme.includes(kod))}>
                <Vlajka kod={kod} /> {nazev}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="mp-temata">
          <h2 id="mp-temata" className="text-velke font-bold">Témata</h2>
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
            <h2 id="mp-vyber" className="text-velke font-bold">Poslední záznamy podle mého výběru</h2>
            {maVyber && (
              <Link href={`/udalosti/?${new URLSearchParams({ ...(p.zeme.length === 1 ? { zeme: p.zeme[0] } : {}), ...(p.temata.length === 1 ? { tema: p.temata[0] } : {}) }).toString()}`} className="text-male font-semibold text-akcent hover:text-akcent-svetla">
                Otevřít v Událostech
              </Link>
            )}
          </div>
          {!nacteno ? null : !maVyber ? (
            <p className="mt-2 text-zaklad text-tlum">Zatím nic nesledujete. Vyberte zemi nebo téma výše.</p>
          ) : vybrane.length ? (
            <ol className="mt-3 border-y border-linka2">
              {vybrane.map((z) => (
                <li key={z.id}>
                  <Link href={`/incident/${z.slug}/`} className="flex min-h-[44px] items-center gap-3 py-2 hover:bg-plocha">
                    <span className="cislice w-[92px] shrink-0 text-drobne text-tlum">{datumPraha(kdyZjisteno(z))}</span>
                    <Vlajka kod={z.kodZeme} />
                    <span className="min-w-0 flex-1 truncate text-zaklad font-semibold text-inkoust">{z.kratkyTitulek || z.titulek}</span>
                    <span className="hidden shrink-0 text-drobne text-tlum2 sm:inline">{druh(z) === "pripad" ? UROVNE[z.zavaznost].nazev : druh(z)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-zaklad text-tlum">Pro tento výběr není zveřejněný žádný záznam.</p>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section aria-labelledby="mp-ulozene" className="rounded-[22px] border border-linka bg-plocha p-5">
          <h2 id="mp-ulozene" className="text-vetsi font-bold">Uložené události</h2>
          <p className="mt-1 text-male text-tlum">Uložit jde tlačítkem na stránce události.</p>
          {ulozene.length ? (
            <ul className="mt-3 space-y-2">
              {ulozene.map((z) => (
                <li key={z.slug} className="flex items-start gap-2">
                  <Link href={`/incident/${z.slug}/`} className="min-w-0 flex-1 text-zaklad font-semibold text-inkoust hover:text-akcent-svetla">{z.kratkyTitulek || z.titulek}</Link>
                  <button type="button" onClick={() => uloz({ ...p, ulozene: p.ulozene.filter((s) => s !== z.slug) })} className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-tlum2 hover:bg-plocha2 hover:text-inkoust" aria-label={`Odebrat ${z.kratkyTitulek || z.titulek}`}>
                    <Ikona nazev="krizek" velikost={12} tah={2.4} />
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-zaklad text-tlum2">Zatím žádná.</p>}
        </section>
        <section className="rounded-[22px] border border-linka bg-plocha p-5">
          <h2 className="text-vetsi font-bold">Odběr bez účtu</h2>
          <p className="mt-1 text-male leading-relaxed text-tlum">RSS kanál obsahuje všechny zveřejněné záznamy. Filtrovaný odběr podle tohoto výběru zatím není — neslibujeme ho.</p>
          <Link href="/odber/" className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-male font-semibold text-akcent hover:text-akcent-svetla">Odběr a RSS</Link>
        </section>
        {(maVyber || p.ulozene.length > 0) && (
          <button type="button" onClick={() => uloz(VYCHOZI)} className="min-h-[44px] text-male text-tlum underline underline-offset-4 hover:text-inkoust">
            Smazat vše uložené v tomto zařízení
          </button>
        )}
      </aside>
    </div>
  );
}

/** Tlačítko na stránce události. */
export function UlozitUdalost({ slug }: { slug: string }) {
  const { ucet, nacita } = useUcet();
  const [ulozeno, setUlozeno] = useState(false);
  const [nacteno, setNacteno] = useState(false);
  useEffect(() => { setUlozeno(jeUlozeno(slug)); setNacteno(true); }, [slug]);
  const prepni = () => {
    const p = nacti() ?? VYCHOZI;
    const nove = { ...p, ulozene: p.ulozene.includes(slug) ? p.ulozene.filter((s) => s !== slug) : [...p.ulozene, slug] };
    try { localStorage.setItem(KLIC, JSON.stringify(nove)); zaznamejUdalost("preference_save", { slug }); } catch { /* bez úložiště jen pro tuto stránku */ }
    setUlozeno(nove.ulozene.includes(slug));
  };
  if (!nacteno || nacita) return null;
  /* Bez účtu se neukládá — tlačítko to říká zámkem a vede na přihlášení. */
  if (!ucet) {
    // Bez účtové služby se tlačítko neukazuje vůbec — mrtvá výzva pod titulkem (revize 24. 9. 2026).
    if (!UCTY_ZAPNUTE) return null;
    return (
      <Link href="/ucet/" className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2.5 text-drobne font-semibold text-tlum2 hover:bg-plocha2 hover:text-inkoust">
        <span className="text-akcent"><Ikona nazev="zamek" velikost={13} tah={2.2} /></span> Uložit do Mého přehledu · po přihlášení
      </Link>
    );
  }
  return (
    <button type="button" onClick={prepni} aria-pressed={ulozeno} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[12px] border border-linka px-3 text-male font-semibold text-tlum hover:border-akcent hover:text-inkoust">
      <Ikona nazev={ulozeno ? "fajfka" : "plus"} velikost={12} tah={2.4} /> {ulozeno ? "Uloženo v Mém přehledu" : "Uložit do Mého přehledu"}
    </button>
  );
}

/**
 * Karta Můj přehled v sekci Sledovat. Bez přihlášení je zašedlá, se zámkem
 * v barvě značky a vede na přihlášení; po přihlášení je to běžný odkaz.
 */
export function KartaMujPrehled({ trida }: { trida: string }) {
  const { ucet, nacita } = useUcet();
  const zamceno = nacita || !ucet;
  return (
    <Link href={zamceno ? "/ucet/" : "/muj-prehled/"} className={`${trida} ${zamceno ? "border-linka hover:border-akcent/60" : "border-linka hover:border-akcent"}`} aria-label={zamceno ? "Můj přehled — vyžaduje přihlášení" : undefined}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-plocha2 ${zamceno ? "text-tlum2" : "text-akcent"}`}><Ikona nazev="terc" velikost={16} tah={2} /></span>
      <span className="min-w-0 flex-1">
        <span className={`block text-male font-bold ${zamceno ? "text-tlum" : "text-inkoust"}`}>Můj přehled</span>
        <span className={`block text-mikro ${zamceno ? "text-tlum2" : "text-tlum"}`}>{zamceno ? (UCTY_ZAPNUTE ? "po přihlášení" : "účty připravujeme") : "jen země a témata, která sledujete"}</span>
      </span>
      {zamceno && <span className="shrink-0 text-akcent"><Ikona nazev="zamek" velikost={15} tah={2} /></span>}
    </Link>
  );
}
