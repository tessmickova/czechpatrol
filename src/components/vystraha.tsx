import Link from "next/link";
import { datumCasPraha } from "@/lib/cas";
import { vystraha } from "@/lib/data";
import { DORUCOVANI, KANALY } from "@/config/web";
import { Ikona } from "./ikony";

/*
  Mimořádná výstraha přes celou šířku, nad vším ostatním.

  Zapíná se zápisem do data/vystraha.json a jinak nijak — viz Vystraha
  v src/lib/typy.ts. Bez ověření člověkem a bez dvou zdrojů se nevykreslí
  ani tehdy, když v souboru něco je.

  Tón: oznámení, ne poplach. Červený pruh přes celou šířku obrazovky sám
  o sobě říká „tohle je vážné“, takže text to nemusí dělat podruhé. Proto
  žádné vykřičníky, žádná velká písmena a hned vedle toho, co se stalo,
  stojí i to, co z toho NEPLYNE. Bez druhé části je z výstrahy poplach —
  a panika zabíjí spolehlivě, zatímco zpráva sama o sobě ne.

  Rady, co má člověk dělat, tu nejsou. Tenhle web není krizový štáb; od
  toho jsou úřady a krizové vysílání, na které pruh odkazuje.
*/

export function PruhVystrahy() {
  const v = vystraha();
  if (!v) return null;

  const telegram = DORUCOVANI.telegram.bezi ? KANALY.telegram : "";

  return (
    <aside
      /*
        role="alert" tu schválně NENÍ. Čtečka by celý pruh přečetla přes
        cokoli, co má člověk zrovna rozečtené, a při návratu na stránku
        znovu. Je to důležité sdělení, ne přerušení; proto obyčejný region
        s nadpisem, ke kterému se dá dojít.
      */
      aria-labelledby="vystraha-nadpis"
      className="neni-tisk border-b border-akcent/45 bg-[#2a0f12]"
    >
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="stitek-tmavy inline-flex items-center gap-1.5 rounded-full border border-akcent/60 px-2.5 py-1 text-akcent">
            <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-akcent" />
            Mimořádná výstraha
          </span>
          <span className="cislice text-drobne text-tlum">
            {datumCasPraha(v.kdy)}
          </span>
        </div>

        <h2 id="vystraha-nadpis" className="mt-2.5 text-velke font-bold leading-snug text-inkoust sm:text-velke">
          {v.nadpis}
        </h2>
        <p className="mt-2 max-w-[60ch] text-zaklad leading-relaxed text-inkoust/90">{v.text}</p>

        <div className="mt-3.5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {v.coToZnamena.length > 0 && (
            <div>
              <div className="stitek mb-1">Co to znamená</div>
              <ul className="space-y-1 text-zaklad leading-snug text-tlum">
                {v.coToZnamena.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}
          {/*
            Tahle půlka je důležitější než ta první. „Mobilizace v Rusku“ si
            spousta lidí přeloží jako „válka s NATO zítra“ — a to z toho
            neplyne. Co se neví, musí být napsané stejně velkým písmem jako
            to, co se ví.
          */}
          {v.coToNeznamena.length > 0 && (
            <div>
              <div className="stitek mb-1">Co to neznamená</div>
              <ul className="space-y-1 text-zaklad leading-snug text-tlum">
                {v.coToNeznamena.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-male">
          <span className="text-tlum2">Zdroje:</span>
          {v.zdroje.map((z) => (
            <a key={z.url} href={z.url} target="_blank" rel="nofollow noopener noreferrer" className="odkaz">
              {z.nazev} ↗
            </a>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {telegram && (
            <a
              href={telegram}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-akcent px-4 py-2 text-zaklad font-semibold text-papir transition-opacity hover:opacity-90"
            >
              <Ikona nazev="zvonek" velikost={15} />
              Odebírat na Telegramu
            </a>
          )}
          <Link
            href="/odber/"
            className="inline-flex items-center gap-2 rounded-full border border-linka px-4 py-2 text-zaklad font-semibold text-inkoust transition-colors hover:border-akcent/60"
          >
            Další způsoby odběru
          </Link>
          <span className="text-drobne text-tlum2">
            Ověřeno {datumCasPraha(v.overeno)} · {v.overil}
          </span>
        </div>
      </div>
    </aside>
  );
}
