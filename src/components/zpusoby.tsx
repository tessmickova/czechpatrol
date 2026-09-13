import { datumPraha } from "@/lib/cas";
import { cislem } from "@/lib/porovnani";
import { UROVNE } from "@/lib/skala";
import { STAVY_UZITI, zpusobyVUziti, OKNO_DNI, type ZpusobVUziti } from "@/lib/zpusoby";
import { Napoveda } from "./zaklad";
import { Odznak, Sdeleni } from "./ui";
import { NadpisSekce } from "./nadpisy";
import { sklon } from "./zeme";

/*
  Způsoby v užití.

  Odpovídá na otázku „čím se to dneska dělá a jak moc“ — a rovnou přiznává,
  na co neodpovídá. Neříká, co přijde. Neříká, jestli je někdo připraven
  zaútočit. Takové tvrzení nemáme z čeho doložit a podle Pravidla č. 0 se
  nesmí napsat; místo něj by tu stál výmysl s grafem, což je horší než nic.

  Každé číslo v téhle tabulce vede na konkrétní záznamy se zdroji.
*/

const SIRKA_PRUHU = 96;

function Pruh({ z }: { z: ZpusobVUziti }) {
  /*
    Délka pruhu je poměr k průměru, ne k maximu: jinak by řádek s jedním
    případem vypadal stejně jako řádek s třinácti. Strop na trojnásobku, ať
    jeden výkyv nerozhodí celou tabulku.
  */
  const porovnani = z.porovnani;
  if (!porovnani) {
    return <span className="text-[12px] text-tlum2">průměr nelze spočítat</span>;
  }
  const pomer = Math.min(z.zaObdobi / porovnani.prumer, 3);
  const sirka = Math.max(2, Math.round((pomer / 3) * SIRKA_PRUHU));
  const nadPrumerem = porovnani.smer === "vyssi";

  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="relative block h-[6px] rounded-full bg-linka2"
        style={{ width: SIRKA_PRUHU }}
      >
        <span
          className={`absolute left-0 top-0 h-full rounded-full ${nadPrumerem ? "bg-akcent" : "bg-tlum2"}`}
          style={{ width: sirka }}
        />
        {/* Ryska průměru: bez ní pruh neříká, proti čemu se měří. */}
        <span className="absolute top-[-3px] h-[12px] w-[1px] bg-inkoust/50" style={{ left: SIRKA_PRUHU / 3 }} />
      </span>
      <span className="text-[12px] text-tlum2">
        {porovnani.slovo}, průměr {cislem(porovnani.prumer)}
      </span>
    </span>
  );
}

function Radek({ z }: { z: ZpusobVUziti }) {
  const s = STAVY_UZITI[z.stav];
  const ton = z.stav === "prave-probiha" ? "vazne" : z.stav === "aktivni" ? "pozor" : "neutral";

  return (
    <li className="grid gap-3 border-b border-linka2 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="text-[15px] font-semibold text-inkoust">{z.nazev}</span>
          <Napoveda popis={s.popis}>
            <Odznak ton={ton} duraz="silny">
              {s.nazev}
            </Odznak>
          </Napoveda>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-tlum2">
          <span>
            naposledy{" "}
            {z.naposledy ? (
              <b className="font-semibold text-tlum">
                {z.dniOdPosledniho === 0 ? "dnes" : `před ${z.dniOdPosledniho} ${sklon(z.dniOdPosledniho!, "dnem", "dny", "dny")}`}
              </b>
            ) : (
              "—"
            )}
            {z.naposledy && <span className="text-tlum2"> ({datumPraha(z.naposledy)})</span>}
          </span>
          {z.zeme.length > 0 && <span>{z.zeme.join(" · ")}</span>}
          {z.nejvyssiZavaznost && <span>nejvýš {UROVNE[z.nejvyssiZavaznost].nazev.toLowerCase()}</span>}
        </div>

        {/*
          Úřední atribuce se uvádí i když je nula — a právě tehdy nejvíc.
          Bez toho by čtenář mohl číst celý sloupec jako „tohle dělá Rusko“.
        */}
        <p className="mt-1.5 text-[12.5px] text-tlum2">
          úředně přisouzeno Rusku:{" "}
          <b className="font-semibold text-tlum">
            {z.prisouzenoRusku} z {z.zaObdobi}
          </b>
          {z.prisouzenoRusku === 0 && z.zaObdobi > 0 && " — původce zatím úředně neurčen"}
        </p>
      </div>

      <div className="sm:text-right">
        <div className="font-mono text-[26px] font-bold leading-none text-inkoust">{z.zaObdobi}</div>
        <div className="mt-1 text-[11.5px] uppercase tracking-wide text-tlum2">
          za {OKNO_DNI} dní · celkem {z.celkem}
        </div>
        <div className="mt-2 sm:flex sm:justify-end">
          <Pruh z={z} />
        </div>
      </div>
    </li>
  );
}

export function ZpusobyVUziti() {
  const radky = zpusobyVUziti();

  return (
    <section className="mt-14">
      <NadpisSekce
        id="zpusoby"
        stitek="Způsoby"
        nadpis="Čím se to doloženě dělá"
        popis={`Doložené případy za posledních ${OKNO_DNI} dní u každého způsobu jednání, poměřené s dvouletým průměrem. Řadí se podle toho, co se děje teď a hodně.`}
      />

      <Sdeleni ton="pozor" ikona="vykricnik" nadpis="Tohle není předpověď.">
        Je to záznam toho, co se stalo — ne odhad toho, co přijde, a ne hodnocení, jestli je někdo připraven zaútočit.
        Takové tvrzení nemáme z čeho doložit, takže ho nepíšeme. Vysoký počet znamená, že se ten způsob hodně používal,
        nic víc.
      </Sdeleni>

      <ol className="mt-5 overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
        {radky.map((z) => (
          <Radek key={z.klic} z={z} />
        ))}
      </ol>

      <p className="mt-3 text-[12.5px] leading-relaxed text-tlum2">
        Počítají se jen skutečné případy se zdrojem, ne prohlášení, reakce ani opatření. „Úředně přisouzeno“ znamená
        formální atribuci státu nebo EU — podezření, byť silné, se nepočítá. Kde je průměru málo dat, tabulka to přizná
        místo toho, aby číslo dopočítala.
      </p>
    </section>
  );
}
