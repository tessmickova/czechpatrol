# CzechPatrol — denní výzkumný audit pro Claude Code

**Vygenerováno:** 8. 9. 2026, Europe/Prague

> Toto NENÍ instrukce k bezhlavé kompletní aktualizaci webu. Je to research handoff: níže jsou věci, které jsem při dnešním výzkumu našel jako nové, hodné kontroly nebo potenciálně ne zcela propsané do webu.
>
> Nejdřív projdi aktuální codebase a data CzechPatrol. Porovnej body níže s tím, co už web skutečně obsahuje, a sám je ověř proti aktuálním důvěryhodným zdrojům. Implementuj pouze změny, které jsou pravdivé, aktuální, neduplicitní a pro uživatele skutečně užitečné. Pokud se tento audit rozchází s lepším primárním nebo novějším zdrojem, použij realitu a pravdu, ne prompt.

## P0 — faktická / bezpečnostní správnost

### 1) Berlínský požár rozvodny z 7. 9. nesmí zůstat prezentovaný jako pravděpodobná sabotáž

Reuters 7. 9. původně informoval, že policie prověřuje požár trafostanice v Berlíně-Moabitu v kontextu německé série útoků na síť. Pozdější vyšetřovací update téhož dne ale podle policejní prezidentky Barbary Slowik Meisel ukazuje na **technickou závadu / následný zkrat**. Definitivní kriminalistická expertiza může ještě doběhnout, ale aktuální evidence hypotézu sabotáže výrazně oslabuje.

Zdroj:
- Reuters, 7. 9. 2026 (souhrn s pozdějším updatem): https://www.reuters.com/world/berlin-police-probe-substation-fire-amid-series-attacks-grid-2026-09-07/
- Reuters text přetištěný Internazionale, 7. 9. 2026: https://www.internazionale.it/ultime-notizie-reuters/2026/09/07/police-in-eastern-german-state-defuse-21-explosive-devices-found-near-power-grid

Pokud web tuto událost mezitím zapsal jako sabotáž / pravděpodobnou sabotáž, oprav confidence/stav a text. Pokud tam není, **nepřidávej ji jako nový sabotážní incident**. Maximálně jako vyšetřovací korekci/negativní signál, pokud to datový model podporuje.

### 2) Český právní stav a NATO jsou čerstvě ověřené a nemají se měnit bez nového primárního důkazu

Repo nyní uvádí `data/pravni-stav.json` ověřený **8. 9. 2026 01:04 UTC**: stav ohrožení státu NE, válečný stav NE, mobilizace NE, nouzový stav NE, obecné omezení vycestování NE, mimořádné uzavření hranic NE. `data/nato.json` je ověřen ve stejný čas a uvádí čl. 4 i čl. 5 jako neaktivované a bez veřejně oznámené mimořádné změny readiness či evakuace personálu/rodin.

Tyto položky jsou nyní správně čerstvé. Neměň je jen proto, že hybridní tlak nebo rétorika rostou.

### 3) Německou energetickou sabotážní sérii stále neslučuj automaticky s ruskou atribucí Leipzig/Halle

Nový rozsah saské série je vážný, ale **není veřejně potvrzené ruské státní řízení celé energetické série**. Leipzig/Halle zůstává samostatným případem s oficiální německou atribucí Rusku.

## P1 — nové / chybějící informace k porovnání s webem

### 1) Sasko: rozsah série narostl na 21 výbušných zařízení — nový vyšetřovací posun 7. 9. 2026

Prokuratura a policie v Sasku 7. 9. oznámily, že při pokračujícím pátrání našly **dalších 9 podomácku vyrobených výbušných zařízení** u vysokonapěťových vedení jižně od rozvodny Graustein v okrese Görlitz. Celkový počet nalezených zařízení v této sérii tím stoupl na **21**.

To není „nový útok 7. 9.“. Fyzické umístění zařízení spadá do předchozí série; **novým signálem je vyšetřovací zjištění rozsahu série**.

Zdroj:
- Reuters, 7. 9. 2026 (přetištěno Internazionale): https://www.internazionale.it/ultime-notizie-reuters/2026/09/07/police-in-eastern-german-state-defuse-21-explosive-devices-found-near-power-grid

Pokud už web saskou sérii má, preferuj update existujícího incidentu/timeline místo nového duplicitního incidentu. Ověř datum původního incidentu vs. datum zveřejnění nového rozsahu.

### 2) Wesel: narušení oplocení další rozvodny — zatím pouze podezřelý fyzický incident

V západoněmeckém Weselu bylo 7. 9. hlášeno narušení bezpečnostního oplocení kolem další trafostanice a policejní prověřování. Zatím není veřejně potvrzené poškození technické infrastruktury, pachatel ani motiv.

Zdroj:
- Reuters, 7. 9. 2026: https://www.reuters.com/world/berlin-police-probe-substation-fire-amid-series-attacks-grid-2026-09-07/

Pokud se zobrazí, drž jako **NEPOTVRZENO / vyšetřování**, ne jako potvrzenou sabotáž. Pokud není další faktický posun, může být lepší nechat jej mimo hlavní feed.

### 3) Rusko–Německo: uzavření německého generálního konzulátu v Petrohradu — konkrétní diplomatická odveta 7. 9. 2026

Rusko 7. 9. oznámilo uzavření německého generálního konzulátu v Petrohradu do 18. 9. jako odvetu za německé kroky po atribuci Leipzig/Halle. Současně potvrdilo ukončení činnosti Goethe-Institutů. Jde o **konkrétní diplomatickou eskalaci**, nikoli vojenský krok ani přerušení diplomatických vztahů jako takových.

Zdroje:
- Reuters, 7. 9. 2026: https://www.reuters.com/world/europe/russia-closes-german-consulate-st-petersburg-after-drone-spat-2026-09-07/
- AP, 7. 9. 2026: https://apnews.com/article/f53afb72a33195d1383c2fe450557122

Pozor na duplicitu: Goethe-Instituty byly oznámeny dříve. Novým bodem 7. 9. je především konkrétní provedení uzavření německého konzulátu a termín.

### 4) Rusko–Norsko: Moskva označila americké raketové instalace za cíle v případě války — 7. 9. 2026

Ruské MZV reagovalo na americké rozmístění systému založeného na Mk-41 v Norsku. Uvedlo, že rozmístění zhoršuje podmínky pro dialog o strategické stabilitě a že rozmístěná místa a velitelská centra by se **v případě vojenského konfliktu** stala cíli.

Důležité: systém podle dostupných zpráv dorazil už v srpnu. **Nový signál 7. 9. je ruská oficiální reakce a explicitní rétorické označení potenciálních cílů**, nikoli nový dnešní přesun zbraní.

Zdroj Reuters, 7. 9. 2026 (přetištěno):
- https://www.investing.com/news/world-news/russia-slams-us-despatch-of-missile-system-tonorway-as-another-blow-to-idea-of-arms-talks-4890589

Pokud web tento bod přidá, typ má být REAKCE / RÉTORIKA / STRATEGICKÝ SIGNÁL, ne fyzický útok. Explicitně uvést podmínku „v případě vojenského konfliktu“.

### 5) Český politicko-bezpečnostní kontext: vláda připouští ruské kybernetické cílení, ale nejde o krizový právní krok

Premiér Andrej Babiš 6. 9. veřejně uvedl, že Česko je pravděpodobně také cílem ruských kybernetických útoků a že vláda chce případné omezení pohybu ruských diplomatů řešit koordinovaně se spojenci. To je relevantní český hybridní/politický signál, ale neznamená mobilizaci, zákaz vycestování ani jiný krizový právní režim.

Zdroj:
- iROZHLAS, 6. 9. 2026: https://www.irozhlas.cz/zpravy-domov/je-cesko-cilem-ruskych-kybernetickych-utoku-pravdepodobne-ano-potvrdil-babis_2609061141_kvr

Pokud už web česká preventivní opatření a hybridní tlak zachycuje, nemusí z toho vzniknout nový incident. Spíš zvaž doplnění českého kontextu / zdroje.

### 6) Deeskalační protiváha: americko-rusko-ukrajinský diplomatický kanál zůstává otevřený

Američtí vyslanci Jared Kushner a Steve Witkoff po jednání s Putinem v Moskvě jednali také v Kyjevě. Bez průlomu, ale s veřejně deklarovanou snahou obnovit trilaterální jednání. To není „mírový průlom“, ale je to relevantní deeskalační protiváha k růstu hybridního a diplomatického napětí.

Zdroj:
- Reuters, 6. 9. 2026: https://www.reuters.com/business/aerospace-defense/us-envoys-make-first-kyiv-visit-amid-ukraine-war-peace-push-2026-09-06/

Použij spíš v „co se nezměnilo / co tlumí eskalaci“ než jako samostatný velký incident.

## P2 — informační architektura / UX k ověření

- `data/stav.json` má stále `aktualizovano: 2026-09-05` a shrnutí stojí hlavně na kumulaci signálů kolem Leipzig/Halle. To **neznamená automaticky, že je level špatně**. Ale po událostech 6.–7. 9. zkontroluj, zda shrnutí/trend už nepůsobí zastarale a zda počet `noveSignaly` odpovídá tomu, co web skutečně ukazuje. Nezvyšuj level jen proto, že timestamp je starší.
- `data/pravni-stav.json` a `data/nato.json` jsou naopak ověřeny 8. 9. krátce po 01:00 UTC. Pokud homepage ukazuje starší dojem u těchto stavů, je problém ve zobrazení/propagaci timestampu, ne v samotných datech.
- U německé energetické série je potřeba relation/timeline logika: původní útok → další nalezená zařízení → nový počet 21 → vyšetřovací korekce Berlin technical fault. Nevyrábět čtyři „nové útoky“, když jde zčásti o nové informace k témuž clusteru.
- Zkontroluj, že homepage umí současně komunikovat: **hybridní tlak je vysoký / zvýšený**, ale **přímý střet zůstává nízký** a **ČR nemá mobilizaci, válečný stav ani obecné omezení vycestování**.
- Rétorické a diplomatické kroky (Lavrov, Norsko, uzavření konzulátu) nesmí mít vizuální váhu stejného typu jako fyzická sabotáž bez jasného badge/typu.

## P3 — maximálně několik užitečných nice-to-have prvků

1. **„Korekce / vyšetřování změnilo obraz“** — malý status u incidentu, když se z podezření na sabotáž stane pravděpodobná technická závada nebo naopak. Je to velmi užitečné proti alarmistickému zkreslení.
2. **Cluster/timeline pro jednu vyšetřovací sérii** — aby nové nálezy (např. 21 zařízení v Sasku) aktualizovaly jeden případ a nevypadaly jako několik nezávislých útoků.
3. **Badge „REAKCE / DIPLOMACIE / RÉTORIKA“** pro konzuláty, výroky a strategické hrozby; fyzické incidenty nechat vizuálně odlišné.

## Putin / ruské vnitřní hodiny — dnešní kontrola

- Nenašel jsem nový důvěryhodný zdravotní fakt o Vladimiru Putinovi. Zdravotní rumory stále nezapočítávej.
- Veřejný diplomatický kanál s USA zůstává otevřený; to je protiváha k ostré rétorice.
- Před ruskými parlamentními volbami 18.–20. 9. stále není nezávisle potvrzený ruský plán na povolební mobilizaci ~300 000 lidí. Ukrajinské tvrzení dál označuj jako **ukrajinské hodnocení**, ne potvrzený plán Kremlu.
- Ekonomický, vojenský a domácí tlak na režim může být relevantní pro trend, ale bez nového konkrétního faktu dnes není důvod automaticky zvyšovat úroveň.

## Co jsem dnes záměrně NEZAŘADIL jako nový incident

- Berlínský požár trafostanice jako sabotáž — novější informace ukazují spíš na technickou závadu.
- Každý jednotlivý článek o 21 zařízeních v Sasku jako samostatnou událost — jde o jeden nový vyšetřovací posun v existující sérii.
- Goethe-Instituty znovu jako nový signál 7. 9., pokud už byly započítané při původním oznámení.
- Samotný americký raketový systém v Norsku jako nový přesun 7. 9. — podle dostupných zpráv byl dodán už v srpnu; nové je až ruské vyjádření.
- Wesel jako potvrzenou sabotáž — zatím jen narušené oplocení a vyšetřování.
- AfD výsledek v Sasku-Anhaltsku jako přímý bezpečnostní incident. Je to politický kontext, ne fyzický nebo právní krizový trigger.
- Běžné opakované průniky do vzdušného prostoru NATO bez kvalitativní změny vzorce.
- Zdravotní spekulace o Putinovi.

## Kontrolní pravidla

- Neimplementuj nic jen proto, že je to napsané zde. Nejprve porovnej s aktuální codebase a ověř realitu.
- Nepřidávej nový incident, pokud jde pouze o nový článek bez nového skutkového zjištění.
- Rozlišuj FAKT / ODHAD / SCÉNÁŘ / NEPOTVRZENO.
- Rozlišuj datum události od data publikace a od data nové atribuce/vyšetřovacího posunu.
- Preferuj primární oficiální zdroje, poté Reuters/AP/AFP a kvalitní národní/regionální média.
- Severity, confidence, bezprostřednost a typ události nejsou totéž.
- U staršího incidentu je nový oficiální atribuční nebo vyšetřovací posun validní nový signál, ale nesmí přepsat původní datum fyzické události.
- Zachovej profesionální, civilní, nealarmistický vzhled. Žádný generický AI dashboard, dramatická militaristická estetika ani falešná procenta rizika.
- Neměň root `CLAUDE.md` ani jiné instrukční root MD soubory kvůli tomuto auditu.
- Po změnách spusť existující testy/typecheck/build a oprav regresní chyby, které změny způsobí.

## Výsledek, který chci od Claude Code

Neodpovídej „implementoval jsem všechno z promptu“. Po kontrole stručně uveď:
- co už bylo na webu správně a nechal jsi beze změny,
- co bylo v rozporu s aktuálními informacemi a opravil jsi,
- co nové jsi skutečně doplnil,
- co jsi záměrně nepřidal, protože to nebylo dost ověřené, bylo duplicitní nebo už zastaralé.

Commituj pouze skutečně potřebné změny webu/dat po vlastním ověření. Tento soubor je research handoff, ne zdroj pravdy.