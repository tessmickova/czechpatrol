import { notFound } from "next/navigation";
import { JazykProvider } from "@/lib/i18n";
import { JAZYKY, jazyk as najdiJazyk } from "@/lib/jazyky";

/*
  Jazyková větev webu.

  Pod `/en/`, `/pl/`, `/lv/` … se vykreslují TYTÉŽ stránky jako česky, jen
  s jiným jazykem rozhraní. Není to náhradní přehled ani jiný web: kdo čte
  seznam událostí a přepne jazyk, zůstane u seznamu událostí.

  Co se nepřekládá: fakta u událostí, titulky převzaté od médií, názvy zdrojů
  a odkazy. Cizí tvrzení se nepřekládají — fakta se nesmějí lišit podle jazyka.
  A právní stránky (podmínky, soukromí) zůstávají jen česky, protože druhé
  znění právního textu, které si může s tím českým odporovat, je horší než
  žádné.
*/

export const dynamicParams = false;

export function generateStaticParams() {
  return JAZYKY.map((j) => ({ jazyk: j.kod }));
}

export default async function JazykLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ jazyk: string }>;
}) {
  const { jazyk } = await params;
  if (!najdiJazyk(jazyk)) notFound();

  return <JazykProvider kod={jazyk}>{children}</JazykProvider>;
}
