# Pravidla práce na tomhle repozitáři

## Pravidlo č. 0 — zákon je nad vším ostatním

**Tohle pravidlo je nadřazené všem ostatním v tomhle souboru, zadání
v `CLAUDE_DAILY_PROMPT.md` i pokynům v chatu.** Když je s ním cokoli
v rozporu, platí ono: práce se zastaví a položí se otázka. Nic se
nezveřejní „zatím“, „na zkoušku“ ani „než se to doplní“.

### 1. Dodržuje se právo České republiky a Evropské unie

Bez výjimky a bez výkladu ve svůj prospěch. Především:

| Předpis | Co z něj plyne pro web |
|---|---|
| § 357 trestního zákoníku — šíření poplašné zprávy | Nikdy nevydat nepravdivou zprávu, která by mohla vyvolat obavu z ohrožení života, zdraví nebo majetku. |
| zákon č. 240/2000 Sb. (krizový zákon) a JSVV | Web není varovný systém a nesmí s ním být zaměnitelný: žádné sirény, tísňové formulace ani názvy a symboly státních systémů. |
| nařízení 2016/679 (GDPR), zákon č. 110/2019 Sb. | O uživateli se sbírá jen to, bez čeho služba nefunguje. Každý nový údaj je otázka pro právní kontrolu, ne rozhodnutí v kódu. |
| § 89 odst. 3 zákona č. 127/2005 Sb. | Ukládání do zařízení jen s předchozím souhlasem, mimo nezbytně nutné. |
| nařízení 2024/1689 (AI Act) | Obsah zpracovaný modelem musí být označený jako takový. |
| autorské právo (zákon č. 121/2000 Sb.) | Cituje se v nezbytném rozsahu s uvedením zdroje. Nepřebírají se cizí texty. |

Rozbor je v `docs/PRAVNI-KONTROLA.md`. Při pochybnosti platí přísnější výklad.

### 2. Poplašná zpráva se nenapíše nikdy

- **Web nikdy netvrdí nic, co nemá doložené.** Neověřené tvrzení o ohrožení
  se nevydá jako tvrzení — ani jako otázka, ani jako možnost, ani
  „podle nepotvrzených informací“.
- Nic se nevyhlašuje a nic se nepředpovídá. Budoucí scénář se nikdy nepíše
  jako jistota.
- Titulek ani text nesmí budit větší obavu, než unese doložený údaj.
- Když si zdroje odporují, zveřejní se rozpor, ne silnější verze.
- Když hrozí, že by zpráva mohla vyvolat obavu z ohrožení, **nevydá se**
  a založí se otázka pro člověka.

### 3. Zveřejňuje se jen to, co je doložené citací se zdrojem

V bezpečnostních tématech — ohrožení, opatření, mobilizace, hranice,
evakuace, právní stav, činnost složek — se web opírá **výhradně o to, co
je řešeno úředně a oficiálně**:

- Přednost má úřední a primární zdroj, tedy orgán, který věc sám oznámil.
  Když takový zdroj chybí, musí to být u záznamu napsáno.
- Právní stav a platná opatření se zapisují jen podle úřední sbírky nebo
  oznámení orgánu, nikdy podle médií.
- Každé tvrzení nese odkaz. Bez odkazu je jistota nejvýš střední a stav
  se nikdy neoznačí jako platný.
- Hodnocení projektu je vždy označené jako hodnocení, ne jako zjištěný fakt.

**Zkráceně: nic nevyhlašujeme, nic nepředpovídáme, nic nepřebíráme bez
zdroje. Píšeme jen to, co už někdo oficiálně řekl nebo vydal — a říkáme,
kdo to byl.**

### 4. Jediná výjimka: smíme napsat, že něco neověřeného koluje

Mlčet o zprávě, která se šíří a mohla by být důležitá, není neutrální —
čtenář se o ní stejně dozví jinde, jen bez protiváhy. Proto existuje
sekce **Právě ověřujeme** (`data/overujeme.json`).

Hranice vede přesně tady: **web o té zprávě netvrdí, že platí.** Tvrdí
jen tři věci, které si sám ověřil, a každá z nich je pravdivá
a doložitelná:

1. že ji vydaly tyhle jmenované redakce (s odkazem),
2. že ji projekt nemá potvrzenou a co konkrétně sám prověřoval,
3. co k ní říkají, nebo výslovně neříkají, úřady.

Tím se to míjí se skutkovou podstatou § 357 trestního zákoníku: ta
předpokládá sdělení **nepravdivé** zprávy. Zveřejněná sdělení jsou
pravdivá; nepravdivé by bylo teprve převzetí samotného tvrzení za své.

Podmínky, bez kterých se položka nezveřejní — hlídá je
`nastroje/kontrola-dat.mjs` a jsou to **chyby, ne varování**:

| Podmínka | Proč |
|---|---|
| dopad: kdyby to platilo, změnilo by to dnes lidem chování | jinak to do přehledu nepatří vůbec |
| aspoň dva nezávislé zdroje, každý s odkazem | jedna zpráva není jev |
| vyplněné „co říkají úřady“ | to je ta ověřená část a stojí na kartě první |
| vyplněné „co dělat teď“ | skoro vždy „nic“; tohle je protipanický prvek |
| lhůta na uzavření, nejvýš týden | fáma se nesmí vléct |
| nejvýš tři položky naráz | jinak je z klidného přehledu proud fám |
| zápis, jak to dopadlo | nic nemizí potichu |

Každá položka musí skončit v jednom ze tří stavů: **potvrzeno** (vznikne
řádný záznam), **vyvráceno** (jde mezi neprošlé), nebo **nikdo
nepotvrdil** (po lhůtě se stáhne z přehledu a zůstane zapsaná).

Dál platí bez výjimky:

- Do počtů, budíků, průměrů ani hodnocení tyhle položky **nevstupují**.
- Do Telegramu ani jiných kanálů se **neodesílají**. Kanál slouží
  k tomu, aby se dalo jednat; neověřená zpráva k jednání nevede.
- Barva závažnosti se na nich **nepoužívá** — žádná ohodnocená není.
- Zařadit položku smí **jen člověk**. Automat sem nedává nic, viz
  pravidlo č. 4.

### 5. AI smí zkrátit, nesmí nic přidat (od 24. 9. 2026)

Platí pro **každý** text na webu, v Telegramu i v jiných kanálech, pro nové
i staré záznamy, pro souhrny od modelu, od Patrola i od člověka.

Souhrn cizí zprávy je legální převzetí faktu: vlastními slovy, zkráceně,
s odkazem na zdroj (viz autorské právo výš). **Nesmí ale vzniknout nové
tvrzení**, které ve zdroji není, ani posun významu. Konkrétně:

- **Nic se nepřidává.** Žádný závěr, souvislost, motiv, příčina ani číslo,
  které zdroj neuvádí. Souvislost mezi dvěma událostmi se napíše, jen když
  ji někdo jmenovitě tvrdí — a jako jeho tvrzení.
- **Nic se nezesiluje.** „Podezřelý“ zůstane podezřelý, „údajně“ zůstane,
  „podle policie“ zůstane. Obviněný není pachatel, dokud ho soud
  pravomocně neodsoudí (presumpce neviny, čl. 40 Listiny). Titulek
  nesmí být silnější než text zdroje.
- **Každé tvrzení má původce.** Kdo co řekl, se píše jmenovitě („podle
  estonské pohraniční stráže“). Co tvrdí strana sporu nebo konfliktu, je
  vždy označené jako její tvrzení.
- **O konkrétních lidech jen to, co doložil úřad nebo soud.** Jméno
  soukromé osoby se neuvádí, pokud ho neuvedl úřad sám; nic, co by šlo
  vyložit jako pomluvu (§ 184 trestního zákoníku) nebo zásah do osobnosti
  (§ 81 a násl. občanského zákoníku).
- **Citace je doslovná** a v uvozovkách, nebo se vůbec nepoužije.
- **Když si zdroje odporují**, napíše se rozpor, ne jedna verze.
- **Oprava je veřejná.** Chybu opravujeme hned a zapíšeme ji do Oprav.

Když model nebo člověk vyrobí větu, kterou nejde dohledat ve zdroji,
věta se smaže — ne přeformuluje.

### 6. S úctou, bez provokací, podle novinářské etiky (od 24. 9. 2026)

Nejsme novináři: shromažďujeme zdroje, zasazujeme je do kontextu a
upozorňujeme na kritické události. Pravidla novinářské etiky (Etický
kodex Syndikátu novinářů ČR) ale dodržujeme, jako bychom jimi byli.
Web se nesmí dostat do hledáčku policie ani jiných orgánů — tuzemských
ani zahraničních — kvůli tomu, co a jak píše. Proto:

- **Věcný, klidný tón o všech.** Žádné nadávky, hanlivé přezdívky ani
  nálepky o státech, národech, skupinách ani lidech („okupanti“,
  „teroristé“, „zrádci“…). Pojmenování jako „teroristická organizace“ jen
  tehdy, když je to úřední označení, a s uvedením, kdo ho vydal.
- **Nikoho neprovokujeme a k ničemu nevyzýváme.** Žádné výzvy k jednání
  proti komukoli, žádné schvalování ani zlehčování trestných činů
  (§ 365 trestního zákoníku), nic, co by šlo vyložit jako podněcování
  k nenávisti (§ 355, § 356 trestního zákoníku).
- **Nic, co by ohrozilo lidi nebo zásah.** Nezveřejňujeme polohu a pohyb
  jednotek, policejní postupy ani podrobnosti vyšetřování nad rámec toho,
  co úřad sám oznámil. Žádné osobní údaje příslušníků složek, obětí,
  svědků ani dětí.
- **Žádné návody.** Jak sabotáž, útok nebo zbraň funguje, se nepíše.
- **Sankcionovaná média se nepoužívají jako zdroj.** Obsah médií na
  sankčním seznamu EU (nařízení Rady 833/2014, čl. 2f — např. RT,
  Sputnik) se nepřebírá ani neodkazuje. Co tvrdí, se uvede podle jiného
  média, které o tom píše. Kontrola dat to hlídá jako chybu.
- **Práva všech stran.** Ke každé straně sporu se přistupuje stejně:
  co tvrdí, kdo to tvrdí, co k tomu říkají úřady.

Když si nejsme jistí, jestli věta obstojí, **nevydá se** a založí se
otázka pro člověka.

## Pravidlo č. 0.7 — každá chyba se opraví u kořene, aby se neopakovala

Když narazíš na chybu (spadlý sběr, nasazení, test, špatná data, rozbitá
stránka), nestačí ji obejít nebo opravit jednou ručně. Vždycky:

1. **Najdi příčinu**, ne příznak: proč to mohlo vzniknout a proč to nikdo
   nezachytil dřív.
2. **Oprav ji tak, aby se nemohla vrátit**: pojistka v kódu (validace,
   automatické zkrácení, odmítnutí vstupu), test, který by ji chytil, nebo
   pravidlo v zadání pro automat. Ruční oprava dat je jen první krok.
3. **Zajisti, aby chyba nezastavila web**: chyba v jednom záznamu nesmí
   shodit sběr ani nasazení; vrátí se ten záznam, ne celý provoz.
4. **Zapiš to**: do commitu proč, do komentáře u pojistky datum a co se
   stalo, do předávacího dokumentu, pokud to mění provoz.

Příklady z 24.–25. 9. 2026: nový důvod odmítnutí `jen-projev` neznala
kontrola dat → doplněn a kontrola se píše spolu s důvodem; automat
zveřejnil aktualizaci bez případu → obě cesty zveřejnění ji teď nepustí;
veřejná fronta přetáhla strop → zkracuje se sama; obecně → **strážce dat**
ve sběru (`nastroje/strazce-dat.mjs`) vrátí chybná data místo zastavení
webu a správce dostane zprávu (`nastroje/upozorni-spravce.mjs`).

## Pravidlo č. 1 — nejsme zpravodajství

**Na web patří jen to, co mění bezpečnostní situaci, nebo doložený a konkrétní
krok k tomu.** Ne prohlášení, sliby, plány ani jednání o cenách a rozpočtu.

Patří sem:

- **skutek** — sabotáž, žhářství, výbuch, poškození kabelu, plynovodu, rozvodny
  nebo železnice, narušení vzdušného prostoru, sestřelený nebo spadlý dron,
  kybernetický útok s následkem, zadržení, obvinění nebo odsouzení za takový čin,
  vyhoštění diplomata;
- **úřední rozhodnutí, které mění, co platí** — nouzový stav, stav ohrožení
  státu, válečný stav, stanné právo, mobilizace, uzavření hranic nebo letiště,
  evakuace, aktivace článku 4 nebo 5, rozmístění sil.

Nepatří sem: „vláda se bude zabývat“, „ministr jednal“, „politik varoval“,
„zvažuje se“. Prohlášení se zapisuje jen tehdy, když se váže ke konkrétnímu
skutku nebo rozhodnutí výše — a i pak je to `reakce`, ne případ.

Sběrač tohle vynucuje sám (`sber/udalosti.ts`, funkce `relevantni`): bez skutku
a bez místa zprávu nezachytí. Klíčová slova se hledají **od začátku slova** —
kmen `bis` se kdysi trefil doprostřed jména „Babiš“ a udělal ze jednání
o důchodech zpravodajskou zprávu.

## Pravidlo č. 2 — ověř, že zadání patří sem

**Tenhle repozitář je jen bezpečnostní přehled CzechPatrol.** Když se zadání týká
jiného webu, jiné domény nebo jiného projektu, zeptej se, jestli to nemá být
řešeno jinde, a teprve po potvrzení pokračuj.

## Pravidlo č. 3 — nevymýšlet

Nikdy nevymýšlej události, čísla, citace ani zdroje. Chybějící údaj je otevřená
otázka, ne prostor pro odhad. `null` je platná hodnota a UI ji umí zobrazit
jako „zatím neověřeno“.

Zástupné texty se nenahrazují smyšlenými údaji. Ukázková data patří výhradně do
`data/ukazka/` a musí být viditelně označená.

## Pravidlo č. 3b — cizí jazyky: překládá se rozhraní, ne fakta

Web nabízí přehled v patnácti jazycích zemí kolem Ruska a našich sousedů
(`/en/`, `/pl/`, `/lv/` …). Platí u nich tři věci a žádná z nich není volitelná:

1. **Překládá se rozhraní a číselníky, ne fakta.** Popisky, názvy kategorií,
   úrovní, stavů a původců mají překlad v `data/preklady/<kód>.json`. Titulky
   a fakta u jednotlivých událostí zůstávají česky, označené `lang="cs"`,
   s odkazem na český detail. Přeložený titulek by byl tvrzení o události,
   které nikdo neověřil — a fakta se nesmějí lišit podle jazyka.
2. **Závazné je české znění** a stránka to říká nahoře. Podmínky užití
   a zásady soukromí se nepřekládají vůbec: druhé znění právního textu, které
   si může s tím českým odporovat, je horší než žádné.
3. **Neúplný překlad zastaví build.** `npm run kontrola:data` hlásí chybějící
   klíč jako chybu, ne jako varování. Poloprázdná cizojazyčná stránka je horší
   než žádná — čtenář nepozná, jestli mu chybí údaj, nebo se nic nestalo.

Názvy zemí se nepíšou ručně; berou se z `Intl.DisplayNames` podle kódu ISO
v `src/lib/jazyky.ts`. Země bez kódu (Evropa, NATO, mezinárodní vody) zůstává
česky, dokud pro ni někdo nedoplní překlad. Nepřeložený údaj, ne vymyšlený.

## Pravidlo č. 3c — měříme, co se stalo; nepředpovídáme, co přijde

Opakovaně přijde žádost o „stupnici připravenosti k útoku“, „co je na spadnutí“
nebo „pravděpodobnost, že zaútočí“. **Nedělá se to, ani v náznaku.** Tři důvody,
každý sám o sobě stačí:

1. Je to předpověď. Pravidlo č. 0 předpovídání zakazuje a hrozí-li, že by
   zpráva vyvolala obavu z ohrožení, nevydá se (§ 357 TZ).
2. Nemáme z čeho. Naše data jsou doložené minulé případy. Bojovou připravenost
   cizího státu z nich spočítat nejde a odhad místo ní by byl výmysl
   (pravidlo č. 3).
3. Číslo s grafem působí jistěji než věta „nevíme“, takže výmysl by tu napáchal
   větší škodu než jinde.

Co se místo toho dělá: **měřidlo doloženého užití** (`src/lib/zpusoby.ts`,
sekce „Čím se to doloženě dělá“ na `/svet/`). U každého způsobu jednání
doložené případy za 90 dní, poměr k dvouletému průměru, kdy naposledy, kde,
nejvyšší závažnost a kolik z toho je **úředně** přisouzeno. Samá dohledatelná
čísla, žádný výhled — a sekce to o sobě rovnou píše.

Rozdíl je jako mezi srážkoměrem a předpovědí počasí. Srážkoměr umíme.

## Pravidlo č. 4 — automat smí potvrdit jen zápor

Sběrač nikdy nic nezveřejňuje. Když najde signál, hodnotu **nemění** — založí
položku do `data/fronta/` ke kontrole. Tohle pravidlo se nesmí obejít ani
„jen dočasně“: je to jediná pojistka proti tomu, aby web vyhlásil něco, co se
nestalo.

Když se relevantní zdroj nepodaří stáhnout, zápor se nepotvrzuje a datum
ověření se nezapisuje.

**Výjimka — celkové hodnocení (`data/stav.json`) počítá automat.** Rozhodla
tak provozovatelka 23. 9. 2026: hodnocení nesmí být starší než jeden den
a nestanovuje ho člověk. Počítá se v hodinovém sběru (`sber/hodnoceni.ts`)
jen ze zveřejněných a ověřených případů za 14 dní, pravidlem, které jde
přepočítat ručně; záznamy „neověřeno úředně" do něj nevstupují. Když sběr
den neproběhl, trend se nepočítá. Ruční přepis `stav.json` se při dalším
běhu přepíše.

## Pravidlo č. 4a — nic se nezahazuje, ale nic se ani nepřeklápí samo

Síto na klíčová slova nikdy nepozná vážnou zprávu s mizerným titulkem. Co
neprojde, proto nekončí v koši, ale v `data/fronta/odmitnute.json` i s důvodem.
Levný model tomu dá druhé čtení a označí, co vypadá vážně; vidět je to na
`/sprava/odmitnute/`.

Tři věci z toho nesmí nikdo ohnout:

1. **Model nerozhoduje o zveřejnění.** Označí, co si zaslouží lidský pohled.
   Dál se položka hne jen ručně (`nastroje/prijmi-odmitnuty.mjs`) a i pak jde
   mezi kandidáty, ne mezi záznamy — čeká ji normální ověření.
2. **Neposouzeno není „nic vážného“.** Chybí-li klíč nebo dojde strop běhu,
   `posouzeni` zůstane `null` a přehled to přizná. Nedopočítává se (pravidlo
   č. 4).
3. **Odmítnuté nikam nevstupují.** Do počtů, hodnocení ani na veřejné stránky.

## Pravidlo č. 4b — co nejde ověřit ze sandboxu, čti z repozitáře

**Plánovaná routine nemá přístup na `czechpatrol.cz` (ani na starou adresu
`czechpatrol.pages.dev`) ani na `api.github.com`.** První blokuje agentní
proxy na úrovni organizace, druhé se uděluje per session a routine si o to nemá čím říct. Není to chyba
routiny a nemá smysl to obcházet ani na to čekat.

Obojí za ni zjišťuje workflow **Stav pro routines**
(`.github/workflows/stav-pro-routines.yml`) — běží na GitHub Actions, kde
žádné z těch omezení neplatí — a zapisuje výsledek do repozitáře:

| Soubor | Co v něm je | Místo čeho |
|---|---|---|
| `data/kandidati.json`, pole `vyrez` | začátek zdrojového článku jako text, se stavem a časem stažení | otevření zpravodajského webu |
| `data/fronta/zivy-web.json` | dostupnost domény, commit živého buildu, commit repozitáře, `shodujeSe`, `commituNavic`, `rozdilVObsahu` | stažení `czechpatrol.cz` |
| `data/fronta/behy.json` | posledních 30 běhů: workflow, závěr, SHA, čas, odkaz | volání `api.github.com` |

**Postup pro routine:**

1. `git pull`, pak přečíst oba soubory z pracovní kopie. Žádná síť.
2. `zivy-web.json` → `shodujeSe: false` samo o sobě **není rozpor**.
   Commity od botů (sběr, rozhlas, zápis stavu) se dělají výchozím tokenem,
   který nasazení nespouští, takže repozitář bývá běžně o pár commitů napřed.
   Rozhoduje `rozdilVObsahu`: `false` znamená, že napřed jsou jen zápisy
   stavu, které se na web nepublikují — do zprávy to nepatří. Jako rozpor ber
   jen `rozdilVObsahu: true`, které trvá i v následujícím běhu; `commituNavic`
   říká, o kolik commitů jde. Podívej se i na `kontrolovano`: když je starší
   než den, je starý i ten údaj a nezakládá závěr.
3. `behy.json` → závěr posledních běhů Nasazení, Kontrola, Hodinový sběr
   dat a Rozhlas do kanálů.
4. Když je `kontrolovano: null` nebo pole `behy` prázdné, workflow ještě
   neproběhl. **Napiš, že se to nepodařilo zjistit — nedopočítávej to**
   (pravidlo č. 4).

Kdyby to někdy nestačilo, workflow jde spustit ručně (`workflow_dispatch`);
routine to ale sama neudělá, protože na Actions API nedosáhne.

### Ověřování kandidátů z výřezu (od 14. 9. 2026)

Tohle je nejdražší chyba, kterou tenhle projekt zatím udělal, a stojí za to ji
mít napsanou. Hodinová rutina měla v zadání „otevři zdroj a ověř, co se stalo;
když se zdroj nepodaří otevřít, kandidáta nepřebírej“. Zpravodajské weby jsou
ale z jejího prostředí blokované. Rutina tedy dělala **přesně to, co měla** —
a nepřevzala od 6. do 14. září jediného kandidáta, přičemž každý běh hlásil
úspěch. Web osm dní stál a nic nekřičelo.

Poučení: **zadání nesmí po automatu chtít něco, na co jeho prostředí nedosáhne.**
Když to uděláš, nedostaneš chybu — dostaneš ticho, které vypadá jako klid.

Oprava: text zdroje přináší sběr běžící na Actions a ukládá ho ke kandidátovi
do pole `vyrez` (`text`, `stazeno`, `stav`, případně `chyba`). Rutina ověřuje
z něj. Platí u toho tři věci:

- **Prázdný výřez s důvodem není „na zdroji nic nebylo“.** Takový kandidát se
  nepřebírá a důvod jde do zprávy.
- **Záznam z výřezu má `lidskyOvereno: false`** a jistotu nižší než „potvrzeno“.
  Ověřoval automat z citace, ne člověk ze zdroje, a web to nesmí zamlčet.
- **Ukládá se citace, ne článek.** Strop 1200 znaků, vždy vedle odkazu na
  originál — autorské právo je součástí pravidla č. 0.

## Pravidlo č. 4c — co smí automat bez člověka (od 23. 9. 2026)

Provozovatelka nemá čas každou zprávu číst. Pravidla proto musí být taková,
aby číst nemusela — a aby automat nemohl říct víc, než dokládá adresa zdroje.

| Kam | Co tam smí automaticky | Co nikdy |
|---|---|---|
| web, řádný záznam (`automaticke`) | dva nezávislé zdroje, aspoň jeden úřední **podle adresy** (`nastroje/uredni-zdroj.mjs`) | příznak `primarni` bez úřední adresy |
| web, „neověřeno úředně“ (`neovereno`) | válečně relevantní událost ze dvou různých redakcí; jistota nejvýš střední, bez hodnocení, **bez úřední atribuce, mimo počty a celkovou úroveň** | cokoli z jediného zdroje |
| veřejný Telegram | ověřené záznamy (člověk nebo `automaticke`), vážné případy jen s úředním zdrojem podle adresy, přehled dne bez tvrzení, která nemáme doložená; při datech starších 3 h věta „data nejsou aktuální“ | neověřený signál z titulku, „neověřeno úředně“, „mobilizace ne“ natvrdo |
| soukromý chat správce | neověřené naléhavé signály, výpadky sběru, spotřeba minut | — |

**Patrol (externí ověřovatel) navrhuje, nerozhoduje.** Z jeho větve se
v hodinovém sběru přebírají jen `data/navrhy.json` a odpovědi v
`data/fronta/pro-patrola.json`, sloučením po id (`nastroje/prevzit-od-patrola.mjs`).
Návrh od Patrola nikdy není lidsky ověřený a bez úřední adresy nemá jistotu
„potvrzeno“ ani úřední atribuci. Žádný workflow se nesmí spouštět pushem na
jeho větev — GitHub by bral definici workflow z ní.

## Pravidlo č. 5 — zdrojový kód patří na GitHub

Každá dokončená změna se commitne a hned nahraje.

```bash
git add -A
git commit -m "co se změnilo a proč"
git push -u origin main   # při selhání sítě opakovat: 2 s, 4 s, 8 s, 16 s
```

## Pravidlo č. 6 — redakční zásady jsou součást produktu

Nepoužívej titulky typu „Válka je za dveřmi“ nebo „Mobilizace přichází“.
Budoucí scénář se nikdy nepíše jako jistota. Ke každému zhoršujícímu údaji
patří i to, co se nestalo — jinak si čtenář vyvodí větší hrozbu, než data
ukazují.

Upozornění „AI-assisted / pracovní verze“ **není omluvenka** pro nepodložené
tvrzení.

### Řeči bez skutku nejsou událost (24. 9. 2026)

Projev, výzva, varování nebo komentář politika či instituce — prezident
v OSN, ministr v rozhovoru, rezoluce bez závaznosti — se nezařazuje, dokud
z něj neplyne konkrétní bezpečnostní následek, změna nebo rozhodnutí
(vyhlášení stavu, zákaz, nasazení, uzavření, sankce, zadržení). Sběr takové
titulky odkládá s důvodem `jen-projev` (`nastroje/zasady-textu.mjs`,
`jeJenProjev`), úvod je do sloupce signálů nepouští a Patrol je odepisuje.
Důvod: web měří, co se stalo, ne co kdo řekl; řeči politiků ho dělají
stranickým a nudným zároveň.

**Výjimka (25. 9. 2026):** výroky vedení Ruska nebo Běloruska o sledovaných
zemích (hrozby, „ochrana krajanů“, „porušování práv ruských menšin“ v Pobaltí)
se zachytí a zapisují jako druh „reakce“. Je to signál pro čtenáře, ne řeč
domácí politiky. Hodnocení nezvyšuje. Zadržení a obvinění se zachytí jen
s bezpečnostním kontextem (špionáž, sabotáž, Rusko, zbraně…), ne celníci
se zbožím.

### Prostředek, odesílatel, úmysl — tři vrstvy původce (24. 9. 2026)

Typ nebo výroba prostředku není původce. Dron ruského typu mohl vyslat
kdokoli, dron ukrajinského typu mohla přesměrovat obrana, rušení nebo
porucha. Původce určuje jen úřední závěr vyšetřování, mezinárodní
organizace nebo přihlášení; do té doby „nepotvrzený“ s uvedením, co víme
(typ, směr letu, radarová stopa) a kdo co tvrdí. Úmysl (záměr, omyl,
zbloudilý) se zapisuje zvlášť a jen podle vyšetřování. Odpovědnost za
následek pro sledované země nese odesílatel i bez úmyslu.

### Důvěryhodnost zdrojů podle kritérií, ne podle zeměpisu (24. 9. 2026)

Pořadí: (1) orgán, který věc sám vyšetřuje nebo provozuje, v kterékoli
zemi; (2) nezávislé potvrzení z druhé strany; (3) redakce a agentury
podle toho, jak dokládají (zdroje, autoři, opravy), ne odkud jsou;
(4) jedna redakce = signál; (5) sociální sítě = signál. Žádný seznam
„západních agentur“ v metodice ani v textech: působil jako stranění.
Sankční seznam EU se dodržuje z právního důvodu, ne jako hodnocení.

## Pravidlo č. 7 — archiv nesmí mystifikovat

Snímek se zapisuje jen při změně. Nikdy nehlas změnu, kterou čtenář nemůže
vidět („Střední → Střední“) — popiš, co se opravdu stalo. Období, které archiv
nepokrývá, se nedopočítává; napíše se, že ho nemáme.

Odběrový kanál, který nikam nevede, se neukazuje jako dostupný.

## Pravidlo č. 8 — rozhraní je pro čtenáře, ne pro nás

Do UI nepatří poznámky o tom, proč jsme něco udělali. Disclaimer je jeden,
v patičce. Popisky pod grafy vysvětlují značku na obrazovce (co znamená
„≥ N“), ne naši filozofii.

Piš jako copywriter: nadpis, jedna věta, konec. Ne odstavce.

## Pravidlo č. 9 — účty vědí co nejméně a role dává jen člověk

Účet nemá jméno, e-mail ani telefon a nikdy je mít nebude. Každý nový údaj
o uživateli je otázka pro `docs/PRAVNI-KONTROLA.md` a `/soukromi/`, ne
rozhodnutí v kódu. Roli (podporovatel, partner IZS, správce) přiděluje jen
správce, nikdy automat ani uživatel sám; zprávy partnerů IZS odcházejí až po
schválení člověkem a vždy s označením „zpráva partnera“. Doby uchování
v `api/src/synchronizace.ts` a na `/soukromi/` musí být totožné.

API (`api/`) je oddělené od webu a nikdy netvrdí nic, co web nezveřejnil:
jediný vstup je `/stav.json` z buildu webu.

## Konvence

- Kód, komentáře i názvy proměnných **česky**. Komentář vysvětluje *proč*, ne *co*.
- Závažnost a jistota jsou dvě nezávislé osy. Nikdy je neslučuj.
- Datum vždy absolutní, nikdy „před 2 hodinami“.
- Datum události ≠ datum zjištění. Obojí se zobrazuje zvlášť.
- Jedna událost = jeden signál, i když o ní vyjde deset článků.
- Žádná pravděpodobnost v procentech.
- Web nedává doporučení „odjet / neodjet“ ani finanční rady.

Kontrola: `npm run typecheck`. Sestavení: `npm run build`.
