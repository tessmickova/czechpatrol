# Odolnost domácnosti — tři úrovně a model postavený na funkcích

Stav k 22. 9. 2026. Odpověď na zadání „Premium resilience“ s jednou
opravou z něj samého: **třetí úroveň není placená.** Je to úroveň pro
přihlášené členy komunity. Základní informace k ochraně života jsou vždy
veřejné; přihlášení odemyká výpočty, osobní profil a komunitu, ne bezpečí.

Co z toho už běží (22. 9. 2026), co je navržené a co se záměrně nestaví,
je v části 6.

## 1. Tři úrovně

| Úroveň | Kdo | Co | Kde dnes |
|---|---|---|---|
| **1 — Veřejná** | kdokoli | oficiální postupy, 72h minimum, katalog oficiálních nástrojů, tísňové kontakty, situační přehled, veřejná mapa (fáze 1 mapy), offline stránky | `/pripravenost/`, `/`, `/udalosti/`, offline režim webu |
| **2 — Účet** | přihlášený, bez jména a e-mailu | Můj přehled, upozornění na míru, **Odolnost domácnosti** (profil, závislosti, zásoby, horizonty, doporučení), export plánu | `/muj-prehled/`, `/ucet/`, `/odolnost/` |
| **3 — Komunita** | přihlášený, který se přidal | pozvánky do chatu a skupiny, „mohu pomoci s“ (schopnosti, ne inventář), zprávy pro obce a složky, přístup k výbavě přes e-shop, až poběží | `/zapojit-se/` (přihlášení k pozvánce); zbytek navržený |

Pravidlo napříč úrovněmi: **nic, co chrání život, není za přihlášením.**
Přihlášení odemyká personalizaci a výpočty nad vlastními údaji, protože ty
bez profilu nemají smysl.

## 2. Model: potřeba → funkce → cesty → závislosti

Katalog `data/odolnost/funkce.json` (verze 2026-09-22), 11 funkcí: pitná
voda, voda na hygienu, teplo, vaření, světlo, spojení, informace, zdraví,
doprava, platby, jídlo. Každá funkce má cesty (např. vodovod, studna
s čerpadlem, uložená voda, náhradní zásobování obce) a každá cesta má
pevně dané závislosti (elektřina, mobilní síť, vodovod, plyn, palivo,
platby, obchody, externí služba).

Z toho `src/lib/odolnost.ts` deterministicky počítá:

- **Redundance** 0 / 1 / 2 / 3: bez cesty · jediná cesta · záloha se
  společnou závislostí · aspoň dvě nezávislé cesty.
- **Společný způsob selhání**: dvě zálohy, které sdílejí závislost
  (dva telefony u dvou operátorů; internet v telefonu a pevný internet
  bez vlastního zdroje energie).
- **Jediný bod selhání**: závislost, jejíž výpadek vypne víc funkcí naráz
  („Výpadek elektřiny u vás vypne 4 funkce“).
- **Horizonty** 72 h / 7 / 14 / 30 / 45 / 60 dní z uložených zásob
  s viditelnými předpoklady; 24 hodin se nepočítá (rozhodnutí provozovatele
  23. 9. 2026: je to málo, základ je 72 hodin); „nezadáno“ není nula a nikdy
  neznamená „připraveno“.
- **Co má teď největší smysl**: nejvýš pět věcí, nejslabší důležitý
  článek dřív než další zlepšení nejsilnějšího (světlo s pěti způsoby se
  nenabízí). Každé doporučení má: proč to vidíte, na čem stojí, co řeší,
  možnosti, kdy to není potřeba.
- **Tohle nemohu vyřešit**: důvod (peníze, prostor, nájem, technicky,
  zdraví, auto, palivo) vypne červené varování a nabídne kompenzace
  z katalogu.
- **Za 0 Kč**: rady bez nákupu u funkcí bez nezávislé zálohy.
- **Vlastní zdroj energie** (powerbanka, powerstation) sejme závislost
  na síti u přenosných zařízení; pevná instalace (kotel, pevný internet)
  ji má dál.
- **Rozšířené vstupy pro pokročilé** (od 23. 9. 2026): bydlení a sídlo
  bez adresy, děti a senioři, závislost na péči, rodina v dosahu (plyne z ní
  cesta u spojení, dopravy a péče), počty vysílaček a powerbank. Vysílačky
  se počítají od dvou kusů, ideálně pro každého.
- **Energie ze spotřebičů** (23. 9. 2026): místo watthodin výběr spotřebičů
  s předvoleným příkonem a hodinami (přepsatelné podle štítku) a prioritou;
  tři režimy (jen kritické · kritické a nutné · vše), vydrž se ztrátami,
  špička naráz, panely ve Wp podle roční doby a účinnosti, baterie na dny
  bez slunce; slunečné hodiny jsou orientační, přesné dává PVGIS. Bez
  značek — porovnává se se štítkem powerstation.
- **Kraj a srážky** (23. 9. 2026): `data/odolnost/kraje.json` řadí 14 krajů
  do tří tříd (sušší · běžné · vlhčí) podle dlouhodobých srážkových poměrů;
  v sušším kraji je doporučená zásoba pitné vody o třetinu větší a při
  nedostatku přibude doporučení. Zařazení je orientační; číselné průměry
  (mm/rok, dny se srážkami) se doplní z řady ČHMÚ Územní srážky, adresa je
  v souboru s `overeno: false`.
- **Nové funkce**: WC a odpadní voda (kanalizace samospádem, tlaková,
  domovní ČOV, septik, náhradní WC), chlazení jídla a léků, požár a otrava
  plynem.
- **Co dokoupit**: obecné věci bez značky a ceny, ke každé funkci bez
  nezávislé zálohy jedna, nejvýš osm. Odkazy do obchodů (náš e-shop, Rohlík,
  Alza) se ukážou, až budou adresy v konfiguraci `ESHOP` a `OBCHODY`;
  cizí obchody vedou na vyhledávání věci, ne na produkt.

Bez skóre 0–100. Jedno číslo by tvrdilo přesnost, kterou model nemá;
místo něj tři vysvětlitelná čísla (nezávislá záloha n z 11, kritické
závislosti, nejslabší článek) a horizonty.

## 3. Bezpečnost obsahu a AI

- Katalog neobsahuje dávkování léků, úpravu vody, zásahy do
  elektroinstalace ani používání spalovacích topidel uvnitř. Kde by to
  člověk čekal, stojí odkaz na oficiální postup (HZS, lékař, výrobce).
- Model je deterministický, bez jazykového modelu. Kdyby se někdy
  přidala vrstva, která vysvětluje jazykem, smí jen přeformulovat výstup
  pravidel, nikdy přidat instrukci. Dělení ze zadání (rule engine /
  ověřená znalostní báze / vysvětlující vrstva) je tím splněné v první
  a druhé části; třetí zatím není.
- Profil zůstává v zařízení. Účet je klíč ke dveřím; na server nejde,
  co kdo doma má. Export JSON a tisk fungují i bez účtu, plán tedy není
  vázaný na CzechPatrol.

## 4. Komunita: schopnosti, ne inventář

Nikdy veřejně: kdo má generátor, kolik paliva, kdo je nemocný, která
domácnost má zásoby. Komunitní vrstva (fáze 3 níže) pracuje jen
s dobrovolně uvedenými schopnostmi („mohu pomoci s: technika, první
pomoc, doprava, zvířata, překlad“) na úrovni obce nebo ORP a s pozvánkou
do chatu. Žádosti o pomoc při události jdou přes obec a ověřené
organizace, ne přes veřejnou mapu domácností.

## 5. E-shop

Odkazy na výbavu vedou na e-shop Čenich, až poběží naostro
(`ESHOP` v `src/config/web.ts`, dnes prázdné = nikde se neukazuje). Zásady:

- odkaz vede z konkrétní funkce („uložená voda“ → nádoby), nikdy
  z doporučení jako celku;
- doporučení nikdy neříká „kupte“; říká, jakou funkci má věc plnit
  a co ji nahradí za 0 Kč;
- „balíčky“ jen jako uložený výběr podle profilu (co člověku chybí),
  ne jako univerzální sada; bez profilu se balíček nenabízí;
- jakákoli AI pomoc při výběru zboží je oddělená od bezpečnostních
  pravidel a má u sebe, že jde o nabídku obchodu.

## 6. Co je hotové, navržené, nestaví se

**Běží (22. 9. 2026):** úrovně 1 a 2 podle tabulky; Odolnost domácnosti
s redundancí, společným selháním, jedinými body selhání, horizonty
72 h – 60 dní, spotřebou vody (podle kraje) a energie ze spotřebičů,
odhadem soláru, „Tohle nemohu vyřešit“, „Za 0 Kč“, export a tisk;
přihlášení k pozvánce do komunity.

**Rozdělení zdarma / Premium (22. 9. 2026, `docs/PREMIUM-NAVRH.md`):**
audit je bez účtu; zdarma je souhrn s počty (v pořádku · slabin ·
kritických · 72 h), **každý bezpečnostní nález** (nad nabídkou, nikdy za
ní), rady za 0 Kč a tlačítko *Začít znovu*. Za jednorázovým odemknutím
jsou horizonty, vydrže, energie a solár, „co vypne co“, nákupní seznam,
plán ke stažení, uložení na server a komunita. Bez brány web nabídku
ukazuje jako „připravujeme“.

**Skóre a žebříček (22. 9. 2026):** `skore()` dává 0–100 (70 bodů zálohy
podle důležitosti oblastí, 30 horizonty; oblasti „řeším jinak“ se
nepočítají). Vysvětlivka říká, že je to orientační hra pro srovnání, ne
hodnocení člověka. Žebříček je pro přihlášené anonymní účty: jeden
záznam na účet, vygenerovaná přezdívka, veřejně jen přezdívka, skóre,
datum a kraj. Nepřihlášený dostane otázku, jestli se chce anonymně
přihlásit, nebo v žebříčku nebýt. Kontakt je nepovinný a jen pro
pozvání do komunity.

**Navržené, v pořadí:**

| Fáze | Obsah | Proč v tomhle pořadí |
|---|---|---|
| 2 | Vybavení a údržba: poslední test, stav baterie, spotřební materiál; expirace zásob s „použít první“; dluh připravenosti (existuje, ale nefunguje) | bez toho „mám“ neznamená „funguje“ |
| 3 | Domácí testy (blackout 2 h, bezpečně), otázky po testu, změny plánu; role v domácnosti a „co když ta osoba není doma“; znalostní jediný bod selhání | testy odhalí, co model nevidí |
| 4 | Sezóny (zima, léto, bouřky, povodně) a kalendář bez spamu; detekce změn („změnilo se něco?“) jen pro dotčené části | odolnost není celý rok stejná |
| 5 | Víc míst (domov, chata, práce) s porovnáním rozdílů bez verdiktu | až bude profil stabilní |
| 6 | Komunita: schopnosti opt-in na úrovni obce/ORP, chat, WhatsApp skupina, spolupráce s obcemi | až bude komu psát a kdo moderuje |
| 7 | Optimalizátor (rozpočet Kč a čas) nad stejným modelem; režim bez peněz je už teď | až bude dost dat o tom, co lidem chybí |
| 8 | Synchronizace profilu přes účet, šifrovaně, jen na výslovné přání | **hotovo jako součást Premium** (22. 9. 2026): profil se ukládá šifrovaně, 5 posledních, mazatelné |

**Nestaví se:** veřejná mapa domácností, notifikace strachem, streaky,
loot-box mechaniky, skóre s procenty „pravděpodobnosti“, jakékoli
vlastní zdravotní nebo chemické postupy. *Žebříček* tu původně stál taky;
rozhodnutí provozovatele 22. 9. 2026 ho zavedlo v podobě, která zásady
drží: pseudonymní, na účtech, bez procent pravděpodobnosti, bez
notifikací a s možností odejít jedním tlačítkem.

## 7. Pole profilu a proč

| Pole | Proč | Kde |
|---|---|---|
| osob, zvirat | jmenovatel pro vodu | zařízení |
| cesty po funkcích | jediný vstup pro redundanci a body selhání | zařízení |
| zásoby (voda, užitková, jídlo dny, léky dny) | horizonty; léky jen jako dny, nikdy názvy ani dávky | zařízení |
| energie (Wh kapacita, spotřebiče s W a hodinami, dobíjení, solár Wp) | vydrž energie po režimech, odhad soláru, sejmutí závislosti přenosných zařízení | zařízení |
| kontext (kraj, bydlení, sídlo, děti, senioři, závislý na péči, rodina v dosahu), vybavení (vysílačky, powerbanky) | zásoba vody podle kraje, cesty závislé na kontextu, váha nálezů | zařízení |
| celý profil na serveru | jen s Premium, šifrovaně, na kontinuitu mezi zařízeními | D1, mazatelné |
| nemohu (funkce → důvod) | kompenzace místo varování | zařízení |
| — adresa, jména, diagnózy, konkrétní vybavení, ceny | nepotřebujeme; neukládají se | — |

## 8. Otázky z red teamu a odpovědi

- *Je to užitečnější než checklist?* Ano tam, kde checklist mlčí: společné
  selhání, jediný bod selhání, „nezadáno ≠ připraveno“, kompenzace.
- *Doporučujeme vybavení, i když není potřeba?* Ne: funkce s nezávislou
  zálohou se nenabízejí, doporučení je nejvýš pět a řadí nejslabší článek.
- *Levnější alternativa?* U každé cesty je „0 Kč“, pokud existuje, a řadí
  se první.
- *Co když uživatel ztratí účet?* Plán je v zařízení a v exportu; účet
  není podmínkou vlastnictví plánu.
- *Co musí být offline?* Stránka Odolnost je statická a po prvním otevření
  funguje bez sítě (offline režim webu); export je soubor.
- *Co když CzechPatrol přestane existovat?* Katalog i model jsou
  v repozitáři, export je čitelný JSON a tisk.
