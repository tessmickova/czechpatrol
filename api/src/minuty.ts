/*
  Hlídání minut GitHub Actions.

  Proč: repozitář je soukromý a GitHub mu dává 2 000 minut měsíčně. Když
  dojdou, GitHub úlohy vůbec nespustí — přesně tak se sběr zastavil
  17. 9. a znovu 23. 9. 2026 ve 2:02, pokaždé bez varování. Hlídač sběru
  se ozval až po třech hodinách ticha a nevěděl proč.

  Tři pojistky, všechny tady:
  1. ODHAD SPOTŘEBY za běžný měsíc z historie běhů. Varování správci při
     70 % a 90 % přídělu — dřív, než se něco zastaví.
  2. PŘIZPŮSOBENÍ KADENCE: když by spotřeba při současném tempu příděl
     vyčerpala před koncem měsíce, worker kope do sběru méně často (60 →
     90 → 120 → 180 → 240 min). Sběr se zpomalí, ale nezastaví. Lepší zpráva
     za dvě hodiny než žádná zpráva týden.
  3. ODMÍTNUTÉ ÚLOHY: běh, který skončil chybou do 15 s, se ani nerozjel
     (typicky došlé minuty nebo zamítnutá platba). Takový stav se hlásí hned,
     ne až po třech hodinách, a s příčinou.

  Odhad je odhad: GitHub účtuje po úlohách zaokrouhleně na minuty, my
  počítáme po bězích. Úloh je u nás v běhu jedna, takže se to liší málo;
  když se liší, pak nahoru — to je bezpečnější strana.
*/

export const PRIDEL_MINUT = 2000;
export const KADENCE = [60, 90, 120, 180, 240] as const;

export interface Beh {
  conclusion: string | null;
  status?: string;
  run_started_at: string;
  updated_at: string;
  created_at?: string;
}

/** Kolik minut si běh nejspíš naúčtoval. Odmítnutý běh (do 15 s, chyba) nic. */
export function minutBehu(b: Beh): number {
  const ms = new Date(b.updated_at).getTime() - new Date(b.run_started_at).getTime();
  if (!(ms >= 0)) return 0;
  if (b.conclusion === "failure" && ms < 15_000) return 0;
  if (b.conclusion === "skipped" || (b.conclusion === "cancelled" && ms < 15_000)) return 0;
  return Math.max(1, Math.ceil(ms / 60_000));
}

export function odmitnuty(b: Beh): boolean {
  const ms = new Date(b.updated_at).getTime() - new Date(b.run_started_at).getTime();
  return b.conclusion === "failure" && ms >= 0 && ms < 15_000;
}

export interface Spotreba {
  minut: number;
  podil: number;
  /** Odhad na konec měsíce při dnešním tempu. */
  naKonciMesice: number;
  /** Poslední tři dokončené běhy byly odmítnuté = GitHub teď nic nespouští. */
  odmitaSe: boolean;
}

export function spocitejSpotrebu(behy: Beh[], ted: number, pridel = PRIDEL_MINUT): Spotreba {
  const d = new Date(ted);
  const zacatek = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const konec = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  const letos = behy.filter((b) => new Date(b.run_started_at).getTime() >= zacatek);
  const minut = letos.reduce((s, b) => s + minutBehu(b), 0);
  const uplynulo = Math.max(1, ted - zacatek);
  const naKonciMesice = Math.round((minut / uplynulo) * (konec - zacatek));
  const dokoncene = behy.filter((b) => b.conclusion !== null).sort((a, b) => b.run_started_at.localeCompare(a.run_started_at));
  const odmitaSe = dokoncene.length >= 3 && dokoncene.slice(0, 3).every(odmitnuty);
  return { minut, podil: minut / pridel, naKonciMesice, odmitaSe };
}

/**
 * Jak často sbírat, aby příděl vydržel do konce měsíce. Počítá se se
 * zbytkem přídělu a se zbytkem měsíce: sběr zabere odhadem `minutNaBeh`
 * a zbytek práce (kontroly, rozhlas, Patrol) tempem dosavadního měsíce.
 */
export function vyberKadenci(s: Spotreba, ted: number, pridel = PRIDEL_MINUT): number {
  if (s.naKonciMesice <= pridel * 0.9) return KADENCE[0];
  const d = new Date(ted);
  const konec = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  const zbyvaHodin = Math.max(1, (konec - ted) / 3_600_000);
  const zbyvaMinut = Math.max(0, pridel * 0.95 - s.minut);
  // Tempo, kterým smí měsíc dojet; sběr je z něj zhruba polovina (odhad z 9/2026).
  const smiZaHodinu = zbyvaMinut / zbyvaHodin;
  const tempoTed = s.naKonciMesice / (30 * 24);
  const pomer = tempoTed / Math.max(0.01, smiZaHodinu);
  for (const k of KADENCE) if (pomer <= k / 60) return k;
  return KADENCE[KADENCE.length - 1];
}

/** Přečte běhy za běžný měsíc (stránkuje, nejvýš 25 stran = 2 500 běhů). */
export async function behyMesice(token: string, repo: string, ted: number): Promise<Beh[]> {
  const d = new Date(ted);
  const od = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const vse: Beh[] = [];
  for (let strana = 1; strana <= 25; strana++) {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=100&page=${strana}&created=%3E%3D${od}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "czechpatrol-api",
      },
    });
    if (!r.ok) break;
    const data = (await r.json()) as { workflow_runs?: Beh[] };
    const kus = data.workflow_runs ?? [];
    vse.push(...kus);
    if (kus.length < 100) break;
  }
  return vse;
}
