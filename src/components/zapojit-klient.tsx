"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL, EMAIL_ODBER_BEZI, KANALY, PROVOZOVATEL } from "@/config/web";
import { zaznamejUdalost } from "@/lib/mereni";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT } from "./formulare";
import { Ikona } from "./ikony";
import { Tlacitko } from "./ui";
import { ZnackaKanalu } from "./znacky";

/*
  Zapojení bez tlaku.

  Web nikomu nic neprodává, tak se ani nemá chovat jako obchod: žádné
  vyskakovací okno při příchodu, žádné odpočítávání, žádné „poslední
  šance". Nabídka přijde až po tom, co člověk sám něco udělal — otevřel
  Telegram nebo si založil účet — a říká jen, co dalšího existuje a proč
  by mu to mohlo pomoct. „Teď ne" je stejně velké tlačítko jako „ano"
  a platí měsíc.
*/

/** Co si člověk může nechat posílat. Klíče odpovídají api/src/zajem.ts. */
export const ZAJMY: { klic: "souhrn" | "komunita" | "pomoc" | "obce"; nazev: string; popis: string }[] = [
  { klic: "souhrn", nazev: "Souhrn e-mailem", popis: "co se změnilo, jednou za čas, bez každodenního psaní" },
  { klic: "komunita", nazev: "Pozvánka do komunity", popis: "až otevřeme chat a skupinu na WhatsAppu, dáme vědět první" },
  { klic: "pomoc", nazev: "Chci pomáhat", popis: "ověřování zdrojů, tipy z regionu, opravy" },
  { klic: "obce", nazev: "Jsem z obce, školy nebo záchranné složky", popis: "napíšeme, až budou zprávy pro instituce" },
];

/** Text souhlasu. Změna textu = nová verze v api/src/zajem.ts. */
const VERZE_SOUHLASU = "2026-09-22";

export function ZajemFormular({ zdroj }: { zdroj: string }) {
  const [email, setEmail] = useState("");
  const [zajmy, setZajmy] = useState<string[]>(["souhrn", "komunita"]);
  const [souhlas, setSouhlas] = useState(false);
  const [past, setPast] = useState("");
  const [stav, setStav] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const [odesila, setOdesila] = useState(false);

  /*
    Bez uvedeného správce údajů se e-maily nesbírají. Není to opatrnost
    navíc: čl. 13 GDPR chce, aby člověk věděl, komu adresu dává. Dokud
    v konfiguraci chybí PROVOZOVATEL, formulář se nezobrazí a web to řekne.
  */
  if (!EMAIL_ODBER_BEZI) {
    return (
      <div className="rounded-[18px] border border-dashed border-linka px-4 py-4">
        <p className="text-zaklad text-tlum">
          <b className="font-semibold text-inkoust">E-mailový odběr připravujeme.</b> Do té doby je nejrychlejší cesta Telegram, tady vedle.
        </p>
      </div>
    );
  }

  const prepni = (k: string) => setZajmy((z) => (z.includes(k) ? z.filter((x) => x !== k) : [...z, k]));

  const odesli = async (e: React.FormEvent) => {
    e.preventDefault();
    setStav(null);
    if (!souhlas) { setStav({ typ: "chyba", text: "Bez souhlasu e-mail neuložíme. Je to jediná věc, kterou o vás budeme mít." }); return; }
    if (!zajmy.length) { setStav({ typ: "chyba", text: "Vyberte prosím aspoň jednu věc, která vás zajímá." }); return; }
    setOdesila(true);
    try {
      const r = await fetch(`${API_URL}/zajem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zajmy, zdroj, souhlas, past, verze: VERZE_SOUHLASU }),
      });
      const data = (await r.json().catch(() => ({}))) as { chyba?: string };
      if (!r.ok) throw new Error(data.chyba ?? "Nepovedlo se odeslat.");
      zaznamejUdalost("zapojeni_email", { zdroj });
      setStav({ typ: "ok", text: "Díky, máme vás. První e-mail přijde, až bude co říct — ne dřív. V každém bude odhlášení na jedno kliknutí." });
      setEmail("");
    } catch (err) {
      setStav({ typ: "chyba", text: err instanceof Error ? err.message : "Nepovedlo se odeslat." });
    } finally {
      setOdesila(false);
    }
  };

  return (
    <form onSubmit={odesli} className="space-y-4">
      <div>
        <Popisek pro="zajem-email">Váš e-mail</Popisek>
        <input id="zajem-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={POLE} autoComplete="email" placeholder="jmeno@example.cz" />
      </div>
      <fieldset>
        <legend className="stitek mb-2">Co vás zajímá</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ZAJMY.map((z) => {
            const aktivni = zajmy.includes(z.klic);
            return (
              <li key={z.klic}>
                <label className={`flex min-h-[56px] cursor-pointer items-start gap-3 rounded-[18px] border px-3.5 py-3 transition-colors ${aktivni ? "border-akcent/60 bg-akcent/10" : "border-linka hover:border-akcent/50"}`}>
                  <input type="checkbox" checked={aktivni} onChange={() => prepni(z.klic)} className="mt-1 h-4 w-4 accent-akcent" />
                  <span className="min-w-0">
                    <span className="block text-male font-semibold text-inkoust">{z.nazev}</span>
                    <span className="block text-drobne text-tlum">{z.popis}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <label className="flex items-start gap-3 text-male leading-relaxed text-tlum">
        <input type="checkbox" checked={souhlas} onChange={(e) => setSouhlas(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-akcent" />
        <span>
          Souhlasím, aby <b className="font-semibold text-inkoust">{PROVOZOVATEL.nazev}</b> uložil můj e-mail a psal mi o CzechPatrol podle výběru výše.
          Nic jiného se neukládá. Odhlášení je jedním kliknutím v každém e-mailu.{" "}
          <Link href="/soukromi/" className="odkaz">Jak s adresou nakládáme</Link>
        </span>
      </label>
      {/* past na roboty — lidé pole nevidí */}
      <input tabIndex={-1} autoComplete="off" value={past} onChange={(e) => setPast(e.target.value)} className="hidden" aria-hidden />
      {stav && <Hlaska typ={stav.typ}>{stav.text}</Hlaska>}
      <button type="submit" disabled={odesila} className={TLACITKO_AKCENT}>
        <Ikona nazev="odeslat" velikost={14} tah={2} /> {odesila ? "Odesílám…" : "Přidat se"}
      </button>
    </form>
  );
}

/* ---------- jemné navádění po interakci ---------- */

const KLIC_ODLOZENI = "czechpatrol:zapojeni:odlozeno";
const ODLOZIT_DNI = 30;

type Podnet = "telegram" | "ucet";

const TEXTY: Record<Podnet, { nadpis: string; text: string }> = {
  telegram: {
    nadpis: "Telegram se otevřel v nové záložce.",
    text: "Chcete i občasný souhrn e-mailem a pozvánku do komunity, až ji otevřeme? Zabere to minutu a nic dalšího po vás nechceme.",
  },
  ucet: {
    nadpis: "Účet máte.",
    text: "Teď si můžete nastavit, co vám má chodit, a přidat e-mail pro souhrn a pozvánky. Obojí jde kdykoli zrušit.",
  },
};

function odlozeno(): boolean {
  try {
    const v = localStorage.getItem(KLIC_ODLOZENI);
    return Boolean(v && Date.now() - Number(v) < ODLOZIT_DNI * 86_400_000);
  } catch {
    return false;
  }
}

/**
 * Poslouchá kliknutí na prvky s `data-zapojeni="telegram|ucet"` kdekoli na
 * webu a po chvíli nabídne další krok. Jednou odložené se měsíc neukáže.
 */
export function NavadeniZapojeni() {
  const [podnet, setPodnet] = useState<Podnet | null>(null);
  const cesta = usePathname();

  useEffect(() => {
    const naKlik = (e: MouseEvent) => {
      const cil = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-zapojeni]");
      const druh = cil?.dataset.zapojeni as Podnet | undefined;
      if (!druh || !(druh in TEXTY) || odlozeno()) return;
      window.setTimeout(() => setPodnet(druh), 900);
    };
    document.addEventListener("click", naKlik);
    return () => document.removeEventListener("click", naKlik);
  }, []);

  /* Na stránce zapojení nemá smysl nabízet stránku zapojení. */
  if (!podnet || cesta.startsWith("/zapojit-se")) return null;

  const zavri = (odlozit: boolean) => {
    if (odlozit) { try { localStorage.setItem(KLIC_ODLOZENI, String(Date.now())); } catch { /* bez úložiště se jen zavře */ } }
    setPodnet(null);
  };
  const t = TEXTY[podnet];

  return (
    <div role="status" aria-live="polite" className="neni-tisk fixed inset-x-3 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[65] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px]">
      <div className="sklo rounded-[22px] border border-linka p-4 shadow-[0_18px_50px_-20px_rgb(0_0_0/0.8)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-akcent/15 text-akcent">
            {podnet === "telegram" ? <ZnackaKanalu znacka="telegram" velikost={20} /> : <Ikona nazev="uzivatel" velikost={17} tah={1.9} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-zaklad font-bold text-inkoust">{t.nadpis}</p>
            <p className="mt-1 text-male leading-relaxed text-tlum">{t.text}</p>
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <Tlacitko kam="/zapojit-se/" varianta="plny" velikost="s" onKlik={() => zavri(false)}>Jak se zapojit</Tlacitko>
              <Tlacitko varianta="obrys" velikost="s" onKlik={() => zavri(true)}>Teď ne</Tlacitko>
            </p>
          </div>
          <button type="button" onClick={() => zavri(true)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-tlum2 hover:bg-plocha hover:text-inkoust" aria-label="Zavřít">
            <Ikona nazev="krizek" velikost={14} tah={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Karta s dalšími kroky po přihlášení. Stejný tón: co existuje, ne co musíte. */
export function DalsiKroky() {
  return (
    <div className="rounded-[22px] bg-plocha p-5">
      <div className="mb-1 flex items-center gap-2"><span aria-hidden className="h-[6px] w-[6px] rounded-full bg-akcent" /><span className="stitek">Další kroky</span></div>
      <p className="text-zaklad text-tlum">Účet je hotový. Co dál dává smysl — vyberte si, nic z toho není povinné.</p>
      <ul className="mt-3 space-y-2">
        {KANALY.telegram && (
          <li>
            <a href={KANALY.telegram} target="_blank" rel="nofollow noopener noreferrer" className="flex min-h-[44px] items-center gap-3 rounded-[14px] border border-linka px-3 hover:border-akcent">
              <ZnackaKanalu znacka="telegram" velikost={20} />
              <span className="min-w-0 flex-1 text-male"><b className="font-semibold text-inkoust">Telegram</b> <span className="text-tlum">— urgentní upozornění hned</span></span>
              <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-45 text-tlum2" />
            </a>
          </li>
        )}
        <li>
          <Link href="/zapojit-se/" className="flex min-h-[44px] items-center gap-3 rounded-[14px] border border-linka px-3 hover:border-akcent">
            <ZnackaKanalu znacka="email" velikost={20} />
            <span className="min-w-0 flex-1 text-male"><b className="font-semibold text-inkoust">E-mail a komunita</b> <span className="text-tlum">— souhrn, pozvánky, pomoc s ověřováním</span></span>
            <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-90 text-tlum2" />
          </Link>
        </li>
        <li>
          <Link href="/odolnost/" className="flex min-h-[44px] items-center gap-3 rounded-[14px] border border-linka px-3 hover:border-akcent">
            <span className="grid h-5 w-5 place-items-center text-akcent"><Ikona nazev="stit" velikost={17} tah={1.9} /></span>
            <span className="min-w-0 flex-1 text-male"><b className="font-semibold text-inkoust">Odolnost domácnosti</b> <span className="text-tlum">— co u vás vypadne s čím a co má smysl řešit první</span></span>
            <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-90 text-tlum2" />
          </Link>
        </li>
        <li>
          <Link href="/muj-prehled/" className="flex min-h-[44px] items-center gap-3 rounded-[14px] border border-linka px-3 hover:border-akcent">
            <span className="grid h-5 w-5 place-items-center text-akcent"><Ikona nazev="terc" velikost={17} tah={1.9} /></span>
            <span className="min-w-0 flex-1 text-male"><b className="font-semibold text-inkoust">Můj přehled</b> <span className="text-tlum">— jen země a témata, která sledujete</span></span>
            <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-90 text-tlum2" />
          </Link>
        </li>
      </ul>
    </div>
  );
}
