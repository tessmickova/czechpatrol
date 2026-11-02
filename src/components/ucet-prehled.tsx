"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KANALY } from "@/config/web";
import { kc, usePremium } from "@/lib/premium";
import { api, type Ucet } from "@/lib/ucet";
import { Ikona, type NazevIkony } from "./ikony";
import { Karta } from "./zaklad";

/*
  Co máte díky přihlášení: jeden seznam se stavem a jedním krokem.
  Žádné vysvětlování — slovo stavu (nastaveno / nenastaveno / odemčeno)
  a odkaz. Správce a partner IZS mají první řádek svou frontu.
*/

interface Radek { ikona: NazevIkony; nazev: string; stav: string; ok: boolean; kam: string; akce: string }

export function PrehledUctu({ ucet }: { ucet: Ucet }) {
  const { premium, verejne, nacita } = usePremium();
  const [zebricek, setZebricek] = useState<{ prezdivka: string; poradi: number } | null | undefined>(undefined);
  const [kreditu, setKreditu] = useState<number | null>(null);
  const [ceka, setCeka] = useState<number | null>(null);

  useEffect(() => {
    api<{ zaznam: { prezdivka: string; poradi: number } | null }>("/ja/zebricek").then((v) => setZebricek(v.zaznam)).catch(() => setZebricek(null));
    api<{ kredity: { stav: string }[] }>("/ja/kredity").then((v) => setKreditu(v.kredity.filter((k) => k.stav === "ACTIVE").length)).catch(() => setKreditu(0));
    if (ucet.role === "admin") {
      api<{ zpravyIzs: number; tipy: number; platbyKRozhodnuti: number }>("/sprava/prehled").then((p) => setCeka(p.zpravyIzs + p.tipy + p.platbyKRozhodnuti)).catch(() => setCeka(null));
    }
  }, [ucet.role]);

  const radky: Radek[] = [];
  if (ucet.role === "admin") radky.push({ ikona: "vaha", nazev: "Správa: co čeká na rozhodnutí", stav: ceka === null ? "otevřít" : ceka ? `${ceka} v databázi + návrhy a naléhavé ze sběru` : "fronty v databázi prázdné; návrhy a naléhavé zvlášť", ok: true, kam: "/sprava/", akce: "Otevřít správu" });
  if (ucet.role === "izs") radky.push({ ikona: "stit", nazev: "Zprávy partnera IZS", stav: "navrhnout zprávu čtenářům v kraji", ok: true, kam: "/izs/", akce: "Otevřít" });
  radky.push(
    { ikona: "zvonek", nazev: "Upozornění do Telegramu", stav: ucet.telegram ? "propojeno" : "nepropojeno", ok: ucet.telegram, kam: "#kanaly", akce: ucet.telegram ? "Nastavit, co chodí" : "Propojit" },
    { ikona: "terc", nazev: "Můj přehled", stav: "země a témata, která sledujete", ok: true, kam: "/muj-prehled/", akce: "Otevřít" },
    { ikona: "stit", nazev: "Odolnost domácnosti", stav: nacita ? "…" : premium ? "Premium odemčeno" : verejne?.bezi ? `audit zdarma · Premium ${kc(verejne.cenaHaleru)}` : "audit zdarma · Premium připravujeme", ok: true, kam: "/odolnost/", akce: "Otevřít" },
    { ikona: "graf", nazev: "Žebříček připravenosti", stav: zebricek === undefined ? "…" : zebricek ? `${zebricek.prezdivka}, ${zebricek.poradi}. místo` : "nejste v žebříčku", ok: Boolean(zebricek), kam: "/odolnost/#zebricek-nadpis", akce: zebricek ? "Aktualizovat" : "Zařadit se" },
    { ikona: "kava", nazev: "Kredity na výbavu", stav: kreditu === null ? "…" : kreditu ? `${kreditu} aktivní` : "žádný; vzniká s Premium", ok: (kreditu ?? 0) > 0, kam: "#kredity", akce: "Zobrazit" },
  );

  return (
    <Karta className="p-6">
      <div className="stitek mb-1">Váš účet</div>
      <h2 className="podnadpis text-velke">Co máte k dispozici</h2>
      <ul className="mt-3 divide-y divide-linka2">
        {radky.map((r) => (
          <li key={r.nazev}>
            <Link href={r.kam} className="flex min-h-[48px] items-center gap-3 py-2 hover:bg-plocha2/60">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-plocha2 text-akcent"><Ikona nazev={r.ikona} velikost={15} tah={1.9} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-zaklad font-semibold text-inkoust">{r.nazev}</span>
                <span className="flex items-center gap-1.5 text-drobne text-tlum"><span aria-hidden className={`h-[5px] w-[5px] shrink-0 rounded-full ${r.ok ? "bg-klid" : "bg-tlum2"}`} />{r.stav}</span>
              </span>
              <span className="shrink-0 text-drobne font-semibold text-tlum">{r.akce}</span>
              <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-90 text-tlum2" />
            </Link>
          </li>
        ))}
      </ul>
      {!ucet.telegram && KANALY.telegram && (
        <p className="mt-3 text-drobne text-tlum2">Veřejný kanál <a href={KANALY.telegram} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">@czechpatrol</a> funguje i bez propojení; propojení přidá upozornění na míru.</p>
      )}
    </Karta>
  );
}
