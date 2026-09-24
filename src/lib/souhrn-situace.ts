import souhrnData from "../../data/souhrn-situace.json";

/*
  Souhrn situace pod hlavním nadpisem (24. 9. 2026).

  Větu píše ověřovatel Patrol (nastroje/souhrn-situace.mjs říká, co smí),
  sběr ji přebírá. Tady se jen čte a rozhoduje, jestli je ještě čerstvá —
  stará věta by tvrdila něco o dnešku z předvčerejška. Bez čerstvé věty
  bere úvod větu z úředního stavu (lib/veta.ts).
*/
export const PLATNOST_HODIN = 30;

export interface SouhrnSituace {
  veta: string | null;
  aktualizovano: string | null;
  podklady: string[];
}

export function souhrnSituace(ted = Date.now()): SouhrnSituace {
  const s = souhrnData as { veta?: string | null; aktualizovano?: string | null; podklady?: string[] | null };
  const cerstvy = Boolean(s.veta && s.aktualizovano && ted - new Date(s.aktualizovano).getTime() <= PLATNOST_HODIN * 3_600_000);
  return { veta: cerstvy ? s.veta! : null, aktualizovano: cerstvy ? s.aktualizovano! : null, podklady: cerstvy ? s.podklady ?? [] : [] };
}
