"use client";

/** Tisk nebo uložení do PDF přes dialog prohlížeče („Uložit jako PDF“). */
export function TiskTlacitko() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-akcent px-5 text-zaklad font-semibold text-papir hover:bg-akcent-svetla">
      Vytisknout nebo uložit jako PDF
    </button>
  );
}
