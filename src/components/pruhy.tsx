import Link from "next/link";
import { JE_UKAZKA } from "@/config/web";
import { Napoveda } from "./zaklad";

/** Beta / AI-assisted proužek. Je vidět na každé stránce, hned pod navigací. */
export function BetaPruh() {
  return (
    <div className="neni-tisk border-b border-linka bg-plocha">
      <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-5 py-2 sm:px-8">
        <Napoveda
          label="Co tento web je"
          popis={
            <span className="block">
              Nezávislý projekt. Veřejné zdroje zpracovává automatizovaně a s pomocí AI.
              Není to oficiální bezpečnostní varování.
            </span>
          }
        >
          <span className="stitek-tmavy inline-flex items-center gap-1.5 rounded-full border border-linka px-2.5 py-1 text-tlum">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-tlum2" />
            Beta · AI-assisted
          </span>
        </Napoveda>
        <Link href="/metodika/" className="stitek transition-colors hover:text-inkoust">
          Metodika
        </Link>
      </div>
    </div>
  );
}

/** Varovný pruh ukázkového režimu. V produkčním buildu se nevykreslí. */
export function UkazkaPruh() {
  if (!JE_UKAZKA) return null;
  return (
    <div className="border-b border-[#5e5124] bg-[#2a2410]">
      <div className="mx-auto flex max-w-[1180px] items-start gap-2.5 px-5 py-2.5 sm:px-8">
        <span className="stitek-tmavy mt-[1px] shrink-0 rounded-[18px] border border-[#5e5124] bg-[#2a2410] px-1.5 py-[3px] text-[#f0d47e]">
          Ukázka
        </span>
        <p className="text-[12px] leading-relaxed text-[#f0d47e]">
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
    <span className="stitek-tmavy shrink-0 rounded-[18px] border border-[#5e5124] bg-[#2a2410] px-1.5 py-[3px] text-[#f0d47e]">
      Ukázka
    </span>
  );
}

/*
  Jedna věta nahoře: kdo tenhle web dělá.

  Návštěvník, který sem přijde ve strachu, musí hned vědět, že nečte úřední
  výstrahu. Delší vysvětlení patří do patičky a na stránku o projektu —
  tady stačí šest slov, aby si nespletl zdroj.
*/
export function PruhPuvodu() {
  return (
    <div className="border-b border-linka2 bg-plocha2/60">
      <div className="mx-auto max-w-[1280px] px-4 py-1.5 text-[12.5px] text-tlum2 sm:px-6">
        Nezávislý projekt, ne úřední zdroj. V nouzi 112.
      </div>
    </div>
  );
}
