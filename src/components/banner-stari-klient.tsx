"use client";

import { useZiveHodiny } from "@/lib/cas-klient";
import { casPraha, cerstvost, datumCasPraha, stariSlovy } from "@/lib/cas";
import { Ikona } from "./ikony";

/*
  Pruh nad obsahem: běží sběr, nebo web stojí?

  Proč je to klientská komponenta, když je celý web statický
  -----------------------------------------------------------
  Tohle je jediná věc na stránce, která musí stárnout i tehdy, když se web
  přestane sestavovat — protože právě tehdy je potřeba.

  Dřív se čerstvost počítala při sestavení. Rozdíl mezi „naposledy čteno"
  a „teď" tím zamrzl v okamžiku buildu: v HTML zůstalo napsáno „Zkontrolováno
  08:01 · bez nálezu" a to tam svítilo dál, ať uplynula hodina nebo týden.
  Čím déle web stál, tím sebevědoměji tvrdil, že je v pořádku.

  Stalo se to 17. 9. 2026: sběr přestal běžet v 08:03 a web další dva dny
  hlásil čerstvou kontrolu bez nálezu. Mlčící web je vada; web, který mlčení
  vydává za klid, je horší než žádný web — a tenhle má být pojistka.

  Teď se rozdíl počítá v prohlížeči návštěvníka. Zamrzlý web tak po pár
  hodinách sám přizná, že zamrzl.
*/

/** Za jak dlouho po poslední kontrole se z ticha stane přiznaný výpadek. */
const HODIN_DO_VYPADKU = 12;

/*
  Stav kontroly jako údaj, ne jako pruh.

  Vzniklo z toho, že nad úvodem stály dva pruhy pod sebou: „Nezávislý projekt,
  ne úřední zdroj" a pod ním „Zkontrolováno 20:01 · bez nálezu". Dvě tenké
  linky kvůli dvěma větám. Klidný stav se proto vejde na konec prvního pruhu;
  vlastní pruh dostane, teprve když je co hlásit.
*/
function stav(zkontrolovano: string | null, nyni: number): { poplach: boolean; text: string } {
  const c = cerstvost(zkontrolovano, nyni, "provoz");
  if (c === "budoucnost") {
    return { poplach: true, text: "Chybný čas u části podkladů — údaj o poslední kontrole je z budoucnosti." };
  }
  if (!zkontrolovano || c === "nezname") return { poplach: true, text: "Aktuálnost zatím neověřena." };

  const hodin = (nyni - new Date(zkontrolovano).getTime()) / 3_600_000;
  if (hodin >= HODIN_DO_VYPADKU) {
    return {
      poplach: true,
      text: `Sběr neběží. Zdroje naposledy čteny ${datumCasPraha(zkontrolovano)}, ${stariSlovy(zkontrolovano, nyni)}. Web ukazuje stav k tomu okamžiku, ne dnešní.`,
    };
  }
  return {
    poplach: false,
    text: hodin < 6
      ? `Zkontrolováno ${casPraha(zkontrolovano)} · bez nálezu`
      : `Zdroje naposledy čteny ${datumCasPraha(zkontrolovano)} · ${stariSlovy(zkontrolovano, nyni)}`,
  };
}

/**
 * Klidný stav na konec pruhu o původu. Když je poplach, nevykreslí nic —
 * na to je pruh vlastní, aby se přes něj nedalo přehlédnout.
 */
export function StavKontrolyVedle({ zkontrolovano, ted }: { zkontrolovano: string | null; ted: number }) {
  const nyni = useZiveHodiny(ted);
  const s = stav(zkontrolovano, nyni);
  if (s.poplach) return null;
  return (
    <span className="flex items-center gap-1.5 text-tlum2">
      <Ikona nazev="info" velikost={12} tah={2} trida="shrink-0" />
      {s.text}
    </span>
  );
}

export function PruhKontroly({ zkontrolovano, ted }: { zkontrolovano: string | null; ted: number }) {
  const nyni = useZiveHodiny(ted);
  const c = cerstvost(zkontrolovano, nyni, "provoz");

  if (c === "budoucnost") {
    return <Pruh poplach text="Chybný čas u části podkladů — údaj o poslední kontrole je z budoucnosti." />;
  }
  if (!zkontrolovano || c === "nezname") {
    return <Pruh poplach text="Aktuálnost zatím neověřena." />;
  }

  const hodin = (nyni - new Date(zkontrolovano).getTime()) / 3_600_000;

  /*
    Výpadek se pojmenuje výpadkem. „Aktuálnost neověřena" je pravda, ale zní
    jako drobná výhrada k jinak funkčnímu webu — ne jako to, co to je: web
    ukazuje starý stav a nová zpráva se na něj nedostane.
  */
  if (hodin >= HODIN_DO_VYPADKU) {
    return (
      <Pruh
        poplach
        text={`Sběr neběží. Zdroje naposledy čteny ${datumCasPraha(zkontrolovano)}, ${stariSlovy(zkontrolovano, nyni)}. Web ukazuje stav k tomu okamžiku, ne dnešní.`}
      />
    );
  }

  /*
    Do dvanácti hodin se nic nezdůrazňuje. Sběr běží po půlhodinách, takže
    pár hodin bez nové zprávy je běžný klid, ne porucha — a oranžový pruh
    nad každou stránkou by za týden zevšedněl natolik, že by ho nikdo
    nepřečetl ani ve chvíli, kdy bude znamenat výpadek.
  */
  /*
    Klid nemá vlastní pruh. Stojí vpravo v pruhu o původu (StavKontrolyVedle) —
    dvě tenké linky nad sebou kvůli dvěma větám byly zbytečné.
  */
  return null;
}

function Pruh({ text, poplach = false }: { text: string; poplach?: boolean }) {
  return (
    <div
      role="status"
      className={poplach ? "border-b border-stari/40 bg-stari/10" : "border-b border-linka2 bg-plocha"}
    >
      <div
        className={`mx-auto flex max-w-[1200px] items-start gap-2.5 px-4 py-2.5 text-zaklad sm:px-6 ${
          poplach ? "text-stari-text" : "text-tlum"
        }`}
      >
        <Ikona nazev={poplach ? "vystraha" : "info"} velikost={16} tah={2} trida="mt-[2px] shrink-0" />
        <span>{text}</span>
      </div>
    </div>
  );
}
