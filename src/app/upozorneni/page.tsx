import type { Metadata } from "next";
import Link from "next/link";
import { HlavickaStranky, Obsah } from "@/components/hlavicka";
import { UpozorneniKlient } from "@/components/upozorneni-klient";

export const metadata: Metadata = {
  title: "Upozornění v telefonu",
  description: "Zapněte si upozornění z CzechPatrolu přímo do telefonu — bez Telegramu, bez aplikace z obchodu a bez telefonního čísla. Návod pro Android i iPhone.",
};

function Krok({ cislo, children }: { cislo: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="cislice grid h-7 w-7 shrink-0 place-items-center rounded-full bg-akcent/15 text-male font-semibold text-akcent">{cislo}</span>
      <span className="pt-0.5 text-zaklad leading-relaxed text-tlum [&_b]:font-semibold [&_b]:text-inkoust">{children}</span>
    </li>
  );
}

/*
  Upozornění do telefonu přes webovou aplikaci (29. 9. 2026). Chodí stejné
  zprávy jako do Telegramu (nastroje/rozhlas.mjs), jen přímo z webu.
  Návod je pro člověka, který nikdy „aplikaci z webu“ neinstaloval.
*/
export default function Upozorneni() {
  return (
    <>
      <HlavickaStranky
        ikona="zvonek"
        stitek="Upozornění v telefonu"
        nadpis="Když se něco stane, telefon vám dá vědět"
        popis="Bez Telegramu, bez aplikace z obchodu a bez telefonního čísla. Stačí jednou povolit upozornění z czechpatrol.cz."
      />
      <Obsah>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-x-16">
          <section>
            <h2 className="nadpis-boxu mb-4">Zapnout</h2>
            <UpozorneniKlient />
          </section>

          <section className="space-y-8">
            <div>
              <h2 className="nadpis-boxu mb-3">Android</h2>
              <ol className="space-y-3">
                <Krok cislo={1}>Otevřete <b>czechpatrol.cz/upozorneni</b> v Chrome (nebo Samsung Internet, Firefox).</Krok>
                <Krok cislo={2}>Doporučujeme: v nabídce <b>⋮</b> zvolte <b>Přidat na plochu</b> / <b>Nainstalovat aplikaci</b>. Funguje to i bez toho, ale z ikony se web otevře rychleji.</Krok>
                <Krok cislo={3}>Vyberte, co chcete dostávat, a klepněte na <b>Zapnout upozornění</b>. Na dotaz prohlížeče dejte <b>Povolit</b>.</Krok>
                <Krok cislo={4}>Klepněte na <b>Poslat zkušební upozornění</b>. Do minuty má přijít.</Krok>
              </ol>
            </div>
            <div>
              <h2 className="nadpis-boxu mb-3">iPhone a iPad</h2>
              <ol className="space-y-3">
                <Krok cislo={1}>Otevřete <b>czechpatrol.cz/upozorneni</b> v <b>Safari</b>. Potřebujete iOS 16.4 nebo novější.</Krok>
                <Krok cislo={2}>Klepněte na <b>Sdílet</b> (čtvereček se šipkou) → <b>Přidat na plochu</b> → <b>Přidat</b>. Na iPhonu to bez tohoto kroku nejde.</Krok>
                <Krok cislo={3}>Otevřete CzechPatrol <b>z nové ikony na ploše</b>, přejděte sem a klepněte na <b>Zapnout upozornění</b> → <b>Povolit</b>.</Krok>
                <Krok cislo={4}>Klepněte na <b>Poslat zkušební upozornění</b>.</Krok>
              </ol>
            </div>
            <div>
              <h2 className="nadpis-boxu mb-3">Aby to chodilo spolehlivě</h2>
              <ul className="list-disc space-y-2 pl-5 text-zaklad leading-relaxed text-tlum">
                <li>Nevypínejte upozornění pro prohlížeč (Android) nebo pro CzechPatrol (iPhone) v nastavení telefonu.</li>
                <li>Na Androidu nedávejte prohlížeči úsporný režim baterie „omezeno“ — zprávy by mohly chodit pozdě.</li>
                <li>Režimy Nerušit a Soustředění upozornění ztiší. Chcete-li je dostávat i tehdy, přidejte si prohlížeč (nebo CzechPatrol) mezi povolené.</li>
                <li>Po vymazání dat prohlížeče nebo odebrání ikony z plochy je potřeba upozornění zapnout znovu.</li>
                <li>Je to vázané na jeden prohlížeč v jednom zařízení. Na tabletu nebo počítači je zapněte zvlášť.</li>
              </ul>
            </div>
            <div className="rounded-[18px] bg-plocha p-4 text-male leading-relaxed text-tlum">
              <b className="font-semibold text-inkoust">Co o vás víme:</b> jen anonymní adresu pro doručení, kterou vydá váš prohlížeč, a co jste si vybrali. Žádné jméno, číslo ani e-mail. Vypnutím se všechno smaže. Podrobně v <Link href="/soukromi/" className="odkaz">Soukromí</Link>.
              <br />
              <b className="font-semibold text-inkoust">Co to není:</b> náhrada sirén a oficiálních varování. Doručení zaručit neumíme — při přímém ohrožení se řiďte pokyny HZS, obce a policie.
            </div>
          </section>
        </div>
      </Obsah>
    </>
  );
}
