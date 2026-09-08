import Link from "next/link";
import { druh, kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { datumPraha } from "@/lib/cas";
import { PASMA, UROVNE } from "@/lib/skala";
import { OdznakNove } from "./odznak-nove";
import { Vlajka } from "./zeme";

/*
  Nová zjištění — co se dozvědělo o tom, co se stalo dřív.

  Není to seznam nových událostí. Sem patří posuny ve vyšetřování: obvinění,
  rozsudek, úředně potvrzený pachatel, samostatná aktualizace případu. Právě
  tohle se u starších případů mění nejčastěji a jinde na webu by to zapadlo
  mezi novou událostí.
*/

const BARVA_DUVODU: Record<string, string> = {
  "podáno obvinění": "text-akcent",
  "vyšetřování uzavřeno": "text-akcent",
  "nové zjištění k případu": "text-akcent",
};

export function NovaZjisteni({ polozky }: { polozky: { zaznam: Zaznam; duvod: string }[] }) {
  if (!polozky.length) {
    return (
      <p className="rounded-[18px] border border-linka2 bg-plocha px-4 py-5 text-[14.5px] text-tlum">
        Zatím žádný posun ve vyšetřování, který by prošel ověřením.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-linka2 overflow-hidden rounded-[22px] border border-linka2 bg-plocha">
      {polozky.map(({ zaznam: i, duvod }) => {
        const t = PASMA[UROVNE[i.zavaznost].pasmo];
        const nove = druh(i) === "aktualizace" ? i.fakta?.[0] : i.historie?.at(-1)?.text;
        return (
          <li key={i.slug}>
            <Link
              href={`/incident/${i.slug}/`}
              className="flex flex-col gap-1.5 px-4 py-4 transition-colors hover:bg-plocha2 sm:flex-row sm:gap-4 sm:px-5"
            >
              <span className="cislice shrink-0 text-[13px] text-tlum2 sm:w-[86px]">{datumPraha(kdyZjisteno(i))}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]">
                  <span aria-hidden className={`h-[8px] w-[8px] rounded-full ${t.tecka}`} />
                  <span className="inline-flex items-center gap-1.5 text-tlum"><Vlajka kod={i.kodZeme} /> {i.kodZeme === "CZ" ? "Česko" : i.zeme}</span>
                  <span aria-hidden className="text-tlum2">·</span>
                  <span className={`font-semibold ${BARVA_DUVODU[duvod] ?? "text-tlum"}`}>{duvod}</span>
                </span>
                <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <OdznakNove kdy={kdyZjisteno(i)} />
                  <span className="text-[15.5px] font-semibold leading-snug text-inkoust">{i.kratkyTitulek || i.titulek}</span>
                </span>
                {nove && <span className="mt-1 block text-[13.5px] leading-relaxed text-tlum">{nove}</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
