"use client";

import { useCallback, useEffect, useState } from "react";
import { datumCas } from "@/lib/format";
import { kc, STAV_EMAILU, STAV_KREDITU, STAV_PLATBY } from "@/lib/premium";
import { api } from "@/lib/ucet";
import { useDialog } from "./dialog";
import { Hlaska, POLE, Popisek, TLACITKO_TICHE } from "./formulare";
import { Karta } from "./zaklad";

/*
  Správa Premium: platby, oprávnění, kredity, e-maily, práva.

  Správce vidí masky kódů, ne kódy. Každý zásah má povinný důvod a jde do
  auditu. Refund při uplatněném kreditu nic nedělá sám — jen označí
  platbu „vyžaduje rozhodnutí“; to je rozhodnutí provozovatele a právníka.
*/

interface Platba { id: string; ucet_id: string; produkt: string; castka_haleru: number; mena: string; provider: string; provider_payment_id: string | null; stav: string; vraceno_haleru: number; vyzaduje_rozhodnuti: number; posledni_chyba: string | null; vytvoreno: string; zaplaceno: string | null }
interface Kredit { id: string; maska: string; ucet_id: string; platba_id: string | null; hodnota_haleru: number; mena: string; stav: string; vytvoreno: string; uplatneno: string | null; vydal: string; nahrada_za_id: string | null; nahrazen_id: string | null; duvod: string | null }
interface Email { id: string; ucet_id: string; druh: string; kredit_id: string | null; stav: string; pokusy: number; posledni_chyba: string | null; vytvoreno: string; odeslano: string | null }
interface Opravneni { id: string; ucet_id: string; produkt: string; druh: string; zdroj_druh: string; stav: string; vytvoreno: string; platne_do: string | null }
interface Pravo { ucet_id: string; pravo: string; udelil: string; kdy: string }

const DUVODY_NAHRADY = ["EMAIL_ISSUE", "EXPOSED_CODE", "TECHNICAL_ISSUE", "SUPPORT_RESOLUTION", "OTHER"];
const id8 = (id: string) => `#${id.slice(0, 8)}`;

export function SpravaPlateb() {
  const [platby, setPlatby] = useState<Platba[]>([]);
  const [bezi, setBezi] = useState<{ bezi: boolean; test: boolean | null }>({ bezi: false, test: null });
  const [kredity, setKredity] = useState<Kredit[]>([]);
  const [emaily, setEmaily] = useState<Email[]>([]);
  const [odesilani, setOdesilani] = useState<{ nastaveno: boolean; poskytovatel: string | null }>({ nastaveno: false, poskytovatel: null });
  const [opravneni, setOpravneni] = useState<Opravneni[]>([]);
  const [prava, setPrava] = useState<Pravo[]>([]);
  const [hlaska, setHlaska] = useState<{ typ: "ok" | "chyba"; text: string } | null>(null);
  const [rucni, setRucni] = useState({ ucetId: "", hodnotaKc: "150", duvod: "" });
  const [dar, setDar] = useState({ ucetId: "", duvod: "" });
  const [pravoForm, setPravoForm] = useState({ ucetId: "", pravo: "kredity.vydat_rucne" });
  const { zeptejSe, potvrd } = useDialog();

  const nacti = useCallback(async () => {
    try {
      const [p, k, e, o, r] = await Promise.all([
        api<{ platby: Platba[]; bezi: boolean; test: boolean | null }>("/sprava/platby"),
        api<{ kredity: Kredit[] }>("/sprava/kredity"),
        api<{ emaily: Email[]; odesilaniNastaveno: boolean; poskytovatel: string | null }>("/sprava/emaily"),
        api<{ opravneni: Opravneni[] }>("/sprava/opravneni"),
        api<{ prava: Pravo[] }>("/sprava/prava"),
      ]);
      setPlatby(p.platby); setBezi({ bezi: p.bezi, test: p.test });
      setKredity(k.kredity);
      setEmaily(e.emaily); setOdesilani({ nastaveno: e.odesilaniNastaveno, poskytovatel: e.poskytovatel });
      setOpravneni(o.opravneni);
      setPrava(r.prava);
    } catch (e) {
      setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se načíst platby." });
    }
  }, []);
  useEffect(() => { nacti(); }, [nacti]);

  const akce = async (f: () => Promise<unknown>, ok: string) => {
    setHlaska(null);
    try { await f(); setHlaska({ typ: "ok", text: ok }); nacti(); } catch (e) { setHlaska({ typ: "chyba", text: e instanceof Error ? e.message : "Nepovedlo se." }); }
  };

  const nahradit = async (k: Kredit) => {
    const duvod = await zeptejSe({ nadpis: `Náhradní kód za ${k.maska}`, text: `Důvod je povinný, jeden z: ${DUVODY_NAHRADY.join(", ")}. Starý kód přestane platit ve stejné chvíli, kdy nový začne.`, popisek: "Důvod", zastupny: "EMAIL_ISSUE", potvrdit: "Vydat náhradní kód" });
    if (!duvod) return;
    const [d, ...pozn] = duvod.trim().split(/\s+/);
    await akce(() => api(`/sprava/kredity/${k.id}/nahradit`, { method: "POST", telo: { duvod: d.toUpperCase(), poznamka: pozn.join(" ") } }), "Náhradní kód vydán; e-mail zařazen, pokud má účet adresu.");
  };
  const zneplatnit = async (k: Kredit) => {
    const duvod = await zeptejSe({ nadpis: `Zneplatnit ${k.maska}`, text: "Kredit přestane platit. Vrátit to nejde; případně vydáte ruční kredit.", popisek: "Důvod", potvrdit: "Zneplatnit" });
    if (!duvod?.trim()) return;
    await akce(() => api(`/sprava/kredity/${k.id}/zneplatnit`, { method: "POST", telo: { duvod } }), "Kredit zneplatněn.");
  };
  const refund = async (p: Platba) => {
    const duvod = await zeptejSe({ nadpis: `Vrátit platbu ${id8(p.id)}`, text: `Brána vrátí ${kc(p.castka_haleru)}. Aktivní kredit se zneplatní a oprávnění zruší. Uplatněný kredit se nemění — platba dostane příznak k rozhodnutí.`, popisek: "Důvod", potvrdit: "Vrátit platbu" });
    if (!duvod?.trim()) return;
    await akce(() => api(`/sprava/platby/${p.id}/refund`, { method: "POST", telo: { duvod } }), "Refund odeslán bráně a zapsán.");
  };
  const zrusOpravneni = async (o: Opravneni) => {
    const duvod = await zeptejSe({ nadpis: `Zrušit oprávnění ${id8(o.ucet_id)}`, text: "Účet přijde o Premium. Kredit zůstává, jak je.", popisek: "Důvod", potvrdit: "Zrušit" });
    if (!duvod?.trim()) return;
    await akce(() => api(`/sprava/opravneni/${o.id}/zrusit`, { method: "POST", telo: { duvod } }), "Oprávnění zrušeno.");
  };

  const kRozhodnuti = platby.filter((p) => p.vyzaduje_rozhodnuti);

  return (
    <div className="space-y-6">
      {hlaska && <Hlaska typ={hlaska.typ}>{hlaska.text}</Hlaska>}

      <Karta className="p-6">
        <div className="stitek mb-1">Premium</div>
        <h2 className="podnadpis text-velke">Platby</h2>
        <p className="mt-2 text-male text-tlum">
          {bezi.bezi ? `Brána Comgate běží${bezi.test ? " v testovacím režimu" : " naostro"}.` : "Brána není nastavená (chybí tajemství COMGATE_MERCHANT, COMGATE_SECRET nebo KLIC_SIFROVANI). Web říká „připravujeme“."}
          {" "}E-maily: {odesilani.nastaveno ? `odesílá ${odesilani.poskytovatel}` : "odesílání není nastavené, fronta čeká"}.
        </p>
        {kRozhodnuti.length > 0 && <div className="mt-3"><Hlaska typ="info">{kRozhodnuti.length} {kRozhodnuti.length === 1 ? "platba vyžaduje" : "platby vyžadují"} rozhodnutí (refund při uplatněném kreditu nebo nesedící částka).</Hlaska></div>}
        {platby.length === 0 ? <p className="mt-3 text-male text-tlum2">Zatím žádná platba.</p> : (
          <ul className="mt-3 divide-y divide-linka2">
            {platby.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-male">
                <span className="cislice text-tlum2">{id8(p.id)}</span>
                <span className="cislice font-semibold text-inkoust">{kc(p.castka_haleru)}</span>
                <span className="flex items-center gap-1.5 text-tlum"><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${p.stav === "PAID" ? "bg-klid" : p.stav === "PENDING" || p.stav === "CREATED" ? "bg-jantar" : "bg-akcent"}`} />{STAV_PLATBY[p.stav] ?? p.stav}</span>
                <span className="text-tlum2">účet {id8(p.ucet_id)} · {datumCas(p.vytvoreno)}</span>
                {p.vyzaduje_rozhodnuti ? <span className="text-tlum">vyžaduje rozhodnutí{p.posledni_chyba ? `: ${p.posledni_chyba}` : ""}</span> : null}
                {p.stav === "PAID" && <button type="button" onClick={() => refund(p)} className="ml-auto text-tlum underline underline-offset-4 hover:text-inkoust">Vrátit</button>}
              </li>
            ))}
          </ul>
        )}
      </Karta>

      <Karta className="p-6">
        <h2 className="podnadpis text-velke">Kredity</h2>
        {kredity.length === 0 ? <p className="mt-3 text-male text-tlum2">Zatím žádný kredit.</p> : (
          <ul className="mt-3 divide-y divide-linka2">
            {kredity.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-male">
                <code className="cislice text-inkoust">{k.maska}</code>
                <span className="cislice font-semibold text-inkoust">{kc(k.hodnota_haleru)}</span>
                <span className="flex items-center gap-1.5 text-tlum"><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${k.stav === "ACTIVE" ? "bg-klid" : k.stav === "REDEEMED" ? "bg-tlum2" : "bg-jantar"}`} />{STAV_KREDITU[k.stav] ?? k.stav}</span>
                <span className="text-tlum2">účet {id8(k.ucet_id)} · {datumCas(k.vytvoreno)} · vydal {k.vydal === "system" ? "systém" : id8(k.vydal)}{k.nahrada_za_id ? " · náhrada" : ""}{k.duvod ? ` · ${k.duvod}` : ""}</span>
                {k.stav === "ACTIVE" && (
                  <span className="ml-auto flex gap-3">
                    <button type="button" onClick={() => nahradit(k)} className="text-tlum underline underline-offset-4 hover:text-inkoust">Náhradní kód</button>
                    <button type="button" onClick={() => zneplatnit(k)} className="text-tlum underline underline-offset-4 hover:text-inkoust">Zneplatnit</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 border-t border-linka2 pt-4">
          <div className="stitek mb-2">Ruční kredit (jen s právem kredity.vydat_rucne)</div>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_1fr_auto] sm:items-end">
            <div><Popisek pro="rk-ucet">Účet (celé id)</Popisek><input id="rk-ucet" className={`${POLE} cislice`} value={rucni.ucetId} onChange={(e) => setRucni({ ...rucni, ucetId: e.target.value })} /></div>
            <div><Popisek pro="rk-kc">Kč</Popisek><input id="rk-kc" inputMode="numeric" className={`${POLE} cislice`} value={rucni.hodnotaKc} onChange={(e) => setRucni({ ...rucni, hodnotaKc: e.target.value })} /></div>
            <div><Popisek pro="rk-duvod">Důvod</Popisek><input id="rk-duvod" className={POLE} value={rucni.duvod} onChange={(e) => setRucni({ ...rucni, duvod: e.target.value })} /></div>
            <button type="button" disabled={!rucni.ucetId || !rucni.duvod} onClick={async () => {
              if (!(await potvrd({ nadpis: "Vydat ruční kredit?", text: `${rucni.hodnotaKc} Kč pro účet ${id8(rucni.ucetId)} bez platby. Zapíše se do auditu s vaším id.`, potvrdit: "Vydat" }))) return;
              await akce(() => api("/sprava/kredity/rucni", { method: "POST", telo: { ucetId: rucni.ucetId.trim(), hodnotaHaleru: Math.round(Number(rucni.hodnotaKc) * 100), duvod: rucni.duvod } }), "Ruční kredit vydán.");
              setRucni({ ucetId: "", hodnotaKc: "150", duvod: "" });
            }} className={TLACITKO_TICHE}>Vydat</button>
          </div>
        </div>
      </Karta>

      <Karta className="p-6">
        <h2 className="podnadpis text-velke">Oprávnění</h2>
        {opravneni.length === 0 ? <p className="mt-3 text-male text-tlum2">Zatím žádné.</p> : (
          <ul className="mt-3 divide-y divide-linka2">
            {opravneni.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-male">
                <span className="cislice text-tlum2">{id8(o.ucet_id)}</span>
                <span className="font-semibold text-inkoust">{o.produkt}</span>
                <span className="text-tlum">{o.druh} · {o.zdroj_druh}</span>
                <span className="flex items-center gap-1.5 text-tlum"><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${o.stav === "ACTIVE" ? "bg-klid" : "bg-tlum2"}`} />{o.stav}</span>
                <span className="text-tlum2">{datumCas(o.vytvoreno)}{o.platne_do ? ` → ${datumCas(o.platne_do)}` : ""}</span>
                {o.stav === "ACTIVE" && <button type="button" onClick={() => zrusOpravneni(o)} className="ml-auto text-tlum underline underline-offset-4 hover:text-inkoust">Zrušit</button>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 border-t border-linka2 pt-4">
          <div className="stitek mb-2">Udělit Premium bez platby (dar, náhrada za technický problém)</div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><Popisek pro="op-ucet">Účet (celé id)</Popisek><input id="op-ucet" className={`${POLE} cislice`} value={dar.ucetId} onChange={(e) => setDar({ ...dar, ucetId: e.target.value })} /></div>
            <div><Popisek pro="op-duvod">Důvod</Popisek><input id="op-duvod" className={POLE} value={dar.duvod} onChange={(e) => setDar({ ...dar, duvod: e.target.value })} /></div>
            <button type="button" disabled={!dar.ucetId || !dar.duvod} onClick={async () => { await akce(() => api("/sprava/opravneni", { method: "POST", telo: { ucetId: dar.ucetId.trim(), produkt: "premium-odolnost", duvod: dar.duvod } }), "Oprávnění uděleno."); setDar({ ucetId: "", duvod: "" }); }} className={TLACITKO_TICHE}>Udělit</button>
          </div>
        </div>
      </Karta>

      <Karta className="p-6">
        <h2 className="podnadpis text-velke">E-maily s kódy</h2>
        {emaily.length === 0 ? <p className="mt-3 text-male text-tlum2">Fronta je prázdná.</p> : (
          <ul className="mt-3 divide-y divide-linka2">
            {emaily.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-male">
                <span className="text-inkoust">{e.druh}</span>
                <span className="flex items-center gap-1.5 text-tlum"><span aria-hidden className={`h-[6px] w-[6px] rounded-full ${e.stav === "SENT" || e.stav === "DELIVERED" ? "bg-klid" : e.stav === "QUEUED" ? "bg-jantar" : "bg-akcent"}`} />{STAV_EMAILU[e.stav] ?? e.stav}</span>
                <span className="text-tlum2">účet {id8(e.ucet_id)} · {datumCas(e.vytvoreno)} · pokusů {e.pokusy}{e.posledni_chyba ? ` · ${e.posledni_chyba}` : ""}</span>
                {e.stav === "FAILED" && <button type="button" onClick={() => akce(() => api(`/sprava/emaily/${e.id}/znovu`, { method: "POST" }), "Zařazeno znovu.")} className="ml-auto text-tlum underline underline-offset-4 hover:text-inkoust">Poslat znovu</button>}
              </li>
            ))}
          </ul>
        )}
      </Karta>

      <Karta className="p-6">
        <h2 className="podnadpis text-velke">Práva správců</h2>
        <p className="mt-2 text-male text-tlum">Běžná práva (číst platby, náhradní kód, e-mail znovu, audit) má správce z role. Vydat kredit bez platby smí jen ten, komu to jiný správce udělil.</p>
        {prava.length > 0 && (
          <ul className="mt-3 divide-y divide-linka2">
            {prava.map((r) => (
              <li key={`${r.ucet_id}-${r.pravo}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-male">
                <span className="cislice text-tlum2">{id8(r.ucet_id)}</span><span className="text-inkoust">{r.pravo}</span><span className="text-tlum2">udělil {id8(r.udelil)} · {datumCas(r.kdy)}</span>
                <button type="button" onClick={() => akce(() => api("/sprava/prava", { method: "PUT", telo: { ucetId: r.ucet_id, pravo: r.pravo, udelit: false } }), "Právo odebráno.")} className="ml-auto text-tlum underline underline-offset-4 hover:text-inkoust">Odebrat</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div><Popisek pro="pr-ucet">Účet správce (celé id)</Popisek><input id="pr-ucet" className={`${POLE} cislice`} value={pravoForm.ucetId} onChange={(e) => setPravoForm({ ...pravoForm, ucetId: e.target.value })} /></div>
          <div><Popisek pro="pr-pravo">Právo</Popisek><select id="pr-pravo" className={POLE} value={pravoForm.pravo} onChange={(e) => setPravoForm({ ...pravoForm, pravo: e.target.value })}><option value="kredity.vydat_rucne">kredity.vydat_rucne</option></select></div>
          <button type="button" disabled={!pravoForm.ucetId} onClick={async () => { await akce(() => api("/sprava/prava", { method: "PUT", telo: { ucetId: pravoForm.ucetId.trim(), pravo: pravoForm.pravo, udelit: true } }), "Právo uděleno."); setPravoForm({ ...pravoForm, ucetId: "" }); }} className={TLACITKO_TICHE}>Udělit</button>
        </div>
      </Karta>
    </div>
  );
}
