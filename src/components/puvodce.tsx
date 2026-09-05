import { puvodce } from "@/lib/data";
import { Ikona, type NazevIkony } from "./ikony";
import { Napoveda } from "./zaklad";

/*
  Kdo za tím stojí.

  Lidi zajímá jednoduchá otázka: kolik z toho bylo Rusko, kolik Ukrajina,
  kolik někdo jiný — a kolik se vůbec neví. Tady je to napsané v číslech
  a s tím, co je potvrzené. Do celkové úrovně tenhle rozpad nevstupuje.
*/

const BARVY: Record<string, { pruh: string; text: string; ikona: NazevIkony }> = {
  rusko: { pruh: "bg-[#ff8a4c]", text: "text-[#ffa877]", ikona: "vlajka" },
  ukrajina: { pruh: "bg-[#ffd166]", text: "text-[#ffe08a]", ikona: "vlajka" },
  "jiny-stat": { pruh: "bg-[#b28cff]", text: "text-[#d3bcff]", ikona: "globus" },
  domaci: { pruh: "bg-[#4fdd9a]", text: "text-[#8ff0c0]", ikona: "uzivatel" },
  neznamy: { pruh: "bg-[#64789a]", text: "text-tlum", ikona: "lupa" },
};

export function KdoZaTimStoji() {
  const p = puvodce();
  const potvrzenoRusko = p.skupiny.find((s) => s.klic === "rusko")?.potvrzeno ?? 0;
  const neznamych = p.skupiny.find((s) => s.klic === "neznamy")?.pocet ?? 0;
  const domacich = p.skupiny.find((s) => s.klic === "domaci")?.pocet ?? 0;

  return (
    <div className="grid gap-4">
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="stitek">{p.celkem} fyzických incidentů</span>
          <Napoveda
            vpravo
            popis={
              <span className="block">
                Počítají se jen činy — sabotáže, útoky, průniky. Prohlášení politiků, varování služeb a reakce
                států ({p.bezPuvodce} záznamů) původce nemají, proto tu nejsou.
              </span>
            }
          >
            <span className="stitek flex items-center gap-1 !text-akcent"><Ikona nazev="info" velikost={13} /> co se počítá</span>
          </Napoveda>
        </div>

        {p.celkem > 0 && (
          <div aria-hidden className="mb-4 flex h-[10px] overflow-hidden rounded-full bg-linka2">
            {p.skupiny.filter((s) => s.pocet).map((s) => (
              <span key={s.klic} className={BARVY[s.klic].pruh} style={{ width: `${(s.pocet / p.celkem) * 100}%` }} />
            ))}
          </div>
        )}

        <ul className="divide-y divide-linka2">
          {p.skupiny.map((s) => (
            <li key={s.klic} className="flex items-center gap-3 py-2.5">
              <span aria-hidden className={`h-[9px] w-[9px] shrink-0 rounded-[3px] ${BARVY[s.klic].pruh}`} />
              <span className={`flex items-center gap-1.5 text-[15px] font-semibold ${s.pocet ? "text-inkoust" : "text-tlum2"}`}>
                <Ikona nazev={BARVY[s.klic].ikona} velikost={14} />
                {s.nazev}
              </span>
              <span className="ml-auto flex items-baseline gap-3">
                {s.pocet > 0 && s.klic !== "neznamy" && (
                  <span className="stitek !text-tlum2">
                    {s.potvrzeno === s.pocet ? "vše potvrzeno" : s.potvrzeno ? `${s.potvrzeno} potvrzeno` : s.vysetruje ? "vyšetřuje se" : "nepotvrzeno"}
                  </span>
                )}
                <span className={`velke-cislo text-[24px] ${s.pocet ? BARVY[s.klic].text : "text-tlum2"}`}>{s.pocet}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="sklo-noc-slabe rounded-[16px] p-4">
        <div className="stitek mb-2">Co z toho plyne</div>
        <ul className="space-y-2.5 text-[14.5px] leading-relaxed text-tlum">
          <li className="flex gap-2.5">
            <span className="mt-[3px] shrink-0 text-[#ffa877]"><Ikona nazev="fajfka" velikost={14} tah={2} /></span>
            <span>
              <b className="font-semibold text-inkoust">Rusku je oficiálně připsán {potvrzenoRusko === 1 ? "jeden případ" : `${potvrzenoRusko} případů`}</b>
              {potvrzenoRusko ? " (Leipzig/Halle, německá atribuce podpořená EU, NATO i ČR)." : "."} Ostatní jsou domněnky nebo otevřené vyšetřování.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-[3px] shrink-0 text-[#8ff0c0]"><Ikona nazev="fajfka" velikost={14} tah={2} /></span>
            <span>
              <b className="font-semibold text-inkoust">{domacich} případy dostaly domácí vysvětlení</b> bez státního řízení. Proto se celá série nevykládá jednou příčinou.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-[3px] shrink-0 text-tlum"><Ikona nazev="lupa" velikost={14} tah={2} /></span>
            <span>
              <b className="font-semibold text-inkoust">U {neznamych} případů se pachatel neví.</b> Ukrajině není připsán žádný. Když se to změní, změní se i tahle čísla.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-[3px] shrink-0 text-akcent"><Ikona nazev="info" velikost={14} tah={2} /></span>
            <span>
              Pro eskalaci je rozhodující jen potvrzené státní řízení celé série. Jednotlivá atribuce úroveň zvýšila, sama o sobě válku neznamená.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
