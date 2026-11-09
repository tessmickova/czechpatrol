# Metodika v2 — hotové texty (pilot, 9. 11. 2026)

Texty odpovídají tomu, co výpočet v `src/lib/metodika2/` skutečně dělá.
Krátké konstanty jsou v `src/lib/metodika2/texty.ts`. Na web se nasadí až
po rozhodnutí podle `05-PROVOZ-MIGRACE-OVERENI.md`. Heslo „Přehled místo
paniky“ zůstává.

## Úroveň 1 — do pěti sekund (úvod)

Hlavička panelu:

> **Co hodnotíme.** Doložené bezpečnostní události podle jejich významu pro
> Česko. Zvlášť ukazujeme skutečný dopad na obyvatele a úřední výstrahy.
> Nejde o předpověď útoku ani o úřední stupeň ohrožení.

Tři řádky vedle sebe, stejně velké:

| Vrstva | Řádek (vzor) |
|---|---|
| Bezpečnostní vývoj pro Česko | **Zvýšený** · aktivní událost u spojence · aktualizováno 9. 11. 16:00 |
| Dopad na obyvatele a chod země | **Bez doloženého celostátního omezení** · kontrola 9. 11. 16:00 · místní situace se může lišit |
| Úřední výstrahy a stavy | **Žádná platná výstraha v kontrolovaných zdrojích** · krizový stav nevyhlášen podle úředních zdrojů |

Když hodnocení nejde určit:

> **Aktuální hodnocení není k dispozici.** Podklady pro hodnocení nejsou
> úplné. Poslední určené pásmo bylo Omezený (k 3. 11.).

Provozní příčinu (např. zastavené ověřování) web neuvádí — rozhodnutí
provozovatelky z 1. 11. 2026, protože web čtou veřejnost i média. Vidí ji
jen neveřejné porovnání.

Pod pásmem vždy jedna věta: „Pásmo samo není výzvou k jednání. Pokyny
vydávají úřady.“

## Úroveň 2 — „Proč toto hodnocení“ (po rozkliknutí, i na mobilu)

Pořadí bloků, každý nejvýš tři řádky:

1. **Co rozhodlo.** Věta z výpočtu, např.: „Událost ‚sabotáž rozvodny
   přenosové soustavy v Polsku‘ splnila pravidlo A-V2; proto pásmo
   Vysoký.“ Pod ní rozhodující události s odkazem na záznam.
2. **Vazba na Česko.** U každé rozhodující události jedna z: přímo
   v Česku · doložená závislost (jaká) · bezpečnost spojenců (NATO, EU) ·
   širší kontext. Když vazbu určilo pravidlo, ne redakce: „vazbu zatím
   určilo pravidlo, redakce ji neposoudila“.
3. **Co změnu nezpůsobilo.** Události, které jsou jen kontext, nová
   zjištění k starším případům, odvrácené plány, neověřené zprávy.
4. **Míra doložení.** doloženo / předběžně doloženo / nepotvrzeno /
   sporné / vyvráceno — slovy, bez procent.
5. **Co by pásmo změnilo.** Nahoru: „Kdyby se doložilo …, splní pravidlo
   A-M1.“ Dolů: „Pásmo klesne, až … přestane být aktivní.“
6. **Co nevíme.** Kvalita podkladů, nezdokumentované oblasti, zdroje bez
   odpovědi.
7. **Změna proti 2. 11.** „Beze změny pásma (Zvýšený). Beze změny
   neznamená bezpečno.“

## Úroveň 3 — veřejná metodika (osnova stránky /metodika/)

1. **Co CzechPatrol hodnotí a co ne.** Odstavec z § 1 specifikace.
   Výslovně: počet článků není počet incidentů; zachycené incidenty nejsou
   všechny; nejde o pravděpodobnost; nemáme neveřejné informace ani
   odbornou garanci.
2. **Tři vrstvy.** Tabulka z § 2. Proč je neslučujeme do jednoho čísla.
3. **Událost, zdroje a tvrzení.** Jedna událost, víc zdrojů; jak počítáme
   nezávislé redakce; datum události × zjištění × ověření.
4. **Stavy doložení.** Tabulka z § 5, příklady (přihlášení hackerů,
   atribuce úřadem, vyvrácení).
5. **Pásma vrstvy A.** Rozhodovací tabulka A-M1 … A-N2 s příklady
   a protipříklady; aktivita; kvalita podkladů; výjimky.
6. **Dopad (vrstva B).** Intenzita × rozsah; co sledujeme a co ne (voda,
   zdravotní péče dnes ne); obnovení.
7. **Úřední výstrahy (vrstva C).** Jen vydavatel; článek 4 NATO
   = konzultace, článek 5 = kolektivní obrana bez automatických opatření
   v ČR; stupně terorismu A–D jsou věc MV.
8. **Lidé a AI.** Co dělá AI (zkracuje, navrhuje), co pravidlo (pásmo),
   co člověk (schvaluje záznamy, posuzuje vazbu, vysoká pásma). Dvě
   automatické cesty zveřejnění a jejich označení.
9. **Opravy a verze.** Postup opravy, seznam oprav, verze metodiky
   a datum změny; historické hodnocení zůstává podle tehdejší verze.
10. **Omezení a ověřování.** Prahy jsou pilotní; jak probíhá dvojí
    nezávislé zařazení; kontakt pro připomínky.

## Krátké texty k vložení

- **Pásmo Omezený:** „Žádná aktivní doložená událost nemá podle našich
  pravidel větší význam pro bezpečnost Česka nebo spojenců.“
- **Pásmo Zvýšený:** „Aktivní událost má význam pro bezpečnost Česka nebo
  spojenců, ale nesplňuje podmínky vysokého pásma.“
- **Pásmo Vysoký:** „Aktivní doložená závažná událost zasahuje Česko ve
  větším rozsahu, zásadní funkce státu nebo obrany, nebo jde o doloženě
  koordinovanou sérii.“
- **Pásmo Mimořádný:** „Aktivní doložená velmi závažná událost zasahuje
  Česko nebo spojence, nebo úředně platí stav ohrožení státu či válečný
  stav.“
- **Bez dopadu:** „V kontrolovaných zdrojích bez doloženého celostátního
  omezení, stav k [čas]. Místní situace se může lišit.“ Nikdy „jste
  v bezpečí“ ani „nic nehrozí“.
- **Ověření:** „Ověřeno člověkem“ jen u `overeni: lidske`. U automatických
  záznamů „Doloženo úředním zdrojem, bez lidské kontroly“. U médií
  „Neověřeno úředně“.
- **AI:** „Texty záznamů zkracuje AI ze zdrojů. Pásmo počítá pevné
  pravidlo. Záznamy schvaluje člověk, kromě dvou automatických cest
  označených u záznamu.“
- **Článek 4 NATO:** „Žádost o konzultace spojenců. Není to předstupeň
  článku 5 a sama nic neaktivuje.“
- **Článek 5 NATO:** „Kolektivní obrana: spojenci se zavazují pomoci,
  podobu pomoci určují sami. Automatickou mobilizaci, uzavření hranic ani
  opatření v Česku z ní nelze odvodit; platí jen ta, která úřad vyhlásí.“

## Opraveno už na větvi (ne na webu)

- Podmínky: „Celkovou úroveň, zařazení a zveřejnění schvaluje člověk“ →
  pravdivý popis automatického výpočtu a dvou automatických cest.
- Karta „AI radí dle aktuální situace“ → „Co si připravit“: počítá ji pevné
  pravidlo, ne AI.
- Síto: článek 4 NATO (konzultace, stupeň 2) odděleně od článku 5
  (kolektivní obrana, stupeň 1).
