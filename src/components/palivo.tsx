import { datumPraha } from "@/lib/cas";
import { radaCen, stavPaliv, vetaOCene, type StavPaliva } from "@/lib/palivo";
import { Napoveda } from "./zaklad";
import { Odznak } from "./ui";

/*
  Cena pohonných hmot.

  Stojí hned pod dlaždicí „Palivo a čerpací stanice", protože odpovídá na
  druhou půlku téže otázky: dlaždice říká, jestli je palivo k dispozici,
  tohle říká, kolik stojí.

  Co se tu NEPÍŠE a psát nebude: že cena poroste, že je vhodné natankovat,
  že se něco chystá. Je to předpověď, nemáme ji z čeho doložit — a na
  bezpečnostním webu by taková věta poslala lidi na pumpy. Panika u pump
  situaci vždycky zhorší; stojí to i v detailu provozní položky.

  Když řada chybí, není tu nic. Prázdná dlaždice s nulou by tvrdila, že
  palivo je zadarmo.
*/

function Cena({ s }: { s: StavPaliva }) {
  const veta = vetaOCene(s);
  if (s.cena === null || !veta) return null;

  const roste = s.zaTyden !== null && s.zaTyden > 0;
  const zmena =
    s.zaTyden === null || s.zaTyden === 0
      ? null
      : `${roste ? "+" : "−"}${Math.abs(s.zaTyden).toFixed(2).replace(".", ",")}`;

  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="flex items-baseline gap-2">
        <span className="text-[13.5px] text-tlum">{s.nazev}</span>
        <span className="cislice text-[15px] font-semibold text-inkoust">
          {s.cena.toFixed(2).replace(".", ",")} Kč/l
        </span>
      </span>
      <span className="flex items-center gap-2">
        {zmena && (
          <span className={`cislice text-[12.5px] ${s.skok ? (roste ? "text-akcent-svetla" : "text-klid-text") : "text-tlum2"}`}>
            {zmena} Kč za týden
          </span>
        )}
        {s.odZacatku ? (
          <Odznak ton="pozor" duraz="silny">nejvýš za celou sledovanou dobu</Odznak>
        ) : s.mesicuNaMaximu !== null && s.mesicuNaMaximu >= 3 ? (
          <Odznak ton="pozor">nejvýš za {s.mesicuNaMaximu} {s.mesicuNaMaximu >= 5 ? "měsíců" : "měsíce"}</Odznak>
        ) : null}
      </span>
    </li>
  );
}

export function CenaPaliva() {
  const data = radaCen();
  const paliva = stavPaliv().filter((s) => s.cena !== null);
  // Bez změřené řady se nepíše nic. Ani „zatím nevíme" — to patří k dlaždici.
  if (!paliva.length) return null;

  // Filtr výše zaručil cenu; konec týdne k ní patří vždycky.
  const tyden = paliva[0].konec ?? "";

  return (
    <section aria-label="Ceny pohonných hmot" className="mt-3 rounded-[18px] border border-linka2 bg-plocha px-4 py-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="stitek">Ceny pohonných hmot</span>
        <Napoveda
          popis={
            <span className="block">
              Průměrné spotřebitelské ceny z týdenního šetření Českého statistického úřadu.
              <b className="font-semibold"> Měření, ne předpověď.</b>
            </span>
          }
        >
          <span className="text-[12px] text-tlum2">za týden do {tyden ? datumPraha(tyden) : "—"}</span>
        </Napoveda>
      </div>
      <ul className="divide-y divide-linka2">
        {paliva.map((s) => <Cena key={s.druh} s={s} />)}
      </ul>
      {/* Čtvrtletí ukazuje, jestli je týdenní pohyb výkyv, nebo pokračování. */}
      {paliva.some((s) => s.zaCtvrtleti !== null) && (
        <p className="mt-2 text-[12px] text-tlum2">
          Za čtvrtletí:{" "}
          {paliva
            .filter((s) => s.zaCtvrtleti !== null)
            .map((s) => `${s.nazev.toLowerCase()} ${s.zaCtvrtleti! > 0 ? "+" : "−"}${Math.abs(s.zaCtvrtleti!).toFixed(2).replace(".", ",")} Kč`)
            .join(" · ")}
          .
        </p>
      )}
      <p className="mt-2 text-[11.5px] leading-snug text-tlum2">
        Zdroj:{" "}
        <a href={data.zdroj.url} rel="noopener noreferrer" target="_blank" className="underline hover:text-inkoust">
          {data.zdroj.nazev}
        </a>
        .
      </p>
    </section>
  );
}
