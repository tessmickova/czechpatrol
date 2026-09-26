import Link from "next/link";
import { aktivniPartneri, type UmisteniPartnera } from "@/lib/partneri";

/*
  Prostor pro partnery (26. 9. 2026).

  Stojí vždy AŽ za tím podstatným: na úvodu pod aktualitami a stavem, na
  ostatních stránkách těsně před patičkou. Je viditelně označený jako
  partner, odkazy nesou rel="sponsored nofollow" a obsah webu ani hodnocení
  na partnerech nezávisí. Bez schváleného partnera ukazuje jen nenápadnou
  nabídku — žádný prázdný rámeček, který by vypadal jako rozbitá reklama.
*/

const REL = "sponsored nofollow noopener noreferrer";

export function PartnerskyProstor({ umisteni, ted, obal = true }: { umisteni: UmisteniPartnera; ted?: number; /** false = uvnitř stránky, která už má okraje. */ obal?: boolean }) {
  const partneri = aktivniPartneri(umisteni, ted);
  return (
    <aside aria-label="Partneři" className={obal ? "mx-auto max-w-[1280px] px-4 sm:px-6" : ""}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-dashed border-linka px-4 py-3">
        {partneri.length ? (
          <ul className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-2">
            {partneri.map((p) => (
              <li key={p.id} className="min-w-0 text-male leading-snug">
                <span className="mr-2 rounded-full border border-linka px-1.5 py-0.5 text-mikro text-tlum2">Partner</span>
                <a href={p.url} target="_blank" rel={REL} className="font-semibold text-inkoust underline-offset-2 hover:underline">{p.nazev}</a>
                <span className="text-tlum"> — {p.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="min-w-0 flex-1 text-male leading-snug text-tlum">
            <span className="mr-2 rounded-full border border-linka px-1.5 py-0.5 text-mikro text-tlum2">Partner</span>
            Místo pro službu, která lidem pomáhá s připraveností a bezpečností.
          </p>
        )}
        <Link href="/partneri/" className="shrink-0 rounded-full border border-linka px-3 py-1.5 text-male font-semibold text-inkoust hover:border-akcent">
          Požádat o banner
        </Link>
      </div>
    </aside>
  );
}
