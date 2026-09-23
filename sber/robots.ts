/*
  robots.txt — co nám provozovatel webu dovoluje stahovat.

  Proč to tu je: § 39c autorského zákona (a čl. 4 směrnice 2019/790) dovoluje
  vytěžování textů a dat jen tehdy, když si ho autor strojově čitelně
  nevyhradil — a strojově čitelná výhrada je v praxi právě robots.txt.
  Sběr ho do 23. 9. 2026 vůbec nečetl. Zdroje, které vracely 403, z katalogu
  odešly a nikdo je neobcházel; tohle je druhá polovina téže zásady: nebrat
  ani to, co web sice vydá, ale výslovně nechce vydat automatům.

  Řídí se RFC 9309: robots.txt s odpovědí 4xx = bez omezení, 5xx nebo
  nedostupný = celý web zakázaný (neví se, co by zakázal), platí nejdelší
  shodné pravidlo a Allow vyhrává nad Disallow při stejné délce.
*/

export const TOKEN_AGENTA = "bezpecnostni-prehled";

interface Pravidlo { povolit: boolean; vzor: string }

/** Pravidla pro našeho agenta; když pro něj skupina není, pro „*". */
export function pravidlaPro(robots: string, token = TOKEN_AGENTA): Pravidlo[] {
  const skupiny: { agenti: string[]; pravidla: Pravidlo[] }[] = [];
  let aktualni: { agenti: string[]; pravidla: Pravidlo[] } | null = null;
  let posledniByloPravidlo = false;
  for (const surovy of robots.split(/\r?\n/)) {
    const radek = surovy.replace(/#.*$/, "").trim();
    const m = radek.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const klic = m[1].toLowerCase();
    const hodnota = m[2].trim();
    if (klic === "user-agent") {
      if (!aktualni || posledniByloPravidlo) {
        aktualni = { agenti: [], pravidla: [] };
        skupiny.push(aktualni);
      }
      aktualni.agenti.push(hodnota.toLowerCase());
      posledniByloPravidlo = false;
    } else if ((klic === "allow" || klic === "disallow") && aktualni) {
      posledniByloPravidlo = true;
      if (hodnota) aktualni.pravidla.push({ povolit: klic === "allow", vzor: hodnota });
    }
  }
  const nase = skupiny.filter((s) => s.agenti.some((a) => a !== "*" && token.toLowerCase().includes(a)));
  const vybrane = nase.length ? nase : skupiny.filter((s) => s.agenti.includes("*"));
  return vybrane.flatMap((s) => s.pravidla);
}

function sedi(vzor: string, cesta: string): boolean {
  const kotva = vzor.endsWith("$");
  const regex = (kotva ? vzor.slice(0, -1) : vzor)
    .split("*")
    .map((c) => c.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${regex}${kotva ? "$" : ""}`).test(cesta);
}

export function povoleno(robots: string, cesta: string, token = TOKEN_AGENTA): boolean {
  let nejlepsi: Pravidlo | null = null;
  for (const p of pravidlaPro(robots, token)) {
    if (!sedi(p.vzor, cesta)) continue;
    if (!nejlepsi || p.vzor.length > nejlepsi.vzor.length || (p.vzor.length === nejlepsi.vzor.length && p.povolit)) nejlepsi = p;
  }
  return nejlepsi ? nejlepsi.povolit : true;
}

type Stahovac = (url: string) => Promise<{ stav: number; telo: string }>;
const mezipamet = new Map<string, Promise<string | null>>();

/** Obsah robots.txt; "" = bez omezení, null = nedostupný (dle RFC 9309 vše zakázáno). */
async function robotsWebu(puvod: string, stahni: Stahovac): Promise<string | null> {
  if (!mezipamet.has(puvod)) {
    mezipamet.set(puvod, (async () => {
      try {
        const { stav, telo } = await stahni(`${puvod}/robots.txt`);
        if (stav >= 200 && stav < 300) return telo;
        if (stav >= 400 && stav < 500) return "";
        return null;
      } catch {
        return null;
      }
    })());
  }
  return mezipamet.get(puvod)!;
}

export async function smiStahnout(url: string, stahni: Stahovac): Promise<{ smi: boolean; proc?: string }> {
  let u: URL;
  try { u = new URL(url); } catch { return { smi: false, proc: "neplatná adresa" }; }
  const robots = await robotsWebu(u.origin, stahni);
  if (robots === null) return { smi: false, proc: "robots.txt nedostupný (RFC 9309: nestahovat)" };
  return povoleno(robots, `${u.pathname}${u.search}`) ? { smi: true } : { smi: false, proc: "robots.txt stahování nepovoluje" };
}
