import Link from "next/link";
import { Ikona } from "./ikony";

/*
  Poznámka k zahraničním zprávám (20. 11. 2026, provozovatelka: „přidej
  české info k zahraničním zprávám červeným fontem, že překlad je finančně
  náročný, a možnost podpořit na již vytvořené stránce“). Strojový překlad
  zdarma měnil smysl a je vypnutý; kvalitní překlad stojí peníze.
*/
export function PoznamkaPrekladu({ trida = "" }: { trida?: string }) {
  return (
    <p className={`text-mikro leading-snug text-akcent ${trida}`}>
      Zprávy v cizím jazyce (<Ikona nazev="globus" velikost={11} tah={2} trida="inline -mt-0.5" /><span className="sr-only">značka glóbus</span>) zatím nepřekládáme — kvalitní překlad je finančně náročný.{" "}
      <Link href="/podporit/" className="whitespace-nowrap font-semibold underline decoration-akcent/50 underline-offset-2 hover:decoration-akcent">Podpořit překlad →</Link>
    </p>
  );
}
