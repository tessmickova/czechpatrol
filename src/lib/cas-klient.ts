"use client";

import { useEffect, useState } from "react";

/*
  Živé hodiny pro klientské komponenty.

  Proč to není prosté `Date.now()`: klientská komponenta se vykresluje dvakrát —
  jednou při sestavení webu na serveru a podruhé v prohlížeči při hydrataci.
  Kdyby si čas vzala sama, dostala by pokaždé jiný a React by hlásil, že se
  vykreslení neshodují (chyba #418). Právě to se dělo na úvodní straně,
  v událostech a v jazykových variantách.

  Proto se výchozí čas PŘEDÁVÁ ze serverové stránky: v HTML je zapečený jeden
  a tentýž údaj, takže se první vykreslení shodne. Teprve po připojení
  komponenty se přepne na skutečný čas a dál se obnovuje po minutě.
*/
export function useZiveHodiny(ted: number): number {
  const [cas, setCas] = useState(ted);
  useEffect(() => {
    setCas(Date.now());
    // Přepočet po minutě stačí; údaje se mění nanejvýš jednou za hodinu.
    const t = setInterval(() => setCas(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return cas;
}
