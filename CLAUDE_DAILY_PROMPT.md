# CzechPatrol — denní výzkumný audit pro Claude Code

**Vygenerováno:** 6. 9. 2026, Europe/Prague

Toto NENÍ instrukce k bezhlavé kompletní aktualizaci webu. Je to výzkumný audit: níže jsou věci, které jsem při aktuálním monitoringu našel jako nové, chybějící, potenciálně zastaralé nebo hodné kontroly.

Tvůj úkol:
1. nejdřív projdi aktuální codebase a data CzechPatrol,
2. porovnej je s body níže,
3. sám ověř, co už na webu je, co je duplicitní a co je skutečně potřeba změnit,
4. používej pouze informace, které odpovídají realitě a jsou dostatečně ověřené,
5. uprav web jen tam, kde změna zvyšuje faktickou správnost, aktuálnost, srozumitelnost nebo užitečnost.

Neber tento soubor jako jediný zdroj pravdy. Pokud se některý bod rozchází s kvalitnějšími primárními zdroji nebo s novějšími fakty, použij realitu a pravdu, nikoli slepé plnění promptu.

## P0 — faktická / bezpečnostní správnost

- Ověř, že právní stav ČR je na všech relevantních místech konzistentní a aktuální: žádný vyhlášený stav ohrožení státu, válečný stav ani mobilizace; žádné obecné omezení legálního vycestování z ČR; článek 5 NATO není aktivován. Pokud některá z těchto informací na webu chybí nebo je příliš schovaná, zpřístupni ji tak, aby čtenář rychle viděl nejen hrozby, ale i to, co se NEDĚJE.
- Ověř u Leipzig/Halle správné oddělení dat: fyzický incident 4. 8. 2026 vs. oficiální německá atribuce Rusku 1. 9. 2026. Starý incident nesmí vypadat jako nový útok 1. 9.
- U německé energetické série nenechávej dojem, že je celá připsaná Rusku. Vyšetřovací vývoj k 4.–6. 9. ukazuje u části případů na domácí extremistický motiv; Leipzig/Halle zůstává samostatně oficiálně připsán Rusku.
- Opakované běžné průniky do vzdušného prostoru NATO prezentuj jako baseline, nikoli automatický důvod pro zvýšení celkové úrovně. Důležitá je změna vzorce, koordinace, hloubka, následky, atribuce a alianční reakce.

## P1 — nové / pravděpodobně chybějící informace k porovnání s webem

- 6. 9. 2026: německý ministr vnitra Alexander Dobrindt oznámil plán systémového posílení ochrany proti hybridním útokům, včetně rychle přesouvatelných protidronových jednotek pro velká města a konceptu „Cyberdome“. Ber to jako nový institucionální obranný signál, NE jako krizový stav nebo přípravu obyvatelstva na válku. Ověř přesné znění a implementační stav z důvěryhodných zdrojů před publikací.
- 5. 9. 2026: americký velvyslanec při NATO Matthew Whitaker veřejně rámoval Leipzig/Halle jako závažnou úmyslnou hybridní akci a varoval před útoky na kritickou infrastrukturu. Je to politicko-bezpečnostní signál USA/NATO prostředí, nikoli formální rozhodnutí Severoatlantické rady.
- 5. 9. 2026: americko-ruské/ukrajinské diplomatické kontakty představují krátkodobý deeskalační signál. Pokud web ukazuje jen rizikové události, zvaž viditelné zobrazení deeskalačních signálů, aby nevznikal systematicky alarmistický bias.
- 4.–6. 9. 2026: u německé energetické infrastruktury došlo k dalším fyzickým nálezům a vyšetřovacím posunům. Nejdřív zkontroluj aktuální stav v datech a nevytvářej duplicitní incidenty pro tutéž sérii. Nový fyzický nález, nový pachatel nebo nový oficiální atribuční posun může být nový signál; článek bez nových faktů není nový incident.

## P2 — informační architektura / UX

- Prověř, zda homepage během 5 sekund současně ukazuje: celkovou úroveň, riziko přímého konfliktu, hybridní tlak, právní možnost vycestování, mobilizaci, stav ohrožení/válečný stav a NATO čl. 4/5. Pokud některý z těchto stavů vyžaduje hledání na jiné stránce, zvaž kompaktní status řádek/kartu bez dalšího vizuálního balastu.
- Severity a confidence musí být vizuálně i významově oddělené. „Vysoká závažnost“ nesmí vypadat jako „potvrzeno“.
- Prověř, zda jsou deeskalační a negativní fakta dost viditelná. Web má umět říct například „přímý střet: nízký“, i když je hybridní tlak vysoký.
- U každé události preferuj minimálně: datum incidentu, datum nového zjištění/atribuce (pokud jiné), stav potvrzení, atribuci, proč to matters, co zatím nevíme a zdroje.

## P3 — užitečné nové prvky k zvážení

- „Co se změnilo od poslední kontroly“: jen skutečné nové signály, ne recyklované články.
- Viditelný blok „Co se nezměnilo“: mobilizace NE, vycestování bez mimořádného omezení, Article 4/5 stav, přímý střet nízký apod. Pouze pokud je to aktuálně ověřené.
- Malý „deeskalační signál“ typ/štítek, aby dashboard nebyl jednostranně kumulátorem špatných zpráv.
- U investigativních sérií relation/series view: stejný případ nedvojit, ale zobrazit časovou osu nových zjištění.

## Kontrolní pravidla

- Neimplementuj nic jen proto, že je to napsané zde. Nejprve porovnej s aktuální codebase a ověř realitu.
- Nepřidávej nový incident, pokud jde pouze o nový článek bez nového skutkového zjištění.
- Rozlišuj FAKT / ODHAD / SCÉNÁŘ / NEPOTVRZENO.
- Rozlišuj datum události od data publikace a od data nové atribuce/vyšetřovacího posunu.
- Preferuj primární oficiální zdroje, poté Reuters/AP/AFP a kvalitní národní média.
- Zachovej profesionální, civilní, nealarmistický vzhled. Nevytvářej generický AI dashboard, zbytečné gradienty ani dramatickou militaristickou estetiku.
- Nevytvářej falešnou přesnost ani procenta rizika bez metodického podkladu.
- Po změnách spusť existující testy/typecheck/build a oprav regresní chyby, které změny způsobí.

## Výsledek, který chci

Ne „implementoval jsem všechno z promptu“, ale stručně vysvětli:
- co už na webu bylo správně a nechal jsi beze změny,
- co bylo v rozporu s aktuálními informacemi a opravil jsi,
- co nové jsi doplnil,
- co jsi záměrně nepřidal, protože to nebylo dost ověřené, bylo duplicitní nebo už zastaralé.
