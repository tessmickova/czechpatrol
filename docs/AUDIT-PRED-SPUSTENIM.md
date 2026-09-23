# CZECHPATROL — AUDIT PŘED VEŘEJNÝM SPUŠTĚNÍM

**Stav k 23. 9. 2026, commit `6aad0a8`.** Audit jen četl, nic neopravoval.
Podrobné nálezy (URL / komponenta / současný stav / problém / riziko / priorita /
oprava / akceptační test) jsou v přílohách v `docs/audit-2026-09-23/`:

| Příloha | Oblast |
|---|---|
| `audit-1-stranky.md` | registr rout, texty, stavy funkcí, test pěti vteřin |
| `audit-2-bezpecnost.md` | tajemství v historii, osobní údaje, API, sběr a otrávení dat, supply chain |
| `audit-3-data.md` | taxonomie, klasifikace zdrojů, atribuce, zastaralá data, celková úroveň, LLM, opravy |
| `audit-4-pravo-ucty.md` | Soukromí, Podmínky, provozovatel, účty, Premium, IZS, odběry, registr funkcí |
| `audit-5-mobil-a11y.md` | 320–1280 px, WCAG 2.2, výkon, SEO a sdílení, offline, stavy selhání |

Co šlo ověřit jen z repozitáře, je tak označené: živý web, nastavení Cloudflare,
tajemství workeru a proměnná `API_URL` z auditního prostředí vidět nejsou.

---

## A. Shrnutí

CzechPatrol má silný základ: zdroje u záznamů, oddělené „ověřujeme“, opravy,
metodiku, žádné cookies ani analytiku, žádná tajemství v historii gitu,
připravené SQL dotazy, kontrolu rolí na serveru.

Spuštění ale brání tři skupiny problémů:

1. **Web tvrdí klid, který nemá doložený.** Zelené „Bez omezení“, „Teď nic
   urgentního“, „bez nálezu“ a ranní Telegram „Mobilizace ne…“ stojí na
   orientační kontrole (`overeno: null` u všech úředních položek) a zůstávají
   zelené, i když sběr stojí. Právě teď stojí od 23. 9. 02:02 UTC.
2. **Automat mluví do veřejného kanálu bez člověka.** Jediný titulek s klíčovým
   slovem („mobilizace“) odejde do Telegramu jako „⚠️ NEOVĚŘENO“, a to i u
   popření („Kreml popřel mobilizaci“). Návrhy se závažností O/R odejdou
   s označením „z úředního zdroje“ podle toho, co o sobě napsal zdroj.
   To odporuje pravidlům 0 a 4 projektu a nese riziko podle § 357 TZ.
3. **Právní a funkční texty neodpovídají systému.** Chybí provozovatel
   a správce údajů, přestože API osobní údaje přijímá. Soukromí popisuje
   starší systém. Premium, komunita, IZS a „e-shop CzechPatrol“ jsou nabízené,
   ale nefungují nebo nemají právní základ.

K tomu část chyb vznikla i v dnešní práci (přiznáno níže u P0-10 až P0-12).

## B. Verdikt

# NEPŘIPRAVENO (NOT READY)

Po opravě P0 (odhadem 2–3 dny práce + rozhodnutí provozovatelky o provozovateli,
Premium a GitHub Actions) je realistické **READY WITH FIXES**.

---

## C. P0 — blokují spuštění

Pořadí = pořadí oprav.

### Provoz
**P0-1 Sběr stojí.** GitHub Actions odmítá úlohy (vyčerpaný příděl minut
soukromého repozitáře). Web i Telegram ukazují stav z 23. 9. 02:02 UTC.
OPRAVA: rozpočet Actions v Billing nebo veřejný repozitář; trvale nasazování přes
Cloudflare Pages (`docs/PROVOZ.md` 2b). Hlídač minut je připravený (`api/src/minuty.ts`),
nasadí se s prvním během. TEST: web ukazuje kontrolu mladší než 2 h.

### Bezpečnost a integrita kanálu
**P0-2 Neověřené poplachy do Telegramu.** `nastroje/rozhlas.mjs:698,718`,
`sber/udalosti.ts` (naléhavost stupně 1). OPRAVA: stupeň 1 posílat jen
správci do soukromého chatu, nikdy do veřejného kanálu; texty na webu, které to
slibují (`src/config/web.ts:60`, `odber.tsx:65`, `vyzva-telegram.tsx`), upravit.
TEST: titulek „Kreml popřel mobilizaci“ ve frontě → veřejný kanál nic nedostane.
**LEGAL REVIEW REQUIRED** (§ 357 TZ).

**P0-3 Návrhy O/R do kanálu bez člověka.** `rozhlas.mjs:684–705`
(`vyberVazneNavrhy`) bere úřednost z `primarni` místo z adresy a píše „na web až
po lidské kontrole“, což neplatí. OPRAVA: vypnout; nebo jen se `jeUredniZdroj`
+ označení „neověřeno“. TEST: návrh se zdrojem globalsecurity.org neodejde.

**P0-4 Patrol přepisuje `data/` a sám zveřejňuje.** `.github/workflows/od-patrola.yml:64,92`
přebírá celý adresář `data/` z cizí větve (i `lidskyOvereno: true`, `vystraha.json`)
a starší kopie přepíše novější data v `main`. OPRAVA: přebírat jen `navrhy.json`
a `pro-patrola.json` sloučením po id; ochrana větve `main`. TEST: push Patrola
se změnou `incidenty.json` → workflow ji ignoruje.

### Integrita dat a nepravdivý klid
**P0-5 Zelený klid bez dokladu.** Budík „Běžný život · teď: Bez omezení“,
„Mobilizace ne · vycestování bez omezení · hranice běžně“, NATO „Bez aktivace“,
pás „Teď nic urgentního“ (`data.ts urovenObcanu`, `hero-dashboard.tsx:211–216`,
`dashboard.tsx:432–438`, `urgentni.tsx:156`, `banner-stari-klient.tsx:56`
„bez nálezu“). NOVÝ TEXT: „V kontrolovaných zdrojích nebylo nalezeno vyhlášení
mimořádných opatření. Úplný úřední seznam zatím nečteme.“ + čas kontroly.
Při stojícím sběru: „Data se nepodařilo aktualizovat od …“. TEST: při
`overeno: null` ani jedno zelené „bez omezení“; při datech starších 3 h žlutý stav.

**P0-6 Ranní Telegram „Mobilizace ne, vycestování bez omezení…“ natvrdo**
(`rozhlas.mjs:915`) i když sběr stojí. OPRAVA: stejná formulace jako P0-5,
a když je poslední sběr starší 3 h, poslat „data nejsou aktuální“.

**P0-7 Skrytá poplašná chyba škály.** Jakékoli opatření (i povodňový nouzový stav)
zvedne budík „Běžný život“ na R1 „Vážná — probíhá ozbrojený incident s účastí
NATO nebo ČR“ (`data.ts:397–399`, `skala.ts`). OPRAVA: budík běžného života
nesmí používat škálu bezpečnostní závažnosti; vlastní slova (běžný režim /
omezení / mimořádná opatření). TEST: simulace nouzového stavu → žádná zmínka
o ozbrojeném incidentu.

**P0-8 Dvě různé úrovně Evropy na první obrazovce.** Věta „hybridní aktivita
vysoká“ z ručního `hybridni-tlak.json` (5. 9.) vs. budík „Zvýšená“ z automatu
(`page.tsx:41`, `veta.ts:79–80`). OPRAVA: jeden zdroj (automat), ruční soubor
odstavit nebo označit datem.

**P0-9 Chybné záznamy.** `us-590b687216`: `zeme: "Rusko"` s kódem US (celé USA se
na webu jmenují „Rusko“), jistota „potvrzeno“ bez člověka, O3 „hranice přímého
střetu“. `opravy.json` tvrdí stažení `ro-8097dca796` a `us-590b687216`, které se
pak znovu zveřejnily. `svalbard-…` a `moldavsko-dron-…` uvádějí tvrzení
anonymních zdrojů jako fakt. OPRAVA: seznam ID v `audit-3-data.md`, závěr.

**P0-10 (dnešní chyba) Karta „Právě ověřujeme“ o mobilizaci** nesplňuje vstupní
podmínku dopadu (sama píše „nic měnit nemusíte“) a věta o Kartapolovovi nemá
odkaz. OPRAVA: uzavřít jako „nikdo nepotvrdil“ nebo převést do Analýz.

**P0-11 (dnešní chyba) Záznamy „neověřeno úředně“ vstupují do počtů případů**
(19 z 50 za 90 dní). Pravidlo 0/4 říká, že neověřené do počtů nevstupují.
OPRAVA: vyloučit z počtů, grafů a porovnání; ponechat v seznamu s označením.

**P0-12 (dnešní chyba) `dk-540223fa5a`** je „neověřeno úředně“, ale má
`atribuce: "oficialni"`. OPRAVA: `atribuce: "nepotvrzena"` a kontrola dat,
která tuto kombinaci zakáže.

### Právo a soukromí
**P0-13 Provozovatel a správce osobních údajů nejsou uvedeni** (`PROVOZOVATEL`
prázdný), API přitom přijímá e-mail, telefon a tipy s kontaktem.
OPRAVA: doplnit (provozovatelka slíbila do 7 dní) a do té doby vypnout na
serveru všechny endpointy, které přijímají osobní údaje (tipy s kontaktem,
`/zajem`, žebříček s kontaktem, WhatsApp). **LEGAL REVIEW REQUIRED.**

**P0-14 `/soukromi/` nepopisuje systém.** Chybí tipy, Premium, platby, e-maily,
žebříček, příjemci (Comgate, e-mailová služba); nepravdivé věty „Bez jména,
e-mailu a telefonu“, „Hodnocení dělá člověk“, „smazání bez zálohy“.
**LEGAL REVIEW REQUIRED.**

**P0-15 Placená vrstva se zapne jedním tajemstvím** bez obchodních podmínek,
poučení o odstoupení (14 dní, § 1837 písm. l OZ), DPH a identifikace
prodávajícího; kredit „v CzechPatrol e-shopu“ do e-shopu, který neexistuje
(jde o Čenich). OPRAVA: kód nepustí platbu bez vyplněného provozovatele a
příznaku podmínek; texty Premium skrýt do spuštění. **LEGAL REVIEW REQUIRED.**

**P0-16 Nabídka neexistujícího.** Karta „Připojit se ke komunitě“ slibuje
WhatsApp skupinu, slevy, VIP přípravu, „omezený počet míst“ (`tri-temata.tsx:63`).
OPRAVA: skrýt.

### Mobil a první obrazovka
**P0-17 Na 390 px první obrazovka neodpovídá „děje se něco, mám něco dělat?“**
Nahoře je karta o neověřené ruské mobilizaci; „Teď nic urgentního“ je 3–5
obrazovek níž (y = 3315 px). OPRAVA: viz U. Doporučená úvodní strana.

**P0-18 Podstránky bez upozornění na zastaralá data.** Pruh „Sběr neběží“ je jen
na úvodní straně; `/zeme/`, `/udalosti/`, detail záznamu nic. OPRAVA: pruh do
layoutu. TEST: posunutý čas o 3 dny → pruh na každé stránce.

---

## D. P1 — před propagací

| # | Nález | Kde (příloha) |
|---|---|---|
| 1 | „Hodnocení dělá člověk“ na O projektu, Soukromí, Podmínkách — od 23. 9. počítá automat | audit-1 K, audit-4 F-08 |
| 2 | „nekomerční“ vs. Premium; „Plus“ vs. Premium | audit-1 L, audit-4 F-19 |
| 3 | Motto „méně atraktivním cílem“ (`odolnost/page.tsx:21`) → „Lepší připravenost pomáhá domácnosti zvládnout období, kdy běžné služby dočasně nefungují.“ | audit-1 M, audit-4 F-11 |
| 4 | Žebříček: soutěž, podvržitelné skóre, souhrn slabin domácnosti na server → odstranit srovnání, nechat „vaše pokrytí / další krok“ | audit-4 F-10 |
| 5 | IZS nabízené jako funkční; správce může sám rozeslat „zprávu partnera IZS“ → skrýt, dvě osoby na schválení | audit-4 F-06, F-07 |
| 6 | Voda na 7 dní a výdrž léků za Premium → zdarma | audit-4 F-12 |
| 7 | Testovací platba vytvoří skutečný kredit | audit-4 F-13 |
| 8 | Smazání účtu s darovaným Premium spadne (500, bez chybové hlášky) | audit-4 F-05 |
| 9 | „Známe o vás: nic osobního“ i s uloženým e-mailem/telefonem | audit-4 F-09 |
| 10 | Formulář tipů bez cíle (chyba až po vyplnění) | audit-4 F-15 |
| 11 | Taxonomie: stejná slova a barvy pro závažnost, jistotu, stav a čerstvost | audit-3 1.1–1.4 |
| 12 | Automatické zveřejnění nekontroluje nezávislost redakcí ani relevanci/datum úředního dokumentu | audit-3 3, audit-2 B-11, B-12 |
| 13 | 42 záznamů s úřední atribucí bez úředního zdroje | audit-3 4.2 |
| 14 | Celková úroveň: zahrnuje Saúdskou Arábii a nesouvisející terorismus; při výpadku sama klesá; chybí „proč“ se seznamem případů | audit-3 6.1 |
| 15 | Graf „Evropa“ a osa „Přímé vojenské riziko“ = ruční odhad z 5. 9. → přejmenovat „Indikátory přípravy přímého vojenského střetu — nejde o předpověď“ | audit-3 6.2–6.4, audit-1 |
| 16 | `svet.json`, `tydny.json` stojí 17 dní | audit-1 O, audit-3 6.3 |
| 17 | Opravy neuchovávají původní znění | audit-3 10 |
| 18 | Celá databáze incidentů (~380 kB) v JS každé stránky, 1–1,2 MB JS | audit-5 N4 |
| 19 | Sdílení záznamu: bez data, bez og:image/url/canonical, popis začíná hodnocením | audit-5 N8 |
| 20 | Fokus schovaný pod lepivou hlavičkou (WCAG 2.4.11) | audit-5 N7 |
| 21 | Služby naživo: starý snímek bez data jako „za 24 h“ | audit-5 N5 |
| 22 | Vlajky: USA jako „Rusko“, NATO s vlajkou EU | audit-5 N6, audit-3 7 |
| 23 | Cizojazyčné větve přeložené jen z malé části, `lang="cs"` | audit-1 Q, audit-5 N9 |
| 24 | Bezpečnostní hlavičky (CSP, HSTS, frame-ancestors), token v `localStorage` | audit-2 B-06 |
| 25 | Nechráněná `main`, externí zapisovatel; akce připnuté tagem; široký Cloudflare token | audit-2 B-05, B-13 |
| 26 | Relace bez absolutního stropu; CORS `localhost` v produkci; `/zajem` bez potvrzení | audit-2 B-07, B-09, B-15 |

## E. P2 — brzy po spuštění

Registr zdrojů (organizace, typ autority, země, úroveň důvěry, datum revize);
zúžení allowlistu na konkrétní části portálů; tři dny letišť Lublin/Rzeszów jako
jeden případ s aktualizacemi (nebo ponechat po jednom podle rozhodnutí
provozovatelky a sloučit jen v počtech); duplikát pásu zemí dosažitelný
klávesnicí; běžící pás bez pauzy; hlavička na 320 px; service worker (chybové
odpovědi v cache, start URL offline, text „platí poslední ověřený stav“);
kontrast bílé na akcentu 3,84:1; výpadek API = „Failed to fetch“; úložiště
v prohlížeči přesně popsat v Soukromí; mrtvý nebezpečný kód `klidoveBody()`,
`components/opatreni.tsx`; `/sprava/odmitnute/` 1,6 MB veřejně; `/muj-prehled/`
v sitemapě.

## P3 — později
Emoji vlajky → SVG; dotykové cíle 44 px; obnovovací kód; nadpisy a landmarky;
Crisis Mode (architektura to dovolí — viz U).

---

## F. Audit po stránkách
Registr všech rout včetně 15 jazykových větví a Správy: `audit-1-stranky.md`,
oddíl 1 a 2. Mobilní snímky 320/375/390/430/768/1280 px: `audit-5`, oddíl 1.

## G. Problémy textů
Úplný výpis (soubor:řádek, současný text, problém, náhrada): `audit-1`, oddíl 3.
Hlavní vzory:

| Současný text | Problém | Náhrada |
|---|---|---|
| „bez nálezu“ | tvrdí zápor, který nemáme | „v kontrolovaných zdrojích nic nového“ + čas |
| „Bez omezení“ / „Teď nic urgentního“ | klid bez dokladu | „Nebylo nalezeno vyhlášení mimořádných opatření“ + čas + odkaz na zdroje |
| „Přímé vojenské riziko: Nízké“ | čte se jako předpověď | „Indikátory přípravy přímého vojenského střetu — nejde o předpověď pravděpodobnosti konfliktu“ |
| „Hodnocení dělá člověk“ | nepravda od 23. 9. | „Celkové hodnocení počítá pravidlo z ověřených záznamů; metodika“ |
| „méně atraktivním cílem“ | militaristický rámec | viz D-3 |
| „⚠️ NEOVĚŘENO — signál ke kontrole“ (Telegram) | poplach z titulku | nepoužívat ve veřejném kanálu |

## H. Datová kvalita
`audit-3`, oddíly 4–8 a seznam ID na konci. Duplicity: přímé nenalezeny.

## I. Klasifikace zdrojů
Porovnávání domén je bezpečné proti podvrženým adresám (`x-gov.pl`,
`gov.pl.evil.com` neprojdou). Slabiny: celé portály včetně nesouvisejících
podstránek (`berlin.de/restaurants`, `news.un.org`), jakákoli doména `.int`,
„nezávislé redakce“ podle hostitele (dvě subdomény projdou), 16 zdrojů
pojmenovaných podle vyhledávacího dotazu, jediný falešně primární `a12`
(mynewsdesk.com). Příznak „úřední“ nikde nevzniká z textu ani z modelu. Detaily
v `audit-3` 2 a `audit-2` B-11, B-12.

## J. Soukromí
E-mail provozovatelky ve veřejném obsahu není (jen autor 3 commitů). Cookies ani
analytika nejsou. Nálezy: P0-13, P0-14, D-4, D-9, audit-2 B-08–B-10.

## K. Bezpečnost
Tajemství v historii 950 commitů: **nic, nic k rotaci.** Bez IDOR, SQL připravené,
role na serveru, Comgate a Telegram webhooky ověřené, `npm audit` 0.
Kritické: P0-2, P0-3. Vysoké: P0-4, D-25.

## L. Možné vystavení citlivých informací
Interní adresa autora Patrola v historii commitů (`patrol@debra-server`);
`/sprava/odmitnute/` veřejně (1,6 MB interní fronty); `data/fronta/*` a
`fronta.json`/`rutina.json` v buildu (provozní stav, ne osobní údaje).
Kritickou infrastrukturu web nezveřejňuje podrobněji než zdroje; bezpečnost
obsahu hlídá `kontrola-dat` (souřadnice, pohyb jednotek).

## M. Právní konzistence
`audit-4` oddíl 1 a 8 (seznam míst pro LEGAL REVIEW REQUIRED).

## N. Rozbité toky
Smazání účtu s Premium (D-8); formulář tipů bez cíle (D-10); výpadek API =
odhlášení a „Failed to fetch“ (P2); start URL aplikace offline (P2).

## O. Nedokončené funkce — registr

| Funkce | Stav v kódu | Co tvrdí web | Doporučení |
|---|---|---|---|
| Účty (passkey) | LIVE, pokud je `API_URL` | různé věty | ponechat, sjednotit texty |
| Telegram kanál | LIVE (když běží Actions) | LIVE | ponechat, bez neověřených poplachů |
| RSS | LIVE | LIVE | ponechat |
| E-mailová upozornění | PLANNED (`KANALY.email` prázdné) | místy „připravujeme“ | skrýt |
| WhatsApp / Signal / Bluesky | PLANNED | „až bude schválený“ | skrýt z hlavních míst |
| Premium / platby | DEVELOPMENT (zapne ho tajemství) | nabízeno | skrýt do právních textů |
| E-shop | neexistuje (Čenich je jiný projekt) | „CzechPatrol e-shop“ | odstranit |
| Komunita / WhatsApp skupina | neexistuje | nabízeno | skrýt |
| Partner IZS | PRIVATE_BETA bez partnera | popsáno jako funkční | skrýt |
| Žebříček | LIVE | soutěž | předělat na osobní pokrytí |
| Ověřujeme | LIVE | LIVE | ponechat |

Úplný registr s odkazy: `audit-1` oddíl 4, `audit-4` oddíl 7.

## P. Mobil
Bez vodorovného přetečení na 12 stránkách a 6 šířkách. Hlavní problém P0-17.
Hlavička na 320 px P2.

## Q. Přístupnost
Fokus viditelný (5,07:1), omezení pohybu respektováno, hlavní barvy textu AA,
axe bez chyb kontrastu a popisků formulářů. Nálezy D-20 a P2 v `audit-5` oddíl 2.

## R. Výkon
LCP úvodní strany 2,26 s (pomalé 4G, bez komprese), TBT 449 ms; hlavní dluh D-18.

## S. SEO a sdílení
robots a sitemap neodhalují Správu. Nálezy D-19, D-23, P2 `/muj-prehled/`.

## T. Free / Premium
Nic životně důležitého nesmí být za platbou (D-6). Premium do spuštění skrýt
(P0-15). Architektura pro budoucí Premium (osobní analýza závislostí, plán A/B/C,
offline balíček) v `docs/PREMIUM-NAVRH.md` je v pořádku jako plán, ne jako nabídka.

---

## U. Doporučená úvodní strana

Bez redesignu, jen pořadí a texty v existujících komponentách:

1. **Česko právě teď** (nahoře, na 390 px celé v prvním viewportu):
   jedna věta + stav + čas kontroly.
   - normálně: „V Česku nejsou podle kontrolovaných úředních zdrojů vyhlášena
     mimořádná opatření. Zkontrolováno dnes 14:00.“
   - zastaralá data: „Data se nepodařilo aktualizovat od 23. 9. 04:02. Úřední
     informace: krizové vysílání ČRo, 112.“
2. **Musím něco dělat?** „Ne. Nic nového k udělání.“ / konkrétní pokyn úřadu s odkazem.
3. **Co se změnilo** — nejvýš 3 položky.
4. **Evropa — širší kontext** — „V Evropě evidujeme zvýšenou intenzitu sledovaných
   bezpečnostních událostí. Nejde o předpověď.“ + rozklik „Proč?“ se seznamem
   případů, které úroveň tvoří, a chybějícími daty.
5. **Právě ověřujeme** — až sem, ne nad stav.
6. Úřední stav po oblastech (dnešní souhrny) a rozklikávací služby a palivo.
7. Připravenost.
8. Detailní analýza.

Crisis Mode: stejné pořadí dovoluje při vyhlášeném stavu (jen z úředního zdroje,
nikdy ze sítí) skrýt body 4–8 a nahoře ukázat co, kde, co říká úřad, co dělat, čas.

## V. Přesný rozsah spuštění
Úvodní strana, Události, detail záznamu, Země, Manipulace, Metodika, Zdroje,
Opravy, Připravenost/Odolnost (bez žebříčku), O projektu, Soukromí, Podmínky,
Telegram kanál (jen ověřené), RSS. Účty jen pokud jsou Soukromí a provozovatel
v pořádku.

## W. Skrýt do později
Premium a platby, e-shop, komunita/WhatsApp skupina, partner IZS, žebříček ve
formě srovnání, e-mailová upozornění, WhatsApp/Signal/Bluesky, cizojazyčné
větve (nebo jasně „jen rozhraní“), Správa mimo index.

## X. Testovací plán
Automatické testy, které chybí a mají vzniknout s opravami:
- klid nesmí vzniknout z `overeno: null` ani ze zastaralých dat (P0-5, P0-18),
- veřejný kanál nikdy nedostane nic s `lidskyOvereno: false` bez úředního zdroje podle adresy (P0-2, P0-3),
- „neověřeno úředně“ nevstupuje do počtů ani do celkové úrovně (P0-11),
- `neovereno` ⇒ `atribuce ≠ oficialni` (P0-12),
- kód země ↔ název ↔ vlajka z jednoho zdroje (D-22),
- opatření v ČR ⇒ budík běžného života nikdy nepoužije text ozbrojeného incidentu (P0-7),
- převzetí od Patrola nezmění `incidenty.json` (P0-4),
- starý úřední dokument nepotvrdí novou událost (D-12),
- kontrola obsahu: TODO, FIXME, Lorem, undefined, NaN, „připravujeme“, „bez nálezu“, „bez rizika“ v buildu = report.
Už existující: klasifikace a allowlist domén, robots.txt, paměť rozhodnutých,
síto skutečných událostí, automatická úroveň, doposlání, uzavírání Ověřujeme,
hlídač minut, autorizace API (api/testy).

## Y. Red team (shrnutí)
Chce-li útočník, aby web ukázal „RUSKO ÚTOČÍ“: dnes stačí jeden titulek s
„vyhlásil mobilizaci“ v Google News → neověřený poplach v kanálu (P0-2). Druhá
cesta: prompt injection do Patrola nebo jeho tokenu → zápis do `data/` (P0-4).
Třetí: dva články na subdoménách jednoho webu + stránka jakékoli domény `.int` →
automatické zveřejnění (D-12). Obrana do hloubky: veřejný kanál jen z ověřených
záznamů; převzetí Patrola jen návrhů; nezávislost redakcí podle registrovaného
vydavatele; úřední zdroj jen z registru + kontrola data a obsahu; celková úroveň
ignoruje záznamy bez člověka nebo úředního zdroje. Text článku se modelu předává
jako data, výstup modelu nikdy neurčuje úřednost, zveřejnění ani atribuci.

## Z. Kontrolní seznam před spuštěním

- [ ] sběr běží, hlídač minut nasazen, upozornění chodí do soukromého chatu
- [ ] žádný P0
- [x] žádné tajemství v historii
- [x] osobní údaje provozovatelky nejsou veřejně
- [ ] Soukromí a Podmínky odpovídají systému (LEGAL REVIEW)
- [ ] provozovatel uveden
- [ ] hlavní CTA fungují, nedokončené funkce skryté
- [ ] klasifikace zdrojů zpřísněná (registr, nezávislost, relevance)
- [ ] stará data se neukazují jako aktuální, „nevíme“ není „klid“
- [ ] občan pochopí úvodní stranu za 5 s (test na 390 px)
- [ ] expert dohledá metodiku a „proč“ u celkové úrovně
- [ ] opravy uchovávají původní znění
- [ ] mobil, přístupnost bez kritických chyb
- [ ] výpadek API a sběru selhává bezpečně
- [ ] ochrana větve `main`, zúžený token Cloudflare
- [ ] ověřená záloha D1 a postup obnovy
- [ ] postup vrácení nasazení (Cloudflare Pages má historii verzí)

---

## Plán oprav (LAUNCH PATCH PLAN)

Malé, vratné, testovatelné kroky v tomto pořadí; po jejich dokončení
**LAUNCH FEATURE FREEZE** (jen chyby, bezpečnost, přesnost obsahu, výkon,
přístupnost):

1. **P0 bezpečnost:** P0-2, P0-3 (kanál jen ověřené), P0-4 (Patrol jen návrhy),
   ochrana `main`.
2. **P0 integrita dat:** P0-5, P0-6, P0-7, P0-8, P0-9, P0-10, P0-11, P0-12, P0-18.
3. **P0 právo a soukromí:** P0-13 (vypnout sběr osobních údajů do doplnění
   provozovatele), P0-14, P0-15, P0-16 — texty nechat projít právníkem.
4. **P0 první obrazovka:** P0-17 podle U.
5. **P1 důvěra a texty**, pak **P1 občan**, pak **P1 transparentnost** („proč“,
   opravy s původním zněním, taxonomie).
6. Přístupnost, výkon (D-18), dokončení.

Rozhodnutí, která patří provozovatelce: rozpočet Actions / veřejný repozitář;
údaje provozovatele; zda a kdy Premium; zda ponechat účty při spuštění.
