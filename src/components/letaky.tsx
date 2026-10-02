import { NALEZ_KROKY, TONY_SIREN, VYSTRAHA_KROKY, ZDROJE_LETAKU, type Zdroj } from "@/lib/letaky";

/*
  Letáky „Co dělat“ — tři karty na tisk (každá na vlastní stránku A4)
  a malé verze do patičky. Žádný JavaScript: tisk i PDF jdou přes prohlížeč.
*/

export function Vlna({ tvar, trida = "" }: { tvar: "rovny" | "kolisavy" | "prerusovany"; trida?: string }) {
  const d = tvar === "rovny"
    ? "M4 30 L24 8 L176 8 L196 30"
    : tvar === "kolisavy"
      ? "M4 18 Q16 2 28 18 T52 18 T76 18 T100 18 T124 18 T148 18 T172 18 T196 18"
      : "M4 30 L20 8 L70 8 L90 30 L110 30 L130 8 L180 8 L196 30";
  return (
    <svg viewBox="0 0 200 36" aria-hidden className={trida} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Zdroje({ zdroje }: { zdroje: Zdroj[] }) {
  return (
    <p className="mt-4 text-drobne text-tlum2">
      Zdroj: {zdroje.map((z, i) => <span key={z.url}>{i > 0 && " · "}<a href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">{z.nazev}</a></span>)} · czechpatrol.cz/letaky
    </p>
  );
}

function Karta({ id, nadpis, children }: { id: string; nadpis: string; children: React.ReactNode }) {
  return (
    <section id={id} className="letak scroll-mt-20 rounded-[22px] border-2 border-linka bg-plocha p-5 sm:p-7">
      <h2 className="text-[1.6rem] font-extrabold leading-tight text-inkoust sm:text-[2rem]">{nadpis}</h2>
      {children}
    </section>
  );
}

export function LetakSireny() {
  return (
    <Karta id="sireny" nadpis="Sirény: tři tóny, které stojí za to znát">
      <ul className="mt-5 space-y-4">
        {TONY_SIREN.map((t) => (
          <li key={t.klic} className={`rounded-[16px] border p-4 ${t.klic === "vystraha" ? "border-akcent/60 bg-akcent/10" : "border-linka"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-velke font-bold text-inkoust">{t.nazev}</span>
              <span className="text-male text-tlum">{t.popis}</span>
            </div>
            <Vlna tvar={t.tvar} trida={`mt-2 h-9 w-full ${t.klic === "vystraha" ? "text-akcent" : t.klic === "pozar" ? "text-jantar" : "text-tlum"}`} />
            <p className="mt-2 text-zaklad font-semibold text-inkoust">{t.co}</p>
          </li>
        ))}
      </ul>
      <Zdroje zdroje={ZDROJE_LETAKU.sireny} />
    </Karta>
  );
}

function Kroky({ kroky }: { kroky: readonly { nadpis: string; text: string }[] }) {
  return (
    <ol className="mt-5 grid gap-3 sm:grid-cols-2">
      {kroky.map((k, i) => (
        <li key={k.nadpis} className="flex gap-3 rounded-[16px] border border-linka p-4">
          <span className="cislice grid h-9 w-9 shrink-0 place-items-center rounded-full bg-akcent text-velke font-bold text-papir">{i + 1}</span>
          <span>
            <b className="block text-velke font-bold leading-snug text-inkoust">{k.nadpis}</b>
            <span className="mt-1 block text-zaklad leading-snug text-tlum">{k.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function LetakVystraha() {
  return (
    <Karta id="vystraha" nadpis="Zazněla všeobecná výstraha? Dovnitř, zavřít, rádio.">
      <Kroky kroky={VYSTRAHA_KROKY} />
      <Zdroje zdroje={ZDROJE_LETAKU.vystraha} />
    </Karta>
  );
}

export function LetakNalez() {
  return (
    <Karta id="nalez" nadpis="Našli jste munici nebo trosky dronu? Nesahat, odejít, 158.">
      <Kroky kroky={NALEZ_KROKY} />
      <Zdroje zdroje={ZDROJE_LETAKU.nalez} />
    </Karta>
  );
}
