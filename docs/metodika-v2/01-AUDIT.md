# Metodika v2 — audit současného stavu (9. 11. 2026)

Stav k větvi `main` na commitu `cdbeca5`. Zjištění jsou doložená kódem
nebo daty (odkaz v závorce). Hypotézy jsou oddělené na konci a nejsou
ověřené.

## Co web dnes měří a jak

| Ukazatel | Výpočet | Kde |
|---|---|---|
| Situace teď · „Evropa · dnes“ (tachometr) | ověřené případy a aktualizace za 14 dní podle data zjištění; medián 13stupňové závažnosti; mimo Česko o stupeň níž; méně než 2 případy = nestanoveno; při 2 případech rozhoduje mírnější; ruční „mimořádný signál“ +1 stupeň na ≤ 14 dní | `sber/hodnoceni.ts` 61–145 |
| Česko · 90 dní | nejvyšší závažnost ověřených případů v ČR a kampaní se zasažením ČR | `src/components/sidebar-webu.tsx`, `src/lib/data.ts` |
| Běžný život · teď | úřední stav → narušené služby → sledujeme → bez omezení | `src/lib/data.ts` 372–392 |
| Trend | součet závažností (0–10) za 7 dní proti předchozím 7; +25 % a +3 body nahoru, −20 % a −3 dolů | `sber/hodnoceni.ts` 125–131 |
| Úřední stav | 7 položek (stav ohrožení státu, válečný stav, mobilizace, nouzový stav, vycestování, hranice, schůze Parlamentu) | `data/pravni-stav.json` |
| Provoz služeb | 8 položek, pokrytí „orientační“, jedna „nedostupné“ | `data/provoz.json` |

## Doložená zjištění

1. **Předmět není vymezený tak, jak ho čtenář chápe.** Tachometr nese
   štítek „Evropa · dnes“ a stupně „Nízká … Vážná“, ale počítá význam
   z pohledu Česka. Současně se jmenuje „Situace teď“ (`sidebar-uvodu.tsx`).
   Nikde není věta, že nejde o celkovou bezpečnost ani o úřední stupeň.
2. **Medián ředí závažnou událost.** Přidání menších doložených případů
   do okna snižuje úroveň (`hodnoceni.ts` 108–109). Při dvou případech
   rozhoduje ten mírnější. Jediná zásadní událost úroveň nezvedne
   a metodika to výslovně píše („Jediná událost úroveň nezvedne“).
3. **Minimum dvou případů.** Pod dvěma ověřenými případy se úroveň
   nestanoví (`hodnoceni.ts` 120). Jediný závažný doložený incident tak
   nestačí.
4. **Aktivita podle data zjištění, ne podle stavu hrozby.** Okno 14 dní
   běží od `datumZjisteni` (`hodnoceni.ts` 65). Nové zjištění ke starému
   případu ho vrátí do okna jako aktuální. Trvající situace po 14 dnech
   vypadne, i když trvá. Pole pro stav hrozby (probíhá, odvráceno,
   ukončeno) v datech není (`src/lib/typy.ts`, `Incident`).
5. **Vazba na Česko je jen zeměpisná.** Každý případ mimo ČR je o stupeň
   níž bez ohledu na to, zda jde o útok na spojence, doloženou závislost,
   nebo vzdálený kontext. Pole pro typ vazby neexistuje. `dopadNaCr` má
   47 záznamů, všechny se stavem „žádný“.
6. **Vrstva skutečného dopadu je prázdná u záznamů.** `praktickyDopad`
   nemá ani jeden záznam z 219. Dopad na obyvatele dnes nese jen
   „Běžný život“ z úředního stavu a orientačního provozu služeb.
7. **Česko · 90 dní je maximum.** Celostátní ukazatel je nejvyšší
   závažnost jednotlivého případu nebo kampaně, bez územního rozsahu.
8. **Doložení je na úrovni záznamu, ne tvrzení.** Existuje `overeni`
   (lidské 113, automatické 16, neověřeno 90) a `jistota` (4 stupně),
   ale ne stav jednotlivých tvrzení (událost, příčina, původce, úmysl,
   koordinace). Atribuce má pět hodnot a odděluje prostředek, původce
   a úmysl v textu metodiky, ne v datech.
9. **Ověřování stojí.** Do hodnocení vstupuje 43 ze 113 monitorovacích
   záznamů. Poslední vstupující je ze 17. 10. 2026. `data/stav.json` má
   `uroven: null` a `overovaniStoji` od 4. 11. 2026. Web to správně
   přiznává („Nestanoveno“); příčinou je zastavený externí ověřovatel.
10. **Zdraví zdrojů měří odpověď, ne čerstvost rozhodujících zdrojů.**
    „31 z 35 zdrojů odpovědělo“ počítá `ok` z načtení
    (`sber/index.ts` 72–79, `src/lib/pulz.ts` 30). Neříká, zda odpověděly
    zdroje rozhodující pro konkrétní závěr.
11. **Článek 4 a článek 5 NATO jsou jeden druh naléhavosti** se stupněm 1
    („hned do kanálu“) a názvem „článek 4 nebo 5 NATO“
    (`sber/udalosti.ts`, druh `clanek-nato`). Konzultace podle článku 4
    se tak zachází jako kolektivní obrana podle článku 5.
12. **Karta „AI radí dle aktuální situace“ není AI.** Doporučení počítá
    deterministické pravidlo nad kategoriemi záznamů za 30 dní
    (`src/lib/priprava-ted.ts`). Štítek přisuzuje výsledek AI, která ho
    nepočítala.
13. **Ruční výjimka je zdokumentovaná.** Mimořádný signál nese důvod,
    mez, platnost ≤ 14 dní a úroveň bez výjimky (`MimoradnySignal`).
    Chybí schvalující role a datum revize.
14. **Opravy existují.** `data/opravy.json` má 20 záznamů, zobrazují se
    u záznamu a v událostech. Chybí vazba na přepočet odvozených výstupů
    a na opravu v kanálu, kde vyšla původní zpráva.
15. **Vrstva úředních stavů je oddělená a poctivá.** Položky „vyhlášení
    nedoloženo“ místo „nevyhlášeno“; datum ověření se u položek nevyplňuje
    (`data/pravni-stav.json`, `overeno` prázdné). Stupně teroristického
    ohrožení A–D web nesleduje ani nezmiňuje.
16. **Repozitář je veřejný.** Cokoli v něm je veřejné, i když to web
    nezobrazuje. Neveřejné porovnání proto nesmí být commitnuté.

## Hypotézy (neověřené)

- Čtenář čte tachometr jako pravděpodobnost ohrožení. Neověřeno, chybí
  test srozumitelnosti.
- Medián se v září shodoval s ručním hodnocením (komentář v
  `hodnoceni.ts` o kalibraci 23. 9.). Kalibrace stála na jednom měsíci
  a na ručním hodnocení téhož autora; nejde o nezávislou validaci.
- Část 90 záznamů „neověřeno úředně“ by po doplnění úředního zdroje
  změnila výsledek. Nelze ověřit bez ověřovatele.
