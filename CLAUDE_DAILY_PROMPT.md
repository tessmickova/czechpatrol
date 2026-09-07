# CzechPatrol — denní výzkumný audit pro Claude Code

**Vygenerováno:** 7. 9. 2026, Europe/Prague

> Toto NENÍ instrukce k bezhlavé kompletní aktualizaci webu. Je to research handoff: níže jsou věci, které jsem při dnešním výzkumu našel jako nové, hodné kontroly nebo potenciálně ne zcela propsané do webu.
>
> Nejdřív projdi aktuální codebase a data CzechPatrol. Porovnej body níže s tím, co už web skutečně obsahuje, a sám je ověř proti aktuálním důvěryhodným zdrojům. Implementuj pouze změny, které jsou pravdivé, aktuální, neduplicitní a pro uživatele skutečně užitečné. Pokud se tento audit rozchází s lepším primárním nebo novějším zdrojem, použij realitu a pravdu, ne prompt.

## P0 — faktická / bezpečnostní správnost

V dnešním auditu jsem nenašel potvrzenou novou P0 změnu českého právního nebo aliančního stavu, kterou by bylo správné automaticky přepsat.

- Repo má `data/pravni-stav.json` ověřený 6. 9. 2026 pozdě večer a uvádí: stav ohrožení státu NE, válečný stav NE, mobilizace NE, obecné omezení vycestování NE, mimořádné uzavření hranic NE. Před změnou těchto stavů vyžaduj nový primární úřední důkaz.
- `data/nato.json` je rovněž ověřen 6. 9. pozdě večer a uvádí čl. 4 i 5 jako neaktivované a bez veřejně oznámené mimořádné změny readiness. Neměň bez nového oficiálního zdroje NATO.
- U Leipzig/Halle dál drž oddělení: fyzický incident 4. 8. 2026; oficiální německá atribuce Rusku 1. 9. 2026. Nové komentáře k případu nejsou nový útok.
- U německé energetické série nesmí UI naznačovat, že je celá připsaná Rusku. U části případů se vyšetřování soustředí na 48letého podezřelého s deklarovaným anti-fosilním motivem / možným „climate extremism“. To nijak neruší samostatnou oficiální ruskou atribuci Leipzig/Halle.

## P1 — nové / chybějící informace k porovnání s webem

### 1) Německo: nový ochranný rámec proti sabotážím — 6. 9. 2026

Reuters 6. 9. uvedl, že německé ministerstvo vnitra připravuje širší ochranný rámec proti sabotážím, dronovým útokům a kybernetickým zásahům po Leipzig/Halle. Jde o **institucionální obrannou reakci**, nikoli krizový stav, mobilizaci nebo známku bezprostředního útoku NATO–Rusko.

Zdroj:
- Reuters, 6. 9. 2026: https://www.reuters.com/business/media-telecom/germany-plans-anti-sabotage-shield-after-airport-drone-attack-bild-reports-2026-09-06/

Porovnej s incidenty/reakcemi v datech. Pokud už je tato reakce zachycena, neduplikuj ji. Pokud není, zvaž ji jako nový institucionální/obranný signál s jasným vysvětlením „co to znamená / co to neznamená“.

### 2) Rusko–Německo: Lavrovova nová eskalační rétorika — 6. 9. 2026

Sergej Lavrov 6. 9. označil německá obvinění Ruska v souvislosti s Leipzig/Halle za začátek „skutečné války“ a obvinil německé vedení z militarizace. Je to **nový oficiální rétorický/diplomatický signál**, nikoli vojenský rozkaz, přesun sil ani změna právního stavu.

Zdroj:
- Reuters, 6. 9. 2026: https://www.reuters.com/world/russias-lavrov-calls-accusations-moscows-involvement-leipzig-drone-incident-2026-09-06/

Pokud bude na webu, severity stanov podle metodiky a confidence odděleně. Nepoužívej titulek typu „Rusko zahájilo válku s Německem“ — fakticky by byl chybný.

### 3) Dánsko: PET veřejně potvrzuje konkrétní ruské plánování sabotáží

Dánská PET na své oficiální stránce 5. 9. výslovně uvedla, že **vidí konkrétní ruské plánování a přípravu sabotáží namířených proti Dánsku**, zejména proti obrannému průmyslu a firmám napojeným na vojenskou pomoc Ukrajině. PET současně výslovně říká, že **nemá informaci o konkrétním bezprostředním útoku v určitém místě nebo čase**. To je důležité pro správné oddělení závažnosti od bezprostřednosti.

Primární zdroj:
- PET, 5. 9. 2026: https://pet.dk/pet/nyhedsliste/pet-ser-planlaegning-og-forberedelse-af-russisk-sabotageaktivitet-i-danmark/2026/09/05

Sekundární potvrzení:
- Reuters, 3. 9. 2026: https://www.reuters.com/world/russia-recruits-danes-sabotage-planning-denmark-says-2026-09-03/

Pozor na datum: Reuters o výroku informoval už 3. 9.; oficiální web PET zveřejnil vlastní potvrzení 5. 9. **Nevytvářej z toho dva incidenty.** Pokud už web dánský signál má z Reuters, pouze zvaž doplnění primárního PET zdroje a přesnější formulace.

### 4) Deeskalační protiváha: diplomatický kanál zůstává otevřený — 6. 9. 2026

Reuters 6. 9. uvedl, že Moskva nevylučuje budoucí trilaterální schůzku Putin–Trump–Si a pokračují přípravy dalších bilaterálních kontaktů. To není mírová dohoda ani důkaz deeskalace války, ale je to relevantní **diplomatický protiváhový signál**, pokud dashboard zobrazuje i deeskalační faktory.

Zdroj:
- Reuters, 6. 9. 2026: https://www.reuters.com/world/china/moscow-has-not-ruled-out-trilateral-meeting-between-presidents-russia-us-china-2026-09-06/

Nepřidávej jako velký incident, pokud metodika takové diplomatické signály nepočítá. Spíš ho použij tam, kde web vysvětluje „co situaci naopak tlumí“.

### 5) Česká republika: preventivní opatření nadále nejsou krizovým právním krokem

České ministerstvo vnitra 4. 9. potvrdilo přijetí konkrétních preventivních bezpečnostních opatření v reakci na sabotážní/hybridní incidenty v okolních státech; současně ministr uvedl, že bezpečnostní situace v ČR je stabilní a teroristický stupeň zůstává B. Pokud to web obsahuje, musí být obě části vedle sebe — **opatření se zvýšila, ale stát nevyhlásil krizový režim**.

Sekundární zdroj ČTK:
- https://www.blesk.cz/clanek/zpravy-politika/847530/cesko-prijalo-nova-opatreni-po-sabotazich-v-nemecku-vetsi-ochrana-letist-i-energetickych-objektu.html

Pokud najdeš primární příspěvek/stanovisko MV nebo ministra, preferuj ho před sekundárním odkazem.

## P2 — informační architektura / UX k ověření

- `data/stav.json` má `aktualizovano` 5. 9. a `data/hybridni-tlak.json` / `data/rusko.json` mají také ověření 5. 9., zatímco právní a NATO soubory jsou ověřené 6. 9. pozdě večer. Neznamená to automaticky, že jsou špatně. Zkontroluj ale, zda novější signály z 6. 9. mění pouze popis/zdroje, nebo skutečně i úroveň/trend. **Nezvyšuj level jen kvůli stáří timestampu.**
- Na homepage musí být jasně vidět současně dvě pravdy: hybridní/sabotážní tlak v Evropě je zvýšený, ale přímé vojenské riziko NATO–Rusko je vedeno odděleně a český právní stav neukazuje mobilizaci či zákaz vycestování.
- Pokud se Lavrovova rétorika objeví jako karta, zobraz ji jako „oficiální rétorický/diplomatický posun“, nikoli jako fyzický incident.
- Pokud se PET objeví jako karta, zobraz zároveň „konkrétní plánování/příprava“ a „bez informace o konkrétním bezprostředním útoku“. To je přesně případ, kde severity ≠ imminence ≠ confidence.
- Ověř, že deeskalační/negativní fakta jsou viditelná a nejsou jen skrytá v detailu. Dashboard nemá uživatele nutit skládat obraz jen z negativních incidentů.

## P3 — maximálně několik užitečných nice-to-have prvků

1. U reakčních/rétorických signálů používej samostatný typ nebo badge „REAKCE / RÉTORIKA“, aby se nepletly s fyzickým incidentem.
2. U primárních zpravodajských varování typu PET zobraz krátký řádek „bezprostřední konkrétní útok: NEUVEDEN“, pokud to primární zdroj výslovně říká.
3. Pokud už existuje „co se změnilo“, přidej nebo zvýrazni jen krátkou protiváhu „co se nezměnilo“ — právní vycestování, mobilizace, NATO čl. 4/5, přímý střet. Nevytvářej další velkou sekci, pokud to už UI řeší.

## Co jsem dnes záměrně NEZAŘADIL jako nový incident

- Další články o stejných německých rozvodnách bez nového skutkového nebo atribučního posunu.
- Pokračující pátrání po 48letém podezřelém z německé energetické série samo o sobě nepočítej jako nový sabotážní incident; je to update stejného vyšetřování.
- Běžné opakované průniky do vzdušného prostoru NATO bez kvalitativní změny vzorce zůstávají baseline.
- Zdravotní spekulace o Vladimiru Putinovi: nenašel jsem nový důvěryhodný zdravotní fakt. `rusko.json` má správně zdravotní tlak jako neprokázaný; neměň na základě rumorů.
- Dánské PET potvrzení z 5. 9. nevytvářej jako nový druhý incident, pokud už je v datech stejný výrok z Reuters 3. 9.; jde o silnější primární zdroj k témuž signálu.

## Kontrolní pravidla

- Neimplementuj nic jen proto, že je to napsané zde. Nejprve porovnej s aktuální codebase a ověř realitu.
- Nepřidávej nový incident, pokud jde pouze o nový článek bez nového skutkového zjištění.
- Rozlišuj FAKT / ODHAD / SCÉNÁŘ / NEPOTVRZENO.
- Rozlišuj datum události od data publikace a od data nové atribuce/vyšetřovacího posunu.
- Preferuj primární oficiální zdroje, poté Reuters/AP/AFP a kvalitní národní/regionální média.
- Severity, confidence a bezprostřednost nejsou totéž.
- Zachovej profesionální, civilní, nealarmistický vzhled. Žádný generický AI dashboard, dramatická militaristická estetika ani falešná procenta rizika.
- Neměň root `CLAUDE.md` ani jiné instrukční root MD soubory kvůli tomuto auditu.
- Po změnách spusť existující testy/typecheck/build a oprav regresní chyby, které změny způsobí.

## Výsledek, který chci od Claude Code

Neodpovídej „implementoval jsem všechno z promptu“. Po kontrole stručně uveď:
- co už bylo na webu správně a nechal jsi beze změny,
- co bylo v rozporu s aktuálními informacemi a opravil jsi,
- co nové jsi skutečně doplnil,
- co jsi záměrně nepřidal, protože to nebylo dost ověřené, bylo duplicitní, metodicky nevhodné nebo už zastaralé.
