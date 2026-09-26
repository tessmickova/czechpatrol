"use client";

import { useEffect, useState } from "react";
import { api, useUcet } from "@/lib/ucet";
import { Hlaska } from "./formulare";

interface Radek { id: string; vytvoreno: string; firma: string; web: string; email: string; kategorie: string; umisteni: string; obdobi: string; zprava: string | null; stav: string; poznamka: string | null }

/** Přehled poptávek partnerů pro správce (api/src/partneri.ts). Schválený partner se zapisuje do data/partneri.json. */
export function SpravaPartneriKlient() {
  const { ucet, nacita } = useUcet();
  const [data, setData] = useState<Radek[] | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  useEffect(() => {
    if (nacita || ucet?.role !== "admin") return;
    api<{ poptavky: Radek[] }>("/sprava/partneri").then((v) => setData(v.poptavky)).catch((e) => setChyba(e instanceof Error ? e.message : "Nepodařilo se načíst."));
  }, [nacita, ucet]);
  if (nacita) return <p className="text-male text-tlum">Načítám…</p>;
  if (ucet?.role !== "admin") return <Hlaska typ="info">Tahle stránka je jen pro správce.</Hlaska>;
  if (chyba) return <Hlaska typ="chyba">{chyba}</Hlaska>;
  if (!data) return <p className="text-male text-tlum">Načítám…</p>;
  if (!data.length) return <p className="text-male text-tlum">Zatím žádná poptávka.</p>;
  return (
    <ul className="space-y-3">
      {data.map((r) => (
        <li key={r.id} className="rounded-[18px] border border-linka p-4 text-male">
          <p className="font-semibold text-inkoust">{r.firma} <span className="font-normal text-tlum2">· {r.stav} · {new Date(r.vytvoreno).toLocaleString("cs-CZ")}</span></p>
          <p className="text-tlum"><a href={r.web} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">{r.web}</a> · {r.email}</p>
          <p className="text-tlum2">{r.kategorie} · {r.umisteni} · {r.obdobi}</p>
          {r.zprava && <p className="mt-1 text-tlum">{r.zprava}</p>}
        </li>
      ))}
    </ul>
  );
}
