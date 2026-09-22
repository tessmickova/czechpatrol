import Link from "next/link";
import { aktualizaceK, dolozeno, druh, jistotaZobrazena, pripadK, uredniZdroj } from "@/lib/agregace";
import { datumCasPraha, datumPraha } from "@/lib/cas";
import { incidenty, opravyK } from "@/lib/data";
import { ATRIBUCE, KATEGORIE, PUVODCI, STAVY } from "@/lib/kategorie";
import { JISTOTY, UROVNE, zDeseti } from "@/lib/skala";
import type { Incident } from "@/lib/typy";
import { Ikona } from "./ikony";
import { SeznamZdroju } from "./zdroje";
import { Napoveda, VykladUrovne } from "./zaklad";
import { Vlajka } from "./zeme";

/*
  Obsah detailu události. Stejná struktura všude — v postranním panelu
  i na samostatné stránce:

    Co se stalo · Co je nového · Dopad na občany · Co zůstává nejasné
    · Zdroje · Historie aktualizací a oprav

  Každý blok říká, co je fakt a co je hodnocení projektu. Nic se
  nedopočítává: kde údaj chybí, je to napsané.
*/

const DRUH_SLOVA: Record<string, string> = {
  pripad: "Případ",
  aktualizace: "Aktualizace případu",
  opatreni: "Oficiální opatření",
  reakce: "Prohlášení nebo reakce",
};

function Blok({ nadpis, popis, children }: { nadpis: string; popis?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-zaklad font-bold text-inkoust">{nadpis}</h3>
      {popis && <p className="mt-0.5 text-drobne text-tlum2">{popis}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function Seznam({ polozky, tlumene = false }: { polozky: string[]; tlumene?: boolean }) {
  if (!polozky.length) return <p className="text-zaklad text-tlum2">Nic dalšího neuvádíme.</p>;
  return (
    <ul className="space-y-2">
      {polozky.map((f, i) => (
        <li key={i} className={`flex gap-2.5 text-zaklad leading-relaxed ${tlumene ? "text-tlum" : "text-inkoust"}`}>
          <span aria-hidden className={`mt-[9px] h-[4px] w-[4px] shrink-0 rounded-full ${tlumene ? "bg-tlum2" : "bg-akcent"}`} />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

/** Hlavička detailu: druh, země, závažnost, data. */
export function HlavickaDetailu({ i, velka = false }: { i: Incident; velka?: boolean }) {
  const d = UROVNE[i.zavaznost];
  const dr = druh(i);
  const rodic = pripadK(i, incidenty());
  const jistota = jistotaZobrazena(i);
  return (
    <header>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-drobne text-tlum">
        <span className="font-semibold uppercase tracking-[0.05em] text-tlum">{DRUH_SLOVA[dr]}</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5"><Vlajka kod={i.kodZeme} /> {i.kodZeme === "CZ" ? "Česko" : i.zeme}{i.region ? `, ${i.region}` : ""}</span>
        {i.historicky && <><span aria-hidden>·</span><span>doplněno zpětně</span></>}
        <span aria-hidden>·</span>
        <span className="stitek text-tlum2">AI shrnutí</span>
      </div>
      {/*
        Na samostatné stránce detailu je název události hlavním nadpisem
        stránky, tedy H1. V seznamu, kde je hlavní nadpis jinde, je to H2.
        Dřív to byl H2 vždycky a stránka detailu neměla H1 vůbec.
      */}
      {velka ? (
        <h1 className="mt-2 text-cislo font-bold leading-tight text-inkoust sm:text-cislo-l">{i.titulek}</h1>
      ) : (
        <h2 className="mt-2 text-velke font-bold leading-tight text-inkoust">{i.titulek}</h2>
      )}
      {rodic && (
        <p className="mt-2 text-male text-tlum">
          Navazuje na případ <Link href={`/incident/${rodic.slug}/`} className="odkaz">{rodic.kratkyTitulek || rodic.titulek}</Link>.
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-linka2 py-3 text-male sm:grid-cols-4">
        <div>
          <dt className="stitek">Kdy se to stalo</dt>
          <dd className="mt-0.5 font-medium text-inkoust">{datumPraha(i.datumUdalosti)}</dd>
        </div>
        <div>
          <dt className="stitek">Kdy se to zjistilo</dt>
          <dd className="mt-0.5 font-medium text-inkoust">{i.datumZjisteni ? datumPraha(i.datumZjisteni) : "stejný den"}</dd>
        </div>
        <div>
          <dt className="stitek">Závažnost</dt>
          <dd className="mt-0.5">
            <Napoveda popis={<VykladUrovne uroven={i.zavaznost} />}>
              <span className="font-medium text-inkoust underline decoration-dotted underline-offset-4">{d.nazev}</span>
            </Napoveda>
            <span className="cislice ml-1.5 text-drobne text-tlum2">{zDeseti(i.zavaznost)} z 10</span>
          </dd>
        </div>
        <div>
          <dt className="stitek">Jistota informace</dt>
          <dd className="mt-0.5 font-medium text-inkoust">
            {JISTOTY[jistota].nazev}
            {jistota !== i.jistota && <span className="block text-drobne font-normal text-tlum2">bez odkazu na zdroj nejvýš střední</span>}
          </dd>
        </div>
      </dl>
    </header>
  );
}

export function DetailObsah({ i }: { i: Incident }) {
  const vse = incidenty();
  const aktualizace = aktualizaceK(i.slug, vse);
  const opravy = opravyK(i.slug);
  const historie = [
    ...i.historie.map((h) => ({ kdy: h.kdy, text: h.text, druh: "aktualizace" as const })),
    ...opravy.map((o) => ({ kdy: o.datum, text: `Oprava: ${o.co} ${o.proc}`, druh: "oprava" as const })),
  ].sort((a, b) => b.kdy.localeCompare(a.kdy));
  const potvrzenPachatel = i.atribuce === "oficialni" || i.atribuce === "domaci";
  const cr = i.kodZeme === "CZ";

  return (
    <div className="space-y-7">
      {/*
        Text záznamu je shrnutí, ne článek. Píše ho model z veřejných zdrojů
        a čtenář to má vědět dřív, než začne číst — jinak se věty čtou jako
        stanovisko projektu nebo přepis úředního textu, a ani jedno to není.
      */}
      <Blok nadpis="Co se stalo" popis="AI shrnutí veřejných zdrojů, ne oficiální článek ani stanovisko. Každý bod je krytý zdrojem níže.">
        <Seznam polozky={i.fakta} />
        <p className="mt-3 text-male text-tlum">
          {/*
            Dřív tu stálo „Pachatel: oficiální" — na místě osoby nebo státu
            se zobrazoval typ důkazu. Teď je zvlášť původce a zvlášť to,
            v jakém stavu je připsání odpovědnosti.
          */}
          Stav: {STAVY[i.stav]}
          {i.puvodce && <> · Původce: {PUVODCI[i.puvodce]}</>}
          {" "}· Připsání odpovědnosti: {ATRIBUCE[i.atribuce].nazev.toLowerCase()}
          {i.puvodce && !potvrzenPachatel ? ", dosud nepotvrzeno" : ""}
          {" · "}Oblasti: {i.kategorie.map((k) => KATEGORIE[k].nazev).join(", ")}
        </p>
      </Blok>

      <Blok nadpis="Co je nového" popis="Nová zjištění k témuž případu. Aktualizace není nový útok.">
        {aktualizace.length ? (
          <ol className="space-y-2.5">
            {aktualizace.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 text-zaklad leading-relaxed sm:flex-row sm:gap-3">
                <span className="cislice shrink-0 text-male text-tlum sm:w-[92px]">{datumPraha(a.datumZjisteni ?? a.datumUdalosti)}</span>
                <Link href={`/incident/${a.slug}/`} className="odkaz">{a.titulek}</Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-zaklad text-tlum2">Žádná navazující aktualizace zatím není zveřejněná.</p>
        )}
      </Blok>

      <Blok nadpis="Dopad na občany ČR" popis="Co z toho plyne pro běžný život v Česku.">
        <p className="text-zaklad leading-relaxed text-tlum">
          {druh(i) === "opatreni" && cr
            ? "Jde o oficiální opatření v ČR. Co přesně platí, je uvedeno v seznamu opatření na přehledu."
            : "Tento záznam sám o sobě nezakládá žádné oficiální opatření v ČR. Co v Česku platí, se řídí úředními vyhláškami — aktuální stav je na přehledu."}
          {" "}
          <Link href="/#opatreni" className="odkaz">Oficiální opatření</Link>
        </p>
        {/*
          Odkud záznam pochází, musí být vidět.

          Web dlouho sliboval, že všechno na něm prošlo člověkem. Od chvíle,
          kdy se dobře doložené záznamy zveřejňují samy, to neplatí — a mlčet
          o tom by znamenalo tvrdit čtenáři něco, co není pravda. Věta je
          proto u záznamu, ne schovaná v metodice.

          Říká se to ale způsobem, jakým se mluví ke čtenáři, ne k sobě:
          „nikdo z nás ho nečetl" je pravda z provozní porady, ne věta pro
          veřejnost. Čtenář potřebuje vědět, na čem záznam stojí a čí
          hodnocení u něj (ne)najde.
        */}
        {i.overeni === "automaticke" && (
          <div className="mt-3 rounded-[18px] border border-linka p-3.5">
            <div className="stitek mb-1">Odkud tenhle záznam pochází</div>
            <p className="text-zaklad leading-relaxed text-tlum">
              Má dva nezávislé zdroje, aspoň jeden úřední. Zveřejnil se na jejich základě, bez redakčního posouzení. <span className="text-inkoust">Fakta i odkazy odpovídají tomu, co zdroje uvádějí.</span>{" "}
              Vlastní hodnocení projektu u něj proto není.
            </p>
          </div>
        )}
        {i.vyznam && (
          <div className="mt-3 rounded-[18px] border border-linka2 bg-plocha p-3.5">
            <div className="stitek mb-1">Hodnocení projektu — proč to sledujeme</div>
            <p className="text-zaklad leading-relaxed text-tlum">{i.vyznam}</p>
          </div>
        )}
      </Blok>

      {/*
        Dopad na Česko u zahraniční události a praktický dopad pro občana.
        Obojí jen vyplněné: prázdná šablona by tvrdila, že jsme se dívali.
      */}
      {i.dopadNaCr && i.kodZeme !== "CZ" && (
        <Blok nadpis="Dopad na Česko" popis={`Ověřeno ${datumPraha(i.dopadNaCr.overeno)}. Říká, co dnes doloženě platí — ne co by mohlo být.`}>
          <p className="flex items-center gap-2 text-zaklad font-bold text-inkoust">
            <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${i.dopadNaCr.stav === "potvrzeny" ? "bg-akcent" : i.dopadNaCr.stav === "mozny" ? "bg-pozor" : "bg-klid"}`} />
            {i.dopadNaCr.stav === "potvrzeny" ? "Potvrzený dopad" : i.dopadNaCr.stav === "mozny" ? "Možný dopad" : "Momentálně žádný"}
          </p>
          <dl className="mt-2 space-y-2 text-male">
            <div><dt className="stitek">Proč je to relevantní</dt><dd className="mt-0.5 text-tlum">{i.dopadNaCr.procRelevantni}</dd></div>
            <div><dt className="stitek">Co teď platí pro lidi v Česku</dt><dd className="mt-0.5 text-tlum">{i.dopadNaCr.dopad}</dd></div>
            <div><dt className="stitek">Sledujeme</dt><dd className="mt-0.5 text-tlum">{i.dopadNaCr.sledujeme}</dd></div>
          </dl>
        </Blok>
      )}

      {i.praktickyDopad && (
        <Blok nadpis="Co to znamená prakticky" popis={`Ověřeno ${datumPraha(i.praktickyDopad.overeno)}. Jen doložené body; kde údaj chybí, není tu.`}>
          <dl className="grid gap-x-6 gap-y-3 text-male sm:grid-cols-2">
            {i.praktickyDopad.coJePotvrzeno.length > 0 && <div><dt className="stitek">Co je potvrzeno</dt><dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{i.praktickyDopad.coJePotvrzeno.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>}
            {(i.praktickyDopad.kde || i.praktickyDopad.odKdy) && <div><dt className="stitek">Kde a od kdy</dt><dd className="mt-0.5 text-tlum">{[i.praktickyDopad.kde, i.praktickyDopad.odKdy ? `od ${datumPraha(i.praktickyDopad.odKdy)}` : null].filter(Boolean).join(" · ")}</dd></div>}
            {i.praktickyDopad.coMuzeBytOvlivneno.length > 0 && <div><dt className="stitek">Co může být ovlivněno</dt><dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{i.praktickyDopad.coMuzeBytOvlivneno.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>}
            {i.praktickyDopad.coFunguje.length > 0 && <div><dt className="stitek">Co funguje</dt><dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{i.praktickyDopad.coFunguje.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>}
            {i.praktickyDopad.coNefunguje.length > 0 && <div><dt className="stitek">Co nefunguje</dt><dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{i.praktickyDopad.coNefunguje.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>}
            {i.praktickyDopad.coDoporucujeUrad.length > 0 && <div><dt className="stitek">Co doporučuje úřad nebo provozovatel</dt><dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{i.praktickyDopad.coDoporucujeUrad.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">{x.kdo}</a>: {x.text}</li>)}</ul></dd></div>}
            {i.praktickyDopad.coUdelat.length > 0 && <div><dt className="stitek">Co udělat</dt><dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{i.praktickyDopad.coUdelat.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>}
            {i.praktickyDopad.coNedelat.length > 0 && <div><dt className="stitek">Co nedělat</dt><dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{i.praktickyDopad.coNedelat.map((x) => <li key={x}>{x}</li>)}</ul></dd></div>}
            {i.praktickyDopad.dalsiInfo.length > 0 && <div><dt className="stitek">Kde získat další informace</dt><dd className="mt-0.5 text-tlum"><ul className="list-disc pl-4">{i.praktickyDopad.dalsiInfo.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">{x.nazev}</a></li>)}</ul></dd></div>}
          </dl>
        </Blok>
      )}

      <Blok nadpis="Co zůstává nejasné" popis="Stejně důležité jako fakta. Sem patří i tvrzení bez potvrzení.">
        <Seznam polozky={i.neznameho} tlumene />
        {(i.eskalacniSpousteče.length > 0 || i.deeskalacniSignaly.length > 0) && (
          <details className="mt-3 group">
            <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-male font-semibold text-tlum hover:text-inkoust">
              <Ikona nazev="dolu" velikost={13} tah={2} trida="transition-transform group-open:rotate-180" />
              Co by hodnocení tohoto záznamu změnilo
            </summary>
            <ul className="mt-2 space-y-2 pl-1">
              {i.eskalacniSpousteče.map((f, n) => (
                <li key={`e${n}`} className="flex gap-2.5 text-zaklad leading-relaxed text-tlum">
                  <span className="mt-[3px] shrink-0 text-stari-text2"><Ikona nazev="nahoru" velikost={12} tah={2} /></span>{f}
                </li>
              ))}
              {i.deeskalacniSignaly.map((f, n) => (
                <li key={`d${n}`} className="flex gap-2.5 text-zaklad leading-relaxed text-tlum">
                  <span className="mt-[3px] shrink-0 text-klid-text"><Ikona nazev="dolu" velikost={12} tah={2} /></span>{f}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Blok>

      <Blok
        nadpis="Zdroje"
        popis={uredniZdroj(i) ? "Obsahuje úřední zdroj — orgán, který věc sám oznámil." : dolozeno(i) ? "Bez úředního zdroje. Média a agentury." : "Bez dohledatelného odkazu — proto nejvýš střední jistota."}
      >
        {i.zdroje.length ? <SeznamZdroju zdroje={i.zdroje} /> : <p className="text-zaklad text-tlum2">Zdroj chybí. Záznam se zobrazuje jen jako archivní.</p>}
      </Blok>

      <Blok nadpis="Historie aktualizací a oprav" popis="Co a kdy se v tomto záznamu změnilo. Opravy se nikdy nedělají potichu.">
        {historie.length ? (
          <ol className="space-y-2.5">
            {historie.map((h, n) => (
              <li key={n} className="flex flex-col gap-0.5 text-zaklad leading-relaxed sm:flex-row sm:gap-3">
                <span className="cislice shrink-0 text-male text-tlum sm:w-[130px]">{datumCasPraha(h.kdy)}</span>
                <span className={h.druh === "oprava" ? "text-pozor-text" : "text-tlum"}>{h.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-zaklad text-tlum2">Beze změn od zveřejnění.</p>
        )}
        <p className="mt-3 text-drobne text-tlum2">
          Zveřejněno {datumCasPraha(i.aktualizovano)} · <Link href="/opravy/" className="odkaz">všechny opravy</Link>
        </p>
      </Blok>
    </div>
  );
}
