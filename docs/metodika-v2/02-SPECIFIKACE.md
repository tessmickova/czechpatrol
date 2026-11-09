# Metodika v2 — specifikace (verze 2.0-pilot, 9. 11. 2026)

Stav: **pilotní, neveřejná.** Výpočet běží jen ve stínovém režimu
(`npm run metodika:porovnani`), web dál ukazuje metodiku v1. Prahy nejsou
empiricky ověřené. Kód: `src/lib/metodika2/`.

## 1. Předmět

CzechPatrol vydává **strukturované redakční hodnocení doložených
bezpečnostních událostí a jejich významu pro Česko**. Není to měření
celkové bezpečnosti země, pravděpodobnost války, předpověď útoku ani
úřední stupeň ohrožení. Veřejné zprávy dávají neúplný a nerovnoměrný
obraz: počet článků není počet incidentů, zachycené incidenty nejsou
všechny incidenty a počet incidentů není pravděpodobnost útoku. Vzorec
„riziko = pravděpodobnost × dopad“ se nepoužívá, protože ani jednu
veličinu neměříme. Projekt nemá přístup k neveřejným informacím, odbornou
garanci ani validaci státem.

## 2. Tři vrstvy (veřejné názvy)

| Vrstva | Veřejný název | Co říká | Co neříká |
|---|---|---|---|
| A | **Bezpečnostní vývoj pro Česko** | význam aktivních doložených událostí pro bezpečnost státu, jeho institucí, infrastruktury a společnou bezpečnost spojenců | dopad na domácnosti, pravděpodobnost útoku |
| B | **Dopad na obyvatele a chod země** | co doloženě nefunguje nebo je ohroženo, kde, od kdy, pro koho, zda je náhrada | příčinu; přírodní nebezpečí mimo výstrahy ČHMÚ |
| C | **Úřední výstrahy a stavy** | platné úřední výstrahy, opatření a krizové stavy s vydavatelem, datem, platností a územím | vlastní hodnocení; nic se neodvozuje z médií |

Vrstvy se neslučují do jednoho čísla. Tachometr, pokud zůstane, patří jen
vrstvě A. Vrstva B je stejně viditelná. Žádná barva vrstvy A sama
neznamená doporučení k mimořádnému jednání; doporučení smí přijít jen
z vrstvy C (pokyn úřadu) nebo z doloženého místního dopadu ve vrstvě B.

Stupně teroristického ohrožení A–D (MV ČR) mají jiný předmět a web je
nepřebírá. Krizové stavy nejsou souvislá stupnice ani posloupnost.

## 3. Jednotka: událost

Jedna událost má jedno stabilní ID (`slug`) a víc zdrojů i aktualizací.
Aktualizace (`druh: aktualizace`, `navazujeNa`) je **nové zjištění**,
ne nová událost. Přepisy agenturní zprávy, překlady a zrcadla se počítají
jako jedna redakce (různé domény, `nastroje/redakce-pravidla.mjs`).
Nejisté sloučení se nabízí ke kontrole (`moznaDuplicita`), vazby se
nemažou.

Časy se drží odděleně: datum události (`datumUdalosti`), zjištění
(`datumZjisteni`), poslední úpravy (`aktualizovano`), posledního ověření
stavu hrozby (`v2.stavHrozby.overeno`) a trvání dopadu
(`v2.dopad[].od/do`). Aktivita se řídí datem události a stavem hrozby,
nikdy datem článku.

## 4. Datový model

Stávající pole `Incident` zůstávají. Nová pole jsou volitelná v bloku
`v2`; co v něm chybí, výpočet odvodí pravidlem a výslovně to označí jako
**odvozené**, ne redakčně posouzené.

| Pole | Hodnoty | Když chybí |
|---|---|---|
| `v2.vazba` | `prime-cr`, `zavislost`, `spojenci` (+ `skupiny: NATO/EU`), `kontext`; `mechanismus` (věta), `doklad` (URL) | odvozeno: ČR → přímá; `dopadNaCr.stav = potvrzeny` → závislost; člen NATO/EU s bezpečnostní kategorií → spojenci; jinak kontext |
| `v2.stavHrozby` | `probiha`, `odvraceno`, `ukonceno`, `neznamo` + `overeno` (ISO) | odvozeno z data události (aktivní 14 dní) |
| `v2.povaha` | `bezpecnostni`, `nehoda-porucha`, `neznama` | `bezpecnostni` (zařazení do monitoringu) |
| `v2.rozsah` | `mistni`, `regionalni`, `celostatni`, `mezinarodni` | neznámý |
| `v2.zasahFunkci` | ano/ne: zásah zásadní funkce státu nebo obrany | neznámý (nikdy se neodvozuje) |
| `v2.tvrzeni[]` | `o`: událost / příčina / původce / úmysl / koordinace; `stav` (§ 5); `text`; `zdroje` | stav události odvozen z `overeni` a `jistota` |
| `v2.serie` | `id`, `koordinace` (stav doložení) | bez série |
| `v2.dopad[]` | `funkce`, `intenzita`, `uzemi`, `rozsah`, `od`, `do`, `nahrada`, `stav`, `overeno` | žádný doložený dopad |
| `v2.podminenyDopad[]` | řetěz kroků `zdrojový fakt → vazba → podmínka → možný následek`, každý krok `jisty` ano/ne | žádný |
| `v2.hypotezy[]` | text, výslovně hypotéza | žádné |
| `v2.kontrola` | kdo (role) a kdy posoudil pole `v2` | odvozená pole jsou neposouzená |

„Neznámé“ je vždy samostatná hodnota: není to nula ani „potvrzeno, že
nenastalo“. Jazyk článku ani země vydavatele neurčuje místo události.
Negace („útok byl vyloučen“) se zapisuje jako `povaha: nehoda-porucha`
nebo tvrzení o příčině se stavem `vyvraceno`, nikdy jako útok.

## 5. Stavy doložení

| Stav | Podmínka (tvrzení o události) | Do vrstvy A |
|---|---|---|
| doloženo | oznámení toho, kdo věc sám oznamuje (úřad, provozovatel) **nebo** lidské ověření s jistotou vysoká/potvrzeno | všechna pásma |
| předběžně doloženo | lidské nebo automatické ověření s jistotou střední; nebo dvě nezávislé redakce bez úředního zdroje | jen do pásma Zvýšený a jen po ověření (ne „neověřeno úředně“) |
| nepotvrzeno | jediný zdroj, kolující tvrzení, přihlášení útočníka bez potvrzení, jistota nízká | ne |
| sporné | zdroje si podstatně odporují | ne; uvede se |
| vyvráceno | tvrzení vyvrátil úřad nebo provozovatel; stažený záznam | ne; oprava |

Nejde o pravděpodobnost a stavy nemají procenta. Úřední zdroj dokládá to,
co sám oznamuje, ne všechny závěry článku. Atribuce se píše „úřad X
přisuzuje operaci Y“; podezření, obvinění a pravomocné rozhodnutí se
rozlišují (`stav`, `atribuce`). Přihlášení útočníka, typ zbraně, IP adresa
ani národnost podezřelého nedokazují státní řízení. Závažnost a doložení
se nenásobí: velmi závažná nepotvrzená zpráva čeká na ověření a u pásma
se uvede jako „co by pásmo změnilo“.

## 6. Vrstva A — rozhodovací tabulka (pilot)

Do tabulky vstupuje událost, která je zároveň: druh `pripad`; ne
historická ani archivní; povaha bezpečnostní; doložení doloženo nebo
předběžně doloženo; ověřená (ne „neověřeno úředně“); **aktivní**.

Aktivní je událost se stavem hrozby `probiha` ověřeným v posledních
7 dnech, nebo bez stavu hrozby s datem události v posledních 14 dnech.
`probiha` s ověřením starším než 7 dní je **neaktuální**. `odvraceno`
a `ukonceno` nejsou aktivní, ale zobrazí se jako nová zjištění.

Pásmo = nejvyšší pásmo ze splněných pravidel. Každá událost se počítá
jednou, svým nejvyšším pravidlem. Počet událostí sám nic nezvyšuje.

| ID | Pásmo | Podmínka |
|---|---|---|
| A-M1 | Mimořádný | aktivní **doložená** událost s červenou závažností a vazbou přímá ČR nebo spojenci |
| A-M2 | Mimořádný | úředně platný stav ohrožení státu nebo válečný stav v ČR (z vrstvy C) |
| A-V1 | Vysoký | aktivní doložená oranžová událost, vazba přímá ČR, rozsah regionální nebo celostátní, nebo zásah zásadní funkce státu |
| A-V2 | Vysoký | aktivní doložená oranžová událost u spojence se **zásahem zásadní funkce státu nebo obrany** (jen redakčně zapsaný) |
| A-V3 | Vysoký | doložená koordinace série s aspoň jednou aktivní oranžovou nebo červenou událostí s vazbou přímá ČR nebo spojenci |
| A-V4 | Vysoký | aktivní doložená červená událost s doloženou závislostí ČR |
| A-Z1 | Zvýšený | aktivní oranžová nebo červená událost s vazbou přímá ČR, která nesplnila A-M1/A-V1 (místní, neznámý rozsah nebo jen předběžně doložená) |
| A-Z2 | Zvýšený | aktivní oranžová nebo červená událost u spojence, která nesplnila vyšší pravidlo |
| A-Z3 | Zvýšený | aktivní oranžová událost s doloženou závislostí ČR |
| A-Z4 | Zvýšený | aktivní doložená žlutá událost s vazbou přímá ČR a rozsahem regionální nebo celostátní |
| A-O1 | Omezený | podklady dostatečné nebo omezené a žádné vyšší pravidlo |
| A-N1 | nelze určit | podklady nedostatečné a žádné pravidlo ≥ Zvýšený |
| A-N2 | nelze určit | neaktuální událost by výsledek změnila (stav nelze předpokládat) |

Protipříklady: žlutá událost u spojence pásmo nezvedá (kontext); místní
žlutá událost v ČR pásmo nezvedá, ale ukáže se s místem; zahraniční
kriminalita bez bezpečnostní kategorie je kontext; konzultace podle
článku 4 NATO je opatření, ne případ, a pásmo sama nezvedá; nový článek
o staré události nic neaktivuje; odvrácený plán není probíhající hrozba.

Změna dolů nastane, když rozhodující událost přestane být aktivní
(ověřený konec, uplynutí 14 dní bez stavu hrozby) nebo je vyvrácena.
Změna nahoru nastane, když nová aktivní událost splní vyšší pravidlo.
Pásmo vždy nese seznam rozhodujících událostí s pravidlem.

### Kvalita podkladů

| Stav | Podmínka |
|---|---|
| dostatečná | sběr do 24 h, ověřovací fronta nestojí, aspoň 80 % zdrojů přečteno, vazba rozhodujících událostí redakčně posouzená |
| omezená | 50–80 % zdrojů, nebo vazba či aktivita rozhodující události jen odvozená pravidlem |
| nedostatečná | sběr starší než 24 h, nebo fronta stojí déle než 48 h, nebo pod 50 % zdrojů |

Provozní příčina neúplnosti (zastavené ověřování) se na veřejný web
nepíše (rozhodnutí provozovatelky 1. 11. 2026); veřejně zní důvod
„podklady pro hodnocení nejsou úplné“.

Při nedostatečné kvalitě: když doložené události splňují pravidlo ≥
Zvýšený, pásmo se ukáže jako **spodní odhad** („podklady neúplné“);
jinak „Aktuální hodnocení není k dispozici“. Nikdy tiché „Omezený“.

### Změna proti referenčnímu období

Porovnává se pásmo dnes a před 7 dny, spočtené stejnými pravidly z
záznamů zjištěných do daného dne. Bez procent. Když kterékoli z obou
nejde určit: „změnu nelze spolehlivě určit“. „Beze změny“ neznamená
„bezpečno“.

### Výjimky

Ruční výjimka (dnes „mimořádný signál“) smí pásmo zvednout nejvýš o jedno
a nejvýš na 14 dní, jen s důvodem, podklady, schvalující rolí a datem
revize. Výstup vždy nese pásmo bez výjimky. Výjimka bez schvalující role
nebo data revize se nepoužije a výpočet to ohlásí.

## 7. Vrstva B — dopad

Funkce: zdravotní péče, elektřina, voda, teplo a plyn, doprava, palivo,
komunikace, platby, veřejné služby, hranice a vycestování. U každého
dopadu se drží **intenzita** (ohrožení života › výpadek zásadní funkce ›
omezení s náhradou › nepříjemnost) a **územní rozsah** (místní,
regionální, celostátní) zvlášť. Místní ohrožení života je výrazná místní
informace, ne tvrzení o celé ČR. Dopad se sleduje bez ohledu na příčinu.

Vstupy: `v2.dopad[]` u záznamů s územím v ČR a `data/provoz.json`.
„Bez doloženého omezení“ vždy nese území, čas kontroly a pokrytí
(„orientační“). Zdroj nedostupný = „neznámé“. Obnovení snižuje dopad až
podle ověření (`do`, `overeno`); historie zůstává.

Možný budoucí dopad se zobrazuje jen jako řetěz s označením nejistých
kroků a nikdy se nesčítá se skutečným. Bez pravděpodobností a časů.

## 8. Vrstva C — úřední

`data/pravni-stav.json`, `data/vystraha.json`, `data/vystrahy-chmi.json`.
Každá položka nese vydavatele, datum, platnost a území. Převzatá autentická
úřední výstraha se zobrazí hned, nečeká na pásmo A ani na redakci.

## 9. Role lidí a AI

AI smí navrhnout extrakci, sloučení, shrnutí a zařazení. Výstup projde
schématem, kontrolou zdrojů a pravidly. Pásmo počítá deterministický kód
z tabulky výše. Model nedoplňuje prázdná pole. Text článků je nedůvěryhodný
vstup. Změna na Vysoký nebo Mimořádný, závažné obvinění a sporná
interpretace vyžadují lidské posouzení před vydáním vlastního závěru.
Redakce neslouží 24/7; prodleva se uvádí.

## 10. Otevřené otázky

1. Prahy pásem (14 dní, 7 dní ověření stavu, 80/50 % zdrojů) jsou pilotní.
2. Odvozená vazba „spojenci“ podle kategorie je hrubá; nahradí ji
   redakční zařazení `v2.vazba`.
3. Zda má odvrácený závažný plán zvednout pásmo jako „odhalení“; v pilotu
   ne, uvede se jako nové zjištění.
4. Územní rozsah a zásah funkce chybí u všech dnešních záznamů; dokud je
   redakce nedoplní, pravidla A-V1, A-V2 a A-Z4 nemají z čeho vycházet.
