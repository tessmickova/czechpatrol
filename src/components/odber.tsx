import { KANALY, KDY_UPOZORNENI, WEB } from "@/config/web";
import { Ikona, type NazevIkony } from "./ikony";
import { Karta } from "./zaklad";

interface Definice {
  klic: string;
  nazev: string;
  popis: string;
  ikona: NazevIkony;
  /** Kanál, který funguje vždy — generuje se při buildu. */
  vzdy?: boolean;
}

const DEFINICE: Definice[] = [
  {
    klic: "rss",
    nazev: "RSS",
    popis: "Funguje v každé čtečce a nepotřebuje účet ani vaši adresu.",
    ikona: "radar",
    vzdy: true,
  },
  { klic: "telegram", nazev: "Telegram", popis: "Kanál jen pro čtení, bez diskuse.", ikona: "komunikace" },
  { klic: "whatsapp", nazev: "WhatsApp", popis: "Kanál jen pro čtení, bez skupiny.", ikona: "komunikace" },
  { klic: "signal", nazev: "Signal", popis: "Pro ty, kdo preferují šifrovanou komunikaci.", ikona: "kyber" },
  { klic: "bluesky", nazev: "Bluesky", popis: "Krátká shrnutí ve veřejné síti.", ikona: "globus" },
  { klic: "email", nazev: "E-mail", popis: "Souhrn do schránky. Adresu nepoužijeme k ničemu jinému.", ikona: "dokument" },
];

/**
 * Odběr.
 *
 * Kanál, který nikam nevede, se neukazuje jako dostupný. Nabízet odběr,
 * který ve skutečnosti neexistuje, je horší než ho nenabízet vůbec.
 */
export function OdberPanel({ kompaktni = false }: { kompaktni?: boolean }) {
  const kanaly = DEFINICE.map((d) => ({
    ...d,
    url: d.vzdy ? `${WEB.url}/feed.xml` : (KANALY[d.klic] ?? ""),
    dostupny: d.vzdy || Boolean(KANALY[d.klic]),
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div>
        <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2">
          {kanaly.map((k) => {
            const obsah = (
              <>
                <span
                  className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] border ${
                    k.dostupny ? "border-linka bg-papir text-inkoust" : "border-dashed border-linka text-tlum2"
                  }`}
                >
                  <Ikona nazev={k.ikona} velikost={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold">{k.nazev}</span>
                    {!k.dostupny && (
                      <span className="stitek-tmavy rounded-full border border-dashed border-linka px-2 py-[3px] text-tlum2">
                        Připravujeme
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-tlum">{k.popis}</span>
                </span>
              </>
            );

            return (
              <li key={k.klic} className="h-full">
                {k.dostupny ? (
                  <a
                    href={k.url}
                    target={k.klic === "rss" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="zdvih flex h-full items-start gap-3 rounded-[14px] border border-linka bg-plocha p-4"
                  >
                    {obsah}
                  </a>
                ) : (
                  <div className="flex h-full items-start gap-3 rounded-[14px] border border-dashed border-linka bg-plocha/50 p-4">
                    {obsah}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {!kompaktni && (
        <Karta className="h-fit p-5 sm:p-6">
          <h3 className="podnadpis mb-3 text-[15px]">Kdy přijde upozornění</h3>
          <ul className="space-y-2.5">
            {KDY_UPOZORNENI.map((k) => (
              <li key={k} className="flex gap-2.5 text-[12.5px] leading-relaxed text-tlum">
                <span aria-hidden className="mt-[1px] text-[#4fbe86]">
                  <Ikona nazev="fajfka" velikost={13} tah={1.8} />
                </span>
                {k}
              </li>
            ))}
          </ul>

        </Karta>
      )}
    </div>
  );
}
