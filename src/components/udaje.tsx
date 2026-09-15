import type { ReactNode } from "react";
import { PASMA, UROVNE } from "@/lib/skala";
import type { Uroven } from "@/lib/typy";

/*
  Údaje u záznamu: jistota, původce, zdroj, závažnost.

  Byly to čtyři podobné pilulky v řadě a splývaly. Přitom to jsou právě ty
  věci, podle kterých se pozná, jestli se dá záznamu věřit — a jestli
  „Rusko" znamená úředně potvrzeného původce, nebo podezření.

  Tvar drží značku: mono popisek verzálkami jako u štítků sekcí, hodnota
  pod ním normálním písmem a tučně. Barví se jen tenký proužek vlevo a
  popisek, nikdy celý text — obarvená věta se čte hůř a u barvosleposti
  nenese nic.
*/

export type TonUdaje = "neutral" | "dobry" | "pozor";

const TONY: Record<TonUdaje, { pruh: string; popisek: string }> = {
  neutral: { pruh: "bg-linka", popisek: "text-tlum2" },
  dobry: { pruh: "bg-klid", popisek: "text-klid-text" },
  pozor: { pruh: "bg-pozor", popisek: "text-pozor-text" },
};

export function Udaj({
  popisek,
  hodnota,
  ton = "neutral",
  barvaPruhu,
}: {
  popisek: string;
  hodnota: ReactNode;
  ton?: TonUdaje;
  /** Vlastní barva proužku — používá se u závažnosti, kde barvu určuje pásmo. */
  barvaPruhu?: string;
}) {
  const t = TONY[ton];
  return (
    <span className="flex items-stretch gap-2">
      <span aria-hidden className={`w-[3px] shrink-0 rounded-full ${barvaPruhu ?? t.pruh}`} />
      <span className="min-w-0">
        <span className={`block font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.08em] ${t.popisek}`}>
          {popisek}
        </span>
        <span className="mt-[3px] block text-[13px] font-semibold leading-tight text-inkoust">{hodnota}</span>
      </span>
    </span>
  );
}

/** Závažnost. Proužek nese barvu pásma, text zůstává čitelný. */
export function UdajZavaznosti({ uroven }: { uroven: Uroven }) {
  const u = UROVNE[uroven];
  return <Udaj popisek="Závažnost" hodnota={u.nazev} barvaPruhu={PASMA[u.pasmo].tecka} />;
}

/** Řada údajů pod titulkem záznamu. Na úzkém displeji se zalomí. */
export function RadaUdaju({ children }: { children: ReactNode }) {
  return <span className="mt-2 flex flex-wrap items-start gap-x-5 gap-y-2.5">{children}</span>;
}
