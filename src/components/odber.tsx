import { KANALY, KDY_UPOZORNENI, WEB } from "@/config/web";
import { Ikona } from "./ikony";
import { ZnackaKanalu, type Znacka } from "./znacky";

interface Definice {
  klic: Znacka;
  nazev: string;
  popis: string;
  vzdy?: boolean;
}

const DEFINICE: Definice[] = [
  { klic: "rss", nazev: "RSS", popis: "Bez účtu, bez adresy. Funguje v každé čtečce.", vzdy: true },
  { klic: "telegram", nazev: "Telegram", popis: "Kanál jen pro čtení." },
  { klic: "whatsapp", nazev: "WhatsApp", popis: "Kanál jen pro čtení." },
  { klic: "signal", nazev: "Signal", popis: "Šifrovaně." },
  { klic: "bluesky", nazev: "Bluesky", popis: "Krátká shrnutí." },
  { klic: "email", nazev: "E-mail", popis: "Souhrn do schránky." },
];

/**
 * Odběr. Jiné pozadí než zbytek stránky — je to jediná výzva k akci na webu.
 * Kanál, který nikam nevede, se ukazuje jako připravovaný, ne jako funkční.
 */
export function OdberPanel({ kompaktni = false }: { kompaktni?: boolean }) {
  const kanaly = DEFINICE.map((d) => ({
    ...d,
    url: d.vzdy ? `${WEB.url}/feed.xml` : (KANALY[d.klic] ?? ""),
    dostupny: d.vzdy || Boolean(KANALY[d.klic]),
  }));

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-akcent/30 bg-[radial-gradient(ellipse_at_top_left,rgb(56_232_255/0.16),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgb(178_140_255/0.16),transparent_55%)] p-5 sm:p-6">
      <div aria-hidden className="vzor-mrizka pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {kanaly.map((k) => {
              const obsah = (
                <>
                  <ZnackaKanalu znacka={k.klic} velikost={30} tlumena={!k.dostupny} />
                  <span className="mt-2 block text-[14px] font-bold uppercase tracking-[0.03em]">{k.nazev}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-tlum">{k.popis}</span>
                  {!k.dostupny && <span className="stitek-tmavy mt-2 inline-block rounded-full border border-dashed border-linka px-2 py-[3px] text-tlum2">připravujeme</span>}
                </>
              );
              return (
                <li key={k.klic}>
                  {k.dostupny ? (
                    <a href={k.url} target={k.klic === "rss" ? undefined : "_blank"} rel="noopener noreferrer" className="zdvih sklo block h-full rounded-[14px] p-3.5">
                      {obsah}
                    </a>
                  ) : (
                    <div className="block h-full rounded-[14px] border border-dashed border-linka p-3.5 opacity-80">{obsah}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {!kompaktni && (
          <div className="sklo-noc-slabe rounded-[14px] p-4">
            <div className="stitek mb-2 !text-akcent">Kdy přijde upozornění</div>
            <ul className="space-y-2">
              {KDY_UPOZORNENI.map((k) => (
                <li key={k} className="flex gap-2 text-[13.5px] leading-snug text-tlum">
                  <span aria-hidden className="mt-[2px] shrink-0 text-[#8ff0c0]"><Ikona nazev="fajfka" velikost={13} tah={2} /></span>
                  {k}
                </li>
              ))}
            </ul>
            <p className="stitek mt-3 !text-tlum2">Ne u každé události. Jen když by člověk mohl jednat jinak.</p>
          </div>
        )}
      </div>
    </div>
  );
}
