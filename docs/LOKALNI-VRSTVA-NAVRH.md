# Lokální vrstva CzechPatrol — audit a návrh před implementací

29. 9. 2026 · podle zadání „Local Information Infrastructure — Master Implementation Brief“.
**Nic z tohoto dokumentu zatím není naprogramováno.** Implementace začne až po schválení
fází (část 20) provozovatelkou.

**Rozhodnutí provozovatelky (29. 9. 2026):**
1. Tarif Workers Paid — provozovatelka zjistí (do té doby se počítá s oběma variantami).
2. Pilot: **Praha, Brno, Ostrava** (Palkovice a Havířov zatím ne; náhled Palkovic zůstává jen jako ukázka rozložení).
3. Doména API podle obecného zvyku: **`api.czechpatrol.cz`**.
4. Hlavní řádek bez „KLID“ — rozhodne se podle toho, jak bude celé vypadat.
5. Doplněna bezpečnostní architektura (část 21) — závazná pro všechny fáze.

Náhled obrazovky obce: [`lokalni-vrstva/palkovice-nahled.png`](lokalni-vrstva/palkovice-nahled.png)
(zdroj [`palkovice-nahled.html`](lokalni-vrstva/palkovice-nahled.html) — tokeny z `globals.css`,
obsah **smyšlený**, jen rozložení).

Navazuje na dva existující dokumenty a neopakuje je:
- [`RYCHLY-PREHLED.md`](RYCHLY-PREHLED.md) — stavový model zdrojů a informací (z něj lokální vrstva vyrůstá),
- [`SITUACNI-MAPA-NAVRH.md`](SITUACNI-MAPA-NAVRH.md) — registr datových zdrojů (část E: RÚIAN, ČHMÚ,
  distributoři, ŘSD, HZS…) s právním stavem GREEN/YELLOW/RED a rozhodnutí o úložišti (D1, R2, bez PostGIS).

---

## 1. Audit — co v repozitáři je (stav 29. 9. 2026)

| Vrstva | Dnes | Soubory |
|---|---|---|
| Web | Next.js 16, `output: "export"` (statický), Cloudflare Pages, 233 stránek / ~1 535 souborů | `src/app/*`, `next.config.ts` |
| Data webu | JSON v gitu, čtené při buildu (`src/lib/data.ts`, 45 funkcí); 3,4 MB | `data/*.json` |
| API | Cloudflare Worker `czechpatrol-api`, jediná vazba **D1** (žádné KV, R2, Queues); cron `*/10` | `api/`, `api/migrace/0001–0009` |
| Účty | passkeys, relace, `ucty.nastaveni` (JSON: frekvence, min. závažnost, tiché hodiny, témata, **kraj**) | `api/src/*`, `src/lib/ucet.ts` |
| Upozornění | Telegram kanál (rozhlas), Telegram/WhatsApp osobně (fronta v D1), e-mail jen pro kredity; **web push není** | `nastroje/rozhlas.mjs`, `api/src/upozorneni.ts` |
| Sběr | GitHub Actions `sber.yml` (kadence 60–240 min podle kvóty 2 000 min/měsíc, `api/src/minuty.ts`) | `sber/*` |
| Katalog zdrojů | 271 kanálů událostí + 33 úředních stránek + ČHMÚ CAP + palivo ČSÚ + Statuspage | `sber/zdroje-udalosti.ts`, `sber/zdroje.ts` |
| Stav zdrojů | `aktualni / zpozdeny / nedostupny / neuplny / neoveritelny`, meze v `cerstvost-zdroju.json` | `src/lib/prehled/model.ts` |
| Informace | `InformaceVstup`: typ autority, **znění vydavatele vs. naše shrnutí**, **pokyn jen doslova z originálu**, území, platnost, odvolání | `src/lib/prehled/typy.ts` |
| Lokalita | `nenastaveno / cr / kraj` (14 krajů), `vztahKLokalite` → `v-uzemi / mimo / nelze-urcit` | tamtéž, `model.ts:131` |
| Geografie | **jen kraj**. ČHMÚ CAP už čte kódy **CISORP (ORP)**, ale dál je nepředává. Obec, okres, souřadnice, mapa: nic | `sber/vystrahy-chmi.ts` |
| AI | model v sběru je **vypnutý** (bez klíče od 20. 9.); ověřovatel „Patrol“ (rutina) jen navrhuje, `lidskyOvereno` nastaví jen člověk | `sber/model.ts`, `nastroje/spravce.mjs` |
| Klient | `cp:lokalita` (kraj), `czechpatrol:muj-prehled:v1` (země, témata), service worker `cp-v3` (síť napřed, offline stránka) | `rychly-prehled.tsx`, `public/sw.js` |
| Pojistky | 66 testových souborů webu, 13 API; `vykon.test.ts` (klient nesmí na `data.ts`), `odkazy.test.ts`, zákaz `<Suspense>` na úvodu | `testy/`, `api/testy/` |

### Co už odpovídá zadání (a proč nezačínat od nuly)
- **Provenance a pokyny**: `InformaceVstup.textJe` + `pokyn` přesně řeší „AI nesmí vymýšlet pokyny“ — pokyn je jen doslova z originálu, jinak `null`.
- **Čerstvost**: pět stavů zdroje a „nelze potvrdit“ místo falešného „klid“.
- **Pokrytí**: `pokryti { zahrnuto, nelzeOverit, necteme }` je předobraz „Pro tuto obec sledujeme“.
- **Zásada bez jediného semaforu** („bezpečno/nebezpečno“ být nesmí) — viz odchylka v části 15.
- **Úřední zdroj podle adresy** (`nastroje/uredni-zdroj.mjs`) — základ třídy důvěry zdrojů.

---

## 2. Popis architektury (jak to teče dnes)

```
Worker cron (*/10) ──dispatch──▶ GitHub Actions sber.yml ──▶ sber/* ──▶ data/*.json (commit)
                                                                        │
                                   Cloudflare Pages ◀── build (Next export) ◀┘
                                         │
                   prohlížeč ◀── statické stránky + /prehled.json (no-store)
Worker ◀── /stav.json (sync) ──▶ D1 fronta ──▶ Telegram / WhatsApp
```

Data jsou verzovaná v gitu a web je statický. To je silná stránka (nic nemůže
„spadnout“ za běhu, historie je v gitu) i hranice (viz rizika).

## 3. Co se znovu použije

| Existující | Použití v lokální vrstvě |
|---|---|
| `prehled/typy.ts` `InformaceVstup`, `StavZdroje`, `TypInformace` | základ `Zprava` (zpráva zdroje) a stavu zdroje; rozšíří se, nepřepíše |
| `Lokalita` + `vztahKLokalite` | přibude `{druh:"obec"}` a `{druh:"orp"}`; staré hodnoty platí dál |
| `sber/vystrahy-chmi.ts` (CISORP) | **první lokální adaptér zdarma**: výstraha → ORP → obce |
| `KRAJE`, výběr kraje v účtu | kraj obce se odvodí z registru obcí |
| `nastroje/uredni-zdroj.mjs` | třída důvěry zdroje (A úřední podle domény) |
| D1 + migrace přes Actions | registr obcí, zdrojů, událostí, push odběrů |
| `api/src/upozorneni.ts` (`naplanuj`, tiché hodiny, digest) | pravidla pro sledované obce; přibude kanál web push |
| `stahniSeSvolenim` + `sber/robots.ts` | povinná cesta pro obecní weby |
| UI: `Odznak`, `Sdeleni`, `SeznamPolozek/RadekSeznamu`, `StariPodkladu`, `Tlacitko`, tóny `klid/pozor/vazne/neutral` | profil obce bez nových komponent tam, kde to jde |
| `/zdroje` + `KontrolaPokryti` | pokrytí obce a stav zdrojů |

## 4. Rizika rozbití (a jak jim předejít)

| Riziko | Proč | Opatření |
|---|---|---|
| **Limit souborů Cloudflare Pages** | stránka = ~6 souborů; 6 250+ obcí × 6 ≈ 37 500 souborů. Limit Pages na nasazení je podle dokumentace řádově 20 000 souborů (**OVĚŘIT** pro náš tarif) | statické stránky jen pro pilot (Praha, Brno, Ostrava); celostátně jedna stránka-slupka + data z API (část 19) |
| Build a velikost JS | `vykon.test.ts` hlídá, co klient načte | registr obcí nikdy celý do klienta; vyhledávání přes API nebo malý index (~6 250 × název+kód ≈ 150–250 kB gz, načtený až po kliknutí do hledání) |
| Kvóta Actions (2 000 min/měs.) | sběr už jede 60–240 min | lokální zdroje číst **ve Workeru**, ne v Actions (část 9) |
| Worker na tarifu Free | limit CPU na vyvolání je nízký (**OVĚŘIT** aktuální hodnotu); parsování CAP/XML může přetéct | rozhodnutí o tarifu Workers Paid (část 20, bod R1) |
| Rozdíl „událost“ vs. dnešní „záznam“ | `incidenty.json` = kurátorované bezpečnostní případy s lidskou kontrolou | **dvě vrstvy**: záznamy (beze změny) a lokální události (nové, v D1); záznam může na událost odkazovat, ne naopak |
| Úvod a `/prehled.json` | na výkon úvodu se ladilo (LCP 1,9 s) | úvod se v 1.–6. fázi nemění; jen odkaz „Co se děje kolem vás?“ |
| Existující URL a SEO | sitemap, přesměrování | nové cesty jen přibývají (`/obec/…`), žádná se nemění |
| Upozornění, která už běží | Telegram kanál s odběrateli | lokální upozornění jen osobní (push/účet), do veřejného kanálu nic lokálního |

---

## 5. Kanonická obec (schéma)

Zdroj pravdy: **RÚIAN (ČÚZK)** — kódy a hranice; číselníky ČSÚ pro LAU. Stahuje se
jednou měsíčně (SITUACNI-MAPA-NAVRH E.1), nikdy živě.

```sql
-- api/migrace/0010_uzemi.sql (návrh)
CREATE TABLE obce (
  kod        INTEGER PRIMARY KEY,   -- kód obce RÚIAN (6 číslic)
  nazev      TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,  -- „palkovice“; při shodě názvů „nazev-okres“
  lau        TEXT,                  -- LAU 2 (ČSÚ), je-li k dispozici
  orp_kod    INTEGER NOT NULL REFERENCES orp(kod),
  okres_kod  TEXT NOT NULL,         -- LAU 1 / kód okresu
  kraj_kod   TEXT NOT NULL,         -- NUTS 3 (CZ080 = Moravskoslezský)
  obyvatel   INTEGER,               -- ČSÚ, k datu
  stred_lat  REAL, stred_lon REAL,  -- centroid (bod v polygonu), ne adresa
  platne_od  TEXT NOT NULL,         -- verze RÚIAN
  zdroj_verze TEXT NOT NULL
);
CREATE INDEX obce_orp ON obce(orp_kod);
CREATE INDEX obce_nazev ON obce(nazev COLLATE NOCASE);
CREATE TABLE orp  (kod INTEGER PRIMARY KEY, nazev TEXT NOT NULL, kraj_kod TEXT NOT NULL, cisorp TEXT UNIQUE);
CREATE TABLE kraje (kod TEXT PRIMARY KEY, nazev TEXT NOT NULL); -- stejná jména jako KRAJE v prehled/typy.ts
```

- **Geometrie nikdy v D1** (rozhodnutí z mapového návrhu): zjednodušené polygony jako statické
  soubory — `/geo/orp.json` (206 ORP) a `/geo/orp/{kod}.json` (obce jednoho ORP). 207 souborů
  se do limitu Pages vejde.
- **Slug**: cesta `/obec/{slug}/` podle vzoru `/zeme/{kod}/`. Slug se jednou přidělí a nemění;
  přejmenování obce = přesměrování ze starého.

## 6. Registr zdrojů (Source Registry)

Rozšiřuje dnešní `ZdrojUdalosti` (klic, nazev, url, jazyk, primarni, typ). Dnešní katalog
se do registru převede skriptem, ne ručně.

```sql
CREATE TABLE zdroje (
  id              TEXT PRIMARY KEY,           -- „chmi-cap“, „hzs-msk“, „obec-500xxx-web“
  nazev           TEXT NOT NULL,
  vlastnik        TEXT NOT NULL,              -- „ČHMÚ“, „Obec Palkovice“
  druh            TEXT NOT NULL,              -- obec | obec-system | orp | kraj | hzs | policie | zzs | chmi | distributor-el | voda | doprava | zeleznice | verejnopravni | jine
  trida_duvery    TEXT NOT NULL,              -- A úřední (doména/podpis) | B provozovatel infrastruktury | C veřejnoprávní médium | D ostatní
  url             TEXT NOT NULL,
  metoda          TEXT NOT NULL,              -- api | cap | open-data | rss | webhook | feed | web | odkaz
  adapter         TEXT NOT NULL,              -- CapAdapter, RssAdapter, … (část 9)
  uzemi_druh      TEXT NOT NULL,              -- cr | kraj | orp | obce
  uzemi_kody      TEXT NOT NULL,              -- JSON pole kódů
  interval_min    INTEGER NOT NULL,
  cyklus          TEXT NOT NULL,              -- objeveny | overen-automaticky | overen | aktivni | pozastaven | zamitnut
  -- soulad (část 13)
  podminky        TEXT NOT NULL,              -- green | yellow | red | neznamo
  robots          TEXT,                       -- povoleno | zakazano | nerelevantni
  licence_pozn    TEXT,
  kontrola_kdo    TEXT, kontrola_kdy TEXT,
  -- zdraví (část 14)
  posledni_pokus  TEXT, posledni_uspech TEXT, posledni_obsah TEXT,
  chyba           TEXT, neuspechu_za_sebou INTEGER NOT NULL DEFAULT 0,
  verze_parseru   TEXT,
  zapnuto         INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE zdroje_obce (zdroj_id TEXT, obec_kod INTEGER, PRIMARY KEY (zdroj_id, obec_kod)); -- odvozeno z uzemi, pro rychlé „co sledujeme pro obec“
CREATE TABLE pokryti_obce (obec_kod INTEGER, oblast TEXT, stav TEXT, pozn TEXT, PRIMARY KEY (obec_kod, oblast));
-- oblast: pocasi | elektrina | voda | doprava | izs | obec | rozhlas; stav: ctene | necteme | neexistuje | nelze
```

`pokryti_obce` nese i **negativa** („vodárna nečteme“, „obecní rozhlas nemá online kanál“) —
bez nich by profil předstíral úplnost.

## 7. Kanonická událost (Event)

Dvě úrovně, jak zadání žádá: **zpráva zdroje** (nic se nemaže) a **událost** (shluk zpráv).

```sql
CREATE TABLE zpravy (                 -- jedna zpráva jednoho zdroje, neměnná
  id            TEXT PRIMARY KEY,     -- hash(zdroj_id + id u zdroje | url + čas)
  zdroj_id      TEXT NOT NULL REFERENCES zdroje(id),
  url           TEXT,
  vydano        TEXT,                 -- čas u zdroje
  stazeno       TEXT NOT NULL,        -- náš čas
  otisk         TEXT NOT NULL,        -- sha256 původního textu
  titulek       TEXT NOT NULL,
  text          TEXT,                 -- jen je-li převzetí přípustné (část 13), jinak NULL
  text_je       TEXT NOT NULL,        -- zneni-vydavatele | vytah | jen-metadata
  pokyn         TEXT,                 -- doslova z originálu, jinak NULL — NIKDY generovaný
  typ           TEXT NOT NULL,        -- = TypInformace
  uzemi         TEXT NOT NULL,        -- JSON: {obce[], orp[], kraje[], cr, polygon?}
  plati_od TEXT, plati_do TEXT, odvolano TEXT,
  udalost_id    TEXT REFERENCES udalosti(id),
  zarazeni      TEXT,                 -- pravidlo | ai | clovek
  ai_model      TEXT, ai_verze TEXT, ai_jistota REAL
);
CREATE TABLE udalosti (
  id            TEXT PRIMARY KEY,
  druh          TEXT NOT NULL,        -- pocasi | pozar | elektrina | voda | doprava | …
  poddruh       TEXT,
  titulek       TEXT NOT NULL,        -- z nejsilnějšího zdroje, ne generovaný
  shrnuti       TEXT, shrnuti_je TEXT, -- zneni-vydavatele | shrnuti-cp (označí se)
  stav          TEXT NOT NULL,        -- = StavInformace: platna | nadchazejici | ukoncena | odvolana | opravena | nejasna
  zavaznost     TEXT NOT NULL,        -- informace | doporuceni | dulezite | kriticke
  jistota       TEXT NOT NULL,        -- jeden-zdroj | vice-zdroju | uredne-potvrzeno
  zacatek TEXT, aktualizovano TEXT NOT NULL, konec TEXT,
  puvod_obec    INTEGER,
  obce          TEXT NOT NULL,        -- JSON pole kódů (dotčené)
  orp           TEXT NOT NULL, kraje TEXT NOT NULL,
  celostatni    INTEGER NOT NULL DEFAULT 0,
  overeni       TEXT NOT NULL,        -- automaticke | clovek | oprava
  zaznam_slug   TEXT                  -- vazba na národní záznam (incidenty.json), je-li
);
CREATE TABLE udalosti_obce (udalost_id TEXT, obec_kod INTEGER, vztah TEXT, PRIMARY KEY (udalost_id, obec_kod));
-- vztah: puvod | dotcena | v-orp (ORP-úroveň) — relevance je explicitní
CREATE INDEX udalosti_obce_obec ON udalosti_obce(obec_kod);
```

Pokyny úřadu jsou vždy v `zpravy.pokyn` s odkazem na zprávu; událost je jen agreguje.
Časová osa události = `zpravy WHERE udalost_id = ? ORDER BY vydano`.

## 8. Geografické vztahy

```
ČR ─┬─ kraj (14) ─┬─ ORP (206) ─┬─ obec (6 250+)
    │             │             └─ (okres je paralelní dělení, drží se jako atribut)
událost ──udalosti_obce──▶ obec (puvod | dotcena | v-orp)
zpráva.uzemi ──normalizace──▶ nejmenší spolehlivá úroveň (nikdy přesnější, než zdroj řekl)
```

Pravidla relevance:
1. Zpráva s ORP (ČHMÚ CISORP) → všechny obce ORP jako `v-orp`. Na profilu obce se ukáže jako „celé ORP“, ne jako „ve vaší obci“.
2. Zpráva jen s krajem → na profilu obce **není** v „Právě teď“; je v přepínači „Kraj“. (Zadání: nezobrazovat každou krajskou událost jako obecní.)
3. Zpráva s textovým místem („Palkovice, Metylovice“) → shoda s registrem obcí v rámci kraje zdroje; nejednoznačné → `nelze-urcit`, ne odhad.
4. Celostátní (`cr`) → pás nahoře „Celá ČR“, jako dnes v Rychlém přehledu.

## 9. Architektura adaptérů

```ts
interface SourceAdapter {
  id: string;                                  // "cap", "rss", "obec-web", …
  nacti(zdroj: Zdroj, kontext: KontextStahovani): Promise<VysledekAdapteru>;
}
type VysledekAdapteru = { stav: "ok" | "obsah" | "chyba"; zpravy: ZpravaVstup[]; obsahDo?: string; chyba?: string };
```

- `CapAdapter` (ČHMÚ dnes, další CAP později), `RssAdapter` (z `ctiRss`), `ApiAdapter` (JSON se schématem),
  `ObecWebAdapter` (seznam aktualit přes `polozkyZeStranky`, jen s povolením robots), `MunipolisAdapter`
  (jen je-li veřejný feed a podmínky to dovolí — **OVĚŘIT**), `OdkazAdapter` (nic nestahuje, jen pokrytí „jen odkaz“).
- **Kde běží**: rychlé zdroje (CAP, API, RSS, interval ≤ 15 min) ve **Worker cron** — ne v Actions.
  Pomalé a těžké (RÚIAN, obecní weby, 1× za 1–6 h) v Actions dávkově.
- **Společná pojistka ve `KontextStahovani`**: strop velikosti odpovědi (dnes chybí: `o.text()` bez limitu),
  časový limit, zákaz přesměrování mimo povolenou doménu (SSRF), omezení na hostitele (dnes jen 6 naráz celkem),
  User-Agent s kontaktem, robots pro `web`.

## 10. AI pipeline

```
zpráva ─▶ 1 pravidla (typ, území z kódů, platnost)       ← rozhoduje
       ─▶ 2 AI jen tam, kde pravidla nestačí:
             klasifikace druhu, vytažení míst/časů z textu, návrh shluku, krátký výtah
       ─▶ 3 validace výstupu schématem (enumy, kódy obcí z registru, žádný nový pokyn)
       ─▶ 4 nízká jistota → fronta operátora
```

- Vstup do modelu je vždy **data v ohraničeném bloku**; instrukce ze staženého textu se nikdy neprovádějí
  (stejné pravidlo jako dnes u Patrola).
- AI **nesmí**: vytvořit `pokyn`, zvýšit závažnost na `kriticke`, přiřadit obec mimo registr, sloučit události
  napříč druhy bez pravidla. Každá AI změna nese `ai_model`, `ai_verze`, `ai_jistota`.
- Deduplikace: klíč = (druh, ORP, časové okno ±3 h) → kandidáti; AI jen porovná texty v rámci kandidátů.
  Sloučení se dá vrátit (zprávy zůstávají, mění se jen `udalost_id`).
- Dnes je model ve sběru vypnutý (bez kreditu) → **lokální vrstva musí fungovat i bez AI**: pravidla + CAP kódy
  pokryjí pilot. AI je zrychlení, ne podmínka.

## 11. Upozornění

```sql
CREATE TABLE push_odbery (       -- web push (VAPID), později APNs/FCM stejná tabulka
  id TEXT PRIMARY KEY, ucet_id TEXT, zarizeni TEXT NOT NULL,  -- webpush | apns | fcm
  endpoint TEXT NOT NULL UNIQUE, klice TEXT NOT NULL,          -- šifrovaně (sifrovani.ts)
  vytvoreno TEXT NOT NULL, posledni_uspech TEXT, chyb INTEGER DEFAULT 0
);
CREATE TABLE sledovane (         -- sledované obce + úroveň upozornění na obec
  odber_id TEXT, obec_kod INTEGER, stitek TEXT, uroven TEXT NOT NULL, -- kriticke | dulezite | doporuceni | informace | nic
  PRIMARY KEY (odber_id, obec_kod)
);
```

- Anonymní uživatel: push odběr bez účtu (endpoint = identita zařízení); s účtem se sloučí.
- **Kritické** jen když platí vše: zdroj třídy A (případně B pro výpadek infrastruktury), stav `platna`,
  obec v `udalosti_obce` jako `puvod`/`dotcena` (ne jen `v-orp` u malých jevů), závažnost z **pravidla**
  (např. CAP `severity=Extreme|Severe`), ne z AI. Dnešní pravidlo „do veřejného kanálu nic neověřeného“ platí dál.
- Dispatch přes dnešní frontu v D1 (`fronta`, `naplanuj`, tiché hodiny) — kritické tiché hodiny přebíjí,
  ostatní ne. Idempotence podle (událost, odběr, úroveň).

## 12. Soukromí

- Poloha se **nežádá sama**; jen po „◎ Použít moji polohu“ s větou proč.
- **Souřadnice neopustí zařízení**: prohlížeč stáhne `/geo/orp.json`, najde ORP, pak `/geo/orp/{kod}.json`,
  najde obec. Na server jde jen kód obce (a ani ten se neukládá bez sledování).
- Uloží se kód obce, nikdy souřadnice; žádná historie pohybu.
- Sledované obce lokálně (`cp:obce:v1`), v účtu jen seznam kódů. Push odběr ukládá jen endpoint a obce.
- Nastavení „Smazat moje sledované a odběry“ na jedno klepnutí.

## 13. Soulad zdrojů (compliance)

Pořadí metod podle zadání (API → CAP → open data → RSS → webhook → feed → web → jen odkaz).
Každý zdroj má `podminky` (green/yellow/red) z registru v SITUACNI-MAPA-NAVRH.md; **bez green se nečte obsah**.

| Stav | Co se smí |
|---|---|
| green | stahovat, ukládat text dle licence, zobrazit výtah s atribucí |
| yellow | jen metadata (titulek, čas, odkaz, otisk); text se nezobrazuje |
| red / neznámo | jen odkaz v „Oficiální zdroje“ — `OdkazAdapter` |

Nikdy: přihlášení, neveřejné API, obcházení limitů, osobní údaje (adresy z odstávek se neukládají — agregace na obec/část obce).

## 14. Zdraví zdrojů

Mapování na stavy ze zadání bez nového modelu:

| Zadání | Dnes (`StavZdroje`) |
|---|---|
| HEALTHY | `aktualni` |
| DELAYED | `zpozdeny` |
| STALE | `neuplny` (odpověď bez očekávaného obsahu) nebo obsah starší než `interval × k` |
| FAILED | `nedostupny` |
| UNKNOWN | `neoveritelny` / nikdy nečteno |

Nové je jen: měřit i `posledni_obsah` (kdy zdroj naposledy **publikoval**, ne jen odpověděl) a stav počítat
per zdroj v D1, ne v JSON. Upozornění provozovatelce jde dnešní cestou (`upozorni-spravce.mjs`, max 1× za 6 h).

## 15. Wireframe profilu obce (v jazyce dnešního webu)

Viz [`lokalni-vrstva/palkovice-nahled.png`](lokalni-vrstva/palkovice-nahled.png). Pořadí shora, mobil:

```
OBEC
Palkovice                                   [☆]
Moravskoslezský kraj · ORP Frýdek-Místek
[Obec] [Okolí (ORP)] [Kraj] [ČR]
┌───────────────────────────────────────────┐
│ ● 1 platná výstraha                        │   ← co říkají zdroje, ne „klid“
│ 0 mimořádných událostí · 1 provozní        │
│ Zdroje zkontrolovány 14:05 · 3 ze 4 čtených aktuální │
└───────────────────────────────────────────┘
PRÁVĚ TEĎ            (řádky SeznamPolozek; OFICIÁLNÍ · ČHMÚ · platí do)
RYCHLÝ PŘEHLED       (6 dlaždic: stav oblasti nebo „nesledujeme“)
PRO TUTO OBEC SLEDUJEME   (✓ čtené + čas, ○ nečtené a proč)
BEZ INTERNETU        (rádio, siréna — odkazem na HZS/ČRo)
```

**Vědomá odchylka od zadání — žádné „● KLID“.** Rychlý přehled má pravidlo, že jediný semafor
„bezpečno/nebezpečno“ být nesmí: web nemá podklady říct, že je v obci klid, jen že **sledované zdroje nic nehlásí**.
Stav proto zní jedním z:

| Situace | Hlavní řádek | Tón |
|---|---|---|
| nic platného, zdroje čerstvé | „Sledované zdroje nic nehlásí“ | klid (zelená tečka + text) |
| výstraha / provozní | „1 platná výstraha“ | pozor |
| kritická úřední | „Kritická výstraha: {titulek}“ | vazne — **jen tady** výrazná barva |
| zásadní zdroj zpožděný/nedostupný | „Nelze potvrdit — ČHMÚ nečteme od 11:20“ | neutral |

Barva nikdy sama: tečka + slovo + čas. Celá obrazovka se nebarví nikdy.

## 16. Palkovice — konkrétně

| Údaj | Hodnota | Stav |
|---|---|---|
| Kraj | Moravskoslezský | ze zadání; potvrdí RÚIAN |
| ORP / okres | Frýdek-Místek | ze zadání; potvrdí RÚIAN |
| Kód obce, LAU, CISORP | `[DOPLNIT z RÚIAN]` | nevymýšlí se |
| ČHMÚ | výstrahy CAP pro ORP Frýdek-Místek | **funguje hned** (kód CISORP už ČHMÚ posílá) |
| HZS MSK | kanál HZS kraje | kandidát — ověřit formát a podmínky |
| Distributor elektřiny | pravděpodobně ČEZ Distribuce (**OVĚŘIT** pro obec) | YELLOW (SITUACNI-MAPA E.3) — do dohody jen odkaz |
| Voda | provozovatel vodovodu obce — `[DOPLNIT]` | neznámo → „nečteme“ |
| Obec | web, aktuality, úřední deska, případně MUNIPOLIS/jiný systém | kandidáti k objevení (část 13, cyklus) |
| Rozhlas | ČRo regionální stanice pro MSK, frekvence `[DOPLNIT z ČRo]` | jen text + odkaz |

Náhled ukazuje rozložení s **ukázkovými** událostmi (vítr, odstávka) — skutečné Palkovice uvidí jen to,
co zdroje opravdu řeknou.

## 17. Národní přehled zůstává — jak se napojí

- Úvod, `/udalosti/`, `/zeme/`, `/analyzy/`, Telegram kanál, `incidenty.json`, hodnocení, sběr — **beze změny**.
- Rychlý přehled na úvodu: volba lokality dostane vedle krajů **„Obec…“**. Zvolená obec se uloží stejně jako dnes kraj
  (`cp:lokalita`), `vztahKLokalite` rozhodne podle ORP/obce. Pro kraj a ČR se nic nemění.
- Z úvodu jeden vstup „Co se děje kolem vás?“ → `/obec/`. Národní záznam, který se týká obce (např. sabotáž v ORP),
  se na profilu obce ukáže odkazem na existující `/incident/{slug}/` — nekopíruje se.
- Menu: jedna položka „Moje obec“; mobilní lišta zůstává, dokud nevznikne aplikace (4 záložky ze zadání jsou pro aplikaci).

## 18. Strategie migrací

- D1 migrace **jen přidávají** (0010 území, 0011 zdroje, 0012 zprávy+události, 0013 sledované+push). Žádný `ALTER … DROP`.
- Každá migrace má test ve `api/testy` (vytvoří prázdnou DB, projde všechny migrace, ověří schéma).
- Plnění registru obcí skriptem z RÚIAN (idempotentní upsert podle `kod`, verze `zdroj_verze`).
- Přepínač `SPUSTENO.obce` v `src/config/web.ts` (vzor `SPUSTENO.izs`): bez něj nic z lokální vrstvy není v menu ani v sitemapě.
- Rollback: vypnout přepínač (web), vypnout cron adaptéry (`zdroje.zapnuto = 0`), tabulky zůstanou — nic se nemaže.

## 19. API (jedno pro web, PWA, iOS, Android)

Worker `api/` na **`api.czechpatrol.cz`**, verze v cestě, čtení bez přihlášení, cache na hraně (ETag, `s-maxage` 60 s):

| Metoda | Cesta | Co vrací |
|---|---|---|
| GET | `/v1/obce?q=palk` | hledání (kód, název, ORP, kraj) |
| GET | `/v1/obce/{kod}` | obec + ORP + kraj |
| GET | `/v1/obce/{kod}/profil` | **vše pro obrazovku obce**: stav, události (s vztahem), dlaždice, pokrytí, zdroje se stavem, bez internetu, `vygenerovano` |
| GET | `/v1/udalosti/{id}` | událost + časová osa zpráv s odkazy |
| GET | `/v1/uzemi/orp/{kod}/profil`, `/v1/uzemi/kraj/{kod}/profil` | totéž pro vyšší úrovně |
| GET | `/v1/zdroje?obec={kod}` | registr a zdraví pro obec |
| POST/DELETE | `/v1/push/odbery` | web push odběr (bez účtu) |
| PUT | `/v1/push/odbery/{id}/sledovane` | obce a úrovně |
| GET/PUT | `/ja/sledovane` | synchronizace s účtem (existující `/ja/*`) |
| — | `/sprava/zdroje/*`, `/sprava/udalosti/*` | operátor: vypnout zdroj, opravit obec, sloučit/rozdělit, změnit závažnost, zneplatnit shrnutí |

Profil obce se **předpočítává** po každém ingestu (řádek `profily(obec_kod, json, vygenerovano)` nebo KV) — otevření
stránky nic nestahuje ani nepočítá. Web: `/obec/{slug}/` je statická slupka (pilot) nebo jedna slupka `/obec/`
+ `?k=`; data z `/v1/obce/{kod}/profil`. SEO pro všechny obce řeší až pozdější fáze (Worker vrací HTML).

## 20. Fáze s body návratu

| Fáze | Obsah | Hotovo když | Rollback |
|---|---|---|---|
| **0** | tento audit a návrh | schváleno provozovatelkou | — |
| **R1 rozhodnutí** | tarif Workers (CPU, Queues), limit souborů Pages, zdroj RÚIAN, doména API (`api.czechpatrol.cz`?) | rozhodnuto | — |
| 1 | registr obcí/ORP/krajů v D1 + `/geo/*.json`; testy migrací | 6 250+ obcí, 206 ORP, kontrola součtů proti ČSÚ | vypnout plnění; tabulky nevadí |
| 2 | profil obce pro **pilot (Praha, Brno, Ostrava)** jen s ČHMÚ (CISORP) + pokrytí; `SPUSTENO.obce=false` pro veřejnost | náhled pro provozovatelku, mobil i desktop, 0 změn na úvodu | přepínač |
| 3 | registr zdrojů v D1, převod dnešních 271+33 | `/zdroje` čte z registru, výstup stejný | návrat na JSON katalog |
| 4 | adaptéry CAP (Worker) + HZS kraje pilotu, strop velikosti, SSRF pojistky | ČHMÚ ve Workeru ≤ 15 min, Actions bez změny kvóty | vypnout cron adaptéru |
| 5 | zprávy + události (D1), relevance k obci | časová osa u události, nic se nemaže | přepínač |
| 6 | shlukování (pravidla, AI volitelně) + fronta operátora | sloučení vratné, test „5 zpráv → 1 událost“ | vrátit `udalost_id` |
| 7 | sledované obce (lokálně, účet) | přepínání obcí bez účtu | — |
| 8 | web push (VAPID) + pravidla kritičnosti | kritické nikdy jen z AI (test) | vypnout kanál |
| 9 | pokrytí a zdraví na profilu i v `/sprava` | žádný zastaralý údaj bez času | — |
| 10 | offline profil sledovaných obcí v SW (`cp-v4`), označení „z mezipaměti“ | profil bez sítě s časem | vrátit `cp-v3` |
| 11 | stabilizace `/v1` (schéma, verze, dokumentace) | smlouva pro aplikace | — |
| 12 | nativní aplikace | — | — |
| později | „Slyším sirénu“ (jen potvrzené vysvětlení, jinak „zatím nemáme potvrzené vysvětlení“), objevování obecních zdrojů s AI (jen `objeveny` → člověk) | | |

Po každé fázi: testy webu i API, `kontrola-dat`, `kontrola-odkazu` nad buildem, mobil + desktop, Lighthouse úvodu
(LCP ≤ 2,5 s), migrace na prázdné DB, sběr a rozhlas proběhnou.

### Otevřené otázky pro provozovatelku
1. Tarif Workers Paid (CPU, Queues) — zjišťuje provozovatelka.
2. Hlavní řádek bez „KLID“ — rozhodne se na hotovém pilotu.
3. Druhá osoba pro schvalování nouzových zásahů (část 21.6) — dnes je jediná správkyně.

---

## 21. Bezpečnostní architektura (doplnění provozovatelky 29. 9. 2026)

Závazné schéma: **veřejné zdroje → (nedůvěryhodný vstup) → ingestion → hranice důvěry → normalizace →
AI karanténa ∥ Source Trust Engine → Event Engine → hranice důvěry → Safety Kernel (bez LLM) →
publikace / upozornění**, a **oddělená bezpečnostní rovina** pro správu a nouzové vypínače.

Níž je každý blok převedený na konkrétní místo v kódu, s tím, co z toho **už dnes existuje** a co chybí.

### 21.1 Ingestion zone (všechno je nedůvěryhodné)

| Požadavek | Dnes | Doplnit |
|---|---|---|
| parser | regexové čtení RSS/Atom a CAP (`sber/nacti.ts`, `vystrahy-chmi.ts`); DTD/entity se nezpracují → XXE nehrozí | pevné schéma výstupu adaptéru (část 9), neznámý tvar = `obsah`, ne „nic“ |
| sanitizer | web vykresluje texty přes React (escapování); `dangerouslySetInnerHTML` jen pro vlastní skripty v `layout.tsx` | test: žádný `dangerouslySetInnerHTML` s daty ze zdrojů; texty zdrojů jen jako prostý text, odkazy jen `https?:` |
| velikost a čas | časový limit 20 s; **strop velikosti chybí** (`o.text()` celé tělo); API bez stropu těla požadavku | strop odpovědi (např. 2 MB, CAP 5 MB) s čtením po částech; strop těla v API |
| přesměrování, SSRF | adresy jsou pevné z registru | povolit přesměrování jen v rámci domény zdroje; zakázat privátní IP a `localhost`; Worker nikdy nestahuje adresu od uživatele (dnes platí, zachovat testem) |
| „malware/content checks“ | stahuje se jen text | přijmout jen `text/*`, `application/(rss\|atom\|xml\|json)`; binárky se nestahují vůbec; záplava (stejný otisk ×N) se sloučí |
| neměnný archiv syrových dat | ukládá se jen výřez a otisk u kandidátů | **R2** (bucket s retencí, zápis bez přepisu, klíč = otisk) — R2 má bezplatnou úroveň, nezávisí na tarifu Workers; v D1 jen otisk a klíč |

### 21.2 Hranice důvěry → normalizace

Normalizace je **deterministický kód** (čas, místo → kód obce z registru, zdroj, typ, provenance).
Co se nepřevede na kód z registru, zůstane `nelze-urcit` — nic se nedomýšlí (dnešní pravidlo ČHMÚ adaptéru).

### 21.3 AI karanténa — „žádné privilegium“

- Model nemá nástroje, síť ani zápis. Dostane data v ohraničeném bloku, vrátí **návrh v JSON**, který se ověří schématem.
- Smí navrhnout: shluk, druh, místa a časy z textu, krátký výtah (označený `shrnuti-cp`).
- **Nesmí** (vynucuje Safety Kernel, ne model): vytvořit nebo upravit `pokyn`, zvýšit závažnost, publikovat, poslat upozornění,
  změnit důvěru zdroje, přiřadit obec mimo registr.
- Dnes: model ve sběru je vypnutý a přepínač AI už existuje (`PUT /sprava/nastaveni-ai`, čte ho sběr přes `/nastaveni-sberu`) — to je základ **AI KILL SWITCH**.

### 21.4 Source Trust Engine

| Rozměr | Pravidlo |
|---|---|
| identita | doména z registru, TLS, přesměrování jen v doméně; úřední podle adresy (`nastroje/uredni-zdroj.mjs`, dnes s testy) |
| autorita | třída A–D (část 6); z Ruska jen sbírka předpisů, ministerstva stran konfliktu nikdy úřední (dnešní test) |
| scope | zpráva mimo geografický rozsah zdroje (HZS MSK o Praze) se neuvěří — jde k operátorovi |
| health | stavy z části 14 |
| **compromise state** | zdroj náhle změní vzorec (jiná doména odkazů, text s instrukcemi pro čtenáře/AI, skok objemu, neobvyklá závažnost) → `podezrely`: jeho zprávy nejdou do upozornění ani do „Právě teď“, dokud je člověk nepotvrdí |

### 21.5 Event Engine a rozpory

Rozpor dvou úředních zdrojů (jeden odvolá, druhý platí; různé území) se **nesloučí potichu**: událost dostane stav
`nejasna`, na profilu jsou vidět obě verze se zdroji. Kernel u `nejasna` nikdy nepošle kritické upozornění.

### 21.6 CzechPatrol Safety Kernel — deterministický, bez LLM

Jeden modul (návrh `src/lib/jadro/`, sdílený webem, Workerem i sběrem), čisté funkce, čas zvenčí. Každá publikace
a každé upozornění projde všemi kontrolami; neprojde-li jedna, výsledek je „nepublikovat / neposlat“ a důvod do auditu.

| Kontrola | Pravidlo |
|---|---|
| authority | kritické jen ze zdroje třídy A (B jen pro výpadek jeho vlastní infrastruktury) |
| provenance | každý zobrazený fakt má zprávu s URL, časem a otiskem; bez ní se nezobrazí |
| geography | obec v `udalosti_obce` jako `puvod`/`dotcena`; `v-orp` jen ORP-úrovňové jevy (počasí) |
| freshness | zpráva i zdroj v mezích čerstvosti; jinak „nelze potvrdit“, nikdy „platí“ |
| **instruction** | `pokyn` musí být **doslovný podřetězec** syrového textu zdroje (po normalizaci mezer) — ověřitelné strojově, AI pokyn nevyrobí |
| notification policy | úroveň podle pravidel (část 11), tiché hodiny, idempotence, rychlostní strop na obec |
| contradiction | stav `nejasna` nebo zdroj `podezrely` → žádné kritické |

Pojistky testem (vzor `vykon.test.ts`): modul `jadro` nesmí importovat nic z `sber/model.ts`, SDK modelů ani síť;
pro každou kontrolu testy „projde“ i „neprojde“.

### 21.7 Publikace a upozornění

- Veřejné API jen pro čtení (`/v1/*`), žádná data od uživatele se nepromítají do veřejných odpovědí.
- Push gateway jako samostatný modul Workeru s vlastním vypínačem a stropem (N zpráv za minutu celkem i na zařízení).
- APNs/FCM až s aplikacemi; stejná politika Kernelu.

### 21.8 Oddělená bezpečnostní rovina (správa)

| Požadavek | Dnes | Doplnit |
|---|---|---|
| hardwarové MFA | přihlášení **passkey** (WebAuthn, klíč v zařízení) | pro roli `admin` **zakázat obnovu jen kódem** (dnes `/auth/obnova` pustí i správce); správce ≥ 2 passkeys (záloha) |
| RBAC | role `obcan / podporovatel / izs / admin` (`api/src/role.ts`) | role `operator` (zdroje, události) bez práv k účtům a platbám |
| schvalování | změny záznamů přes `schvaleni.yml` s auditem | dvojí schválení pro vypnutí nouzového režimu a změnu třídy zdroje — **vyžaduje druhou osobu** (otevřená otázka) |
| audit log | tabulka `audit` v D1 | zápis jen přidáváním; každý vypínač, oprava závažnosti a sloučení událostí |
| tajemství | secrets přes `wrangler secret put` | `SPRAVCE_CHAT` přesunout z proměnných do secrets; `ADMIN_BOOTSTRAP_KOD` po použití odstranit |
| známé slabiny z auditu | — | atomický rate limiter (dnes read-then-write), strop těla požadavku, obnova kódem prochází všechny účty |

### 21.9 Nouzové vypínače

Stav vypínačů v D1 (`stav`) + zrcadlo v repozitáři pro Actions (vzor dnešního `data/fronta/rozhlas-pozastaveno.json`).
Ovládání z `/sprava` jedním klepnutím z telefonu, každé přepnutí do auditu a zprávou správkyni.
**Selhání čtení vypínače = bezpečná poloha** (nečitelný stav push = neposílat).

| Vypínač | Co udělá | Dnes |
|---|---|---|
| PUSH KILL SWITCH | žádná upozornění žádným kanálem | jen Telegram kanál (`rozhlas-pozastaveno.json`) → rozšířit na frontu v D1 a push |
| AI KILL SWITCH | model se nevolá; pipeline běží jen na pravidlech | existuje (`nastaveni-ai`) |
| SOURCE KILL SWITCH | jeden zdroj (nebo třída) se nečte ani nezobrazuje | nové (`zdroje.zapnuto`) |
| INGESTION KILL SWITCH | žádný sběr; web ukazuje poslední stav s časem a „sběr pozastaven“ | nové (dnes jen vypnutím workflow) |
| READ-ONLY MODE | API odmítá zápisy kromě správy | nové |
| VERIFIED-ONLY MODE | publikuje se jen lidsky ověřené; cesty `automaticke` a `neovereno` stojí | nové (dnes pravidla v `spravce.mjs zverejni`) |

### 21.10 Kam to patří ve fázích

Bezpečnost není samostatná fáze na konci: **fáze 1** dostane strop velikosti, SSRF pojistky a vypínače
(ingestion, source, read-only); **fáze 4** R2 archiv a Trust Engine; **fáze 5** Safety Kernel před první publikací
lokální události; **fáze 8** push až s Kernelem, push kill switchem a stropem. Bez Kernelu se nic lokálního nepublikuje.
