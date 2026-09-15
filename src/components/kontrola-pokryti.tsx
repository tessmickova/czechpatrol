import { kontrolaPokryti, souhrnPokryti, STUPNE, type StupenPokryti } from "@/lib/pokryti-stavu";
import { Odznak, type Ton } from "./ui";

/*
  Kontrola pokrytí: u kterých stavů máme použitelné zdroje a které teprve
  potřebujeme sehnat.

  Proč to je veřejně a ne jen v interní dokumentaci: web u většiny úředních
  stavů nedokáže doložit, že opatření NEPLATÍ — sledované stránky úřadů
  nejsou úplné seznamy. Kdyby se to nikde neřeklo, vypadalo by „vyhlášení
  nedoloženo" jako naše nedbalost. Je to popis toho, co z veřejných zdrojů
  jde a nejde zjistit, a zároveň seznam práce, kterou je potřeba udělat.
*/

const TON_STUPNE: Record<StupenPokryti, Ton> = {
  uplne: "klid",
  vicezdrojove: "neutral",
  jednozdrojove: "pozor",
  chybi: "vazne",
};

export function KontrolaPokryti() {
  const radky = kontrolaPokryti();
  const s = souhrnPokryti(radky);
  const skupiny = ["Právní stav", "NATO", "Běžný život"] as const;

  return (
    <section aria-labelledby="pokryti-nadpis" className="space-y-5">
      <div>
        <h2 id="pokryti-nadpis" className="titul-mensi">Co o kterém stavu můžeme vědět</h2>
        <p className="mt-2 max-w-[52ch] text-zaklad leading-relaxed text-tlum">
          Sledujeme {s.celkem} úředních stavů. Doložit, že opatření neplatí, jde jen z úplného
          registru — takový máme u <b className="font-semibold text-inkoust">{s.uplne}</b> z nich.
          U zbytku umíme spolehlivě zachytit vyhlášení, ale ne jeho nepřítomnost.
        </p>
      </div>

      {skupiny.map((sk) => {
        const moje = radky.filter((r) => r.skupina === sk);
        if (!moje.length) return null;
        return (
          <div key={sk} className="overflow-hidden rounded-[20px] border border-linka2 bg-plocha">
            <div className="stitek border-b border-linka2 px-3 py-2">{sk}</div>
            <ul>
              {moje.map((r) => (
                <li key={`${sk}-${r.klic}`} className="border-b border-linka2 px-3 py-2.5 last:border-b-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-zaklad font-semibold text-inkoust">{r.nazev}</span>
                    <Odznak ton={TON_STUPNE[r.stupen]}>{STUPNE[r.stupen].nazev.toLowerCase()}</Odznak>
                  </div>
                  <p className="mt-1 text-male leading-snug text-tlum">
                    {r.zdroje.length
                      ? `Čteme: ${r.zdroje.map((z) => z.nazev).join(", ")}.`
                      : "Automaticky čitelný zdroj zatím nemáme."}
                  </p>
                  {r.stupen !== "uplne" && r.chybi && (
                    <p className="mt-1 text-male leading-snug text-tlum2">
                      K doložení, že opatření neplatí, by byl potřeba: {r.chybi.replace(/\.$/, "")}.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
