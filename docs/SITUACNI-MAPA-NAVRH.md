# CzechPatrol — situační mapa ČR: návrh před implementací

Stav k 22. 9. 2026. Výstup fáze 0 podle zadání „profesionální český veřejný
situační dashboard“. **Nic z toho není naprogramováno.** Dokument je
podklad k rozhodnutí, co se bude stavět, v jakém pořadí a nad jakými daty.

Jak číst značky u zdrojů a licencí:

- **GREEN** — jasná otevřená licence nebo výslovné oprávnění k zamýšlenému použití.
- **YELLOW** — data jsou veřejně zobrazitelná, ale oprávnění k automatickému
  získávání, ukládání historie nebo redistribuci není jasné.
- **RED** — přihlášení, zákaz automatického získávání, osobní údaje, smluvní
  API nebo jiný problém.
- **NEOVĚŘENO — vyžaduje kontakt s poskytovatelem.** Tvrzení jsem odsud
  nemohl ověřit. Prostředí, ve kterém tento dokument vzniká, blokuje
  přístup na většinu webů (viz `docs/PROVOZ.md`). Kde uvádím licenci, uvádím
  i adresu, na které má být zveřejněná — **před implementací ji musí někdo
  otevřít a přečíst.** Nejde o právní stanovisko; kde to vyžaduje právníka,
  stojí **LEGAL REVIEW REQUIRED**.

Pravidlo, které platí pro celý dokument i pro budoucí kód (zadání, bod 0):
incident není útok, porucha není sabotáž, anomálie není nepřátelská
aktivita, korelace není kauzalita, neověřené hlášení není potvrzená
událost. Atribuci zobrazí web jen tehdy, když ji provedl kompetentní orgán,
a vždy s uvedením, kdo ji provedl.

---

## A. Produktová architektura

### Co CzechPatrol je a co není

CzechPatrol je **nezávislý civilní situační přehled**: agreguje veřejně
dostupné a legálně použitelné informace o dostupnosti základních služeb
a o bezpečnostních událostech v Česku a okolí, s dohledatelným zdrojem
u každého údaje. Není úředním systémem, není varovným systémem, nedává
vlastní krizové pokyny.

### Vrstvy produktu (shora dolů)

| Vrstva | Co dělá | Kde běží dnes | Kde poběží |
|---|---|---|---|
| Prezentace | statický web, mapa, karty, náhledy, RSS | Next.js 16 `output: export`, Cloudflare Pages | beze změny + MapLibre GL JS jako klientská komponenta |
| Veřejné API | normalizovaná, agregovaná data pro mapu a karty (JSON, GeoJSON, PMTiles) | částečně: `stav.json`, `fronta.json` generované při buildu | Cloudflare Worker `api/` (už existuje) + statické soubory na Pages/R2 s ETag |
| Analytika | baseline, anomálie, kaskády, indexy | — | plánovaný krok v ingestu (Actions) nebo Worker cron; výsledky jako soubory |
| Normalizace a provenance | sjednocení jednotek, geokód na okres/ORP, verzování | `sber/` (TypeScript, GitHub Actions každou hodinu) | beze změny principu; trvalé úložiště normalizovaných a historických dat je Cloudflare D1 (už existuje pro účty), syrová stažení v R2 |
| Ingest | čtení zdrojů podle registru, rate limit, zálohy | `sber/` | beze změny; každý zdroj má záznam v registru (část E) a stav GREEN dřív, než se čte |

### Odchylky od preferované architektury v zadání a proč

- **Databáze: Cloudflare D1, ne PostgreSQL + PostGIS** (rozhodnutí
  provozovatele 22. 9. 2026: žádný Supabase ani jiný cizí účet). D1 už
  běží pro účty a Premium, migrace jdou z repozitáře přes GitHub Actions,
  žádný další přístup není potřeba. Co tím projekt ztrácí a jak to řeší:
  - **prostorové dotazy** (bod v polygonu, sousedství okresů) D1 neumí →
    dělají se **při ingestu** v Node (Actions/Worker) nad hranicemi
    z RÚIAN uloženými jako GeoJSON v R2, výsledek je jen kód území;
    sousedství okresů je předpočítaná tabulka `uzemi_soused`;
  - **objem**: D1 má strop na velikost databáze (**NEOVĚŘENO** aktuální
    limit na zvoleném tarifu) → syrová stažení jdou do R2 (v D1 jen
    otisk a odkaz), historie se drží agregovaná, podrobné položky
    24 měsíců;
  - **geometrie** nikdy v D1: hranice žijí jako PMTiles/GeoJSON na R2,
    D1 zná jen kódy, názvy, nadřazené jednotky a počty obyvatel.
  Kdyby prostorová analytika někdy přerostla tenhle model, je přechod na
  PostGIS možný bez změny veřejného API (čte jen agregáty).
- **Redis: ne, nahrazeno Cloudflare KV a Cache API.** Plní tutéž roli
  (cache agregátů, rate limiting) bez vlastního serveru. Kdyby se projekt
  přesunul na vlastní VPS, Redis se doplní bez změny rozhraní.
- **Fronta: GitHub Actions + Cloudflare Queues.** Hodinový sběr už běží na
  Actions; pro častější zdroje (stavové stránky každých 5 minut) se použije
  Worker cron. Zadání připouští „scheduled workers / queue“.
- **Mapový engine: MapLibre GL JS**, jak zadání žádá. Podkladové dlaždice
  self-hosted (PMTiles na R2) — žádný klíč třetí strany v prohlížeči.

### Tok dat (jedna věta na krok)

1. Registr zdrojů říká, co se smí číst a jak často.
2. Ingest stáhne syrový záznam a uloží ho beze změny (`raw_value`, čas, verze parseru).
3. Normalizace převede na datový model incidentu / stavu služby / meteo jevu, přiřadí geografickou jednotku (nikdy přesnější než obec, veřejně nikdy přesnější než ORP).
4. Analytika spočítá baseline, anomálie, kaskády a indexy — jen z normalizovaných dat, s odkazem na vstupy.
5. Publikace vytvoří soubory pro web (agregáty po okresech a ORP, GeoJSON, stav providerů) s časem výpočtu.
6. Web zobrazí, u každého údaje s odkazem na zdroj a s čerstvostí.

---

## B. Informační architektura

### Navigace (změna proti dnešku)

| Dnes | Návrh |
|---|---|
| Přehled | **Přehled** — nahoře „Živá mapa ČR“ místo budíků; budíky se přesunou pod mapu jako Národní stav (část 19) |
| Události | Události (beze změny; přibude filtr podle okresu/ORP) |
| Manipulace | Manipulace (beze změny) |
| Země | Země (beze změny) |
| Analýzy | Analýzy + nová stránka **Historie výpadků** (fáze 3) |
| Připravenost | Připravenost (beze změny) |
| — | **Metodika mapy** (`/metodika/mapa/`) a **Zdroje** (`/zdroje/` rozšířit o registr providerů) |

### Živá mapa ČR — vrstvy (primární přepínač)

PŘEHLED · ELEKTŘINA · KOMUNIKACE · DOPRAVA · KYBER · POČASÍ · BEZPEČNOST

- Vždy je aktivní **jedna** vrstva plus podklad. PŘEHLED ukazuje jen
  souhrn za okres: jednu barvu podle nejvyššího stavu ze všech vrstev
  a číslo aktivních položek. Nikdy všechny body naráz.
- Každá vrstva má vlastní legendu, vlastní zdroje a vlastní čerstvost.
- Vrstva bez povoleného zdroje se **nezobrazí jako prázdná mapa**, ale
  jako karta „Tuto vrstvu zatím nemáme odkud číst“ se seznamem, s kým
  se jedná (část H).

### Jednotky zobrazení

| Přiblížení | Jednotka | Co se ukáže |
|---|---|---|
| celá ČR | kraj (14) | souhrnný stav, počet aktivních položek |
| kraj | okres (77) | stav, počty, trend 24 h |
| okres | ORP (206) | jednotlivé položky jako karty; body jen u věcí, které jsou z podstaty veřejné a bodové (uzavřené letiště, uzavřený přechod) |
| — | obec (6 254) | jen v textu karty („dotčené obce: 3“), nikdy jako samostatný bod poruchy |

### Karta položky (stejná pro všechny vrstvy)

Co se stalo · Kde (okres/ORP) · Od kdy · Koho se to týká · Je služba
dostupná · Je známá příčina · Co říká oficiální zdroj · Co má občan dělat
(jen podle pokynu kompetentního orgánu, s odkazem) · Zdroj · Aktualizováno
před … · Stav ověření · Historie oprav.

---

## C. Textový wireframe — desktop (≥ 1280 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Nezávislý projekt … ne úřední zdroj. V nouzi 112.       Zkontrolováno 10:01  │
├──────────────────────────────────────────────────────────────────────────────┤
│ [●] CzechPatrol BETA     PŘEHLED  UDÁLOSTI  MANIPULACE  ZEMĚ  ANALÝZY  PŘIPR. │
├──────────────────────────────────────────────────────────────────────────────┤
│ ŽIVÁ MAPA ČR                                     Je právě teď něco neobvyklé? │
│ [PŘEHLED][ELEKTŘINA][KOMUNIKACE][DOPRAVA][KYBER][POČASÍ][BEZPEČNOST]         │
├───────────────────────────────────────────────┬──────────────────────────────┤
│                                               │ TEĎ V ČESKU                  │
│   ┌ plovoucí filtry ┐                          │ ○ Bez neobvyklého vzorce     │
│   │ ○ jen aktivní   │   MAPA (MapLibre)        │   za posledních 6 h          │
│   │ ○ >6 h          │   kraje → okresy → ORP   │                              │
│   │ ○ neplánované   │   barva = stav okresu    │ AKTIVNÍ POLOŽKY (okres)      │
│   └─────────────────┘   + / − / ⌂ / ⌨          │ • Frýdek-Místek · elektřina  │
│                                               │   neplánovaná porucha        │
│        [legenda: klid · omezení · výpadek      │   od 14:37 · 2 h 05 min      │
│         · bez údaje (šrafy)]                   │   Zdroj: ČEZ Distribuce ↗    │
│                                               │   Aktualizováno před 3 min   │
│                                               │ • Praha 6 · doprava …        │
│                                               │                              │
│                                               │ PROVIDEŘI                    │
│                                               │ ČEZ  LIVE · EG.D  ZPOŽDĚNÍ   │
│                                               │ 18 min · PRE  LIVE · ČHMÚ …  │
├───────────────────────────────────────────────┴──────────────────────────────┤
│ ČASOVÁ OSA  ◄ 24 h ─────────────●────────────────────────────── teď ►        │
│ [24 h] [7 d] [30 d]   sloupce = nové položky za hodinu, šrafy = bez dat      │
├──────────────────────────────────────────────────────────────────────────────┤
│ NÁRODNÍ STAV (transparentní indexy)                                          │
│ INFRASTRUKTURA 12/100 KLID   KYBER 21/100 KLID   HYBRIDNÍ 38/100 ZVÝŠENÝ   │
│ VOJENSKÝ/VNĚJŠÍ 30/100 …     každý: +x/24 h, +y/7 d, „co zvýšilo / snížilo /│
│ co není pozorováno“, odkaz na metodiku                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ AKTUALITY (stávající) │ CO SE ZMĚNILO (stávající) │ SLUŽBY NAŽIVO (stávající) │
└──────────────────────────────────────────────────────────────────────────────┘
```

Poznámky k desktopu:

- Mapa má 60 % šířky, pravý panel 40 %. Panel je scrollovatelný, mapa
  ne (sticky). Klik na okres = panel ukáže jen ten okres a tlačítko „zpět
  na ČR“.
- Plovoucí filtry jsou vlevo nahoře nad mapou, max. čtyři přepínače.
- Časová osa pod mapou: posun zpět přebarví mapu podle stavu v ten čas
  (jen z uložených snímků — bez dopočtu).
- Bez blikání, bez trvalé červené. Červená jen pro stav „výpadek“ a pro
  potvrzenou vážnou událost; jinak tlumené odstíny a šrafy pro „bez údaje“.

## D. Textový wireframe — mobil (≤ 640 px)

```
┌──────────────────────────────┐
│ Nezávislý projekt … 112.     │
│ [●] CzechPatrol  BETA   [≡]  │
├──────────────────────────────┤
│ ŽIVÁ MAPA ČR                 │
│ ‹ PŘEHLED ELEKTŘINA KOMUN… › │  ← vodorovně posuvné záložky
├──────────────────────────────┤
│                              │
│         MAPA                 │
│    (výška 52 % displeje)     │
│    kraje → okresy            │
│    [+][−][⌂]                 │
│                              │
├──────────────────────────────┤  ← bottom sheet, 3 polohy:
│ ═══  Bez neobvyklého vzorce  │    zavřený (1 řádek),
│      za posledních 6 h       │    poloviční (seznam),
│ • Frýdek-Místek · elektřina  │    plný (karta položky)
│   neplánovaná · od 14:37     │
│   2 h 05 min · ČEZ ↗ · 3 min │
│ • Praha 6 · doprava · …      │
│ Provideři: ČEZ LIVE · EG.D … │
├──────────────────────────────┤
│ Přehled Události Manip. Anal.│  ← stávající spodní lišta
└──────────────────────────────┘
```

Poznámky k mobilu:

- Žádný hover; vše klepnutím. Karta položky se otevře v plném bottom
  sheetu, zavře přejetím dolů nebo křížkem.
- Časová osa je v bottom sheetu jako jednoduchý výběr 24 h / 7 d / 30 d.
- Mapa se nesmí zachytávat prstu při rolování stránky: dotyk jedním
  prstem roluje stránku, mapou se hýbe dvěma prsty (MapLibre
  `cooperativeGestures`).
- Cíl výkonu: první vykreslení mapy do 2,5 s na 4G (část 22).

---

## E. Registr datových zdrojů (DATA SOURCE REGISTER)

Formát: každý zdroj má tabulku se všemi poli ze zadání. Kde není pole
vyplněné, platí **NEOVĚŘENO — vyžaduje kontakt s poskytovatelem.**
Adresy jsou místa, kde má být licence nebo podmínky zveřejněné; z tohoto
prostředí je nešlo otevřít.

### E.1 Geografický podklad

#### ČÚZK — RÚIAN (hranice krajů, okresů, ORP, obcí)

| Pole | Hodnota |
|---|---|
| Organizace | Český úřad zeměměřický a katastrální |
| URL | https://vdp.cuzk.cz/ (Veřejný dálkový přístup k RÚIAN), https://geoportal.cuzk.cz/ |
| Vlastník | ČÚZK (státní správa) |
| Typ dat | vektorové hranice správních jednotek, kódy, názvy (výměnný formát RÚIAN, GeoJSON přes VDP) |
| Veřejná | ano |
| API | ano (VDP, WFS na geoportálu) |
| Open-data feed | ano — RÚIAN je v Národním katalogu otevřených dat (https://data.gov.cz) |
| Licence | Podle **prováděcího nařízení Komise (EU) 2023/138** (datové sady vysoké hodnoty, příloha — kategorie *Geoprostorové údaje: správní jednotky*) musí být poskytována zdarma, strojově čitelně a pod CC BY 4.0 nebo rovnocennou licencí. Konkrétní text licence ČÚZK: **NEOVĚŘENO** — přečíst na geoportálu (Podmínky užití). |
| Podmínky použití | tamtéž |
| robots.txt relevantní | ne (API a soubory ke stažení) |
| Databázová práva | pořizovatel ČÚZK; otevřená licence je pokrývá |
| Autorská práva | úřední dílo (§ 3 písm. a) zákona č. 121/2000 Sb.) — **LEGAL REVIEW REQUIRED** pro přesný rozsah |
| Požadovaná atribuce | „Zdroj: ČÚZK, RÚIAN“ (přesné znění podle licence) |
| Komerční použití | podle CC BY ano |
| Redistribuce | ano (odvozené PMTiles s atribucí) |
| Historie | ano |
| Agregace | ano |
| Cache | ano |
| Rate limit | VDP: **NEOVĚŘENO**; stahujeme jednou měsíčně, ne živě |
| Osobní údaje | ne (na úrovni jednotek; adresní místa se nestahují) |
| Citlivá bezpečnostní data | ne |
| **Status** | **GREEN** (po přečtení podmínek na geoportálu) |
| Doporučený způsob | měsíční stažení VFR/GeoJSON v Actions → zjednodušení (mapshaper) → PMTiles na R2 |
| Kontakt | podatelna ČÚZK, https://cuzk.gov.cz/ |
| Partnerství | není třeba |

#### OpenStreetMap — podkladová mapa (silnice, sídla, vodstvo)

| Pole | Hodnota |
|---|---|
| Organizace | OpenStreetMap Foundation / přispěvatelé |
| URL | https://www.openstreetmap.org/copyright |
| Typ dat | podkladová mapa jako vektorové dlaždice |
| Licence | **ODbL 1.0** (jistota vysoká; primární zdroj: adresa výše) |
| Atribuce | „© přispěvatelé OpenStreetMap“ viditelně na mapě |
| Redistribuce | ano, odvozená databáze pod ODbL |
| Rate limit | **veřejné dlaždice OSMF nesmí sloužit jako podklad cizího webu s vyšším provozem** (https://operations.osmfoundation.org/policies/tiles/) → self-hosting |
| **Status** | **GREEN** při self-hostingu dlaždic |
| Doporučený způsob | hotová sestava Protomaps (https://protomaps.com/, PMTiles ke stažení, data ODbL) nahraná na Cloudflare R2; alternativa OpenFreeMap (https://openfreemap.org/) — **NEOVĚŘENO** aktuální podmínky provozu obou |

#### Natural Earth — hranice států pro pás okolních zemí

| Pole | Hodnota |
|---|---|
| URL | https://www.naturalearthdata.com/about/terms-of-use/ |
| Licence | public domain (jistota vysoká) |
| **Status** | **GREEN** |

### E.2 Počasí

#### ČHMÚ — otevřená data (měření, výstrahy)

| Pole | Hodnota |
|---|---|
| Organizace | Český hydrometeorologický ústav |
| URL | https://opendata.chmi.cz/ ; výstrahy SIVS: https://www.chmi.cz/ (formát CAP) |
| Typ dat | měření stanic, radar, výstrahy podle ORP, srážky, vítr, teploty |
| API / open-data | ano (portál otevřených dat spuštěný v roce 2024 — **NEOVĚŘENO** rozsah a formáty) |
| Licence | Meteorologická data jsou kategorie datových sad vysoké hodnoty podle nařízení (EU) 2023/138 (*Meteorologie*) → CC BY 4.0 nebo rovnocenná. Konkrétní licence na portálu: **NEOVĚŘENO**. |
| Atribuce | „Zdroj: ČHMÚ“ |
| Osobní údaje | ne |
| **Status** | **GREEN** (po přečtení licence na portálu) |
| Doporučený způsob | výstrahy CAP každých 10 min; měření hodinově; do D1 s časem platnosti (ORP přiřazené při ingestu) |
| Co jde na veřejnou mapu | **jen výstrahy vysokého a extrémního stupně** (rozhodnutí provozovatele 22. 9. 2026). Nižší stupně a měření slouží jen interně jako kontrolní vrstva pro anomálie (část N). |
| Poznámka | sběr už dnes čte https://www.chmi.cz/ jako zdroj `chmi` (HTTP 200) — jen HTML, ne data |

#### Blesková data

- ČHMÚ (pokud jsou součástí otevřených dat): **NEOVĚŘENO**.
- Blitzortung.org: data jen pro účastníky sítě, nekomerčně — **RED** pro
  automatický odběr bez účasti. (https://www.blitzortung.org/)

### E.3 Elektřina

#### ČEZ Distribuce — poruchy a odstávky

| Pole | Hodnota |
|---|---|
| Organizace | ČEZ Distribuce, a. s. |
| URL | https://www.cezdistribuce.cz/ (sekce Poruchy a odstávky) |
| Typ dat | aktuální poruchy (mapa/seznam), plánované odstávky podle obce |
| Veřejná | ano (zobrazení) |
| API | veřejné **NEOVĚŘENO** — vyžaduje kontakt s poskytovatelem |
| Open-data feed | **NEOVĚŘENO** |
| Licence, podmínky, robots | **NEOVĚŘENO**; web distributora má vlastní podmínky užití |
| Databázová práva | ano — pořizovatel ČEZ Distribuce (§ 88 a násl. AZ) — **LEGAL REVIEW REQUIRED** |
| Osobní údaje | plánované odstávky obsahují adresy/čísla popisná → **veřejně se neukládají ani nezobrazují** |
| Citlivá data | při přílišné přesnosti (konkrétní trafostanice) ano → agregace na ORP |
| **Status** | **YELLOW** |
| Doporučený způsob | 1. dotaz na veřejné API / open-data; 2. partnerské API s agregací na ORP; do té doby jen odkaz |
| Kontakt | tiskové oddělení / infolinka ČEZ Distribuce (na webu) |
| Partnerství | **ano, prioritně** (část I) |

#### EG.D — poruchy a odstávky

Stejná struktura; URL https://www.egd.cz/ ; **YELLOW**; partnerství ano.

#### PREdistribuce — poruchy a odstávky

Stejná struktura; URL https://www.predistribuce.cz/ ; **YELLOW**;
partnerství ano.

#### ČEPS — přenosová soustava (data o zatížení, výrobě)

| Pole | Hodnota |
|---|---|
| URL | https://www.ceps.cz/ (sekce Data) |
| Typ dat | agregovaná systémová data, ne poruchy distribuce |
| Licence | **NEOVĚŘENO** |
| **Status** | **YELLOW**; pro mapu poruch nepotřebné, pro kontext ano |
| Poznámka | sběr už čte tiskové zprávy ČEPS (`ceps`, HTTP 200) |

#### ENTSO-E Transparency Platform

| Pole | Hodnota |
|---|---|
| URL | https://transparency.entsoe.eu/ |
| API | ano, s bezplatným tokenem po registraci |
| Licence | **NEOVĚŘENO** — podmínky užití platformy |
| **Status** | **YELLOW** |

### E.4 Komunikace

#### ČTÚ

| Pole | Hodnota |
|---|---|
| URL | https://ctu.gov.cz/ |
| Typ dat | úřední informace o výpadcích (hlášení operátorů podle § 98 zákona č. 127/2005 Sb.), statistiky |
| API / open-data | **NEOVĚŘENO** |
| **Status** | **YELLOW**; sběr dnes dostává HTTP 403 (běh z GitHub Actions 22. 9. 2026) |
| Doporučený způsob | oslovit ČTÚ s dotazem na strojově čitelný kanál výpadků; do té doby jen odkaz |

#### Stavové stránky provozovatelů ve formátu Statuspage (Cloudflare, Zoom, Discord — už v provozu)

| Pole | Hodnota |
|---|---|
| URL | https://www.cloudflarestatus.com/api/v2/summary.json a obdobné |
| Typ dat | stav služby, incidenty, komponenty |
| API | ano, veřejné bez klíče |
| Licence | **NEOVĚŘENO** u každého provozovatele zvlášť; Statuspage API je určené ke čtení stavu (dokumentace Atlassian) |
| **Status** | **YELLOW** — čteme, zobrazujeme s odkazem, neukládáme historii déle než 90 dní; **potvrdit podmínky** |

#### Downdetector (Ookla)

| Pole | Hodnota |
|---|---|
| URL | https://downdetector.cz/ |
| Typ dat | hlášení uživatelů |
| API | komerční (Downdetector Enterprise) |
| Automatické získávání | podmínky Ookla zakazují — **NEOVĚŘENO** přesné znění, ale jde o komerční produkt |
| **Status** | **RED** pro scraping; jen odkaz (už dnes) |

#### IODA (Georgia Tech) — detekce plošných výpadků internetu na úrovni státu

| Pole | Hodnota |
|---|---|
| URL | https://ioda.inetintel.cc.gatech.edu/ ; API https://api.ioda.inetintel.cc.gatech.edu/v2/ |
| Typ dat | signály BGP, aktivní měření, telescope — na úrovni státu/regionu |
| API | ano, veřejné |
| Licence | **NEOVĚŘENO** |
| **Status** | **YELLOW** → dotaz na podmínky; velmi vhodné pro „plošný výpadek“ bez osobních dat |

#### Cloudflare Radar — výpadky a provoz podle země

| Pole | Hodnota |
|---|---|
| URL | https://radar.cloudflare.com/ ; API https://developers.cloudflare.com/radar/ |
| API | ano, s tokenem účtu Cloudflare |
| Licence | podle dokumentace Radar jsou data pod **CC BY-NC 4.0** — **NEOVĚŘENO** (ověřit na adrese výše) |
| **Status** | **YELLOW** — nekomerční použití vyhovuje, pokud web zůstane bez placené vrstvy vázané na tato data |

#### RIPE Atlas

| Pole | Hodnota |
|---|---|
| URL | https://atlas.ripe.net/ |
| Licence | **NEOVĚŘENO** |
| **Status** | **YELLOW** |

### E.5 Doprava

#### ŘSD — Jednotný systém dopravních informací (dopravniinfo.cz)

| Pole | Hodnota |
|---|---|
| URL | https://www.dopravniinfo.cz/ (sekce Otevřená data / DATEX II) |
| Typ dat | uzavírky, nehody, omezení, sjízdnost |
| API / open-data | JSDI má datové rozhraní pro registrované odběratele; existence otevřené sady **NEOVĚŘENO** |
| **Status** | **YELLOW**; sběr dnes: „fetch failed“ (22. 9. 2026) |
| Doporučený způsob | registrace k datovému rozhraní JSDI nebo otevřená sada v NKOD |

#### Správa železnic — omezení provozu, výluky

| Pole | Hodnota |
|---|---|
| URL | https://www.spravazeleznic.cz/ |
| API / open-data | **NEOVĚŘENO** |
| **Status** | **YELLOW**; sběr dnes čte stránku pro média (HTTP 200) |

#### Letiště Praha — provozní informace

**YELLOW**; sběr čte stránku (HTTP 200); API **NEOVĚŘENO**.

### E.6 Kybernetika

#### NÚKIB

| Pole | Hodnota |
|---|---|
| URL | https://nukib.gov.cz/ (aktuality, upozornění, měsíční přehledy) |
| Typ dat | upozornění, zranitelnosti, statistiky, zprávy o incidentech |
| API / open-data | **NEOVĚŘENO**; RSS **NEOVĚŘENO** |
| Autorská práva | úřední dílo (§ 3 AZ) pro úřední sdělení — **LEGAL REVIEW REQUIRED** |
| **Status** | **YELLOW** pro automatický odběr, **GREEN** pro odkaz a citaci |
| Poznámka | sběr už čte aktuality (`nukib`, HTTP 200). Měsíční statistika se nikdy nezobrazí jako „incidenty právě teď“ (část 11). |

#### CERT.PL, SK-CERT, BSI, ENISA (kontext)

Už ve sběru jako zdroje událostí; pro mapu ČR jen kontext. Licence
jednotlivě **NEOVĚŘENO**.

### E.7 Bezpečnost (události)

#### Policie ČR, HZS ČR, MV ČR, BIS, vláda, Hrad, MZV

| Pole | Hodnota |
|---|---|
| URL | policie.cz, hzscr.cz, mvcr.cz, bis.cz, vlada.gov.cz, hrad.cz, mzv.gov.cz |
| Typ dat | tiskové zprávy, aktuality |
| Autorská práva | úřední díla podle § 3 AZ — **LEGAL REVIEW REQUIRED** (rozsah: sdělení ano, fotografie ne) |
| **Status** | **YELLOW** pro automatický odběr celé stránky; **GREEN** pro citaci s odkazem; Hrad dnes HTTP 403 |
| Osobní údaje | ano (jména v tiskových zprávách) → ukládá se jen titulek, odkaz, čas; nikdy jména do vlastních textů bez potřeby |

#### Výjezdy HZS krajů (některé kraje publikují)

**NEOVĚŘENO** kraj po kraji; případně GREEN u krajů s otevřenou sadou v NKOD.

### E.8 Vzdušný prostor a GNSS

#### OpenSky Network

| Pole | Hodnota |
|---|---|
| URL | https://opensky-network.org/ |
| Licence | výzkumné a nekomerční užití podle podmínek sítě — **NEOVĚŘENO** |
| **Status** | **YELLOW**; pro veřejnou mapu **nepoužívat živě** — sledování konkrétních letadel do civilního přehledu nepatří (část 14) |

#### gpsjam.org (rušení GNSS odvozené z ADS-B)

**YELLOW**, licence **NEOVĚŘENO**; pro ČR jen jako odkaz a denní souhrn, ne živě.

#### Flightradar24, ADSB Exchange

**RED** (smluvní podmínky, komerční API). Jen odkaz.

### E.9 Ostatní

#### ČSÚ — číselníky, počty obyvatel podle jednotek

URL https://csu.gov.cz/ a https://data.csu.gov.cz/ ; otevřená data —
licence **NEOVĚŘENO** (očekávána CC BY 4.0). **GREEN po přečtení.**
Použití: jmenovatel pro „počet dotčených obyvatel na 1 000“.

#### Národní katalog otevřených dat (data.gov.cz)

URL https://data.gov.cz/ — rozcestník; každou sadu posuzovat zvlášť.

---

## F. Právní a licenční matice

| Zdroj | Otevřená licence | Automatický odběr | Historie | Redistribuce | Osobní údaje | Citlivá data | Status |
|---|---|---|---|---|---|---|---|
| ČÚZK RÚIAN | ano (HVD) | ano | ano | ano | ne | ne | GREEN* |
| OSM (self-host) | ODbL | ano | ano | ano (ODbL) | ne | ne | GREEN |
| Natural Earth | PD | ano | ano | ano | ne | ne | GREEN |
| ČHMÚ open data | ano (HVD) | ano | ano | ano | ne | ne | GREEN* |
| ČSÚ | ano (očekáváno) | ano | ano | ano | ne | ne | GREEN* |
| ČEZ Distribuce | ? | ? | ? | ? | ano (adresy) | při přesnosti | YELLOW |
| EG.D | ? | ? | ? | ? | ano | při přesnosti | YELLOW |
| PREdistribuce | ? | ? | ? | ? | ano | při přesnosti | YELLOW |
| ČEPS data | ? | ? | ? | ? | ne | ne | YELLOW |
| ENTSO-E | registrace | ano | ? | ? | ne | ne | YELLOW |
| ČTÚ | ? | dnes 403 | ? | ? | ne | ne | YELLOW |
| Statuspage (CF, Zoom, Discord) | ? | ano (API) | krátká | ne | ne | ne | YELLOW |
| Downdetector | ne | ne | ne | ne | ne | ne | RED |
| IODA | ? | ano (API) | ? | ? | ne | ne | YELLOW |
| Cloudflare Radar | CC BY-NC* | ano (token) | ano | ano (NC) | ne | ne | YELLOW |
| RIPE Atlas | ? | ano | ? | ? | ne | ne | YELLOW |
| ŘSD JSDI | registrace | ? | ? | ? | ne | ne | YELLOW |
| Správa železnic | ? | ? | ? | ? | ne | ne | YELLOW |
| NÚKIB | úřední dílo* | ? | citace | citace | ne | ne | YELLOW |
| Policie/HZS/MV/BIS/vláda | úřední dílo* | ? | citace | citace | ano (jména) | ne | YELLOW |
| OpenSky | nekomerční* | ano | ? | ne | ne | ano (sledování letadel) | YELLOW |
| Flightradar24, ADSB Exchange | ne | ne | ne | ne | ne | ano | RED |
| Blitzortung | ne | ne | ne | ne | ne | ne | RED |

`*` = tvrzení podle znalosti k červnu 2026, **ověřit na uvedené adrese
před implementací.** `?` = NEOVĚŘENO — vyžaduje kontakt s poskytovatelem.

### Právní rámec, o který se matice opírá (primární předpisy)

- Směrnice (EU) 2019/1024 o otevřených datech; **prováděcí nařízení Komise
  (EU) 2023/138** (datové sady vysoké hodnoty: geoprostorové údaje,
  meteorologie, mobilita aj.) — povinnost poskytovat zdarma, přes API, pod
  CC BY 4.0 nebo rovnocennou licencí.
- Zákon č. 106/1999 Sb., § 3 odst. 11 a § 4b (otevřená data) a nařízení
  vlády č. 425/2016 Sb. (seznam informací zveřejňovaných jako otevřená data).
- Zákon č. 121/2000 Sb. (autorský zákon): § 3 písm. a) úřední dílo; § 88 a
  násl. zvláštní právo pořizovatele databáze; § 39c–39d výjimky pro
  vytěžování textů a dat (transpozice čl. 3 a 4 směrnice (EU) 2019/790) —
  **LEGAL REVIEW REQUIRED**: rozsah výjimky pro nevýzkumné užití a účinek
  výhrady (opt-out) provozovatele.
- Nařízení (EU) 2016/679 (GDPR) a zákon č. 110/2019 Sb.
- Zákon č. 127/2005 Sb., § 89 odst. 3 (cookies/úložiště) a § 98 (hlášení
  výpadků operátorů ČTÚ).
- Zákon č. 240/2000 Sb. (krizový zákon), zákon č. 239/2000 Sb. (IZS) —
  zaměnitelnost s úředním varováním (viz `docs/PRAVNI-KONTROLA.md`, část 4).
- Zákon č. 181/2014 Sb. o kybernetické bezpečnosti (a jeho nástupce po
  transpozici NIS2) — CzechPatrol není povinnou osobou; nesmí ale
  publikovat, co by povinným osobám škodilo (část 14).

Pravidlo z rámce, vtělené do kódu: **zdroj se čte, jen když má v registru
GREEN.** YELLOW a RED se ukazují jako odkaz. Registr bude soubor
`data/registr-zdroju.json` a `nastroje/kontrola-dat.mjs` odmítne sběr ze
zdroje bez GREEN.

---

## G. Zdroje použitelné ihned

Po přečtení podmínek na uvedené adrese (jeden člověk, jedno odpoledne):

1. **ČÚZK RÚIAN** — hranice krajů, okresů, ORP, obcí. Základ mapy.
2. **OpenStreetMap přes Protomaps/OpenFreeMap (self-host)** — podklad.
3. **Natural Earth** — okolní státy.
4. **ČHMÚ otevřená data** — výstrahy podle ORP, měření. Vrstva POČASÍ a kontrolní vrstva pro anomálie.
5. **ČSÚ** — počty obyvatel podle jednotek (jmenovatel).
6. **Vlastní data CzechPatrol** — záznamy a opatření, které už web má (dnes 14 záznamů z Česka, **žádný s okresem** — geokód doplní redakce, ne automat).
7. **Statuspage stavové stránky** — už v provozu; potvrdit podmínky.

## H. Zdroje vyžadující souhlas, API nebo partnerství

| Zdroj | Co chceme | Cesta |
|---|---|---|
| ČEZ Distribuce, EG.D, PREdistribuce | agregované aktivní poruchy a odstávky na úrovni obec/ORP, časy, počet dotčených odběrných míst, příčina je-li veřejná | partnerské API nebo export (část I) |
| ČTÚ | strojově čitelná hlášení výpadků podle § 98 ZEK | dotaz, případně žádost podle zákona č. 106/1999 Sb. o formát otevřených dat |
| ŘSD JSDI | uzavírky a omezení po okresech | registrace k datovému rozhraní |
| Správa železnic | omezení provozu | dotaz na strojový kanál |
| NÚKIB | RSS/JSON upozornění, souhlas s automatickým odběrem | dopis |
| Policie ČR, HZS ČR, MV ČR | souhlas s automatickým čtením aktualit; krajské výjezdy HZS jako otevřená data | dopis |
| IODA, Cloudflare Radar, RIPE Atlas | podmínky pro zobrazení státní úrovně | e-mail / dokumentace |
| ENTSO-E | token a podmínky | registrace |
| OpenSky, gpsjam | podmínky pro denní souhrn | e-mail; živé sledování letadel nezavádět |

---

## I. Návrh oslovení ČEZ Distribuce, EG.D a PREdistribuce

Odesílá provozovatel projektu (jméno a identita: **[DOPLNIT]** —
`PROVOZOVATEL` v `src/config/web.ts` je dosud prázdné; bez něj se dopis
neposílá). Plné znění všech dopisů: `docs/DOPISY-POSKYTOVATELUM.md`.

Co je „identita provozovatele": ten, kdo web právně provozuje a odpovídá
za osobní údaje (čl. 4 odst. 7 a čl. 13 GDPR). U jednotlivce stačí jméno a
příjmení a kontaktní e-mail; u podnikající osoby nebo firmy název, IČO a
sídlo; u spolku název, IČO a sídlo. Zapisuje se na jediné místo
(`PROVOZOVATEL` v `src/config/web.ts`) a odtud jde do stránky Soukromí, do
souhlasu s e-mailem a do dopisů. Jedna šablona, tři adresáti; odstavce v hranatých závorkách se
liší.

> **Věc: Žádost o agregovaná data o poruchách a odstávkách pro veřejný situační přehled CzechPatrol**
>
> Vážená paní, vážený pane,
>
> obracím se na Vás jako provozovatel projektu CzechPatrol
> (https://czechpatrol.cz), nezávislého veřejného civilního
> situačního přehledu, který agreguje ověřené informace o dostupnosti
> základních služeb a o bezpečnostních událostech v Česku. Projekt není
> součástí žádného úřadu ani složky IZS a takový dojem nevytváří; u každého
> údaje uvádí zdroj a čas.
>
> Rád/a bych na mapě České republiky zobrazoval/a, **kde právě neteče
> elektřina a jak dlouho** — na úrovni obce nebo ORP, nikdy adresy. Cílem je,
> aby si běžný člověk během několika vteřin ověřil, jestli jde o místní
> poruchu, nebo o něco většího, a aby plánované odstávky nebyly zaměňovány
> za mimořádné události.
>
> Prosím o informaci, zda [ČEZ Distribuce / EG.D / PREdistribuce]:
>
> 1. provozuje veřejné API nebo otevřená data k aktuálním poruchám a plánovaným odstávkám,
> 2. může poskytnout anonymizované, agregované údaje třetí straně, konkrétně: typ (neplánovaná porucha / plánovaná odstávka), lokalizaci na úrovni obce nebo ORP, čas vzniku, předpokládaný a skutečný čas obnovy, počet dotčených odběrných míst jako číslo, příčinu, je-li veřejná,
> 3. jaký je vhodný interval obnovy (nabízíme 5–15 minut) a zda lze data uchovávat pro historické statistiky (trvání, četnost podle okresu),
> 4. zda smí být z těchto dat publikována agregovaná statistika (například medián trvání poruch v okrese za 30 dní) s uvedením zdroje,
> 5. jaké podmínky užití a atribuci vyžadujete.
>
> **Nežádáme** adresy domácností, EAN odběrných míst, jména zákazníků,
> telefonní čísla, individuální spotřebu ani jiné osobní údaje. Nežádáme
> ani polohu konkrétních zařízení distribuční soustavy; přesnější data, než
> je obec, by projekt na veřejné vrstvě stejně agregoval.
>
> Pokud veřejný přístup není možný, navrhuji dohodu o poskytování
> agregovaných dat (partnerské API nebo pravidelný export) s podmínkami,
> které určíte. Zdrojová data zůstanou u Vás; CzechPatrol zobrazí jen
> agregát s označením „Zdroj: [distributor]“ a s časem aktualizace, a při
> výpadku kanálu zobrazí „data nejsou dostupná“, nikdy „bez poruch“.
>
> Metodika projektu je veřejná (https://czechpatrol.cz/metodika/),
> stejně jako kód. Rád/a doplním cokoli dalšího.
>
> S pozdravem
> [jméno, role, kontakt — DOPLNIT]

Pro ČEZ Distribuci navíc: dotaz, zda mapa poruch na jejich webu má
strojové rozhraní, které by mohli otevřít pod licencí. Pro PREdistribuci:
zmínit, že Praha má vlastní granularitu (městské části) a že nám stačí
ORP Praha jako celek nebo obvod.

**Nikde v dopise ani na webu se netvrdí, že partnerství existuje, dokud
neexistuje.**

---

## J. Databázové schéma (Cloudflare D1 / SQLite)

Jen tabulky potřebné pro fáze 1–3; kyber a kaskády přidají tabulky ve
stejném duchu. Veřejné API nikdy nečte `raw_*` tabulky. Stejné
konvence jako dnešní `api/migrace/`: `TEXT` pro časy v ISO 8601 (UTC),
`INTEGER` 0/1 místo boolean, JSON jako `TEXT`. Geometrie v D1 nikdy;
hranice jsou na R2 (PMTiles pro mapu, GeoJSON pro ingest).

```sql
-- geografie (naplněno z RÚIAN, jednou měsíčně; bez geometrie)
CREATE TABLE uzemi (
  kod            TEXT PRIMARY KEY,          -- kód RÚIAN
  druh           TEXT NOT NULL CHECK (druh IN ('stat','kraj','okres','orp','obec')),
  nazev          TEXT NOT NULL,
  nadrazene_kod  TEXT REFERENCES uzemi(kod),
  obyvatel       INTEGER,                   -- ČSÚ, k datu
  hranice_r2     TEXT,                      -- klíč GeoJSON na R2 (jen kraj/okres/ORP)
  platne_od      TEXT NOT NULL,
  zdroj_id       TEXT NOT NULL REFERENCES zdroj(id)
);
CREATE INDEX uzemi_druh ON uzemi (druh, nadrazene_kod);

-- sousedství okresů, předpočítané z hranic při měsíčním importu (náhrada za PostGIS touches)
CREATE TABLE uzemi_soused (
  kod            TEXT NOT NULL REFERENCES uzemi(kod),
  soused_kod     TEXT NOT NULL REFERENCES uzemi(kod),
  PRIMARY KEY (kod, soused_kod)
);

-- registr zdrojů (část E), stejný obsah jako data/registr-zdroju.json
CREATE TABLE zdroj (
  id             TEXT PRIMARY KEY,
  organizace     TEXT NOT NULL,
  url            TEXT NOT NULL,
  typ_dat        TEXT NOT NULL,
  licence        TEXT,
  status         TEXT NOT NULL CHECK (status IN ('GREEN','YELLOW','RED')),
  atribuce       TEXT,
  interval_s     INTEGER,
  rate_limit     TEXT,
  osobni_udaje   INTEGER NOT NULL DEFAULT 0,
  citliva_data   INTEGER NOT NULL DEFAULT 0,
  kontakt        TEXT,
  overeno_kdy    TEXT,
  overil         TEXT
);

-- syrové stažení: nikdy se nemaže, nikdy se nemění; tělo je v R2, tady jen otisk a klíč
CREATE TABLE raw_stazeni (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  zdroj_id       TEXT NOT NULL REFERENCES zdroj(id),
  url            TEXT NOT NULL,
  ziskano        TEXT NOT NULL,
  http_stav      INTEGER,
  hlavicky       TEXT,                      -- JSON
  telo_sha256    TEXT NOT NULL,
  telo_r2        TEXT NOT NULL,             -- klíč objektu v R2 (raw/{zdroj}/{rok}/{sha256})
  parser_verze   TEXT NOT NULL
);
CREATE INDEX raw_zdroj ON raw_stazeni (zdroj_id, ziskano);

-- položka dostupnosti služby (elektřina, komunikace, doprava)
CREATE TABLE vypadek (
  id             TEXT PRIMARY KEY,
  zdroj_id       TEXT NOT NULL REFERENCES zdroj(id),
  raw_id         INTEGER NOT NULL REFERENCES raw_stazeni(id),
  vrstva         TEXT NOT NULL CHECK (vrstva IN ('elektrina','komunikace','doprava','kyber','pocasi')),
  druh           TEXT NOT NULL CHECK (druh IN ('neplanovana','planovana','omezeni','neznamo')),
  uzemi_kod      TEXT NOT NULL REFERENCES uzemi(kod),   -- nejjemněji obec (přiřazeno při ingestu); veřejně se agreguje
  zacatek        TEXT NOT NULL,
  odhad_konce    TEXT,
  konec          TEXT,
  dotcenych_mist INTEGER,                   -- jen když zdroj uvádí
  pricina_verejna TEXT,                     -- doslovný text zdroje, nikdy náš odhad
  publikovano    TEXT,
  ziskano        TEXT NOT NULL,
  hash_polozky   TEXT NOT NULL,             -- dedup mezi běhy
  UNIQUE (zdroj_id, hash_polozky)
);
CREATE INDEX vypadek_vrstva ON vypadek (vrstva, zacatek);
CREATE INDEX vypadek_uzemi ON vypadek (uzemi_kod, zacatek);

-- historie změn položky (nikdy UPDATE bez řádku sem)
CREATE TABLE vypadek_zmena (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  vypadek_id     TEXT NOT NULL REFERENCES vypadek(id),
  kdy            TEXT NOT NULL,
  pole           TEXT NOT NULL,
  stara          TEXT,
  nova           TEXT,
  raw_id         INTEGER REFERENCES raw_stazeni(id),
  poznamka       TEXT
);

-- bezpečnostní událost (rozšíření dnešního incidenty.json; viz část L)
CREATE TABLE udalost (
  id             TEXT PRIMARY KEY,
  slug           TEXT UNIQUE NOT NULL,
  kategorie      TEXT NOT NULL,             -- CYBER, SABOTAGE, ENERGY, TELECOM, TRANSPORT, GNSS, AIRSPACE, INFORMATION, OTHER
  titulek        TEXT NOT NULL,
  popis          TEXT NOT NULL,
  uzemi_kod      TEXT REFERENCES uzemi(kod),   -- pro ČR okres/ORP; zahraničí: NULL + kod_zeme
  kod_zeme       TEXT NOT NULL,
  cas_udalosti   TEXT NOT NULL,
  cas_zjisteni   TEXT NOT NULL,
  stav_overeni   TEXT NOT NULL CHECK (stav_overeni IN ('OFFICIALLY_CONFIRMED','MULTIPLE_SOURCES','UNDER_INVESTIGATION','UNVERIFIED','RETRACTED')),
  atribuce_kdo   TEXT,                      -- orgán, který atribuci provedl; NULL = žádná
  atribuce_text  TEXT,                      -- doslovné znění
  jistota        TEXT NOT NULL CHECK (jistota IN ('nizka','stredni','vysoka','potvrzeno')),
  naposledy_zkontrolovano TEXT NOT NULL,
  lidsky_overeno INTEGER NOT NULL DEFAULT 0,
  aktualizovano  TEXT NOT NULL
);

CREATE TABLE udalost_zdroj (
  udalost_id     TEXT NOT NULL REFERENCES udalost(id),
  zdroj_id       TEXT REFERENCES zdroj(id),
  url            TEXT NOT NULL,
  organizace     TEXT NOT NULL,
  typ            TEXT NOT NULL CHECK (typ IN ('primary','media','wire','social')),
  uredni_adresa  INTEGER NOT NULL,          -- výsledek nastroje/uredni-zdroj.mjs
  publikovano    TEXT,
  ziskano        TEXT NOT NULL,
  PRIMARY KEY (udalost_id, url)
);

CREATE TABLE udalost_oprava (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  udalost_id     TEXT NOT NULL REFERENCES udalost(id),
  kdy            TEXT NOT NULL,
  text           TEXT NOT NULL,             -- „11:04 aktualizováno: …“
  raw_id         INTEGER REFERENCES raw_stazeni(id)
);

-- meteorologický jev (kontrolní vrstva)
CREATE TABLE meteo_jev (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  zdroj_id       TEXT NOT NULL REFERENCES zdroj(id),
  raw_id         INTEGER NOT NULL REFERENCES raw_stazeni(id),
  druh           TEXT NOT NULL,             -- vitr, bourka, blesky, snih_namraza, teplota, povoden
  stupen         TEXT,                      -- podle zdroje (ČHMÚ SIVS)
  uzemi_kod      TEXT NOT NULL REFERENCES uzemi(kod),   -- ORP
  od             TEXT NOT NULL,
  do_            TEXT
);
CREATE INDEX meteo_uzemi ON meteo_jev (uzemi_kod, od);

-- agregáty pro web (přepočítávají se; veřejné API čte jen tohle)
CREATE TABLE agregat_uzemi (
  uzemi_kod      TEXT NOT NULL REFERENCES uzemi(kod),
  vrstva         TEXT NOT NULL,
  okno           TEXT NOT NULL,             -- 'ted','24h','7d','30d','90d','1y'
  spocteno       TEXT NOT NULL,
  data           TEXT NOT NULL,             -- JSON: počty, mediány, P95, histogram, trend, baseline, čerstvost
  PRIMARY KEY (uzemi_kod, vrstva, okno)
);

-- stav providerů (fail-safe, část 23)
CREATE TABLE provider_stav (
  zdroj_id       TEXT PRIMARY KEY REFERENCES zdroj(id),
  posledni_ok    TEXT,
  posledni_pokus TEXT NOT NULL,
  stav           TEXT NOT NULL CHECK (stav IN ('LIVE','DELAYED','UNKNOWN')),
  zpozdeni_s     INTEGER,
  chyba          TEXT
);
```

Zásady: `raw_*` je append-only (tělo v R2, v D1 otisk); každá změna
normalizované položky má řádek v `*_zmena`/`*_oprava`; veřejné soubory
se generují z `agregat_uzemi`, ne z `vypadek` přímo; do `uzemi_kod` na
veřejné vrstvě nikdy nejde obec. Geokód (bod → obec/ORP) se počítá
při ingestu v Node nad GeoJSON z R2, do D1 jde jen kód. Doby uchování:
`vypadek`, `meteo_jev` 24 měsíců, `raw_stazeni` podle licence zdroje
(výchozí 24 měsíců, tiskové zprávy 90 dní), agregáty bez omezení.
Zálohy: D1 Time Travel (30 dní na placeném tarifu — **NEOVĚŘENO**) +
měsíční export do R2.

---

## K. API architektura

Dvě API, ostře oddělená:

### Veřejné API (bez klíče, jen čtení, cache na CDN)

| Cesta | Obsah | Cache |
|---|---|---|
| `GET /api/v1/mapa/{vrstva}/{okno}.json` | agregát po okresech a ORP: stav, počty, trend, čerstvost, provider stavy | ETag, `max-age=60`, `stale-while-revalidate=300` |
| `GET /api/v1/uzemi/{kod}/{vrstva}.json` | detail jednoho okresu/ORP: aktivní položky (bez adres), historie oken, baseline | ETag, 60 s |
| `GET /api/v1/udalosti.json?zeme=CZ&od=…` | bezpečnostní události (jen OFFICIALLY_CONFIRMED, MULTIPLE_SOURCES, UNDER_INVESTIGATION; UNVERIFIED jen s `&vcetne=unverified`) | ETag, 300 s |
| `GET /api/v1/provideri.json` | LIVE / DELAYED / UNKNOWN pro každý zdroj | 30 s |
| `GET /api/v1/narodni-stav.json` | čtyři indexy s rozpisem (část 19) | 300 s |
| `GET /dlazdice/{z}/{x}/{y}.pbf` (PMTiles přes R2) | podklad + hranice | rok (verzované cesty) |
| `GET /api/v1/metodika.json` | verze parserů, baseline, prahů | 1 h |

Vlastnosti: CORS jen pro čtení, rate limit 60 požadavků/min/IP (Cloudflare
WAF), žádné dotazovací parametry mimo výčet, žádné volné vyhledávání,
odpovědi nikdy neobsahují obec ani adresu (validace na výstupu).

### Interní API (Worker `api/`, token, RBAC)

- `POST /interni/ingest/{zdroj}` — jen z Actions/cron s tokenem; zapisuje `raw_stazeni`.
- `POST /interni/prepocet` — spustí agregace; idempotentní.
- `POST /interni/udalost/{id}/oprava` — jen role správce; zapisuje `udalost_oprava`.
- Audit log každého zápisu (kdo, kdy, co) — už existuje pro účty, rozšířit.

### Statické publikování jako záloha

Stejné soubory jako veřejné API se při každém běhu zapíší i do `out/`
(dnes `stav.json`, `fronta.json`). Když Worker nebo databáze spadne, web
ukazuje poslední soubory s jejich časem a stavem „DATA DELAYED“.

---

## L. Datový model incidentu

Rozšíření dnešního záznamu (`src/lib/typy.ts`, `Incident`) o pole ze
zadání. Stávající pole zůstávají (zpětná kompatibilita 130 záznamů).

| Pole (zadání) | Pole v modelu | Poznámka |
|---|---|---|
| timestamp | `datumUdalosti`, `datumZjisteni` | obě povinné, ISO; publikace ≠ událost |
| location | `kodZeme` + nové `uzemi: { druh: "okres"\|"orp"\|"kraj", kod, nazev }` | pro ČR povinné od fáze 1; automat nesmí odhadovat, zapisuje redakce nebo ověřovatel z textu zdroje |
| category | nové `kategorieMapy: "CYBER"\|"SABOTAGE"\|"ENERGY"\|"TELECOM"\|"TRANSPORT"\|"GNSS"\|"AIRSPACE"\|"INFORMATION"\|"OTHER"` | mapování ze stávajících `kategorie[]` je deterministické (tabulka v kódu) |
| description | `fakta[]` (doložené věty) + `titulek` | „AI shrnutí“ zůstává označené |
| source, source URL | `zdroje[]` (`nazev`, `url`, `typ`, `primarni`) + nové `urednAdresa: boolean` | výsledek `uredni-zdroj.mjs` se ukládá, ne počítá při zobrazení |
| verification status | nové `stavOvereni` | odvozeno: `lidskyOvereno && úřední zdroj` → OFFICIALLY_CONFIRMED; `≥2 nezávislé, žádný úřední` → MULTIPLE_SOURCES; `stav in (probiha, overujeme)` → UNDER_INVESTIGATION; návrh bez schválení → UNVERIFIED; `nepotvrzeno.json` stav vyvraceno → RETRACTED |
| last checked | nové `naposledyZkontrolovano` | čas, kdy někdo (nebo sběr) naposledy otevřel zdroje |
| attribution | `atribuce` + `puvodce` + nové `atribuceKdo`, `atribuceText` | zobrazit jen s `atribuceKdo`; bez něj „Příčina zatím není známa.“ |
| confidence | `jistota` | beze změny |
| corrections history | `historie[]` | beze změny; každá oprava věty o příčině/původci je nový řádek, nikdy přepis |

Věty pro veřejnost podle stavu (pevné, z kódu, ne z modelu):

- UNDER_INVESTIGATION: „Událost je vyšetřována. Příčina zatím není známa.“
- MULTIPLE_SOURCES bez atribuce: „Souvislost s hybridní aktivitou nebyla potvrzena.“
- OFFICIALLY_CONFIRMED s atribucí: „Podle {atribuceKdo}: {atribuceText}.“
- UNVERIFIED: utlumeně, s „neověřeno“ v každém zobrazení; na mapě
  defaultně skryté.

---

## M. Provenance model

Každý veřejný údaj má řetěz: **zobrazený údaj → agregát → normalizovaná
položka → syrové stažení → zdroj v registru**. Uživatel klikne „Zdroj“
a dostane:

```
Zdroj: ČEZ Distribuce (registr: cez-distribuce, status GREEN od 2026-10-01)
URL: https://…
Získáno: 2026-09-22 14:40:12 UTC (běh #512, parser vypadky-cez v3)
Zveřejněno zdrojem: 2026-09-22 14:37
Syrová hodnota: „Porucha VN, obec Dobrá, předpoklad obnovení 17:30“
Normalizováno: druh=neplanovana, uzemi=ORP Frýdek-Místek, zacatek=14:37, odhad_konce=17:30
Licence: [text z registru]
Stav ověření: převzato od provozovatele (není hodnocení CzechPatrol)
```

Uložená pole (ze zadání) a kde: `source_id` (`zdroj.id`), `source_url`
(`raw_stazeni.url`), `source_organization` (`zdroj.organizace`),
`retrieved_at` (`raw_stazeni.ziskano`), `published_at`
(`vypadek.publikovano`), `raw_value` (`raw_stazeni.telo` + výřez),
`normalized_value` (řádek `vypadek`), `license` (`zdroj.licence`),
`verification_status` (`udalost.stav_overeni` / u výpadků „převzato“),
`parser_version` (`raw_stazeni.parser_verze`).

Pravidla: syrová data se nemažou (jen po uplynutí doby v registru, když to
licence žádá); přepočet agregátu z historie musí dát stejný výsledek
(determinismus); změna parseru = nová verze, staré řádky se nepřepisují.

---

## N. Model detekce anomálií

Anomálie je **statistické tvrzení o datech, nikdy o příčině.** Výstup je
vždy věta „NEOBVYKLÝ VZOREC“ s čísly a s „PŘÍČINA: zatím neznámá“, dokud
příčinu neuvede zdroj.

### Baseline

- Pro každý okres, vrstvu a hodinu v týdnu: medián a mezikvartilové
  rozpětí počtu nových položek za posledních 8 stejných týdenních slotů
  (např. „úterý 14–15 h“), po odečtení plánovaných odstávek.
- Minimálně 6 týdnů dat, jinak baseline „nedostatečná“ a anomálie se
  **nepočítá** (zobrazí se „Baseline zatím nemáme“).
- Sezónnost: slot podle měsíce (září ≠ leden) od 1 roku dat; do té doby
  jen týdenní.

### Signály (každý 0–1, s vysvětlením)

| Signál | Výpočet | Práh |
|---|---|---|
| časová koncentrace | počet nových položek v klouzavém okně 30 min / medián baseline | ≥ 2,5× a ≥ 5 položek |
| geografický cluster | počet sousedních okresů (sdílená hranice z předpočítané tabulky `uzemi_soused`) s koncentrací ve stejném okně | ≥ 3 |
| neobvyklé trvání | podíl aktivních položek nad P95 trvání za 90 dní | ≥ 20 % a ≥ 3 položky |
| více služeb naráz | počet vrstev se zhoršením ve stejném okrese a okně (část 10) | ≥ 2 |
| odchylka od baseline | (aktuální − medián) / IQR | ≥ 3 |

### Kontrolní vrstva počasí

Na veřejné vrstvě POČASÍ jsou jen výstrahy vysokého a extrémního stupně.
Pro kontrolu anomálií se interně používají všechny stupně i měření; ven
z toho jde jen věta o korelaci, ne data.

Když ČHMÚ ve stejném ORP a čase hlásí výstrahu (vítr, bouřky, námraza,
sníh, povodeň) stupně ≥ nízký, skóre koncentrace a clusteru se násobí 0,5
a k větě se přidá: „Výpadky časově a geograficky korelují s bouřkovou
aktivitou (ČHMÚ, výstraha č. …).“ Nikdy „počasí vylučuje“.

### Skóre a confidence

- `anomaly_score` = vážený součet signálů (váhy v metodice, verzované).
- `confidence`: nízká (< 6 týdnů baseline nebo jeden provider DELAYED),
  střední (baseline ≥ 6 týdnů, všichni provideři LIVE), vysoká (≥ 1 rok
  baseline, ≥ 2 nezávislé zdroje pro tutéž vrstvu).
- Výstup se **nezobrazí**, dokud confidence není aspoň střední; nízká se
  loguje.

### Co model nikdy nedělá

Nepřiřazuje původce, nepoužívá slova „útok“, „sabotáž“, „nepřátelský“;
nezvyšuje bezpečnostní index sám (část 19: anomálie infrastruktury zvyšuje
jen index INFRASTRUKTURA); neposílá upozornění do kanálu bez lidského
potvrzení.

---

## O. Model hrozeb pro samotný CzechPatrol

| Aktivum | Hrozba | Dopad | Opatření |
|---|---|---|---|
| Veřejná data na mapě | agregace jako mapa slabých míst (kde vypadává nejdéle, kde je jediný zdroj) | pomoc útočníkovi | veřejně jen okres/ORP; žádné pořadí „nejslabších“ okresů; žádná topologie; histogramy bez identifikace konkrétních uzlů (část 14) |
| Ingest | otrávený zdroj (falešná stavová stránka, podvržené RSS) | falešný výpadek na mapě | registr s pevnými adresami, TLS, kontrola domény (`uredni-zdroj.mjs`), žádné automatické přidávání zdrojů, dva nezávislé zdroje pro „výpadek“ na mapě |
| Ingest | DoS na zdroj naším sběrem | ztráta přístupu, právní problém | rate limit v registru, exponenciální zpomalení, User-Agent s kontaktem |
| Worker/API | zneužití zápisových cest | poškození dat | token jen pro Actions, RBAC pro správce, audit log, validace vstupu (schéma), žádný volný SQL |
| Databáze | únik | syrová data obsahují přesnější polohy než veřejné | oddělené role (ingest zapisuje, API jen čte agregáty), šifrování, EU region, zálohy s testem obnovy |
| Repozitář | vložení tajemství, změna workflow | kompromitace celého toku | tajemství jen v GitHub/Cloudflare secrets (platí už dnes), branch protection na `main`, review změn workflow, dependency scanning (Dependabot), `npm audit` v CI |
| Web | XSS z textů zdrojů | krádež tokenu účtu | CSP bez inline skriptů, escapování všech textů ze zdrojů, žádné HTML ze zdrojů |
| Účty | passkey, obnovovací kód | převzetí účtu | existuje (viz `docs/PRAVNI-KONTROLA.md`); rate limit na pokusy |
| Telegram/WhatsApp | falešná zpráva „od CzechPatrol“ | panika | každá zpráva nese větu „ne úřední varování“, kanál jen pro čtení, podpis běhu |
| Reputace | mapa vypadá jako oficiální | zaměnitelnost s IZS | disclaimer v hlavičce každé stránky, žádné státní symboly, „Zdroj: NÚKIB“ textem |
| Dostupnost | výpadek Cloudflare (sami ho sledujeme) | web nedostupný v krizi | statický export je i v repozitáři; postup ručního nasazení jinam v `docs/PROVOZ.md` (doplnit) |
| Provoz | jediný správce | ztráta přístupu | dva správci, zálohy tajemství mimo repozitář |

Kontrolní seznam ze zadání a stav: RBAC (existuje pro účty, rozšířit na
data), audit log (existuje pro účty), secret management (existuje), rate
limiting (API ano, doplnit pro veřejné cesty), WAF (Cloudflare, zapnout
pravidla), API auth (token), validace vstupu (doplnit schémata), dependency
scanning (doplnit Dependabot), CSP (doplnit v `_headers`), security headers
(částečně v `_headers`, doplnit), backup (D1 Time Travel + měsíční export do R2, doplnit workflow), incident
response (doplnit dokument), monitoring (Actions + Cloudflare observability;
doplnit upozornění na selhání ingestu).

---

## P. GDPR checklist

| Bod | Stav | Co udělat |
|---|---|---|
| Identita správce v `/soukromi/` | **chybí** (`PROVOZOVATEL` prázdné) | doplnit před spuštěním map s daty od providerů |
| Minimalizace | veřejná mapa nikdy pod ORP; adresy z odstávek se neukládají | vynutit v normalizaci (validace odmítne řádek s adresou) |
| Právní základ pro zpracování syrových dat obsahujících jména (tiskové zprávy policie) | oprávněný zájem, čl. 6 odst. 1 písm. f) | sepsat LIA; ukládat jen titulek a odkaz, ne celý text |
| Doba uchování syrových dat | není stanovena | registr: podle licence; výchozí 24 měsíců, tiskové zprávy 90 dní |
| Zpracovatelé | jen Cloudflare (DPA; D1, R2, Workers, Pages) — žádný další zpracovatel dat | zápis v `/soukromi/`; ověřit umístění dat D1 (**NEOVĚŘENO**, D1 nemá výběr regionu jako Postgres) |
| Analytika webu | žádná (viz `docs/PRAVNI-KONTROLA.md` část 2) | zůstat bez ní, nebo jen serverové počty bez identifikátorů |
| Individuální domácnosti | nepublikovat | pravidlo v kódu + test |
| Práva subjektů u dat z tiskových zpráv | žádost o výmaz jména z našeho textu | postup v `/soukromi/`; kontakt |
| DPIA | zvážit znovu při zavedení položek s adresními daty v D1 | krátké odůvodnění; při agregaci na ORP se DPIA nejeví jako povinná |
| Děti | beze změny | — |
| Porušení zabezpečení | postup chybí | sepsat (72 h, ÚOOÚ) |

---

## Q. Accessibility checklist (WCAG 2.2 AA)

| Kritérium | Řešení |
|---|---|
| 1.4.1 barva není jediný nositel | stav = barva + ikona + slovo v každé kartě i v legendě; „bez údaje“ šrafy |
| 1.4.3 kontrast 4,5:1 | tokeny už kontrolované ručně; přidat axe v CI (`docs/DALSI-ETAPA.md`) |
| 1.4.11 kontrast neTextových prvků 3:1 | obrysy okresů a značky na mapě testovat proti podkladu ve světlém i tmavém režimu |
| 2.1.1 klávesnice | mapa: Tab na mapu, šipky posun, +/− přiblížení, Enter vybere okres, seznam okresů jako skrytý `<select>` pro přímý výběr |
| 2.4.3 pořadí fokusu | panel před mapou v DOM, mapa jako doplněk |
| 4.1.2 role | mapa `role="application"` s `aria-label`, každý okres s `aria-label="Okres X, stav Y, N položek"` v paralelním seznamu |
| Screen reader | vše, co říká mapa, říká i seznam po okresech (stejná data); mapa je „vizualizace seznamu“, ne jediný zdroj |
| CVD | paleta stavů testovaná pro deuteranopii a protanopii (dnes klid zelená / pozor jantar / výpadek červená → doplnit tvar značky) |
| 2.3.3 pohyb | žádné blikání; animace jen s `prefers-reduced-motion` respektováno (už platí) |
| 2.5.8 velikost cíle 24×24 | tlačítka mapy 44×44 (platí i pro mobil) |
| Jazyk | `lang="cs"`, výrazy vysvětlené (část 20) |

---

## R. MVP roadmap

| Fáze | Obsah | Předpoklad | Odhad práce |
|---|---|---|---|
| **0** | Tento dokument; přečtení podmínek u GREEN* zdrojů; odeslání dopisů (část I) a dotazů (část H); založení `data/registr-zdroju.json`; doplnění `PROVOZOVATEL` | rozhodnutí provozovatele | 1–2 týdny (většina je čekání na odpovědi) |
| **1** | Skutečná mapa ČR: RÚIAN → PMTiles; podklad OSM self-host; MapLibre v Přehledu; kraje/okresy/ORP; vrstva POČASÍ z ČHMÚ (výstrahy podle ORP); vrstva BEZPEČNOST z vlastních záznamů s doplněným okresem; stav providerů; metodika mapy | GREEN u ČÚZK, ČHMÚ, ČSÚ | 3–4 týdny |
| **2** | ELEKTŘINA — jen zdroje s vyřešeným oprávněním; tabulky v D1 (část J), syrová data v R2; ingest 5–15 min; rozlišení neplánovaná/plánovaná; karta okresu | odpověď aspoň jednoho distributora | 3 týdny po získání dat |
| **3** | Historie a analytika výpadků: okna 24 h – 1 rok, histogram, P95, „oproti normálu“ s vysvětlením baseline; stránka Historie výpadků | ≥ 6 týdnů dat z fáze 2 | 2–3 týdny |
| **4** | KYBER (NÚKIB — po souhlasu s odběrem) + bezpečnostní události na mapě se stavy ověření; UNVERIFIED skryté | souhlas NÚKIB nebo jen citace | 2 týdny |
| **5** | KOMUNIKACE (ČTÚ / IODA / Radar podle oprávnění), DOPRAVA (JSDI, Správa železnic) | registrace/souhlasy | 3 týdny |
| **6** | Kaskádový monitor (více vrstev ve stejném okrese a okně) | fáze 2 + 5 | 2 týdny |
| **7** | Národní stav se čtyřmi indexy a rozpisem; anomálie s confidence | fáze 3 + 6 | 3 týdny |

Co se **nedělá** v žádné fázi: živé sledování letadel, přesné polohy
infrastruktury, veřejné pořadí „nejzranitelnějších“ okresů, automatická
atribuce, vlastní krizové instrukce.

---

## S. Odhad provozních nákladů

Podle veřejných ceníků k červnu 2026, **NEOVĚŘENO** aktuální výše;
zapsat do `docs/naklady.json`, až budou faktury.

| Položka | Fáze 1 | Fáze 2–3 | Fáze 7 |
|---|---|---|---|
| Cloudflare Pages (web) | 0 Kč | 0 Kč | 0 Kč |
| Cloudflare Workers + KV (API, cron) | 0 Kč (free) | ~125 Kč/měs. (Workers Paid, 5 USD) | ~125 Kč |
| Cloudflare R2 (PMTiles ~2–4 GB, agregáty) | ~0–20 Kč | ~20–50 Kč | ~50–100 Kč |
| Cloudflare D1 (databáze) | 0 Kč (free tier) | v ceně Workers Paid; nad zahrnutý objem řádky a úložiště zvlášť (**NEOVĚŘENO** aktuální ceník) | ~0–250 Kč |
| GitHub Actions | 0 Kč (veřejný repozitář) | 0 Kč | 0 Kč, při 5min cronu zvážit Worker cron |
| Doména | ~30 Kč | ~30 Kč | ~30 Kč |
| Zálohy (R2 snapshoty) | 0 | ~20 Kč | ~50 Kč |
| E-maily, WhatsApp (stávající) | 0–250 Kč | 0–250 Kč | 0–250 Kč |
| **Celkem** | **~30–300 Kč/měs.** | **~200–500 Kč/měs.** | **~300–800 Kč/měs.** |

Lidská práce (ověřování, geokód záznamů, odpovědi providerům, opravy)
v tabulce není a je největší položkou: odhad 5–10 h týdně ve fázi 2+.

---

## T. Největší rizika projektu

1. **Bez dat distributorů není vrstva ELEKTŘINA.** Odpověď může být „ne“
   nebo mlčení. Zmírnění: dopisy hned ve fázi 0; fáze 1 stojí i bez nich;
   žádost podle zákona č. 106/1999 Sb. nelze použít na soukromé
   distributory, jen na ČTÚ/ERÚ.
2. **Licenční omyl.** Přečíst podmínky až po nasazení = stažení vrstvy
   a ztráta důvěry. Zmírnění: pravidlo GREEN-před-čtením v kódu; dokument
   `docs/PRAVNI-KONTROLA.md` rozšířit a nechat přečíst právníkem
   (**LEGAL REVIEW REQUIRED** u TDM výjimky a databázových práv).
3. **Zaměnitelnost s úředním systémem** (§ 357 TZ, krizový zákon).
   Zmírnění: disclaimer, žádné symboly, žádné instrukce mimo citace
   kompetentních orgánů; UNVERIFIED skryté.
4. **Mapa jako mapa zranitelností.** Zmírnění: část 14; interní recenze
   každé nové vrstvy proti seznamu „nepublikovat“; test na výstupu API
   (žádná obec, žádná adresa, žádné pořadí slabých míst).
5. **Falešný klid.** Provider spadne a mapa ukáže „bez poruch“. Zmírnění:
   UNKNOWN ≠ NORMAL v kódu a testech; šrafy; stav providerů viditelný.
6. **Nedostatečná baseline → falešné anomálie.** Zmírnění: anomálie až po
   6 týdnech, confidence, počasí jako kontrola, žádné upozornění bez
   člověka.
7. **Jediný správce a jediný ověřovatel.** Dnes nikdo neschvaluje
   návrhy (22. 9. 2026). Zmírnění: druhý správce; automatické zveřejnění
   jen s úředním zdrojem (zavedeno 22. 9.); vše ostatní zůstává
   nepotvrzené a je tak označené.
8. **Strop velikosti D1 a lidský čas** při růstu dat. Zmírnění: agregáty
   jako soubory, syrová data v R2, ne v DB, podrobné položky jen 24 měsíců; měsíční přehled nákladů
   v `/podporit/`.
9. **Výkon mapy na mobilu** (6 254 obcí se nesmí nikdy načíst naráz).
   Zmírnění: obce jen v textu, PMTiles s generalizací podle přiblížení,
   rozpočet 300 kB pro první vykreslení.
10. **Přístupnost mapy.** Zmírnění: paralelní seznam po okresech je
    zdroj pravdy; mapa jen vizualizace; axe v CI.
11. **Závislost na Cloudflare** (hosting i sledovaná služba). Zmírnění:
    statický export v repozitáři, postup nouzového nasazení jinam.
12. **Právní nejistota kolem vytěžování webů úřadů** bez API. Zmírnění:
    dopisy s žádostí o souhlas nebo strojový kanál; do té doby jen odkaz.

---

## Co následuje po schválení tohoto dokumentu

1. Provozovatel doplní identitu (`PROVOZOVATEL`) a odešle dopisy z části I a dotazy z části H.
2. Někdo s přístupem na web otevře adresy u zdrojů GREEN* a zapíše licence do `data/registr-zdroju.json` (nový soubor podle části E).
3. Teprve potom začne fáze 1: RÚIAN → PMTiles, MapLibre v Přehledu, ČHMÚ výstrahy, geokód stávajících českých záznamů na okres.
