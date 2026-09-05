import { WEB } from "@/config/web";
import { celkovyStav, hybridniTlak, incidenty, nato, posledniOvereni, pravniStav, provoz } from "@/lib/data";
import { UROVNE } from "@/lib/skala";

export const dynamic = "force-static";

/**
 * Strojově čitelný stav webu.
 *
 * Generuje se při buildu — je to přesně to, co web tvrdí, nic navíc. Čte ho
 * API upozornění: porovná ho s minulým a z rozdílu udělá zprávy. Díky tomu
 * má API jediný zdroj pravdy a nemusí znát ani git, ani sběrač.
 */
export function GET() {
  const stav = celkovyStav();
  const hybrid = hybridniTlak();
  const primy = hybrid.podkategorie.find((p) => p.klic === "primy");
  const telo = {
    verze: 1,
    web: WEB.url,
    generovano: new Date().toISOString(),
    overeno: posledniOvereni(),
    uroven: stav.uroven,
    nazev: stav.uroven ? UROVNE[stav.uroven].nazev : null,
    pasmo: stav.uroven ? UROVNE[stav.uroven].pasmo : null,
    trend: stav.trend,
    hybridni: hybrid.celkem,
    primy: primy?.uroven ?? null,
    pravni: Object.fromEntries(pravniStav().polozky.map((p) => [p.klic, p.plati])),
    nato: Object.fromEntries(nato().polozky.map((p) => [p.klic, p.aktivni])),
    provoz: Object.fromEntries(provoz().polozky.map((p) => [p.klic, p.stav])),
    udalosti: incidenty()
      .filter((i) => i.slug !== "nenalezeno")
      .slice(0, 60)
      .map((i) => ({
        slug: i.slug,
        titulek: i.titulek,
        zavaznost: i.zavaznost,
        pasmo: UROVNE[i.zavaznost].pasmo,
        kategorie: i.kategorie,
        zeme: i.zeme,
        kodZeme: i.kodZeme,
        datumUdalosti: i.datumUdalosti,
        datumZjisteni: i.datumZjisteni ?? null,
        aktualizovano: i.aktualizovano,
        odkaz: `${WEB.url}/incident/${i.slug}/`,
      })),
  };
  return new Response(JSON.stringify(telo), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
