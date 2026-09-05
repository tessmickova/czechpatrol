"use client";

import { useCallback, useEffect, useState } from "react";
import { UCTY_ZAPNUTE } from "@/config/web";
import { datumCas } from "@/lib/format";
import { api, ROLE, useUcet, type Role } from "@/lib/ucet";
import { Hlaska, POLE, Popisek, TLACITKO_AKCENT, TLACITKO_TICHE } from "./formulare";
import { AkceSchvaleni, PolozkaZpravy, type ZpravaIzs } from "./izs-klient";
import { Karta } from "./zaklad";

interface UcetSprava {
  id: string;
  role: Role;
  vytvoreno: string;
  posledniPrihlaseni: string | null;
  telegram: boolean;
  whatsapp: boolean;
  passkeys: number;
  poznamka: string | null;
}

interface Audit {
  id: number;
  kdy: string;
  kdo: string;
  co: string;
  cil: string | null;
}

/**
 * Správa.
 *
 * Správce vidí identifikátory, role a kanály — ne obsah účtů, protože žádný
 * není. Každý zásah se zapíše do auditu, včetně toho, kdo ho udělal.
 */
export function SpravaKlient() {
  const { ucet, nacita, obnov } = useUcet();
  const [ucty, setUcty] = useState<UcetSprava[]>([]);
  const [zpravy, setZpravy] = useState<ZpravaIzs[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [hledat, setHledat] = useState("");
  const [bootstrap, setBootstrap] = useState("");
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);

  const jeAdmin = ucet?.role === "admin";

  const nacti = useCallback(async () => {
    try {
      const [u, z, a] = await Promise.all([
        api<{ ucty: UcetSprava[] }>("/sprava/ucty"),
        api<{ zpravy: ZpravaIzs[] }>("/izs/zpravy"),
        api<{ audit: Audit[] }>("/sprava/audit"),
      ]);
      setUcty(u.ucty);
      setZpravy(z.zpravy);
      setAudit(a.audit);
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se načíst." });
    }
  }, []);

  useEffect(() => {
    if (jeAdmin) nacti();
  }, [jeAdmin, nacti]);

  if (!UCTY_ZAPNUTE) return <Hlaska typ="info">Účty zatím nejsou zapnuté, takže není co spravovat.</Hlaska>;
  if (nacita) return <p className="text-[15px] text-tlum">Ověřuji přihlášení…</p>;
  if (!ucet) return <Hlaska typ="info">Správa je jen pro přihlášené správce.</Hlaska>;

  if (!jeAdmin) {
    // První správce vzniká jednorázovým kódem, který zná jen provozovatel.
    return (
      <Karta odstin="pisek" className="max-w-[560px] p-6">
        <div className="stitek mb-2 !text-jantar">Zavedení správce</div>
        <h2 className="podnadpis text-[20px]">Tenhle účet není správce</h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-tlum">
          Prvního správce zakládá provozovatel jednorázovým kódem. Další správce pak přidává
          existující správce ve správě účtů.
        </p>
        <form
          className="mt-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setHlaska(null);
            try {
              await api("/sprava/bootstrap", { method: "POST", telo: { kod: bootstrap.trim() } });
              setHlaska({ typ: "ok", text: "Hotovo. Tenhle účet je správce." });
              obnov();
            } catch (err) {
              setHlaska({ typ: "chyba", text: err instanceof Error ? err.message : "Kód nesedí." });
            }
          }}
        >
          <Popisek pro="bootstrap">Zaváděcí kód</Popisek>
          <input id="bootstrap" value={bootstrap} onChange={(e) => setBootstrap(e.target.value)} className={`${POLE} cislice`} autoComplete="off" />
          <button type="submit" disabled={!bootstrap.trim()} className={`${TLACITKO_AKCENT} mt-3`}>Stát se správcem</button>
        </form>
        {hlaska && <div className="mt-4"><Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska></div>}
      </Karta>
    );
  }

  const zmenRoli = async (id: string, role: Role) => {
    const poznamka = role === "izs" ? prompt("Poznámka k ověření (např. složka a datum ověření):") ?? "" : "";
    if (role === "izs" && !poznamka.trim()) return;
    try {
      await api(`/sprava/ucty/${id}/role`, { method: "PUT", telo: { role, poznamka } });
      nacti();
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." });
    }
  };

  const filtr = ucty.filter((u) => !hledat || u.id.startsWith(hledat.trim().replace(/^#/, "")));
  const cekajici = zpravy.filter((z) => z.stav === "navrh");

  return (
    <div className="space-y-6">
      {hlaska && <Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska>}

      <Karta odstin={cekajici.length ? "pisek" : "bila"} className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="stitek mb-1">Zprávy partnerů IZS</div>
            <h2 className="podnadpis text-[20px]">{cekajici.length ? `${cekajici.length} čeká na rozhodnutí` : "Nic nečeká"}</h2>
          </div>
          <button type="button" onClick={nacti} className={TLACITKO_TICHE}>Obnovit</button>
        </div>
        {zpravy.length > 0 && (
          <ul className="space-y-3">
            {zpravy.map((z) => (
              <PolozkaZpravy key={z.id} z={z} akce={<AkceSchvaleni z={z} po={nacti} />} />
            ))}
          </ul>
        )}
      </Karta>

      <Karta className="p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="stitek mb-1">Účty</div>
            <h2 className="podnadpis text-[20px]">{ucty.length} účtů</h2>
          </div>
          <input value={hledat} onChange={(e) => setHledat(e.target.value)} className={`${POLE} cislice max-w-[240px]`} placeholder="hledat podle #id" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left">
                {["Účet", "Role", "Založen", "Přihlášen", "Kanály", "Passkey", "Poznámka"].map((h) => (
                  <th key={h} className="stitek border-b border-linka pb-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtr.map((u) => (
                <tr key={u.id} className="border-b border-linka2">
                  <td className="cislice py-2.5 pr-4">#{u.id.slice(0, 8)}{u.id === ucet.id && <span className="stitek ml-2 !text-akcent">vy</span>}</td>
                  <td className="py-2.5 pr-4">
                    <select
                      value={u.role}
                      disabled={u.id === ucet.id}
                      onChange={(e) => zmenRoli(u.id, e.target.value as Role)}
                      className="rounded-[8px] border border-linka bg-noc/60 px-2 py-1 text-[13.5px] text-inkoust disabled:opacity-60"
                    >
                      {(Object.keys(ROLE) as Role[]).map((r) => <option key={r} value={r}>{ROLE[r].nazev}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 pr-4 text-tlum">{datumCas(u.vytvoreno)}</td>
                  <td className="py-2.5 pr-4 text-tlum">{u.posledniPrihlaseni ? datumCas(u.posledniPrihlaseni) : "—"}</td>
                  <td className="py-2.5 pr-4 text-tlum">{[u.telegram && "Telegram", u.whatsapp && "WhatsApp"].filter(Boolean).join(", ") || "—"}</td>
                  <td className="cislice py-2.5 pr-4 text-tlum">{u.passkeys}</td>
                  <td className="py-2.5 pr-4 text-tlum">{u.poznamka ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Karta>

      <Karta className="p-6">
        <div className="stitek mb-1">Audit</div>
        <h2 className="podnadpis mb-4 text-[20px]">Kdo co změnil</h2>
        <ul className="space-y-1.5 text-[13.5px]">
          {audit.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-x-3 border-b border-linka2 py-1.5">
              <span className="cislice text-tlum2">{datumCas(a.kdy)}</span>
              <span className="cislice text-tlum">#{a.kdo.slice(0, 8)}</span>
              <span className="text-inkoust">{a.co}</span>
              {a.cil && <span className="cislice text-tlum">→ #{a.cil.slice(0, 8)}</span>}
            </li>
          ))}
        </ul>
      </Karta>
    </div>
  );
}
