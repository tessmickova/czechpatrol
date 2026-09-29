import { API_URL } from "@/config/web";

/*
  Upozornění do telefonu přes webovou aplikaci (Web Push). Server je
  v api/src/push.ts; tady je jen to, co dělá prohlížeč: požádat o svolení,
  přihlásit odběr a poslat ho API.

  Volba druhů se drží i v prohlížeči, aby šel odběr tiše obnovit, když ho
  prohlížeč sám vymění (dělá to občas bez varování).
*/

/** Klíče odpovídají api/src/push.ts (DRUHY_PUSH). */
export const DRUHY_UPOZORNENI = [
  { klic: "hned", nazev: "Naléhavé zprávy", popis: "mimořádná výstraha, vážné případy, opatření v Česku, článek 4/5 NATO — hned" },
  { klic: "prehled", nazev: "Přehled ráno a večer", popis: "v 7:30 a 19:30, jen co ještě nepřišlo; bez novinek nepřijde" },
  { klic: "kratce", nazev: "Menší signály", popis: "krátce, nejvýš jednou za 4 hodiny" },
  { klic: "tipy", nazev: "Tipy k přípravě", popis: "občas jedna praktická rada" },
] as const;
export type DruhUpozorneni = (typeof DRUHY_UPOZORNENI)[number]["klic"];
export const VYCHOZI_DRUHY: DruhUpozorneni[] = ["hned", "prehled"];

const KLIC_ULOZENI = "cp:upozorneni-druhy";

export type Podpora = "ano" | "ios-plocha" | "ne" | "bez-api";

/** Umí tenhle prohlížeč upozornění? Na iPhonu jen z aplikace přidané na plochu. */
export function podpora(): Podpora {
  if (!API_URL) return "bez-api";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const naPlose = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const umi = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (ios && !naPlose) return "ios-plocha";
  return umi ? "ano" : "ne";
}

function zB64u(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function api<T>(cesta: string, telo?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${cesta}`, telo === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(telo) });
  const data = (await r.json().catch(() => ({}))) as T & { chyba?: string };
  if (!r.ok) throw new Error(data.chyba ?? `Služba odpověděla chybou ${r.status}.`);
  return data;
}

async function registrace(): Promise<ServiceWorkerRegistration> {
  const r = await navigator.serviceWorker.getRegistration();
  if (r) return r;
  return navigator.serviceWorker.register("/sw.js");
}

export async function aktualniOdber(): Promise<PushSubscription | null> {
  const r = await navigator.serviceWorker.getRegistration();
  return r ? r.pushManager.getSubscription() : null;
}

function ulozDruhy(druhy: DruhUpozorneni[] | null) {
  try {
    if (druhy) localStorage.setItem(KLIC_ULOZENI, JSON.stringify(druhy));
    else localStorage.removeItem(KLIC_ULOZENI);
  } catch { /* bez úložiště jen nepůjde tiché obnovení */ }
}

function ctiDruhy(): DruhUpozorneni[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(KLIC_ULOZENI) ?? "null");
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** Zapne upozornění (nebo uloží nový výběr). Volat jen po kliknutí — jinak prohlížeč o svolení nepožádá. */
export async function zapnout(druhy: DruhUpozorneni[]): Promise<void> {
  const svoleni = await Notification.requestPermission();
  if (svoleni !== "granted") throw new Error(svoleni === "denied" ? "Upozornění máte v prohlížeči zakázaná. Povolte je v nastavení webu a zkuste to znovu." : "Bez svolení upozornění posílat nemůžeme.");
  const reg = await registrace();
  await navigator.serviceWorker.ready;
  let odber = await reg.pushManager.getSubscription();
  if (!odber) {
    const { klic } = await api<{ klic: string }>("/push/klic");
    odber = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: zB64u(klic) });
  }
  await api("/push/odber", { ...odber.toJSON(), druhy });
  ulozDruhy(druhy);
}

export async function vypnout(): Promise<void> {
  const odber = await aktualniOdber();
  if (odber) {
    await api("/push/odhlasit", { endpoint: odber.endpoint }).catch(() => {});
    await odber.unsubscribe().catch(() => {});
  }
  ulozDruhy(null);
}

export async function stavOdberu(): Promise<{ prihlaseno: boolean; druhy?: DruhUpozorneni[]; posledniDoruceni?: string | null }> {
  const odber = await aktualniOdber();
  if (!odber) return { prihlaseno: false };
  return api("/push/stav", { endpoint: odber.endpoint });
}

export async function zkouska(): Promise<void> {
  const odber = await aktualniOdber();
  if (!odber) throw new Error("Upozornění tu nejsou zapnutá.");
  await api("/push/zkouska", { endpoint: odber.endpoint });
}

/**
 * Tiché obnovení při každé návštěvě: když člověk upozornění zapnul, ale
 * prohlížeč mezitím odběr zahodil nebo vyměnil, přihlásí se znovu se
 * stejným výběrem. Bez svolení nebo bez uloženého výběru nedělá nic.
 */
export async function obnovitPotichu(): Promise<void> {
  const druhy = ctiDruhy();
  if (!druhy || podpora() !== "ano" || Notification.permission !== "granted") return;
  // Stačí jednou denně — každé otevření stránky by zbytečně volalo API.
  try {
    if (Date.now() - Number(localStorage.getItem(`${KLIC_ULOZENI}:kontrola`) ?? 0) < 86_400_000) return;
    localStorage.setItem(`${KLIC_ULOZENI}:kontrola`, String(Date.now()));
  } catch { return; }
  const reg = await navigator.serviceWorker.ready;
  let odber = await reg.pushManager.getSubscription();
  if (!odber) {
    const { klic } = await api<{ klic: string }>("/push/klic");
    odber = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: zB64u(klic) });
  }
  const s = await api<{ prihlaseno: boolean }>("/push/stav", { endpoint: odber.endpoint });
  if (!s.prihlaseno) await api("/push/odber", { ...odber.toJSON(), druhy });
}
