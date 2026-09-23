# Audit 1 — stránky, copy a stavy funkcí (CzechPatrol, před veřejným spuštěním)

Datum auditu: 23. 9. 2026, ~15:20 UTC. Repozitář `/home/user/czechpatrol`, HEAD `6aad0a8` (shodný s `origin/main`, ověřeno `git ls-remote`). Audit je jen pro čtení, v repozitáři se nic neměnilo.

**Co nešlo ověřit z repozitáře (a proto to netvrdím):**
- jestli je v GitHubu nastavená proměnná `API_URL`. Workflow „Nasazení API“ běží úspěšně (`data/fronta/behy.json`, běhy č. 26–28), ale z repozitáře nejde poznat, jestli web byl sestaven s `NEXT_PUBLIC_API_URL`. Na tom závisí, jestli jsou naživo účty, žebříček a Premium. Nálezy, které na tom závisí, jsou označené **[když API běží]**,
- jestli brána Comgate běží naostro, nebo v testovacím režimu (`COMGATE_TEST`),
- co je teď na `czechpatrol.cz`. Poslední záznam `data/fronta/zivy-web.json` je z 22. 9. 20:27 a hlásí `rozdilVObsahu: true`. Nasazení č. 580 skončilo chybou.

**Provozní nález, který přebíjí všechno ostatní:** poslední commit hodinového sběru je `2026-09-23 02:02 UTC` („Sběr dat 2026-09-23 02:02 UTC“). Pak už přišly jen ruční commity (14:42–15:16). Hodinový sběr tedy víc než 13 hodin nic nezapsal. Po 12 hodinách to web sám přizná pruhem „Sběr neběží“ (`src/components/banner-stari-klient.tsx:95-101`). Spustit web veřejně s takovým pruhem nahoře nejde. Souvislost s commitem `646be3c` „Hlídač: minuty GitHub Actions“ je potřeba prověřit (viz `docs/naklady.json`: „v limitu bezplatných minut veřejného repozitáře“).

---

## 0. Souhrn P0 / P1

| # | Priorita | Nález | Kde |
|---|---|---|---|
| A | P0 | Úvodní věta a velký budík si na první obrazovce odporují: budík říká „Evropa · dnes: **Zvýšená**“ (automatické `stav.json`, YO), ale věta hned nad ním říká „V Evropě je hybridní aktivita **vysoká** a týká se i sousedních zemí“ (ruční `hybridni-tlak.json` = O1, ověřeno **5. 9.**) | `src/app/page.tsx:41`, `src/lib/veta.ts:79-80`, `data/hybridni-tlak.json` |
| B | P0 | Budík „Běžný život · teď“ ukazuje zeleně **„Bez omezení“** a „pohyb, nákupy i služby beze změny“, přestože všech 8 provozních a 7 právních položek má `overeno: null` a pokrytí jen `orientacni`. Dlaždice níž na téže stránce u stejných položek píšou „nedoloženo“ nebo „bez hlášení“ | `src/lib/data.ts:402`, `src/components/hero-dashboard.tsx:215-216`, `src/components/dashboard.tsx:428` |
| C | P0 | Jakmile začne platit **jakékoli** úřední opatření (třeba nouzový stav kvůli povodni), budík „Běžný život“ skočí na R1 „**Vážná**“ a v nápovědě ukáže „Probíhá ozbrojený incident s přímou účastí NATO nebo ČR“. Narušení provozu (třeba výpadek proudu kvůli počasí) ukáže O1 „Vážný hybridní tlak s doloženým státním podílem“. Web by tak sám vyrobil poplašnou zprávu | `src/lib/data.ts:397-399`, `src/lib/skala.ts:97-100, 76-79`, `src/components/zaklad.tsx:98-121` |
| D | P0 | Telegram posílá automaticky zachycené **neověřené** titulky („⚠️ NEOVĚŘENO — signál ke kontrole“) k mobilizaci, článku 4/5, hranicím a krizovému stavu. Web to na 4 místech slibuje jako funkci. Je to v přímém rozporu s CLAUDE.md, pravidlo č. 2 a č. 4 („Do Telegramu ani jiných kanálů se neodesílají… Automat sem nedává nic“), a riziko podle § 357 TZ | `nastroje/rozhlas.mjs:698, 718`, `src/config/web.ts:60, 110-116`, `src/components/odber.tsx:65`, `src/components/vyzva-telegram.tsx` (Otaznik) |
| E | P0 | Karta na úvodní stránce slibuje „**WhatsApp skupina, slevy na výbavu, testování novinek, přednostní přístup, VIP příprava. Omezený počet míst.**“ Nic z toho neexistuje (`KANALY.whatsapp=""`, `ESHOP=""`, `DISKUZE.url=""`) a „omezený počet míst“ je vymyšlená vzácnost | `src/components/tri-temata.tsx:63` |
| F | P0 [když API běží] | Premium se prodává s obsahem, který neexistuje („přístup do komunity a chatu“, „co dokoupit, s odkazy do obchodů“) a s „kreditem na nákup v CzechPatrol e-shopu“, který neexistuje. Podmínky ani Soukromí o Premium, platbách, kreditu, e-mailu ke kódu ani o ukládání profilu domácnosti na server nemají ani slovo. `PROVOZOVATEL` je prázdný | `src/components/premium-klient.tsx:31-33, 108, 112`, `src/app/podminky/page.tsx`, `src/app/soukromi/page.tsx`, `src/config/web.ts:244-247` |
| G | P0 [když API běží] | Žebříček připravenosti sbírá **e-mail a telefon** k anonymnímu účtu, i když správce údajů není uvedený (čl. 13 GDPR). Je to i v rozporu s CLAUDE.md, pravidlo č. 9 („Účet nemá jméno, e-mail ani telefon a nikdy je mít nebude“), a se Soukromím („Účet — bez jména, e-mailu a telefonu“) | `src/components/zebricek-klient.tsx:151-162`, `api/src/zebricek.ts:81`, `src/app/soukromi/page.tsx:49, 62` |
| H | P0 | „Zkontrolováno HH:MM · **bez nálezu**“ v liště na každé stránce. Sběr ale každou hodinu něco najde (300 kandidátů ve frontě). „Bez nálezu“ tvrdí zápor, který kontrola nedoložila | `src/components/banner-stari-klient.tsx:56`, `src/app/layout.tsx:95` |
| I | P0 | Pás „Teď nic urgentního. **Žádná mobilizace, krizové vysílání ani mimořádný stav** za 48 h“ je kategorický zápor ze zdrojů s pokrytím jen `orientacni`. `veta.ts:48-59` přitom výslovně říká, že kategorický zápor smí padnout jen z autoritativního pokrytí. Čas „zdroje čteny“ se nezobrazí, protože `posledniOvereni()` je `null` | `src/components/urgentni.tsx:156`, `src/components/dashboard.tsx:507` |
| J | P0 | Karta „Právě ověřujeme“ (ruská mobilizace) stojí jako první blok nad budíky. V poli „co říkají úřady“ má větu, která zpochybňuje popření: „Popírání samo nic nedokládá… Kartapolov popíral mobilizaci i 20. 9. 2022, den před jejím vyhlášením“ (bez odkazu). Položka navíc nesplňuje vstupní podmínku „kdyby to platilo, změnilo by to dnes lidem chování“: vlastní `coDelatTed` říká „Nic měnit nemusíte“ | `data/overujeme.json` (id `o-2026-09-18-ru-mobilizace`), `src/components/overujeme.tsx:132-147` |
| K | P0 | O projektu a Soukromí tvrdí „**Hodnocení dělá člověk**“. Od 23. 9. ho podle CLAUDE.md (pravidlo č. 4, výjimka) a Metodiky (`metodika/page.tsx:132`) počítá automat | `src/app/o-projektu/page.tsx:43`, `src/app/soukromi/page.tsx:139` |
| L | P0 | O projektu: „nezávislý a **nekomerční**“. Zároveň běží placené Premium s kreditem do e-shopu s výbavou. /podporit tvrdí „Nic z toho se teď nedá koupit“ | `src/app/o-projektu/page.tsx:31`, `src/app/podporit/page.tsx:60`, `src/app/odolnost/page.tsx:8, 22` |
| M | P1 | Heslo „Čím lépe budeme připraveni, tím méně **atraktivním cílem** budeme.“ Válečný rámec a implicitní hrozba útoku na domácnost | `src/app/odolnost/page.tsx:21` |
| N | P1 | Nápověda budíku „Česko · 90 dní“ vysvětluje úroveň obecnou definicí (Y2: „Opakované sabotáže, zatčení operativců“), i když ji teď určuje jediná manipulační kampaň (Těšínsko). Když je úroveň `null`, ukáže se „**Bez incidentu**“ | `src/components/hero-dashboard.tsx:93, 203-210` |
| O | P1 | Zastaralá data se ukazují, jako by byla aktuální: `hybridni-tlak.json` (5. 9.) napájí větu „dnes“, `tydny.json` končí týdnem 31. 8.–6. 9., `svet.json` je z 6. 9. | viz část 2 |
| P | P1 | Počty na webu (pás zemí, Země, Vývoj) zahrnují 19 případů „neověřeno úředně“ a 9 automaticky zveřejněných z 50 za 90 dní. Hodnocení je nepočítá. Čísla na téže stránce se tedy neshodují a pás je nijak neodděluje | `src/lib/data.ts:65`, `src/lib/agregace.ts:77`, `src/components/pas-zemi.tsx` |
| Q | P1 | Cizojazyčné větve (15 jazyků × 20 stránek) mají přeloženo 50 řetězců rozhraní. Zbytek včetně hlavní věty, „Bez omezení“ a karet se ukazuje česky. Pravidlo 3b přitom takové stránky zakazuje | `data/preklady/ui/*.json`, `src/components/hero-dashboard.tsx:130-131` |

---

## 1. Registr rout

Legenda: **H** = hlavička (`navigace.tsx:20-26`), **M** = postranní menu (`postranni-panel.tsx:25-56`), **P** = patička (`paticka.tsx:11-24`), **S** = sitemap (`sitemap.ts:9`). Publikum: O = občan, N = novinář, E = expert.

| URL | Účel | Publ. | Odkazy | Stav | Hlavní problémy | Chybějící stavy | Priorita |
|---|---|---|---|---|---|---|---|
| `/` | Přehled: věta, 3 budíky, pás zemí, aktuality, úřední stavy, 3 karty, manipulace, odběr | O | H M P S | funkční | A, B, C, E, H, I, J, N; „Ve spolupráci s“ = 3× „volné místo pro partnera“ (`sledovat.tsx`, `Partneri`) | chybí stav „data starší než X“ přímo u věty a budíků (hlídá to jen lišta nahoře) | **P0** |
| `/udalosti/` | Všechny záznamy, filtry, záložky nepotvrzené/zachycené | O N E | H M P S | funkční | Neověřené úředně a automatické záznamy jsou mezi případy. 34 záznamů má prázdné `vyznam` a karta vykreslí prázdný blok „Proč to sledujeme“ (`karta-udalosti.tsx:158-160`). 11 záznamů má zdroj přes `news.google.com/rss/articles/…` | prázdný filtr ok | P1 |
| `/incident/[slug]/` | Detail záznamu | N E | z výpisů, S | funkční | Jistota „potvrzeno“ u 28 záznamů bez úředního zdroje (např. `a28` O1, `a10` z Anadolu Agency). Záznam `i-2026-09-06-babis` je prohlášení politika („pravděpodobně cílem“), což pravidlo č. 1 vylučuje | „nenalezeno“ má noindex | P1 |
| `/manipulace/` | Rozbory kampaní | O N | H M P | funkční | chybí v sitemapě | prázdný stav ok (`manipulace/page.tsx:65`) | P2 |
| `/analyzy/` | Rozcestník (vývoj, aktéři, typy) | N E | H M P | funkční | „Typy událostí“ ukazují pavučinu z `hybridni-tlak.json` (5. 9.) včetně osy „Přímé vojenské riziko: G2“ (ručně zadané hodnocení rizika, blízké předpovědi) | – | P1 |
| `/pripravenost/` | Oficiální nástroje (Záchranka, 112, ČHMÚ, DROZD) | O | H M | funkční | chybí v patičce i sitemapě. Popisek v menu je „Jsem připraven/a?“, v hlavičce „Připravenost“ | – | P2 |
| `/zeme/` + `/zeme/[kod]/` | Přehled zemí, detail země | N E | M P | funkční | chybí v sitemapě. Do počtů vstupují neověřené úředně záznamy | prázdná země má dobrou větu (`zeme/[kod]/page.tsx:75`) | P1 |
| `/vyvoj/` | Vývoj v čase, týdny, archiv | N E | M P S | funkční | Týdenní řada končí 6. 9. (`tydny.json`) a obsahuje řadu „**Přímý střet**“ (`trend.tsx:132`) | chybí věta „od 7. 9. týdenní hodnocení nemáme“ | P1 |
| `/svet/` | Aktéři a cíle, míra přiblížení | E | M P S | funkční | `svet.json` z 6. 9. Výhledové a politické soudy („Tchaj-wan zůstává mimo dosah bez války, kterou si Peking zatím nedovolí“, „Cíl roku 2030 je reálný pro část priorit“) jdou proti pravidlu č. 1 a 3c | – | P1 |
| `/metodika/` | Pravidla hodnocení | N E | M P S | funkční | „Role automatizace“ neříká, že celkovou úroveň počítá automat (to je jen v :132). „Úřední stavy ověřujeme proti úředním zdrojům“, přitom všechny mají `overeno: null` | – | P1 |
| `/zdroje/` | Seznam zdrojů | N E | M P S | funkční | – | – | P3 |
| `/opravy/` | Opravy a historie | N | M P S | funkční | – | prázdný stav ok | P3 |
| `/o-projektu/` | Kdo, jak, co není hotové | N | M P S | funkční | K, L. „Ostatní sítě se nenabízejí“ (:58), přitom úvod i menu je nabízejí jako „připravujeme“. „Kód i data jsou veřejné“ (:67), přitom odkaz na GitHub je záměrně prázdný (`web.ts:122-133`). Rozbitý řádek s třemi „ · “ bez odkazů (:69-74) | – | **P0** |
| `/zapojit-se/` | Telegram, e-mail, účet, tipy | O | M P | funkční | Krok 01 přebírá `DORUCOVANI.telegram.rozsah` včetně „posíláme i neověřený signál“ (D). Krok 03 „Účet je bez jména, e-mailu i telefonu“ neplatí u Premium a žebříčku (G) | e-mail „připravujeme“ ok | **P0** |
| `/odber/` | Jak fungují kanály, RSS | O | M P S | funkční | D (`odber.tsx:65`) | – | **P0** |
| `/odolnost/` | Audit domácnosti, Premium, žebříček | O | M | funkční (audit lokálně) | M, F, G. Popis „Profil zůstává ve vašem zařízení“ (:8, :22) neplatí u Premium, které ukládá na server (`api/src/domacnost.ts`), a to včetně údaje o závislosti na péči nebo přístroji | – | **P0** |
| `/odolnost/platba/` | Návrat z brány | O | – (noindex) | funkční [API] | – | ověřit chybový a čekací stav | P2 |
| `/podporit/` | Náklady a podpora | O N | H P S | funkční | L. „Plus 79 Kč“ je popsané jako budoucí záměr, zatímco jiný placený produkt (Premium) už se prodává | tlačítko skryté (ok) | P1 |
| `/ucet/` | Účet passkey, kanály, Premium | O | M P (noindex) | podle API | Popis „…přijde na Telegram nebo WhatsApp“ (:7), WhatsApp neexistuje. „Bez jména, e-mailu i telefonu“ (:18) neplatí u Premium e-mailu | stav „připravujeme“ ok | P1 |
| `/muj-prehled/` | Sledované země a témata | O | M P S | podle API | V sitemapě, přestože bez účtu nic neukáže | ok | P2 |
| `/izs/` | Partner IZS | IZS | M P S | kód existuje, `IZS_KONTAKT=""` | Nadpis a popis „Ověřená složka … může přes CzechPatrol poslat zprávu“ (:26-28) zní jako hotová služba. `/zapojit-se` přitom píše „Zprávy pro … záchranné složky — Nic z toho ještě neběží“. Ikona `sirena` a „Zprávy záchranných složek přímo čtenářům“ se dají zaměnit s varovným systémem (pravidlo č. 0, krizový zákon) | – | P1 |
| `/soukromi/` | Zásady | O | M P S | text | chybí Premium, platby, kredit, e-mail pro kód, profil domácnosti na serveru (F). Věta „Hodnocení dělá člověk“ (:139) je nepravdivá (K) | – | **P0** [API] |
| `/podminky/` | Podmínky | O | M P S | text | chybí Premium a kredit, přitom `premium-klient.tsx:112` na podmínky odkazuje („podle podmínek“) | – | **P0** [API] |
| `/sprava/`, `/sprava/odmitnute/` | Administrace, odmítnuté zprávy | správce | M jen s rolí (noindex) | funkční | Statická stránka `/sprava/odmitnute/` je veřejně dostupná komukoli (data jsou ve statickém buildu). V `robots.ts` není `disallow` | – | P2 |
| `/nepotvrzeno/[id]/` | Detail nepotvrzeného záznamu | N | z Událostí (noindex) | funkční | ok, jasně označené | „už tu není“ ok | P3 |
| `/offline/` | PWA bez sítě | O | – | funkční | – | – | P3 |
| `/cr/`, `/nato/`, `/dnes/`, `/osa/`, `/tlak/`, `/trend/`, `/watchlist/`, `/komunita/`, `/nepotvrzeno/` | Přesměrování starých adres | – | – (noindex) | funkční | ok | – | P3 |
| `/feed.xml` | RSS | O N | M, úvod | funkční | – | – | P3 |
| `/stav.json`, `/fronta.json`, `/rutina.json` | Strojová data pro API a rutiny | interní | – | funkční | `fronta.json` veřejně vystavuje automaticky zachycené titulky a nepotvrzené návrhy. Web je ukazuje taky (oddělené), ale soubor je zadarmo k převzetí třetími stranami bez kontextu | – | P2 |
| `/sitemap.xml` | Sitemap | – | – | funkční | Chybí `/manipulace`, `/analyzy`, `/pripravenost`, `/zeme`, `/zeme/*`, `/zapojit-se`, `/odolnost`. Obsahuje přihlašovací `/muj-prehled` | – | P2 |
| `/{kod}/…` × 15 jazyků (`[jazyk]/*`: úvod + 19 stránek) | Stejné stránky s přeloženým rozhraním | zahraniční | P (Jazyky) | částečně | Q. Chybí `/{kod}/izs`, `/podminky`, `/soukromi`, `/ucet`, `/incident/*`, `/zeme/[kod]` (podmínky a soukromí záměrně). Odkazy na ně z cizojazyčných stránek vedou na české stránky | – | P1 |

Nepropojené z navigace ani patičky: `/offline`, `/odolnost/platba`, `/nepotvrzeno/[id]`, `/sprava/odmitnute` (jen z `/sprava`), přesměrování a JSON. `/odolnost` a `/pripravenost` chybí v patičce. `/odolnost` je dostupná jen z menu a z karty na úvodu.

---

## 2. Nálezy v akčním formátu

### A — Rozpor věta vs. velký budík na první obrazovce (P0)
- **URL:** `/` a všechny `/{kod}/`
- **KOMPONENTA:** `src/app/page.tsx:41` → `src/lib/veta.ts:69-81`; `src/components/hero-dashboard.tsx:159-166`
- **CURRENT:** velký budík „Evropa · dnes“ = `stav.json` `uroven: "YO"` → „**Zvýšená**“, trend „zlepšení za 7 dní“. Věta nad ním = `hybridniTlak().celkem` = `O1` z ručního `data/hybridni-tlak.json` (`overeno: 2026-09-05`) → „V Evropě je hybridní aktivita **vysoká** a týká se i sousedních zemí.“
- **PROBLEM:** Dvě různá hodnocení Evropy (automatické z 23. 9. a ruční z 5. 9.) stojí vedle sebe s jiným slovem. Věta je 18 dní stará a přitom o sobě tvrdí, že je dnešní. Dovětek „týká se i sousedních zemí“ se z dat nevyvozuje, je napsaný pevně pro celé oranžové pásmo.
- **RISK:** Faktický rozpor na první obrazovce, zastaralá data vydávaná za aktuální, silnější verze vyhrává (proti pravidlu č. 2).
- **PRIORITY:** P0
- **NEW COPY:** (věta z téhož zdroje jako budík) zelená: „V Evropě je hybridní aktivita na běžné úrovni.“ / žlutá: „V Evropě sledujeme zvýšenou hybridní aktivitu.“ / přechod: „V Evropě sledujeme výrazně zvýšenou hybridní aktivitu.“ / oranžová: „V Evropě je hybridní aktivita vysoká.“ / červená: „Hodnocení pro Evropu je na nejvyšší úrovni — podrobnosti v Metodice.“ (Poslední varianta nesmí tvrdit „mění se rychle“, dokud to nedokládá trend.)
- **IMPLEMENTATION:** v `page.tsx:41` předat `celkovyStav().uroven` místo `hybridniTlak().celkem`. Ve `veta.ts` odstranit „a týká se i sousedních zemí“ a „mění se rychle“. `hybridni-tlak.json` buď automatizovat stejně jako `stav.json`, nebo u pavučiny ukázat „hodnoceno 5. 9. 2026“ a z úvodu ho vyřadit.
- **ACCEPTANCE TEST:** unit test: pro libovolné `stav.uroven` je pásmo slova ve `veta.evropa` totožné s pásmem velkého budíku. Snapshot `/`: slovo budíku a přídavné jméno ve větě patří do stejného pásma.

### B — „Bez omezení“ bez ověření (P0)
- **URL:** `/`
- **KOMPONENTA:** `src/lib/data.ts:392-403` (`urovenObcanu`), `src/components/hero-dashboard.tsx:211-217`, `src/components/dashboard.tsx:428-432`
- **CURRENT:** „Běžný život · teď — **Bez omezení**“ (zelená tečka), nápověda „pohyb, nákupy i služby beze změny“, v dashboardu „Mobilizace ne · vycestování bez omezení · hranice běžně“.
- **PROBLEM:** `data/provoz.json` a `data/pravni-stav.json`: všech 15 položek má `overeno: null` a `pokryti: "orientacni"`. Dlaždice (`pokryti.ts:103, 122`) je proto správně označují „nedoloženo“ nebo „bez hlášení“ (tón `nedolozeno`, ne `klid`). Budík nad nimi ale tvrdí ověřený klid a „beze změny“ u nákupů a služeb, které web vůbec nesleduje. `urovenObcanu()` nebere v potaz `pokryti` ani `overeno`.
- **RISK:** Falešný status „normál“. Rozpor mezi budíkem a dlaždicemi na téže stránce. Čtenář s místním omezením se dozví, že se ho nic netýká (přesně tomu chtěl `veta.ts:15-20` zabránit).
- **PRIORITY:** P0
- **NEW COPY:** slovo budíku při orientačním pokrytí: „**Bez hlášení**“, nápověda: „Ve sledovaných úředních zdrojích jsme nenašli celostátní omezení. Úplný výčet opatření nemáme; místní situace se může lišit.“ Při autoritativním pokrytí: „Bez omezení“ + „V kontrolovaných úředních zdrojích neplatí celostátní omezení.“ Popis v dashboardu: „Mobilizace nevyhlášena · vycestování bez hlášeného omezení · hranice bez hlášení“.
- **IMPLEMENTATION:** do `urovenObcanu()` přidat větev: když některá položka nemá `pokryti === "autoritativni"`, vrátit `{ uroven: null, slovo: "Bez hlášení" }` a neutrální tečku. `crTon` v `dashboard.tsx:429` odvodit ze stejných tónů jako dlaždice (`stavPravni`/`stavProvozu`). Vyhodit „nákupy i služby“.
- **ACCEPTANCE TEST:** s daty, kde všechny položky mají `pokryti: "orientacni"`, se na `/` nikde neobjeví řetězec „Bez omezení“ ani zelená tečka u „Běžný život“. S `autoritativni` + `plati:false` se „Bez omezení“ objeví.

### C — Úřední opatření nebo výpadek = „Vážná / ozbrojený incident“ (P0, zatím skryté)
- **URL:** `/`
- **KOMPONENTA:** `src/lib/data.ts:397-401`, `src/lib/skala.ts:76-79` (O1), `:97-100` (R1), `:49-52` (Y1), `src/components/hero-dashboard.tsx:49` (`VykladUrovne`)
- **CURRENT:** `plati.length` → `uroven: "R1"` (Vážná: „Probíhá ozbrojený incident s přímou účastí NATO nebo ČR“). `narusene` → `O1` (Vysoká: „Vážný hybridní tlak s doloženým státním podílem nebo velkou škodou“). `sledovane` → `Y1` („Incidenty tvoří rozpoznatelný vzor“).
- **PROBLEM:** Stupnice závažnosti hybridního tlaku se používá jako semafor běžného života. Nouzový stav kvůli povodni, výpadek sítě kvůli bouřce nebo kontroly na hranici by web označil jako ozbrojený incident nebo státem řízený útok.
- **RISK:** Web sám vytvoří poplašnou zprávu (§ 357 TZ, pravidlo č. 2) přesně ve chvíli, kdy se lidé budou dívat nejvíc.
- **PRIORITY:** P0 (musí se opravit před spuštěním, i když se dnes neprojevuje)
- **NEW COPY:** vlastní třístupňová škála „Běžný život“ bez vazby na UROVNE: „Bez hlášení“ / „**Platí opatření**: {název}“ / „**Hlášené narušení**: {název}“. Nápověda: jen název opatření, úřad, odkaz a „co to znamená pro vás“ z `vysvetleni`.
- **IMPLEMENTATION:** `urovenObcanu()` nemá vracet `Uroven`, ale vlastní typ `StavZivota`. Budík `Merak` pro „Běžný život“ nemá volat `VykladUrovne`.
- **ACCEPTANCE TEST:** fixture s `nouzovy-stav.plati = true` → na `/` se nevyskytuje „Vážná“, „ozbrojený“ ani „NATO“ v bloku „Běžný život“. Fixture s `provoz.elektrina.stav = "narusen"` → nevyskytuje se „státním podílem“.

### D — Neověřené zprávy do Telegramu (P0)
- **URL:** `/odber/`, `/zapojit-se/`, `/` (výzva Telegram), `/o-projektu/`
- **KOMPONENTA:** `src/config/web.ts:60` (`DORUCOVANI.telegram.rozsah`: „U pěti nejzávažnějších témat posíláme i neověřený signál“), `:96-116` (`NEOVERENE_SIGNALY`), `src/components/odber.tsx:65`, `src/components/vyzva-telegram.tsx` (Otaznik „Kdy přijde okamžité upozornění“), implementace `nastroje/rozhlas.mjs:698, 718` („⚠️ NEOVĚŘENO — signál ke kontrole“ + titulek)
- **CURRENT:** „U pěti nejvážnějších témat pošleme zprávu hned, i neověřenou. Je tak označená a vede na zdroj.“
- **PROBLEM:** CLAUDE.md pravidlo č. 2: „Neověřené tvrzení o ohrožení se nevydá jako tvrzení — ani jako otázka, ani jako možnost“. Pravidlo č. 4: položky se „Do Telegramu ani jiných kanálů **neodesílají**… Zařadit položku smí jen člověk. Automat sem nedává nic“. Pravidlo č. 4 také říká: „Sběrač nikdy nic nezveřejňuje.“ Push s titulkem „Russia declares mobilization“ je zveřejnění automatem. Příklad z fronty: kandidát „In Russia, hundreds of thousands of men have been issued with mobilisation orders — UkrMedia News“ (`kandidati.json`, 9. 9., `naliehave.druh = mobilizace-rusko`).
- **RISK:** § 357 TZ. Šíření fámy s logem projektu. Zásadní rozpor mezi zveřejněnými pravidly a praxí.
- **PRIORITY:** P0
- **NEW COPY:** `rozsah`: „Mimořádná výstraha a vážné ověřené případy odcházejí hned. Ostatní ověřené záznamy jednou denně v souhrnu.“ Odstranit věty o neověřených zprávách z `odber.tsx:65` a z Otazníku ve `vyzva-telegram.tsx`.
- **IMPLEMENTATION:** v `nastroje/rozhlas.mjs` vypnout větev „signál ke kontrole“ (:718) a „NEOVĚŘENO — vážný případ“ (:698), nebo ji nechat jen do interního kanálu správce. Rozhodnutí patří provozovatelce, protože jde o vědomou výjimku (`web.ts:97-109`). Do té doby web nesmí funkci inzerovat.
- **ACCEPTANCE TEST:** `grep -rn "neověřen" src/config/web.ts src/components/odber.tsx src/components/vyzva-telegram.tsx` nic nevrátí. Test rozhlasu: kandidát s `naliehave` bez `lidskyOvereno` nevyprodukuje žádnou zprávu pro veřejný kanál.

### E — Karta „Připojit se ke komunitě“ (P0)
- **URL:** `/`
- **KOMPONENTA:** `src/components/tri-temata.tsx:59-68`
- **CURRENT:** „Připojit se ke komunitě — WhatsApp skupina, slevy na výbavu, testování novinek, přednostní přístup, VIP příprava. Omezený počet míst. [Chci se přidat]“
- **PROBLEM:** Neexistuje WhatsApp (`KANALY.whatsapp = ""`), e-shop (`ESHOP = ""`), slevy, testování, VIP ani komunita (`DISKUZE.url = ""`, `KOMUNITA.* = ""`). „Omezený počet míst“ je vymyšlená vzácnost (nekalá obchodní praktika). „VIP příprava“ patří do slovníku preppingu. `/o-projektu:58` přitom tvrdí, že WhatsApp „se nenabízí“.
- **RISK:** Nabízí neexistující funkci jako hotovou a lže o dostupnosti. Novinář tím dostane titulek.
- **PRIORITY:** P0
- **NEW COPY:** štítek „Zapojit se“ · nadpis „Dejte vědět, co se děje u vás“ · popis „Pošlete odkaz na úřední zdroj nebo zprávu z regionu. Ověříme ji a zapíšeme se zdrojem.“ · akce „Poslat tip“. (Nebo kartu odstranit, dokud komunita neexistuje.)
- **IMPLEMENTATION:** nahradit položku v `TEMATA`. Případný budoucí text o komunitě podmínit `KOMUNITA.skupina !== ""`.
- **ACCEPTANCE TEST:** na `/` není „WhatsApp“, „slevy“, „VIP“ ani „Omezený počet míst“, dokud jsou příslušné konfigurace prázdné.

### F — Premium, kredit a e-shop (P0 [když API běží])
- **URL:** `/odolnost/`, `/ucet/`
- **KOMPONENTA:** `src/components/premium-klient.tsx:26-34` (`OBSAH_PREMIUM`), `:108`, `:112-113`; `src/app/podminky/page.tsx`; `src/app/soukromi/page.tsx`
- **CURRENT:** Premium obsahuje „co dokoupit, s odkazy do obchodů, až poběží“ a „**přístup do komunity a chatu**“. „Celých {kredit} vám vrátíme jako kredit {kredit} na nákup v CzechPatrol e-shopu.“ Níž (jen když `!eshopBezi`) následuje „E-shop připravujeme. Kredit bude možné využít po jeho spuštění, podle podmínek.“
- **PROBLEM:** Prodává se přístup ke komunitě, která neexistuje, a kredit do neexistujícího e-shopu. Podmínky o kreditu, Premium ani vrácení peněz nic neříkají. Soukromí neuvádí Comgate, e-mail pro kód ani to, že se profil domácnosti (včetně „Někdo je závislý na péči, léku nebo přístroji“) ukládá šifrovaně na server (`api/src/domacnost.ts`). Není uvedený správce. Úvodní popis `/odolnost` tvrdí „Profil zůstává ve vašem zařízení“.
- **RISK:** spotřebitelské právo, GDPR čl. 13, a u údaje o zdraví i čl. 9. Neexistující funkce se prodává jako funkční. Dojem, že bezpečnostní přehled straší kvůli prodeji výbavy.
- **PRIORITY:** P0, pokud je brána naostro. Jinak P1 s blokací platby.
- **NEW COPY:** seznam Premium jen z toho, co běží: „vaše kritické závislosti a co selže jako první · odolnost na 7–60 dní · jak dlouho vydrží voda, jídlo, léky a energie — s předpoklady · rozpočet energie · plán ke stažení a tisku“. Kreditovou větu vypustit, dokud `eshopBezi` není `true`. Popis `/odolnost`: „Souhrn a nálezy se počítají ve vašem zařízení. Uložení na server je volitelné a jen s Premium.“
- **IMPLEMENTATION:** položky `OBSAH_PREMIUM` podmínit (`komunita`, `eshopBezi`). Platbu v API blokovat, dokud nejsou vyplněné `PROVOZOVATEL`, podmínky Premium a oddíl Soukromí „Platby a uložený profil“. Právní text předat k právní kontrole (`docs/PRAVNI-KONTROLA.md`), nepsat ho v kódu.
- **ACCEPTANCE TEST:** s `eshopBezi=false` a `komunita=null` se na `/odolnost` ani `/ucet` nevyskytuje „komunit“, „chat“ ani „kredit na nákup“. `POST /platby/zacit` vrací 503, dokud je `PROVOZOVATEL.nazev` prázdný.

### G — Žebříček sbírá kontakt bez správce (P0 [když API běží])
- **URL:** `/odolnost/`
- **KOMPONENTA:** `src/components/zebricek-klient.tsx:116-119, 145, 151-162`, `api/src/zebricek.ts:47, 60, 81`, `src/app/soukromi/page.tsx:99`
- **CURRENT:** „Nechat kontakt pro pozvání do komunity (nepovinné)“ s poli E-mail a Telefon. „Vidí ho jen provozovatel“, jenže provozovatel není uveden. Tato část je podmíněná jen `UCTY_ZAPNUTE` a šifrovacím klíčem, ne `PROVOZOVATEL` (komentář v `tri-temata.tsx:15` přitom slibuje „uvedený provozovatel + API“).
- **PROBLEM:** Pravidlo č. 9 („Účet nemá jméno, e-mail ani telefon a nikdy je mít nebude“). GDPR čl. 13. Pozvánka do komunity, která neexistuje. „Jste v žebříčku jako …, {poradi}. místo“ a „průměr ostatních“ dělají z připravenosti soutěž.
- **RISK:** porušení GDPR a vlastních zásad, vymyšlený účel sběru.
- **PRIORITY:** P0 [API]; gamifikace sama o sobě P1
- **NEW COPY:** kontaktní pole zatím úplně odstranit. Místo pořadí: „Vaše skóre {n} ze 100. Orientační, není to hodnocení vás ani doklad o připravenosti.“
- **IMPLEMENTATION:** podmínit kontakt `PROVOZOVATEL.nazev !== "" && KOMUNITA.skupina !== ""`. Rozhodnout (provozovatelka + právní kontrola), jestli žebříček s pořadím vůbec zůstane.
- **ACCEPTANCE TEST:** s prázdným `PROVOZOVATEL` není v DOM `/odolnost` žádné pole `type=email` ani `type=tel`. `POST /ja/zebricek` s kontaktem vrací 400/503.

### H — „bez nálezu“ v liště (P0)
- **URL:** všechny stránky
- **KOMPONENTA:** `src/components/banner-stari-klient.tsx:53-58`, `src/app/layout.tsx:95`
- **CURRENT:** „Zkontrolováno 14:01 · bez nálezu“
- **PROBLEM:** Kontrola skoro vždy něco zachytí (300 kandidátů ve frontě). Věta tvrdí zápor, který nemá doložený, a může stát vedle červeného pásu „Sběr zachytil naléhavou zprávu“. Podle vlastního komentáře (:15-22) je to přesně ta formulace, která 17. 9. zamaskovala výpadek.
- **RISK:** falešný status, rozpor na téže obrazovce
- **PRIORITY:** P0
- **NEW COPY:** „Zdroje čteny 14:01“ (bez hodnocení výsledku)
- **IMPLEMENTATION:** z `:56` vypustit „ · bez nálezu“.
- **ACCEPTANCE TEST:** `grep -rn "bez nálezu" src` najde jen komentáře.

### I — „Teď nic urgentního. Žádná mobilizace…“ (P0)
- **URL:** `/`
- **KOMPONENTA:** `src/components/urgentni.tsx:117-121` (plná verze), `:156` (pás v úvodu), volání `dashboard.tsx:507` s `zkontrolovano={overeno}` (= `posledniOvereni()` = `null`)
- **CURRENT:** „**Teď nic urgentního.** Žádná mobilizace, krizové vysílání ani mimořádný stav za 48 h“ se zeleným rámečkem, bez času.
- **PROBLEM:** Kategorický zápor z orientačního pokrytí (odporuje `veta.ts:48-59`). Chybí čas, takže zelená zůstane i tehdy, když sběr 13 h neběží. „Žádná mobilizace“ bez upřesnění kde (Rusko? ČR?). Slovo „urgentní“ a červený rámeček připomínají varovný systém (pravidlo č. 0: web nesmí být zaměnitelný s JSVV).
- **RISK:** falešný klid a zaměnitelnost s varováním
- **PRIORITY:** P0
- **NEW COPY:** „**Ve sledovaných zdrojích nic nového za 48 h.** Mobilizace v ČR ani krizové vysílání nejsou hlášené · zdroje čteny {čas}“. Při výpadku: „Nevíme — sběr naposledy běžel {čas}.“ Štítek „Urgentní upozornění“ → „Co je nového“.
- **IMPLEMENTATION:** předat `posledniKontrola()` místo `posledniOvereni()`. Nad 12 h staré kontroly zobrazit šedý stav „Nevíme“ místo zeleného. Totéž v `vyzva-telegram.tsx:32`.
- **ACCEPTANCE TEST:** s `zkontrolovano` starším než 12 h pás není zelený a obsahuje „Nevíme“. Řetězec „Žádná mobilizace“ se nevyskytuje.

### J — Karta „Právě ověřujeme“ o ruské mobilizaci (P0)
- **URL:** `/` (první blok nad budíky), `/udalosti/`
- **KOMPONENTA:** `data/overujeme.json` id `o-2026-09-18-ru-mobilizace`; `src/components/overujeme.tsx:132-147`
- **CURRENT (coRikajiUrady[1]):** „Popírání samo nic nedokládá: předseda obranného výboru Dumy Andrej Kartapolov popíral mobilizaci i 20. 9. 2022, den před jejím vyhlášením.“ `coSeHlasi` obsahuje „Rozhodnutí podle nich může padnout po ruských volbách do Státní dumy (18.–20. září 2026).“
- **PROBLEM:** (1) Do pole „co říkají úřady“ patří jen to, co úřady řekly. Tahle věta je hodnocení projektu a zesiluje obavu (pravidlo č. 2: „nesmí budit větší obavu, než unese doložený údaj“). Nemá odkaz. (2) Nesplňuje vstupní podmínku z pravidla č. 0/4 „dopad: kdyby to platilo, změnilo by to dnes lidem chování“: vlastní `kdybyPlatilo` i `coDelatTed` říkají, že v ČR by se nic neměnilo. (3) Časový odhad („může padnout po volbách“) je předpověď převzatá od strany konfliktu, a volby už proběhly.
- **RISK:** poplašný dojem na první obrazovce, rozpor s vlastními pravidly
- **PRIORITY:** P0 (rozhoduje člověk, protože položku zařadila provozovatelka)
- **NEW COPY:** položku stáhnout z úvodu (nesplňuje podmínku dopadu). Pokud zůstane: `coRikajiUrady` = „Ruské úřady mobilizaci nevyhlásily; Kreml zprávy 25. 8. označil za vymyšlené [odkaz]. · České úřady k tomu žádné opatření nevydaly.“ Vypustit větu o Kartapolovovi a časový odhad.
- **IMPLEMENTATION:** úprava dat a doplnění kontroly do `nastroje/kontrola-dat.mjs`: každá věta v `coRikajiUrady` musí mít odkaz.
- **ACCEPTANCE TEST:** `kontrola-dat` hlásí chybu u položky, kde `coDelatTed` začíná „Nic“ a zároveň `kdybyPlatilo` neobsahuje dopad na ČR (nebo jde o ruční checklist provozovatelky).

### K — „Hodnocení dělá člověk“ (P0)
- **URL:** `/o-projektu/`, `/soukromi/`
- **KOMPONENTA:** `src/app/o-projektu/page.tsx:43`, `src/app/soukromi/page.tsx:139`
- **CURRENT:** „Texty jsou AI shrnutí zdrojů, ne články. **Hodnocení dělá člověk.**“
- **PROBLEM:** Celkovou úroveň počítá automat (`sber/hodnoceni.ts`, CLAUDE.md pravidlo č. 4, výjimka ze dne 23. 9.; `metodika/page.tsx:132`). Tvrzení je nepravdivé. U Soukromí jde navíc o informaci o automatizovaném zpracování.
- **RISK:** faktická chyba o metodice, rozpor mezi stránkami
- **PRIORITY:** P0
- **NEW COPY:** „Celkové hodnocení počítá automat z ověřených případů za 14 dní podle pravidla v Metodice. Záznamy a jejich závažnost schvaluje člověk.“
- **IMPLEMENTATION:** úprava dvou řádků a přidání zápisu do `/opravy/` (změna metodiky = zápis).
- **ACCEPTANCE TEST:** `grep -rn "Hodnocení dělá člověk" src` nic nenajde.

### L — „nekomerční“ vs. Premium (P0)
- **URL:** `/o-projektu/`, `/podporit/`, `/odolnost/`
- **KOMPONENTA:** `o-projektu/page.tsx:31`, `podporit/page.tsx:59-64`, `odolnost/page.tsx:8, 22`
- **CURRENT:** „nezávislý a nekomerční přehled“ · „Záměr, ne nabídka. Nic z toho se teď nedá koupit.“ · „Podrobný plán … je Premium.“
- **PROBLEM:** Tři stránky popisují peníze třemi různými způsoby. Existují dva placené produkty (Plus jako hypotéza, Premium jako prodej) a o-projektu nezmiňuje ani jeden.
- **RISK:** rozpor mezi stránkami, důvěryhodnost
- **PRIORITY:** P0
- **NEW COPY:** o-projektu: „Nezávislý přehled bez inzerce. Bezpečnostní informace jsou zdarma. Placený je jen podrobný plán odolnosti domácnosti (Premium).“ /podporit, oddíl „Co je placené“: „Premium — podrobný plán odolnosti domácnosti, jednorázově {cena}. Bezpečnostní informace nikdy placené nebudou.“ Plus uvést jako záměr zvlášť.
- **IMPLEMENTATION:** texty sjednotit z jednoho místa (podobně jako `DORUCOVANI` v `web.ts`).
- **ACCEPTANCE TEST:** ruční průchod: slova „nekomerční“, „nic se nedá koupit“ a „Premium“ si mezi stránkami neodporují.

### M — „atraktivním cílem“ (P1)
- **URL:** `/odolnost/`
- **KOMPONENTA:** `src/app/odolnost/page.tsx:21`
- **CURRENT:** „Čím lépe budeme připraveni, tím méně atraktivním cílem budeme.“
- **PROBLEM:** Předpokládá útočníka, který si vybírá cíl, tedy válečný a prepperský rámec. Na webu, který od připravenosti vede ke koupi výbavy, to působí jako strašení.
- **PRIORITY:** P1
- **NEW COPY:** „Domácnost, která zvládne pár dní bez proudu a vody, pomáhá i sousedům a záchranářům.“
- **ACCEPTANCE TEST:** `grep -rn "atraktivn" src` nic nenajde.

### N — Budík „Česko · 90 dní“ (P1)
- **KOMPONENTA:** `src/components/hero-dashboard.tsx:93-100, 203-210`, `dashboard.tsx:422-428`
- **CURRENT:** úroveň Y2 „Střední“ (jediná kampaň „Těšínsko“, `kampane.json`, odhaleno 17. 8.) a nápověda „Významnější signály, které se kumulují. Typicky způsobuje: Opakované sabotáže, zatčení operativců…“. Bez dat: „**Bez incidentu**“, „ani jeden případ“.
- **PROBLEM:** Obecná definice úrovně neodpovídá tomu, co ji způsobilo. „Bez incidentu“ je kategorický zápor (znamená jen „žádný ověřený případ v evidenci“). Záznam `a28` „ČR přijala preventivní bezpečnostní opatření“ (O1) se nepočítá, protože je `opatreni`. Čtenář tak nepozná, proč je Česko „Střední“.
- **PRIORITY:** P1
- **NEW COPY:** bez dat: „**Žádný ověřený případ**“. Nápověda s daty: „Nejvyšší závažnost z {n} případů a {k} manipulačních operací za 90 dní. Nejzávažnější: {titulek} ({datum}).“
- **ACCEPTANCE TEST:** nápověda obsahuje titulek záznamu, který úroveň určil. Řetězec „Bez incidentu“ se nevyskytuje.

### O — Zastaralá data jako aktuální (P1)
| Soubor | Poslední stav | Kde se ukazuje jako dnešní | Oprava |
|---|---|---|---|
| `data/hybridni-tlak.json` | `overeno: 2026-09-05` | věta na úvodu („V Evropě…“), pavučina v `/analyzy/`, `stav.json` pole `primy` | viz A; u pavučiny „hodnoceno 5. 9. 2026“ |
| `data/tydny.json` | poslední týden 31. 8.–6. 9. | `/vyvoj/` graf týdnů | věta „Od 7. 9. týdenní hodnocení nemáme.“ nebo doplnit ze `stav.json` |
| `data/svet.json` | `aktualizovano: 2026-09-06` | `/svet/` | datum viditelně u každého aktéra |
| hodinový sběr | poslední commit 23. 9. 02:02 UTC | lišta; po 12 h „Sběr neběží“ | zjistit příčinu (minuty Actions?) |

### P — Počty zahrnují neověřené úředně (P1)
- **KOMPONENTA:** `src/lib/data.ts:65` pouští do `incidenty()` i `overeni: "neovereno"` (23) a `"automaticke"` (9). `agregace.ts:77` je nerozlišuje.
- **PROBLEM:** Za 90 dní je 50 případů, z toho 19 „neověřeno úředně“ a 9 automatických. Pás zemí, Země i Vývoj je počítají, hodnocení (`stav.json`: „13 případů za 14 dní“) ne. Na úvodu tak stojí dvě různá čísla bez vysvětlení.
- **NEW COPY:** u počtu: „{n} případů za 90 dní · z toho {m} bez úředního potvrzení“.
- **ACCEPTANCE TEST:** součet v pásu zemí se rovná počtu `lidskyOvereno` a zvlášť uvedenému počtu neověřených.

### Q — Cizojazyčné větve (P1)
- `data/preklady/ui/en.json` má 50 klíčů. Nepřeloženo zůstává mimo jiné „Bez omezení“, „Bez incidentu“, obě věty z `veta.ts`, `tri-temata.tsx`, `urgentni.tsx` a „90 dní“ i „teď“ (`hero-dashboard.tsx:206, 214`, předáváno bez `t()`).
- **RISK:** pravidlo 3b: „Poloprázdná cizojazyčná stránka je horší než žádná“.
- **IMPLEMENTATION:** do spuštění z `/{kod}/` nechat jen úvod s přeloženými budíky a odkaz na česká znění, nebo doplnit překlady a v `kontrola:data` kontrolovat i řetězce mimo `t()`.

### Další P1–P2
- **P1** `src/app/izs/page.tsx:26-28` — „Zprávy záchranných složek přímo čtenářům“ + ikona `sirena`. Nový text: „Zprávy partnerů IZS — připravujeme“ a „Až poběží, ověřená složka bude moct…“. Podmínit `IZS_KONTAKT`.
- **P1** `src/app/ucet/page.tsx:7` — „…na Telegram nebo WhatsApp“ → „…na Telegram“.
- **P1** `src/components/vyzva-telegram.tsx:32` — „Urgentní upozornění“ → „Upozornění“ (zaměnitelnost s varováním).
- **P1** `data/hybridni-tlak.json` / `src/lib/data.ts:296` + `trend.tsx:132` — osa „Přímé vojenské riziko“ / „Přímý střet“ je ručně zadané hodnocení rizika. Poznámka říká „Riziko ozbrojeného střetu mezi NATO a Ruskem“, což je výhled (pravidlo 3c). Přejmenovat na „Přímé vojenské incidenty NATO–Rusko (doložené)“ a počítat ji jen z případů, nebo ji odstranit.
- **P1** `data/incidenty.json` `i-2026-09-06-babis` — prohlášení politika jako záznam (proti pravidlu č. 1). `a10` (BIS) má jediný zdroj, Anadolu Agency, místo výroční zprávy BIS.
- **P1** 28 záznamů má jistotu „potvrzeno“ bez úředního zdroje (`a04, a10, a18, a21, a22, a24, a28, a29, a30, h01…`). Commit „Audit: bez úředního zdroje nejvýš střední jistota“ z 23. 9. 14:57 se týká jen návrhů, starých záznamů ne.
- **P2** `src/components/karta-udalosti.tsx:158-160` — prázdný blok „Proč to sledujeme“ u 34 záznamů. Podmínit `incident.vyznam &&`.
- **P2** 11 záznamů odkazuje na zdroj přes `news.google.com/rss/articles/…`. Nahradit přímou adresou článku.
- **P2** `src/app/o-projektu/page.tsx:69-74` — řádek „ ·  · Soukromí · Podmínky“ s prázdnými oddělovači.
- **P2** `src/components/sledovat.tsx` `Partneri` — tři rámečky „volné místo pro partnera“ na úvodní stránce. Do spuštění skrýt, když je `PARTNERI.length === 0`.
- **P2** `src/components/pruhy.tsx:21` — „Beta · AI-assisted“ anglicky v českém rozhraní → „Beta · zpracováno s pomocí AI“.
- **P2** `src/app/sitemap.ts:9` — doplnit chybějící stránky, odebrat `/muj-prehled`.

---

## 3. Grep fráze: klid, riziko, alarmismus, přehnaná jistota

(Komentáře v kódu vynechány. Uvedeny jen řetězce, které se vykreslují.)

| soubor:řádek | CURRENT | PROBLEM | REPLACEMENT |
|---|---|---|---|
| `components/banner-stari-klient.tsx:56` | „Zkontrolováno {čas} · bez nálezu“ | zápor bez dokladu (H) | „Zdroje čteny {čas}“ |
| `components/hero-dashboard.tsx:93` | „Bez incidentu“ | kategorický zápor (N) | „Žádný ověřený případ“ |
| `components/hero-dashboard.tsx:100` | „ani jeden případ“ | totéž | „žádný ověřený případ v evidenci“ |
| `components/hero-dashboard.tsx:215-216` | „Bez omezení“ / „pohyb, nákupy i služby beze změny“ | nákupy a služby se nesledují, `overeno:null` (B) | „Bez hlášení“ / „Ve sledovaných úředních zdrojích bez celostátního omezení.“ |
| `lib/data.ts:402` | „bez omezení, bez mobilizace, bez mimořádných nařízení“ | totéž | „ve sledovaných zdrojích bez hlášeného omezení“ |
| `components/dashboard.tsx:428` | „Bez omezení“ | totéž | „Bez hlášení“ (když pokrytí není autoritativní) |
| `components/dashboard.tsx:431` | „Mobilizace ne · vycestování bez omezení · hranice běžně“ | kategorické, bez ověření | „Mobilizace nevyhlášena · vycestování a hranice bez hlášení“ |
| `components/dashboard.tsx:295` | souhrn tónu „v normálu“ | „normál“ je hodnocení | „bez hlášení“ |
| `components/urgentni.tsx:120, 156` | „Teď nic urgentního. Žádná mobilizace, krizové vysílání ani mimořádný stav za 48 h“ | zápor z orientačního pokrytí (I) | „Ve sledovaných zdrojích nic nového za 48 h · zdroje čteny {čas}“ |
| `components/urgentni.tsx:99` | „Žádná výstraha neplatí.“ | ok, pokud `vystraha.json` hlídá člověk | ponechat |
| `lib/veta.ts:56` | „Pro běžný život v Česku dnes neplatí žádné mimořádné omezení.“ | ok jen s autoritativním pokrytím (kód to hlídá) | ponechat |
| `lib/veta.ts:80` | „…vysoká a týká se i sousedních zemí.“ | dovětek se z dat nevyvozuje (A) | „V Evropě je hybridní aktivita vysoká.“ |
| `lib/veta.ts:81` | „V Evropě je situace vážná a mění se rychle.“ | „mění se rychle“ je hodnocení dynamiky bez dat | „Hodnocení pro Evropu je na nejvyšší úrovni. Podrobnosti v Metodice.“ |
| `lib/skala.ts:91` (O3) | „Na hranici mezi hybridním tlakem a přímým střetem.“ | hraniční formulace, zní jako předpověď | „Doložené ozbrojené incidenty mezi státy NATO a Ruskem bez aktivace čl. 5.“ |
| `lib/skala.ts:93` (O3 neznamena) | „Neznamená, že k eskalaci nutně dojde — stabilizace je stále možná.“ | rámuje eskalaci jako výchozí scénář | „Neznamená válečný stav ani mobilizaci v ČR.“ |
| `lib/skala.ts:97-100` (R1) | „Probíhá ozbrojený incident s přímou účastí NATO nebo ČR.“ | v pořádku jako definice, ale nesmí se ukázat u „Běžný život“ (C) | viz C |
| `lib/skala.ts:43` (G3) | „Stále klidný stav…“; `:35` „Klidný stav…“ | „klid“ je hodnocení | „Běžná úroveň, některé jevy sledujeme.“ |
| `lib/data.ts:296, 305` + `data/hybridni-tlak.json` | „Přímé vojenské riziko“ (G2), poznámka „Riziko ozbrojeného střetu mezi NATO a Ruskem“ | hodnocení rizika, tedy výhled (3c) | „Doložené přímé vojenské incidenty NATO–Rusko“ |
| `lib/data.ts:688` (`klidoveBody`, nikde se nevolá) | „Riziko přímého vojenského střetu NATO–Rusko zůstává nízké.“ | výhled; mrtvý kód | smazat |
| `components/trend.tsx:132, 227` | řada „Přímý střet“ | totéž | „Přímé vojenské incidenty“ |
| `app/metodika/page.tsx:65` | vzorová věta „…přímé vojenské riziko zůstává nízké“ | Metodika tuhle formulaci doporučuje, pravidlo 3c ji zakazuje | „Nový incident; přímý vojenský incident NATO–Rusko není doložen.“ |
| `app/odolnost/page.tsx:21` | „…tím méně atraktivním cílem budeme.“ | válečný rámec (M) | viz M |
| `components/tri-temata.tsx:63` | „…VIP příprava. Omezený počet míst.“ | prepperský slovník, falešná vzácnost (E) | viz E |
| `components/vyzva-telegram.tsx:32` | „Urgentní upozornění“ | tísňová formulace | „Upozornění“ |
| `app/izs/page.tsx:26` | „Zprávy záchranných složek přímo čtenářům“ | zaměnitelné s varovným systémem, neběží | „Zprávy partnerů IZS (připravujeme)“ |
| `components/kampane.tsx:202, 280` | „Zatím jen pravděpodobně“ / „pravděpodobně“ | slovní míra jistoty, ok | ponechat |
| `data/overujeme.json` (RU mobilizace) | „Popírání samo nic nedokládá…“ | zesiluje obavu, bez odkazu (J) | vypustit |
| `data/svet.json` (Čína) | „…bez války, kterou si Peking zatím nedovolí.“ | výhled | „Tchaj-wan: Peking deklaruje sjednocení; vojenský krok nebyl učiněn.“ |
| `data/svet.json` (EU) | „Cíl roku 2030 je reálný pro část priorit, ne pro všechny.“ | předpověď | „K září 2026 schváleno X, dodáno Y [zdroj].“ |
| `data/stav.json` `trendPopis` | „součet závažnosti 11.5 … (62.3)“ | pseudopřesnost. Kontrola: `trendPopis` se v `src` nevykresluje (grep bez výsledku), jde jen do JSON | v UI nepoužívat |
| `components/odolnost-klient.tsx` | „přepočítává se průběžně“, výpočty Wh s „odečtením 15 % ztrát“ (`lib/odolnost.ts:280`) | předpoklad je uvedený, ok | ponechat |

Hledané výrazy „žádné incidenty“, „0 incidentů“, „bez rizika“, „bez hrozby“, „válka“ (v rendrovaném textu mimo seznam ZAKÁZANÉ v metodice) a „nepřítel“ se v UI nevyskytují.

---

## 4. Registr stavu funkcí

| Funkce | Stav podle kódu a konfigurace | Co tvrdí stránky (soubor:řádek) | Rozpor? |
|---|---|---|---|
| Telegram | `KANALY.telegram` vyplněný, `DORUCOVANI.telegram.bezi: true`, workflow `rozhlas.yml` běží (behy.json) | nabízí se v `zapojit-se:49-56`, `postranni-panel.tsx:236`, `sledovat.tsx`. Ve `vyzva-telegram.tsx:52` a `zapojit-se:59` je větev „Telegram připravujeme“, ale díky podmínce se nezobrazí | ne. Rozsah ale zahrnuje neověřené zprávy (D) → **ano, s pravidly** |
| RSS | build, funkční | všude | ne |
| WhatsApp | `KANALY.whatsapp = ""`, `DORUCOVANI` bez položky | „WhatsApp skupina“ `tri-temata.tsx:63` (jako hotové); „připravujeme“ `sledovat.tsx:17`, `postranni-panel.tsx:68`; „Až otevřeme… skupinu na WhatsAppu“ `zapojit-se:68, 116`; `ucet/page.tsx:7` „přijít na Telegram nebo WhatsApp“; `ucet-klient.tsx:51` „na Telegram nebo WhatsApp“; `soukromi:53, 90` (zpracování tel. čísla); `podminky:68` „Doručení na Telegram nebo WhatsApp“; `o-projektu:58` „nenabízejí se“ | **ano** (úvod: hotové; o-projektu: nenabízí se; ostatní: připravujeme) |
| Signal, Bluesky | prázdné | „připravujeme“ `sledovat.tsx:18-19`, `postranni-panel.tsx:67`; o-projektu „nenabízejí se“ | **ano** (drobný) |
| E-mailový souhrn | `EMAIL_ODBER_BEZI = UCTY_ZAPNUTE && PROVOZOVATEL` → `false` (provozovatel prázdný) | `zapojit-klient.tsx:52` „E-mailový odběr připravujeme“ ok; `zapojit-se:72` „Souhrn zatím nevychází“ ok; `soukromi:96-100` popisuje sběr e-mailu jako běžící | drobný (soukromí je napsané dopředu) |
| Účty (passkey) | `DORUCOVANI.ucty.bezi: false` („zatím neběží“), ale UI se řídí `UCTY_ZAPNUTE` (= `API_URL`). API se nasazuje | `o-projektu:50` podle `UCTY_ZAPNUTE`; `postranni-panel.tsx:182` „Účty a upozornění zatím neběží“ | **možný rozpor**: `DORUCOVANI.ucty.bezi` je natvrdo `false`, i když je `API_URL` nastavené |
| Týdenní souhrn v účtu | `DORUCOVANI.ucty.rozsah` „týdenní souhrn“, API `rozeslani.ts` | `o-projektu:50` „Účty, týdenní souhrn a upozornění: běží/neběží“ | závisí na API |
| Premium (Odolnější domácnost) | API `platby.ts`, `opravneni.ts`, `kredity.ts`, Comgate; web ho ukáže, když `GET /premium` vrací `bezi` | `odolnost/page.tsx:8, 22` „je Premium“ (natvrdo, i bez API); `premium-klient.tsx:117` „Odemknutí připravujeme“ (bez API); `podporit:60` „Nic z toho se teď nedá koupit“; `o-projektu:31` „nekomerční“ | **ano** |
| Plus (79/790 Kč) | jen `docs/naklady.json`, žádný kód | `podporit:62` „Pracovní hypotéza“ | ne, ale vedle Premium mate |
| E-shop (Čenich) | `ESHOP = ""`, API `eshopBezi` | `tri-temata.tsx:63` „slevy na výbavu“; `premium-klient.tsx:108` „kredit na nákup v CzechPatrol e-shopu“; `:112` „E-shop připravujeme“ | **ano** |
| Komunita / chat | `DISKUZE.url = ""`, `KOMUNITA.* = ""` | `tri-temata.tsx:62-64` „Připojit se ke komunitě … Omezený počet míst“; `premium-klient.tsx:33` „přístup do komunity a chatu“ (jako součást placeného produktu); `premium-klient.tsx:192` „Pozvánky připravujeme“; `zapojit-se:113` „otevřeme ho, až bude komu psát“ | **ano (P0)** |
| Žebříček | API `zebricek.ts`, UI `zebricek-klient.tsx` na `/odolnost`, správa `sprava-zebricek-klient.tsx` | `tri-temata.tsx:74` „Porovnejte se s ostatními v žebříčku“ (jen s `EMAIL_ODBER_BEZI`); `zebricek-klient.tsx:125` „Žebříček připravujeme. Poběží s účty.“; `soukromi:99` popisuje ho jako běžící | podmínky se liší (karta: `EMAIL_ODBER_BEZI`; žebříček: `UCTY_ZAPNUTE`) |
| Partner IZS | API `izs.ts`, role; `IZS_KONTAKT = ""` | `izs/page.tsx:26-28` popisuje jako funkční; `o-projektu:61` „připravená v kódu“; `zapojit-se:117` „Zprávy pro … záchranné složky — nic z toho ještě neběží“ | **ano** |
| Upozornění na míru | API `upozorneni.ts`, `nastaveni.ts` | menu „Upozornění na míru“ (`postranni-panel.tsx:41`, „vyžaduje přihlášení“ / „účty připravujeme“) | závisí na API |
| Můj přehled | localStorage, zámek podle účtu | `muj-prehled-klient.tsx:36, 250` | ne |
| Filtrovaný RSS | neexistuje | `muj-prehled-klient.tsx:197` „zatím není — neslibujeme ho“ | ne |
| Podpora (Buy me a coffee) | `BUY_ME_A_COFFEE_URL = ""` | `podporit:53` „Platba zatím není nastavená“; `postranni-panel.tsx:309` „přímý příspěvek zatím připravujeme“; `podminky:81` zmiňuje „Buy me a coffee“ | ne |
| Měření | `NEXT_PUBLIC_MERENI_URL` není ve workflow → vypnuto | `soukromi:45` „žádná analytika“ | ne |
| GitHub odkaz / „kód a data veřejné“ | `KOMUNITA.github = ""` (záměrně skryté) | `o-projektu:67` „Kód i data jsou veřejné.“ | **ano** |
| BETA | `znacka.tsx:102` `beta = true`, `pruhy.tsx:21` | ok | ne |

---

## 5. Placeholdery, rozbité řetězce, ukázková data

- `TODO`, `FIXME`, `Lorem`, `[DOPLNIT]`: v `src/` ani `data/` nic.
- `undefined`/`NaN` v datech: nic. Kandidáti na `NaN` v UI: `hero-dashboard.tsx:97` a `crPocet` (vždy čísla), `palivo` `toFixed` (podmíněno `cena !== null`). Nic jsem nenašel.
- Prázdné řetězce, které se vykreslí: 34× `vyznam: ""` → prázdný blok „Proč to sledujeme“ (`karta-udalosti.tsx:158-160`). V detailu je podmíněno (`detail-obsah.tsx:204`).
- Rozbitá řádka: `o-projektu/page.tsx:69-74` (tři `" · "`, dva bez odkazu).
- Volná místa: `sledovat.tsx` `Partneri` → 3× „volné místo pro partnera“ na úvodu.
- Ukázková data: `data/ukazka/*` se importují staticky v `src/lib/data.ts:34-43` (jsou v bundlu), ale vykreslují se jen s `NEXT_PUBLIC_REZIM=ukazka`. Produkční workflow tu proměnnou nenastavuje (`nasazeni.yml`, grep). Riziko nízké (P3). Doporučení: dynamický import, aby ukázková data v produkčním bundlu vůbec nebyla.
- „test“: `premium-klient.tsx:113` „Brána běží v testovacím režimu: platba je zkušební, nic se neúčtuje.“ Správně podmíněno `verejne.test`. Před spuštěním ověřit `COMGATE_TEST`.
- `data/fronta/zivy-web.json` a `behy.json` jsou staré (22. 9. 20:27, první položka `in_progress`). Rutina „Stav pro routines“ od té doby nezapsala.

---

## 6. Odolnost a žebříček („lepší než X %“)

- **Existuje.** Žebříček je na `/odolnost/` pod auditem (`src/app/odolnost/page.tsx:29`, `<Zebricek />`), API `api/src/zebricek.ts` (veřejný `GET /zebricek`, vlastní `GET /ja/zebricek` s `poradi: lepsich + 1`, `POST`, `DELETE`), správa `src/components/sprava-zebricek-klient.tsx` (výpis „{n} v žebříčku · {m} s kontaktem“, čtení kontaktů auditované).
- Formulace: „Jak jste na tom proti ostatním“, „vaše skóre z 100 · průměr ostatních {x}“, „Jste v žebříčku jako {přezdívka}, {pořadí}. místo“, veřejný seznam s pořadím, přezdívkou, krajem, datem a skóre (`zebricek-klient.tsx:116-119, 145, 180-190`). Procentní formulaci „lepší než X %“ jsem nenašel.
- Na úvodu ho propaguje `tri-temata.tsx:74` („Porovnejte se s ostatními v žebříčku“), jen když `EMAIL_ODBER_BEZI`.
- Problémy: GDPR (G); soutěžní rámec u tématu bezpečí domácnosti (kraj + počet osob + skóre připravenosti je profil zranitelnosti, i když pod přezdívkou); Soukromí ho popisuje jako běžící. Doporučení P1: veřejné pořadí a kraj odstranit, nechat jen „vaše skóre“ a anonymní medián.

---

## 7. Úvodní strana — test pěti vteřin

**Pořadí první obrazovky (desktop ≥1280 px)** podle `layout.tsx:90-100` a `dashboard.tsx:474-521`:
1. Lišta původu: „Nezávislý projekt… · Beta · AI-assisted · Metodika · Zkontrolováno {čas} · bez nálezu“. Pokud je kontrola starší než 12 h, přibude oranžový pruh „Sběr neběží. Zdroje naposledy čteny …“, **což podle repozitáře teď nastane** (poslední kontrola 02:00 UTC).
2. Navigace.
3. Běžící pás zemí s vlajkami, počty „incidentů za 90 dnů“ a barevnými tečkami (včetně neověřených úředně).
4. **„Právě ověřujeme“**: karta o ruské mobilizaci (600 tisíc) se zpochybněným popřením (J). Právě tahle karta je první obsahový blok, ne odpověď na otázku, jestli se něco děje v ČR.
5. H1 „Bezpečnostní situace v Česku a okolí“ a tučná věta: „V kontrolovaných zdrojích žádné celostátní omezení. Místní situace se může lišit.“ + šedě „V Evropě je hybridní aktivita vysoká a týká se i sousedních zemí.“
6. Velký budík **„Evropa · dnes — Zvýšená“** + „zlepšení za 7 dní“. Dva malé: **„Česko · 90 dní — Střední“**, **„Běžný život · teď — Bez omezení“**.
7. Pás: „Teď nic urgentního. Žádná mobilizace, krizové vysílání ani mimořádný stav za 48 h“ (zelený).
8. Vpravo aktuality (ověřené + „zachyceno, neověřeno“).

**Úrovně a jejich formulace:**
- *Evropa* = automatické `stav.json` (medián závažnosti za 14 dní). Slovo z řady Nízká → Vážná. Budík je největší prvek stránky, přestože H1 a věta mluví o Česku. Hierarchie tak ukazuje Evropu, ne Česko.
- *Česko* = maximum závažnosti případů a kampaní za 90 dní. Používá stejnou stupnici, takže „Střední“ z jedné dezinformační kampaně vypadá stejně jako „Střední“ ze sabotáží.
- *Běžný život* = odvozené z úředních položek, ale kóduje se do téže stupnice (C) a ukazuje „Bez omezení“ bez ověření (B).

**„Přímý střet“:** na úvodu se nevykresluje. Je ve `/vyvoj/` (řada „Přímý střet“, `trend.tsx:132`), v `/analyzy/` (osa „Přímé vojenské riziko“, poznámka „Riziko ozbrojeného střetu mezi NATO a Ruskem“) a v `stav.json`. Formulace „riziko střetu“ je odhad budoucnosti (pravidlo 3c). Metodika ji dokonce doporučuje jako vzor (`metodika/page.tsx:65`). Doporučení: přejmenovat na doložené incidenty, nebo odstranit.

**Pozná čtenář za 5 vteřin, jestli se v ČR děje něco mimořádného a jestli musí jednat?**
- *Částečně ano, ale nespolehlivě.* Tučná věta („V kontrolovaných zdrojích žádné celostátní omezení“) je správně opatrná, jenže:
  - nad ní stojí karta o ruské mobilizaci, takže první dojem je „něco se chystá“,
  - vedle ní jsou tři barevné budíky se slovy „Zvýšená“ a „Střední“, které nic neříkají o tom, jestli má čtenář jednat,
  - věta o Evropě („vysoká“) odporuje velkému budíku („Zvýšená“),
  - zelené „Bez omezení“ a „Teď nic urgentního“ tvrdí víc, než je doložené, a při výpadku sběru zůstanou zelené.
- Otázku „musím jednat?“ výslovně nezodpovídá nic. Chybí jedna věta typu **„Nemusíte nic dělat jinak. V Česku ve sledovaných úředních zdrojích neplatí mimořádné opatření.“** s časem kontroly. Karta „Právě ověřujeme“ to má („Nic měnit nemusíte“), ale jen k jedné fámě.

**Doporučená podoba první obrazovky (P0/P1):**
1. H1 + věta pro Česko + samostatný řádek „**Co to pro vás znamená:** Nic nemusíte dělat jinak.“ (jen s autoritativním pokrytím. Jinak „Ve sledovaných zdrojích bez hlášení · čteno {čas}“),
2. malý řádek o Evropě, **ze stejného zdroje** jako budík,
3. budíky menší. „Česko“ s nápovědou, co ho určilo. „Běžný život“ s vlastní škálou,
4. „Právě ověřujeme“ **pod** budíky, ne nad nimi,
5. „Teď nic urgentního“ nahradit neutrálním „Nic nového za 48 h · čteno {čas}“ se stavem „Nevíme“ při výpadku.
