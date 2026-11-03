import Link from "next/link";
import type { DruhKyber } from "@/lib/kyber";
import { typProKategorie, typProKyber } from "@/lib/typy-utoku";
import { Ikona } from "./ikony";
import { Napoveda } from "./zaklad";

/*
  „Co mohu udělat“ u každého případu (3. 11. 2026).

  Malý spouštěč vedle záznamu; po najetí nebo klepnutí pár bodů předem
  a pár bodů, když nastane, a odkaz na celý typ s doloženými případy.
  Záměrně bez barvy a bez rámečku: rada je doprovod záznamu, ne další
  výstraha. Když záznam nespadá pod žádný typ (jen diplomacie, právo,
  vyšetřování), nezobrazí se nic.
*/
export function RadaKTypu({ kategorie, druh, vpravo = false, nahoru = false }: { kategorie?: readonly string[]; druh?: DruhKyber; vpravo?: boolean; nahoru?: boolean }) {
  const t = druh ? typProKyber(druh) : typProKategorie(kategorie ?? []);
  if (!t) return null;
  return (
    <Napoveda
      label={`Co mohu udělat: ${t.nazev}`}
      vpravo={vpravo}
      nahoru={nahoru}
      popis={
        <span className="block text-male">
          <b className="block font-semibold leading-snug text-inkoust">{t.nazev}</b>
          <span className="stitek mt-2 block text-tlum2">Předem</span>
          {t.predem.map((p) => <span key={p} className="mt-0.5 block leading-snug text-tlum">· {p}</span>)}
          <span className="stitek mt-2 block text-tlum2">Když nastane</span>
          {t.kdyzNastane.map((p) => <span key={p} className="mt-0.5 block leading-snug text-tlum">· {p}</span>)}
          <Link href={`/typy-utoku/#${t.klic}`} className="mt-2.5 inline-flex items-center gap-1 font-semibold text-inkoust hover:text-akcent">
            Celý typ a doložené případy <Ikona nazev="nahoru" velikost={11} tah={2} trida="rotate-90" />
          </Link>
        </span>
      }
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-mikro text-tlum2 transition-colors hover:text-inkoust">
        <Ikona nazev="stit" velikost={12} tah={2} />Co mohu udělat
      </span>
    </Napoveda>
  );
}
