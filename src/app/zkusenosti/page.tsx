import type { Metadata } from "next";
import { HlavickaStranky } from "@/components/nadpisy";
import { ZkusenostiKlient } from "@/components/zkusenosti-klient";
import { SidebarWebu } from "@/components/sidebar-webu";
import { CoDal } from "@/components/co-dal";
import { Sdeleni } from "@/components/ui";
import { zkusenosti } from "@/lib/zkusenosti";

export const metadata: Metadata = {
  title: "Zkušenosti z Ukrajiny",
  description: "Skutečné útržky z války na Ukrajině: výpadky proudu, voda, peníze, poplachy, odchod z domova. Co se stalo, co následovalo a jak si lidé poradili. Se zdroji.",
};

export default function Zkusenosti() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16">
      <HlavickaStranky
        stitek="Zkušenosti z Ukrajiny"
        nadpis="Jak to bylo doopravdy"
        uvod="Ne fronta, ale všední život ve válce: co přestalo fungovat, co následovalo a jak si lidé poradili. Příručky říkají, jak to má být — tady je, jak to bylo. Vyberte téma."
      />
      <div className="mt-16 grid gap-10 sm:mt-24 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-x-16">
        <div className="min-w-0">
          <ZkusenostiKlient polozky={zkusenosti()} />
          <Sdeleni ikona="info" trida="mt-8">
            Útržky vycházejí ze zveřejněných reportáží, úřadů a organizací; přebíráme fakta, ne znění, a každý má zdroj.
            Česko není Ukrajina — sítě, úřady i situace se liší. Berte to jako zkušenost, ne jako předpověď.
          </Sdeleni>
          <CoDal />
        </div>
        <SidebarWebu />
      </div>
    </div>
  );
}
