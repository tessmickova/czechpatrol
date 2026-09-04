import Link from "next/link";
import { JE_UKAZKA } from "@/config/web";
import { Napoveda } from "./zaklad";

/** Beta / AI-assisted proužek. Je vidět na každé stránce, hned pod navigací. */
export function BetaPruh() {
  return (
    <div className="neni-tisk border-b border-linka bg-plocha">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2 sm:px-8">
        <Napoveda
          label="Co tento web je"
          popis={
            <span className="block space-y-1.5">
              <span className="block">
                Experimentální nezávislý projekt. Informace jsou automatizovaně
                a ručně zpracovávány z veřejných zdrojů.
              </span>
              <span className="block opacity-80">
                Nejde o oficiální bezpečnostní varování ani o pokyn k jednání.
              </span>
            </span>
          }
        >
          <span className="stitek-tmavy inline-flex items-center gap-1.5 rounded border border-linka px-1.5 py-[3px] text-tlum">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-tlum2" />
            Beta · AI-assisted analysis
          </span>
        </Napoveda>
        <p className="text-[11.5px] text-tlum2">
          Nezávislý projekt. Není součástí státních orgánů ani NATO.{" "}
          <Link href="/metodika/" className="odkaz text-tlum">Metodika</Link>
        </p>
      </div>
    </div>
  );
}

/** Varovný pruh ukázkového režimu. V produkčním buildu se nevykreslí. */
export function UkazkaPruh() {
  if (!JE_UKAZKA) return null;
  return (
    <div className="border-b border-[#e6ddc9] bg-[#fbf7ee]">
      <div className="mx-auto flex max-w-[1180px] items-start gap-2.5 px-5 py-2.5 sm:px-8">
        <span className="stitek-tmavy mt-[1px] shrink-0 rounded border border-[#ddd0ae] bg-[#f5eeda] px-1.5 py-[3px] text-[#7a6428]">
          Ukázka
        </span>
        <p className="text-[12px] leading-relaxed text-[#6d5a2a]">
          Zobrazený obsah je <b className="font-semibold">smyšlený ukázkový materiál</b> sloužící
          k posouzení vzhledu a rozvržení. Nejde o skutečné bezpečnostní události.
          Produkční verze zobrazuje pouze ověřené záznamy s uvedenými zdroji.
        </p>
      </div>
    </div>
  );
}

/** Odznak u jednotlivého ukázkového záznamu. */
export function OdznakUkazky() {
  return (
    <span className="stitek-tmavy shrink-0 rounded border border-[#ddd0ae] bg-[#f5eeda] px-1.5 py-[3px] text-[#7a6428]">
      Ukázka
    </span>
  );
}
