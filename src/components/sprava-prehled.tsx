"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/ucet";
import { useDialog } from "./dialog";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { Ikona, type NazevIkony } from "./ikony";
import { Karta } from "./zaklad";

/*
  Správa: první, co správce vidí.

  „Co čeká na vás“ je seznam front s počtem a jedním odkazem — ne
  vysvětlení, jak to funguje. Pořadí podle toho, co nejvíc hoří:
  naléhavé zprávy, návrhy ke schválení, zprávy partnerů, hlášení,
  peníze, e-maily, žebříček. Počty z databáze jsou živé; kandidáti
  a odmítnuté jsou ze sestavení webu (data v repozitáři).

  „Oznámení“ je jediné místo, odkud správce z webu něco pošle: do
  veřejného kanálu a/nebo čtenářům s propojeným kanálem. S potvrzením
  a v auditu; nic se neposílá automaticky.
*/

interface Prehled {
  zpravyIzs: number; tipy: number; platbyKRozhodnuti: number; platbyCekajici: number; emailySelhane: number;
  zebricekNovi: number; zajem: number; uctu: number; sKanalem: number; kanal: boolean; kanalNazev: string | null;
}

export function SpravaPrehled({ naliehave, kandidatu, odmitnutychVazne }: { naliehave: number; kandidatu: number; odmitnutychVazne: number }) {
  const [p, setP] = useState<Prehled | null>(null);
  const [navrhu, setNavrhu] = useState<number | null>(null);

  const nacti = useCallback(async () => {
    try { setP(await api<Prehled>("/sprava/prehled")); } catch { setP(null); }
    try { setNavrhu((await api<{ navrhy: { id: string | null }[] }>("/sprava/navrhy")).navrhy.filter((n) => n.id).length); } catch { setNavrhu(null); }
  }, []);
  useEffect(() => { nacti(); }, [nacti]);

  const radky: { ikona: NazevIkony; nazev: string; pocet: number | null; kam: string; vysvetleni: string; hori?: boolean }[] = [
    { ikona: "sirena", nazev: "Naléhavé zprávy ze sběru", pocet: naliehave, kam: "/udalosti/?tab=cekajici", vysvetleni: "ověřit zdroj, převzít nebo nechat ve frontě", hori: naliehave > 0 },
    { ikona: "fajfka", nazev: "Návrhy ke schválení", pocet: navrhu, kam: "#navrhy", vysvetleni: "schválit, upravit nebo zamítnout", hori: (navrhu ?? 0) > 0 },
    { ikona: "stit", nazev: "Zprávy partnerů IZS", pocet: p?.zpravyIzs ?? null, kam: "#izs", vysvetleni: "po schválení odejdou čtenářům v kraji", hori: (p?.zpravyIzs ?? 0) > 0 },
    { ikona: "bublina", nazev: "Hlášení od čtenářů", pocet: p?.tipy ?? null, kam: "#tipy", vysvetleni: "přijmout nebo zamítnout" },
    { ikona: "otaznik", nazev: "Kandidáti čekající na posouzení", pocet: kandidatu, kam: "/udalosti/?tab=cekajici", vysvetleni: "automatický sběr; rutina bere nejnovější" },
    { ikona: "lupa", nazev: "Odmítnuté s vysokým podezřením", pocet: odmitnutychVazne, kam: "/sprava/odmitnute/", vysvetleni: "co síto nepustilo, ale model označil jako vážné" },
    { ikona: "vaha", nazev: "Platby k rozhodnutí", pocet: p?.platbyKRozhodnuti ?? null, kam: "#platby", vysvetleni: "refund s uplatněným kreditem nebo nesedící částka", hori: (p?.platbyKRozhodnuti ?? 0) > 0 },
    { ikona: "obalka", nazev: "E-maily, které se nepodařilo doručit", pocet: p?.emailySelhane ?? null, kam: "#emaily", vysvetleni: "poslat znovu" },
    { ikona: "uzivatel", nazev: "Noví v žebříčku s kontaktem", pocet: p?.zebricekNovi ?? null, kam: "#zebricek", vysvetleni: "pozvat do komunity, označit stav" },
  ];

  return (
    <Karta className="p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="stitek mb-1">Správa</div>
          <h2 className="podnadpis text-velke">Co čeká na vás</h2>
        </div>
        <button type="button" onClick={nacti} className={TLACITKO_TICHE}>Obnovit</button>
      </div>
      <ul className="divide-y divide-linka2">
        {radky.map((r) => (
          <li key={r.nazev}>
            <Link href={r.kam} className="flex min-h-[48px] items-center gap-3 py-2 hover:bg-plocha2/60">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-plocha2 ${r.hori ? "text-akcent" : "text-tlum"}`}><Ikona nazev={r.ikona} velikost={15} tah={1.9} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-zaklad font-semibold text-inkoust">{r.nazev}</span>
                <span className="block text-drobne text-tlum2">{r.vysvetleni}</span>
              </span>
              <span className={`cislice shrink-0 text-velke font-bold ${r.pocet ? (r.hori ? "text-akcent" : "text-inkoust") : "text-tlum2"}`}>{r.pocet === null ? "…" : r.pocet}</span>
              <Ikona nazev="nahoru" velikost={12} tah={2} trida="shrink-0 rotate-90 text-tlum2" />
            </Link>
          </li>
        ))}
      </ul>
      {p && (
        <p className="mt-3 text-drobne text-tlum2">
          {p.uctu} účtů, {p.sKanalem} s propojeným kanálem, {p.zajem} e-mailů v zájmu o komunitu. Veřejný kanál {p.kanal ? `${p.kanalNazev} je připojený` : "není nastavený"}.
        </p>
      )}
    </Karta>
  );
}

export function Oznameni() {
  const [form, setForm] = useState({ kam: "kanal", titulek: "", text: "", odkaz: "", zavaznost: "vysoka" });
  const [odesila, setOdesila] = useState(false);
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const { potvrd } = useDialog();

  const odesli = async () => {
    const kam = form.kam === "kanal" ? "do veřejného kanálu" : form.kam === "ctenari" ? "čtenářům s propojeným kanálem" : "do kanálu i čtenářům";
    if (!(await potvrd({ nadpis: `Odeslat oznámení ${kam}?`, text: `„${form.titulek}“ — odejde hned a nejde vzít zpět. Zůstane v auditu s vaším jménem.`, potvrdit: "Odeslat", zrusit: "Ještě ne" }))) return;
    setHlaska(null);
    setOdesila(true);
    try {
      const v = await api<{ kanal: boolean | null; zasazeni: number | null }>("/sprava/oznameni", { method: "POST", telo: { ...form, odkaz: form.odkaz || null } });
      setHlaska({ typ: "ok", text: `Odesláno.${v.kanal ? " Kanál: ano." : ""}${v.zasazeni !== null ? ` Čtenářům zařazeno: ${v.zasazeni} (odejde podle jejich nastavení, nejpozději do 10 minut).` : ""}` });
      setForm({ kam: form.kam, titulek: "", text: "", odkaz: "", zavaznost: "vysoka" });
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
    } finally {
      setOdesila(false);
    }
  };

  return (
    <Karta className="p-6" id="oznameni">
      <div className="stitek mb-1">Oznámení</div>
      <h2 className="podnadpis text-velke">Poslat zprávu ven</h2>
      <p className="mt-2 text-male text-tlum">Do veřejného kanálu na Telegramu, čtenářům s propojeným kanálem (podle jejich nastavení), nebo obojí. Jen vy, jen ručně, vždy v auditu.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <Popisek pro="oz-kam">Komu</Popisek>
          <select id="oz-kam" className={POLE} value={form.kam} onChange={(e) => setForm({ ...form, kam: e.target.value })}>
            <option value="kanal">veřejný kanál</option>
            <option value="ctenari">čtenáři s kanálem</option>
            <option value="oba">kanál i čtenáři</option>
          </select>
          {form.kam !== "kanal" && (
            <div className="mt-3">
              <Popisek pro="oz-zav">Závažnost</Popisek>
              <select id="oz-zav" className={POLE} value={form.zavaznost} onChange={(e) => setForm({ ...form, zavaznost: e.target.value })}>
                <option value="vysoka">vysoká (podle nastavení čtenáře)</option>
                <option value="kriticka">kritická (i v tichých hodinách)</option>
              </select>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div><Popisek pro="oz-titulek">Titulek</Popisek><input id="oz-titulek" className={POLE} maxLength={120} value={form.titulek} onChange={(e) => setForm({ ...form, titulek: e.target.value })} /></div>
          <div><Popisek pro="oz-text">Text</Popisek><textarea id="oz-text" rows={4} className={POLE} maxLength={2000} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></div>
          <div><Popisek pro="oz-odkaz">Odkaz (nepovinné, https://)</Popisek><input id="oz-odkaz" className={POLE} value={form.odkaz} onChange={(e) => setForm({ ...form, odkaz: e.target.value })} /></div>
        </div>
      </div>
      {hlaska && <div className="mt-3"><Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska></div>}
      <button type="button" disabled={odesila || form.titulek.trim().length < 3 || form.text.trim().length < 10} onClick={odesli} className={`${TLACITKO_AKCENT} mt-4`}>
        <Ikona nazev="odeslat" velikost={15} tah={2} /> {odesila ? "Odesílám…" : "Odeslat oznámení"}
      </button>
    </Karta>
  );
}
