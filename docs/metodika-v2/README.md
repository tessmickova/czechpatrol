# Metodika v2 (pilot, neveřejná)

Revize metodiky podle zadání provozovatelky z 9. 11. 2026. Stav: kód
a dokumentace na větvi `claude/metodika-v2`, web beze změny.

| Soubor | Obsah |
|---|---|
| `01-AUDIT.md` | doložená zjištění o současném stavu, oddělená od hypotéz |
| `02-SPECIFIKACE.md` | předmět, tři vrstvy, datový model, stavy doložení, rozhodovací tabulka, kvalita, výjimky |
| `03-TEXTY.md` | hotové české texty pro úvod, „Proč toto hodnocení“ a veřejnou metodiku |
| `04-UKAZKY.md` | modelové ukázky výstupů (místní, česká, spojenecká událost) |
| `05-PROVOZ-MIGRACE-OVERENI.md` | role lidí a AI, postup opravy, migrace, plán ověření, otevřené otázky |

Kód: `src/lib/metodika2/`. Testy: `testy/metodika2-scenare.test.ts`.
Nástroje: `npm run metodika:porovnani`, `npm run metodika:vzorek`.

Interní právní mapa se do veřejného repozitáře nedává.
