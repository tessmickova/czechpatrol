"use client";

import { useEffect, useState } from "react";

/*
  Štítek „nové“ u čerstvého záznamu.

  Počítá se v prohlížeči podle hodin návštěvníka. Kdyby se počítal při
  sestavení webu, zůstal by viset i na záznamu starém dva dny — a naopak
  by chyběl u toho, co přibylo těsně po sestavení.

  Okno je dvanáct hodin: kratší by štítek u nočních zápisů zmizel dřív,
  než si jich kdokoli všimne, delší by přestal znamenat „právě teď“.
*/

const OKNO_HODIN = 12;

export function OdznakNove({ kdy, hodin = OKNO_HODIN }: { kdy: string; hodin?: number }) {
  // Napoprvé se nevykreslí nic: server nezná čas návštěvníka a blikající
  // rozdíl mezi serverem a prohlížečem by React zahlásil jako chybu.
  const [cerstve, setCerstve] = useState(false);
  useEffect(() => {
    const spocitej = () => setCerstve(Date.now() - new Date(kdy).getTime() <= hodin * 3_600_000);
    spocitej();
    const t = setInterval(spocitej, 60_000);
    return () => clearInterval(t);
  }, [kdy, hodin]);

  if (!cerstve) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-akcent px-2 py-[3px] text-[10.5px] font-bold uppercase leading-none tracking-[0.1em] text-papir">
      <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-papir" />
      nové
    </span>
  );
}
