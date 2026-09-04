import { TYPY_ZDROJU } from "@/lib/kategorie";
import { datumCas } from "@/lib/format";
import type { Zdroj } from "@/lib/typy";
import { Napoveda } from "./zaklad";

export function ZnackaZdroje({ zdroj }: { zdroj: Zdroj }) {
  const t = TYPY_ZDROJU[zdroj.typ];
  return (
    <Napoveda popis={<span className="block">{t.popis}</span>}>
      <span className={`stitek-tmavy inline-flex items-center rounded-[10px] border px-1.5 py-[3px] ${t.tridy}`}>
        {t.znacka}
      </span>
    </Napoveda>
  );
}

/** Seznam zdrojů. Každé konkrétní tvrzení na webu musí mít odkud pochází. */
export function SeznamZdroju({ zdroje, husty = false }: { zdroje: Zdroj[]; husty?: boolean }) {
  if (!zdroje.length) {
    return (
      <p className="text-[12px] text-tlum2">
        U tohoto záznamu zatím nejsou uvedeny zdroje — proto se na produkci nezobrazuje.
      </p>
    );
  }
  return (
    <ol className={husty ? "space-y-1.5" : "space-y-2.5"}>
      {zdroje.map((z, i) => (
        <li key={z.url + i} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="cislice w-4 shrink-0 text-[11px] text-tlum2">{i + 1}</span>
          <ZnackaZdroje zdroj={z} />
          <a
            href={z.url}
            target="_blank"
            rel="noopener noreferrer"
            className="odkaz text-[13px] font-medium"
          >
            {z.nazev}
          </a>
          {z.publikovano && (
            <span className="cislice text-[11.5px] text-tlum2">{datumCas(z.publikovano)}</span>
          )}
          {z.jazyk !== "cs" && (
            <span className="stitek !text-tlum2">{z.jazyk}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
