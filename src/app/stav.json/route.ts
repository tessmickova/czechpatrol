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
    /*
      Commit, ze kterého je tenhle build.
      
      Podle něj se dá poznat, jestli na doméně běží to, co je v repozitáři —
      bez toho se „živá verze“ nedá s ničím porovnat. Mimo GitHub Actions
      (lokální build, náhled) je null, protože se nemá co vyplnit.
    */
    commit: process.env.GITHUB_SHA ?? null,
    overeno: posledniOvereni(),
    uroven: stav.uroven,
    nazev: stav.uroven ? UROVNE[stav.uroven].nazev : null,
    pasmo: stav.uroven ? UROVNE[stav.uroven].pasmo : null,
    trend: stav.trend,
    /* Úroveň zvednutá mimořádným signálem redakce: spočtená úroveň a důvod, ať to strojový odběratel neplete s měřením. */
    mimoradny: stav.mimoradny ? { zakladni: stav.mimoradny.zakladni, kratce: stav.mimoradny.kratce, platiDo: stav.mimoradny.platiDo } : null,
    hybridni: hybrid.celkem,
    primy: primy?.uroven ?? null,
    pravni: Object.fromEntries(pravniStav().polozky.map((p) => [p.klic, p.plati])),
    nato: Object.fromEntries(nato().polozky.map((p) => [p.klic, p.aktivni])),
    provoz: Object.fromEntries(provoz().polozky.map((p) => [p.klic, p.stav])),
    // Jen čerstvé záznamy: doplněná historie nesmí vypadat jako nové události.
    udalosti: incidenty()
      .filter((i) => i.slug !== "nenalezeno")
      .filter((i) => Date.now() - new Date(i.datumZjisteni ?? i.datumUdalosti).getTime() < 120 * 86_400_000)
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
