# Metodika v2 — provoz, opravy, migrace a ověření (9. 11. 2026)

## Kdo co dělá

| Krok | Kdo | Kde |
|---|---|---|
| Sběr, deduplikace, návrh shrnutí a zařazení | automat a AI | `sber/`, Patrol |
| Kontrola schématu, zdrojů a zakázaných textů | automat | `npm run kontrola:data`, testy |
| Schválení záznamu | člověk (`overeni: lidske`) | Správa, `npm run spravce schval` |
| Dvě automatické cesty zveřejnění | automat, vždy označené u záznamu | `spravce zverejni` |
| Posouzení vazby na ČR, stavu hrozby, rozsahu, zásahu funkce (`v2`) | člověk (`v2.kontrola`) | zápis do záznamu |
| Pásmo vrstvy A | pevné pravidlo | `src/lib/metodika2/vrstva-a.ts` |
| Vysoké a mimořádné pásmo jako vlastní závěr | až po posouzení rozhodujících událostí; do té doby „předběžné“ | `cekaNaPosouzeni` |
| Převzatá úřední výstraha | samostatně, hned, s vydavatelem a územím | vrstva C |
| Ruční výjimka | člověk s rolí, důvodem, podklady, datem revize; nejvýš +1 pásmo a 14 dní | `VyjimkaV2` |

Redakce neslouží nepřetržitě. Zastavené ověřování se ukáže jako
„Aktuální hodnocení není k dispozici“, ne jako klid.

## Postup opravy

1. **Přijetí podnětu.** Chybí kontakt: `PROVOZOVATEL.kontakt` v
   `src/config/web.ts` je prázdný a podmínky posílají na stránku bez
   kontaktu. **Blokující, doplní provozovatelka.**
2. **Posouzení.** Člověk ověří podklady a zapíše rozhodnutí.
3. **Změna záznamu.** `npm run spravce uprav-zaznam <slug> '<json>'`,
   vyvrácení `npm run spravce stahni <slug> '<json>'` (záznam přejde
   do nepotvrzených se stavem „vyvráceno“). Ve `v2.tvrzeni` se tvrzení
   označí `vyvraceno`.
4. **Přepočet.** Hodnocení v1 se přepočítá při nejbližším sběru; v2
   `npm run metodika:porovnani`. Test scénáře 15 hlídá, že vyvrácená
   událost z pásma vypadne a je u ní vidět proč.
5. **Dohledatelnost.** Zápis do `data/opravy.json` (u záznamu
   a v událostech) a commit s důvodem.
6. **Stejný kanál.** U podstatně chybné dříve rozeslané zprávy připravit
   „uvedení na pravou míru“ pro Telegram (`nastroje/rozhlas.mjs` ho umí).
   Odeslání vyžaduje výslovný pokyn provozovatelky.
7. **Odstranění.** Když je obsah nezákonný, nestačí oprava: je třeba
   odstranit i z veřejné historie repozitáře. Postup posoudí právník
   (interní právní mapa, bod 11).

## Migrace (bezpečný postup)

1. **Stínový režim (hotovo na větvi `claude/metodika-v2`).** Výpočet,
   testy, `npm run metodika:porovnani`. Web se nemění. Výstup porovnání
   jde do `.metodika-v2/`, kterou git ignoruje.
2. **Doplnění polí `v2`** u událostí za posledních 30 dní a u všech
   probíhajících: vazba s mechanismem, stav hrozby s datem ověření,
   rozsah, zásah funkce, `kontrola`. Bez nich zůstávají rozhodující
   události „odvozené“ a kvalita „omezená“.
3. **Neveřejné porovnání 2–4 týdny** denně. Každý rozdíl v1 × v2
   zapsat s důvodem. Změna metody není změna bezpečnosti.
4. **Dvojí nezávislé zařazení vzorku** (níže) před zveřejněním.
5. **Rozhodnutí provozovatelky** o zveřejnění. Do `data/stav.json`
   přibude `verzeMetodiky`. Starší hodnocení zůstávají podle verze 1.x
   s poznámkou „počítáno podle dřívější metodiky, není přímo srovnatelné“.
6. **Změna rozhraní** podle `03-TEXTY.md`: tři řádky, tachometr jen pro
   vrstvu A nebo bez něj, „Proč toto hodnocení“.

Zpětné porovnání má omezení: u minulých dní nezná tehdejší stav
ověřování a sběru a bere kvalitu jako dostatečnou. Dny po zastavení
ověřovatele (od 18. 10. 2026) proto vycházejí příznivěji, než by skutečně
vyšly. Záznamy se navíc později upravovaly; „co se tehdy vědělo“ se
rekonstruuje jen podle data zjištění.

Výsledek stínového porovnání za 45 dní k 9. 11. 2026 (v2): 26.–29. 9.
Zvýšený (A-Z2, závažná událost u spojence), 30. 9.–8. 11. Omezený (A-O1),
9. 11. nelze určit (A-N1, ověřování stojí). Web (v1) dnes ukazuje
„Nestanoveno“.

## Plán empirického ověření

| Co | Jak | Pilotní cíl |
|---|---|---|
| Shoda zařazení | `npm run metodika:vzorek -- vzorek 30`; dva hodnotitelé nezávisle, bez výstupu algoritmu; `shoda a.csv b.csv` | kappa ≥ 0,6 u vazby a pásma; neshody → zpřesnit pravidla |
| Falešné poplachy | pásmo ≥ Zvýšený, rozhodující událost později vyvrácena | počítat a zveřejnit |
| Přehlédnuté dopady | doložený dopad v ČR, který vrstva B neukázala | počítat |
| Stabilita | změny pásma za týden bez nové události | ≤ 1 |
| Prodleva | od zjištění události po pásmo | změřit, zveřejnit typickou |
| Srozumitelnost | 5–8 čtenářů, panel úrovně 1: „Je to pravděpodobnost útoku?“, „Máte něco udělat?“ | žádná záměna pásma za pravděpodobnost ani za pokyn |

Zpětné ověření skutečných případů jen s informacemi dostupnými k danému
datu (`znamoKe`). Externí odborná revize zatím neproběhla; odborný
konsenzus se netvrdí.

## Výsledky testů (9. 11. 2026)

`testy/metodika2-scenare.test.ts`: 18 scénářů ze zadání, 6 pojistek
a 2 testy shody hodnotitelů — všechny prošly. Celá sada viz commit.

## Otevřené otázky

1. Prahy (14 dní aktivity, 7 dní ověření stavu, 80/50 % zdrojů) jsou
   pilotní a nevyhodnocené.
2. Odvozená vazba „spojenci“ podle kategorie je hrubá.
3. Odvrácený závažný plán pásmo nezvedá; je to správně?
4. Voda a zdravotní péče se nesledují; pro vrstvu B chybí zdroje.
5. Ověřování stojí od 18. 10. 2026 (externí ověřovatel); bez něj nebude
   v2 ani v1 mít z čeho počítat.
6. Kontakt pro opravy chybí.
