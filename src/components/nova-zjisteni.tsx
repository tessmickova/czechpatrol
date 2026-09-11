import { druh, kdyZjisteno, type Zaznam } from "@/lib/agregace";
import { Odznak, RadekSeznamu, SeznamPolozek, Sdeleni, TeckaZavaznosti } from "./ui";

/*
  Nová zjištění — co se dozvědělo o tom, co se stalo dřív.

  Není to seznam nových událostí. Sem patří posuny ve vyšetřování: obvinění,
  rozsudek, úředně potvrzený pachatel, samostatná aktualizace případu. Právě
  tohle se u starších případů mění nejčastěji a jinde na webu by to zapadlo
  mezi novou událostí.

  Řádek je tentýž jako v Událostech a na stránkách zemí — jen důvod zjištění
  stojí navíc v metařádce, protože je to to jediné, co se tu čte první.
*/

export function NovaZjisteni({ polozky }: { polozky: { zaznam: Zaznam; duvod: string }[] }) {
  if (!polozky.length) {
    return <Sdeleni ikona="hodiny">Zatím žádný posun ve vyšetřování, který by prošel ověřením.</Sdeleni>;
  }
  return (
    <SeznamPolozek>
      {polozky.map(({ zaznam: i, duvod }) => {
        const nove = druh(i) === "aktualizace" ? i.fakta?.[0] : i.historie?.at(-1)?.text;
        return (
          <RadekSeznamu
            key={i.slug}
            kam={`/incident/${i.slug}/`}
            o={{
              datum: kdyZjisteno(i),
              tecka: <TeckaZavaznosti uroven={i.zavaznost} />,
              kodZeme: i.kodZeme,
              zeme: i.zeme,
              meta: [<Odznak key="d" ton="akcent">{duvod}</Odznak>],
              cerstvost: kdyZjisteno(i),
              titulek: i.kratkyTitulek || i.titulek,
              popis: nove,
            }}
          />
        );
      })}
    </SeznamPolozek>
  );
}
