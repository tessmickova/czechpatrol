import { KANALY } from "@/config/web";
import { Ikona } from "./ikony";
import { Tlacitko } from "./ui";
import { Znacka } from "./znacka";
import { ZnackaKanalu } from "./znacky";

/*
  Tmavší deska uprostřed stránky.

  Jediné místo na přehledu, kde web něco chce po čtenáři. Stojí schválně
  až za čísly: kdo dočetl sem, ví, co projekt dělá, a teprve pak má smysl
  se ptát, jestli o tom chce vědět dřív než z webu.

  Text nic neslibuje. Upozornění chodí jen u změn, kvůli kterým by člověk
  jednal jinak — ne u každé události. Kdyby chodila u všeho, lidé si je
  vypnou a v okamžiku, kdy by byla potřeba, se k nim nedostane nic.
*/
export function VyzvaTelegram() {
  const url = KANALY.telegram;
  return (
    <section aria-label="Odběr urgentních upozornění" className="noc nalet overflow-hidden rounded-[28px]">
      <div className="relative grid gap-6 px-6 py-8 sm:px-9 sm:py-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
        {/* Značka jako vodoznak — drží desku v rodině webu, nekřičí. */}
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 opacity-[0.07] sm:-right-4">
          <Znacka velikost={230} tmave />
        </span>

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-akcent/20 text-akcent"><Ikona nazev="zvonek" velikost={16} tah={1.9} /></span>
            <span className="stitek-znacky">Urgentní upozornění</span>
          </div>
          <h2 className="titul-mensi mt-4 text-noc-text">Až se něco změní, nebudete zrovna na tomhle webu</h2>
          <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-noc-tlum">
            <strong className="font-bold text-noc-text">
              Kanál posílá zprávu jen tehdy, když se změní něco, kvůli čemu byste jednali jinak.
            </strong>{" "}
            Mobilizace, stav ohrožení, uzavření hranic, článek 4 nebo 5 NATO, narušení provozu. Ne každá
            událost — od toho je tenhle web.
          </p>
          <p className="mt-5 flex flex-wrap items-center gap-2.5">
            {url ? (
              <Tlacitko kam={url} nove varianta="plny" velikost="l">
                <ZnackaKanalu znacka="telegram" velikost={20} />
                Odebírat na Telegramu
              </Tlacitko>
            ) : (
              <span className="inline-flex min-h-[48px] items-center gap-2.5 rounded-full border border-dashed border-linka px-6 text-[14.5px] font-semibold text-noc-tlum">
                <ZnackaKanalu znacka="telegram" velikost={20} tlumena /> Telegram připravujeme
              </span>
            )}
            <Tlacitko kam="/feed.xml" varianta="obrys" velikost="l" naTmavem ikona="rss">RSS do čtečky</Tlacitko>
            <Tlacitko kam="/odber/" varianta="tichy" velikost="l" trida="!font-normal text-noc-tlum hover:bg-[rgb(255_255_255/0.06)] hover:text-noc-text">
              kdy přesně upozornění chodí
            </Tlacitko>
          </p>
        </div>

        <ul className="relative space-y-2.5">
          {[
            { ikona: "zamek" as const, text: "Bez jména, bez e-mailu, bez účtu." },
            { ikona: "vaha" as const, text: "Každá zpráva má u sebe zdroj, na který se dá kliknout." },
            { ikona: "hodiny" as const, text: "Žádné denní souhrny. Ticho znamená, že se nic nezměnilo." },
          ].map((b) => (
            <li key={b.text} className="flex items-start gap-3 rounded-[18px] border border-linka px-3.5 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[rgb(255_255_255/0.06)] text-akcent"><Ikona nazev={b.ikona} velikost={15} tah={1.9} /></span>
              <span className="text-[13.5px] leading-relaxed text-noc-tlum">{b.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
