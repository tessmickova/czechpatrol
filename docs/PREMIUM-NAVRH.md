# Premium MVP + kredit 150 Kč — návrh před implementací

Stav k 23. 9. 2026. Odpověď na zadání „Premium MVP + Commitment Credit“.
**Nic z toho není naprogramováno.** Dokument čeká na schválení; kde se
něco nedalo ověřit z kódu nebo vyžaduje rozhodnutí provozovatele, stojí
**UNKNOWN / REQUIRES DECISION**. Kde jde o právo, stojí **LEGAL REVIEW
REQUIRED** a žádný právní závěr se tu nedělá.

Jedna věc předem, protože mění pořadí prací: **web dnes nemá uvedeného
provozovatele** (`PROVOZOVATEL` v `src/config/web.ts` je prázdné). Bez
právní identity nejde přijímat platby, vystavovat doklady, uzavírat
smlouvu s platební bránou ani psát obchodní podmínky. Je to první krok
roadmapy (část 22), ne technický detail.

---

## 1. Audit současného kódu

| Oblast | Co existuje | Co z toho plyne |
|---|---|---|
| Framework | Next.js 16, App Router, `output: "export"` (statický web), React 19, TypeScript, Tailwind 4, vitest | Web nemá server; cokoli s tajemstvím běží v API Workeru |
| Routing | statické stránky + jazykové zrcadlo `[jazyk]`; klientské komponenty pro účet, Můj přehled, Odolnost | Premium stránky budou stejný vzor: statická stránka + klientská komponenta čtoucí API |
| Auth | Worker `api/` (Cloudflare Workers) s D1; passkey (WebAuthn), obnovovací kód, tokeny jako SHA-256 otisk, role `obcan / podporovatel / izs / admin`, `smiZmenitRoli` | Účet **nemá e-mail, jméno ani telefon** (záměr, `docs/PRAVNI-KONTROLA.md`). Kredit „na e-mail“ tedy vyžaduje nový, dobrovolný e-mail u účtu — viz část 8 |
| Databáze / ORM | Cloudflare D1 (SQLite), bez ORM, SQL v `api/src/*.ts`, migrace `api/migrace/000N_*.sql` aplikované při nasazení | Nové tabulky = nová migrace `0005_platby.sql`; transakce přes `DB.batch()` (D1 nemá interaktivní transakce) |
| Tabulky | ucty, passkeys, vyzvy, relace, kanaly, propojeni, zpravy_izs, zpravy, fronta, stav, audit, limity, tipy, zajem | `audit` existuje (kdo/kdy/co/cíl), append-only jen konvencí; `limity` = brzda podle otisku IP; `zajem` = e-maily pro souhrn (bez vazby na účet) |
| Design system | tokeny v `globals.css`, stavebnice `ui.tsx` (Tlacitko, Odznak, Sdeleni, RadekSeznamu), `formulare.tsx` (POLE, Popisek, Hlaska, Volby), `zaklad.tsx` (Napoveda, Otaznik, Karta), `docs/ZNACKA.md` | Nic nového se nezakládá; Premium používá totéž |
| Odolnost (včera) | `/odolnost/` pro přihlášené: katalog `data/odolnost/funkce.json`, model `src/lib/odolnost.ts` (redundance, společné selhání, jediné body selhání, horizonty, spotřeba vody a energie, „Co má teď největší smysl“, „Tohle nemohu vyřešit“, export JSON) — **vše v prohlížeči, profil jen v zařízení** | Většina z toho je v zadání označená jako Premium. Rozhodnutí v části 3 |
| Připravenost | `/pripravenost/`: katalog oficiálních nástrojů, skóre z odpovědí mám/nemám/nevím v zařízení | zůstává FREE |
| Platby | **žádný provider.** `PLACENE.hraniceADoprava = false`, `BUY_ME_A_COFFEE_URL` prázdné. E-shop Čenich (samostatný repozitář) má adaptér **Comgate** (`apps/core/src/payments/comgate.ts`, push + autoritativní `/v1.0/status`, stavy created…partially_refunded), zatím v testovacím režimu, bez ostrého merchant účtu | Provider pro CzechPatrol: **REQUIRES DECISION** (část 5) |
| E-mail | **žádná odesílací infrastruktura** (ani v API, ani v e-shopu). Forpsi nabízí schránky na czechpatrol.cz | Provider: **REQUIRES DECISION** (část 8) |
| PWA / offline | `public/sw.js` (skořápka + navštívené stránky do cache), `manifest.webmanifest`, stránka `/offline/` | Offline pack jako stránka je proveditelný; PDF jen přes tisk prohlížeče |
| Správa | `/sprava/` (účty, audit, návrhy, tipy, Patrol, zamítnuté), API `sprava.*` jen pro `admin` | Sekce Platby / Kredity / E-maily se přidají sem |
| Měření | `src/lib/mereni.ts`, události jen s názvem a cestou, zapnuté jen s `NEXT_PUBLIC_MERENI_URL` | Trychtýř z části AL jde přidat jako názvy událostí |
| Nasazení | Pages (web) a Worker (API) přes GitHub Actions; tajemství jen v GitHub/Cloudflare | Klíče brány a e-mailu tam patří také |
| Kód je veřejný | repozitář je veřejný, engine odolnosti je v klientském JS | **Tvrdá brána nad výpočtem není možná bez přesunu enginu na server**; viz část 3 a red team |

Neověřené z kódu: stav živnosti / subjektu provozovatele, DPH režim,
účet u Comgate, doména pro e-mail, zda e-shop Čenich bude mít vlastní
účty nebo sdílí účty s CzechPatrol (**UNKNOWN / REQUIRES DECISION** —
rozhoduje, jak se kredit uplatní).

---

## 2. Navrhovaný tok uživatele

```
/odolnost/ (audit, i bez účtu — nová změna)  ──►  souhrn zdarma
      │                                                │
      │ „Podle zadaných údajů: 8 oblastí v pořádku,      │
      │  3 slabiny, 2 kritické závislosti“              │
      ▼                                                ▼
  bezpečnostní nálezy (vždy zdarma, hned)      náhled Premium (počty, ne obsah)
                                                       │
                                            [ Odemknout můj plán — 150 Kč ]
                                                       │
                                          přihlášení / založení účtu (passkey)
                                                       │
                                            doplnění e-mailu (dobrovolné, viz 8)
                                                       │
                                        platební stránka brány (mimo náš web)
                                                       │
                                webhook + ověření stavu  →  oprávnění + kredit (jedna dávka)
                                                       │
                                     plné výsledky + kredit v účtu + e-mail (úloha, s opakováním)
                                                       │
                                        akční plán, „Tohle nemohu použít“, offline plán
```

Změna proti dnešku: audit může začít **bez účtu** (profil v zařízení,
jako dnes Připravenost). Účet je nutný až před platbou, aby šlo bezpečně
přiřadit oprávnění, kredit a výsledky.

---

## 3. Hranice FREE / PREMIUM

| Vždy zdarma (i bez účtu) | Premium (po odemknutí) |
|---|---|
| tísňová čísla, oficiální postupy, katalog nástrojů, 72h základ, offline stránky, situační přehled | dependency graph s výpisem, co vypne co |
| audit domácnosti a **souhrn s počty**: kolik oblastí je v pořádku, kolik slabin, kolik kritických závislostí, stav 24 h / 72 h | jednotlivé body selhání a společná selhání s vysvětlením |
| **každý bezpečnostní nález** (např. spalovací topidlo uvnitř bez určení, závislost zdravotního přístroje na síti) s odkazem na oficiální postup | horizonty 7 / 14 / 30 dní, rozpočet vody po účelech, rozpočet energie po režimech |
| „Za 0 Kč“ (rady bez nákupu) | plán A/B/C, náhradní cesty po „Tohle nemohu použít“, scénáře, offline plán, historie |

**REQUIRES DECISION:** včera nasazená stránka Odolnost dává celý engine
zdarma přihlášeným. Návrh: nechat ji jako **audit + souhrn** (FREE) a
podrobné výstupy přesunout za odemknutí. Alternativa: nechat vše zdarma
a za 150 Kč prodávat jen kontinuitu (uložení na server, offline plán,
scénáře, historie) + kredit. Druhá varianta je poctivější vůči veřejnému
kódu (viz red team), první má jasnější hodnotu.

---

## 4. Okamžik platby (paywall)

Objeví se až po dokončeném auditu a zobrazeném souhrnu. Text:

> **Audit dokončen.** ✓ 8 oblastí v pořádku · ⚠ 3 významné slabiny · ⚠ 2 kritické závislosti · ✓ 72 h: připraveno
>
> **Chcete vidět, kde přesně může vaše domácnost selhat?**
> Premium analýza obsahuje: vaše kritické závislosti · co selže jako první · odolnost 7 / 14 / 30 dní · náhradní cesty, když něco nemůžete získat · rozpočet energie · rozpočet vody · plán A / B / C · offline plán.
>
> [ Odemknout můj plán — 150 Kč ]
> Celých 150 Kč vám vrátíme jako kredit 150 Kč na nákup v CzechPatrol e-shopu.
>
> *Proč to děláme?* Když do nějakého cíle sami něco vložíme, často máme větší motivaci ho skutečně dokončit. Proto nechceme, aby těch 150 Kč skončilo jen jako poplatek za výsledek — dostanete je zpět jako kredit na praktickou přípravu.
>
> E-shop připravujeme. Kredit bude možné využít po jeho spuštění, podle zveřejněných podmínek. *(LEGAL / CONSUMER LAW REVIEW REQUIRED)*

Bez odpočtů, bez „vaše rodina je v nebezpečí“, bez „zaplaťte a zjistěte
proč“. Bezpečnostní nálezy jsou nad tímto blokem, ne pod ním.

---

## 5. Architektura plateb

**REQUIRES DECISION:** provider. Doporučení: **Comgate**, jeden merchant
účet pro CzechPatrol i e-shop, protože e-shop už má hotový adaptér a
české platební metody. Integrace v API Workeru CzechPatrol (ne přes
e-shop): jednodušší odpovědnost, kredit vzniká tam, kde vzniká oprávnění.

Tok (server-authoritative):

1. `POST /platby/zacit` (přihlášený) → záznam `platby` ve stavu CREATED s vlastním `idempotency_key`, volání Comgate „create“ → PENDING, vrátí adresu platební stránky.
2. Uživatel platí u brány. Návrat na `/premium/vysledek?platba=…` **nic neodemyká**; stránka jen čte stav z API.
3. Comgate push na `POST /platby/webhook/comgate`: ověření tajemství (porovnání bez úniku času) → **autoritativní dotaz** na stav u brány → teprve podle něj přechod stavu.
4. Přechod na PAID = jedna dávka `DB.batch()`: `platby.stav=PAID`, `opravneni` INSERT, `kredity` INSERT, `emaily` INSERT (úloha), `audit` INSERT ×3. Idempotence: `UNIQUE(provider, provider_payment_id)` + kontrola stavu před zápisem; opakovaný webhook najde PAID a skončí 200 bez zápisu.
5. Stavy: CREATED → PENDING → PAID | FAILED | CANCELLED; PAID → REFUNDED | PARTIALLY_REFUNDED (Comgate refund je oddělená operace; UNKNOWN, zda push chodí i pro refund — ověřit v dokumentaci Comgate).

Cron Workeru (už existuje `scheduled`) doplní kontrolu: platby v PENDING starší než 2 h se dotáží na stav u brány (ztracený webhook), e-maily ve stavu FAILED se zkusí znovu.

---

## 6. Model oprávnění (entitlement)

Ne `user.isPremium`. Tabulka `opravneni`:

| Pole | Význam |
|---|---|
| id, ucet_id | komu |
| produkt | `premium-odolnost` (později `premium-rodina`, …) |
| druh | `jednorazove` · později `predplatne`, `rodina`, `rocni`, `dar` |
| zdroj_druh, zdroj_id | `platba` + id platby · `admin` · později `predplatne`, `dar` |
| platne_od, platne_do | NULL = bez konce (jednorázové odemknutí) |
| stav | ACTIVE · REVOKED · EXPIRED |
| pro_domacnost_id | NULL = jen účet; později rodinný plán |
| vytvoreno, zruseno, duvod_zruseni | audit |

Kontrola: „má účet aktivní oprávnění na produkt k času T“ — jediná funkce
v API, kterou volá vše ostatní. Přidat předplatné = nový `druh` a
`platne_do`, ne přepis.

---

## 7. Životní cyklus kreditu

Tabulka `kredity` přesně podle zadání (id, kod, ucet_id, platba_id,
hodnota_haleru, mena, stav, vytvoreno, expirace?, uplatneno?,
uplatneno_objednavka?, vydal, nahrada_za_id?, nahrazen_id?, duvod?,
metadata) + tabulka `kredit_uplatneni` (kredit_id, objednavka_id,
castka_haleru, kdy, idempotency_key UNIQUE).

- **Kód:** 8 znaků z abecedy bez záměnných písmen (bez 0/O, 1/I/L), tvar
  `CP-XXXX-XXXX`, generovaný `crypto.getRandomValues` (≈ 40 bitů entropie
  na 8 znaků z 32 → 2^40 ≈ 10^12 možností; při 1 000 vydaných kódech a
  brzdě 10 pokusů/min je hádání bezpředmětné). Uloží se **otisk SHA-256
  + poslední 4 znaky** pro vyhledání a maskování; plný kód **šifrovaně
  AES-GCM** klíčem z tajemství Workeru, aby ho šlo ukázat v účtu a poslat
  znovu. V logu jen `CP-****-X9PQ`.
- **Stavy:** ACTIVE → REDEEMED | REVOKED | REPLACED | EXPIRED.
- **Uplatnění** (až bude e-shop): `POST /kredity/uplatnit` z e-shopu s
  jeho serverovým tokenem: jedna dávka `UPDATE kredity SET stav='REDEEMED', uplatneno=?, uplatneno_objednavka=? WHERE id=? AND stav='ACTIVE'` + INSERT do `kredit_uplatneni`; když UPDATE změní 0 řádků, uplatnění se odmítne. To řeší dva souběžné pokusy bez zámků (D1 vykoná dávku atomicky).
- **Expirace:** návrh **bez expirace** (zadání: neexpirovat kvůli urgenci). Pokud právník expiraci vyžaduje, musí být na tlačítku před platbou. LEGAL REVIEW REQUIRED.
- **Kredit ≠ promo kód:** promo kódy (budou v e-shopu) mají vlastní tabulku; kredit vždy odkazuje na konkrétní platbu a účet a je auditovatelný v řetězu platba → kredit → e-mail → uplatnění/náhrada.

---

## 8. Tok e-mailu

**REQUIRES DECISION (dvě věci):**

1. **Účet nemá e-mail.** Návrh: u účtu nové dobrovolné pole `email`
   (šifrovaně, s časem souhlasu), zadávané před platbou s textem „Kam
   poslat kód. Nepovinné — kód uvidíte i v účtu.“ Bez e-mailu platba
   projde a kód je jen v účtu. Změna e-mailu jen po přihlášení; „Poslat
   znovu“ jen po přihlášení; u změny e-mailu vyžadovat čerstvé přihlášení
   passkeyem (WebAuthn to umožňuje: nová výzva).
2. **Odesílání.** Workers neumí SMTP; potřeba služba s API (Postmark,
   Resend, Mailgun — **UNKNOWN**, která; kritéria: DPA, zpracování v EU,
   DKIM/SPF na czechpatrol.cz, cena do stovek Kč/měs.). Odesílatel
   `kredit@czechpatrol.cz` na nové doméně.

Tabulka `emaily`: id, ucet_id, druh (`kredit-vydan`, `kredit-znovu`,
`kredit-nahrada`), kredit_id, adresa_otisk, stav (QUEUED · SENT ·
FAILED · DELIVERED?), pokusy, posledni_chyba, vytvoreno, odeslano.
Odeslání je **úloha po zápisu**, ne podmínka zápisu: kredit existuje, i
když e-mail selže; cron opakuje 3× s odstupem; po třetím selhání stav
FAILED viditelný ve správě a v účtu („E-mail se nepodařilo doručit; kód
je tady“).

Obsah e-mailu podle zadání (předmět „Váš CzechPatrol kredit 150 Kč“,
kód, hodnota, stav, podmínky odkazem, věta „Kód najdete také ve svém
účtu“, a pokud e-shop neběží: „Kredit bude možné využít po spuštění
CzechPatrol e-shopu.“).

---

## 9. Refund a náhradní kódy

| Situace | Pravidlo |
|---|---|
| Refund platby, kredit ACTIVE | kredit → REVOKED (důvod `refund`), oprávnění → REVOKED, audit REFUND |
| Refund platby, kredit REDEEMED | **BUSINESS + LEGAL DECISION REQUIRED.** Nic se automaticky nedělá; platba dostane příznak `vyzaduje_rozhodnuti` a objeví se ve správě |
| Částečný refund | totéž jako výše; MVP ho nevyvolává (jedna cena, žádné dílčí položky) |
| Náhradní kód | správce vybere kredit → „Vydat náhradní kód“ → povinný důvod (EMAIL_ISSUE · EXPOSED_CODE · TECHNICAL_ISSUE · SUPPORT_RESOLUTION · OTHER) → jedna dávka: starý REPLACED + `nahrazen_id`, nový ACTIVE + `nahrada_za_id`, e-mail úloha, audit CREDIT_REPLACED. Oba aktivní nikdy |
| Náhrada REDEEMED kódu | zakázáno v kódu |
| Ruční kredit | zvláštní oprávnění `kredit.vydat_rucne` (ne každý admin): účet, hodnota, měna, důvod, interní poznámka; audit ADMIN_MANUAL_CREDIT. Pole `schvalil_2` NULL pro budoucí schválení dvěma osobami nad prahem (práh v konfiguraci, dnes vypnutý) |

---

## 10. Oprávnění správců

Dnes jen role `admin`. Návrh: tabulka `opravneni_spravcu` (ucet_id,
pravo, udelil, kdy) s právy `platby.cist`, `kredity.nahradit`,
`kredity.vydat_rucne`, `emaily.znovu`, `audit.cist`. Role `admin` dostane
při migraci vše kromě `kredity.vydat_rucne`, to se uděluje ručně a je
v auditu. Audit tabulka: API nemá žádnou cestu UPDATE/DELETE nad ní; D1
zálohy (Time Travel) kryjí i přímý zásah přes CLI — to je jediný způsob,
jak ji změnit, a zůstává mimo web.

---

## 11. Databázové schéma (migrace `0005_platby.sql`)

```sql
CREATE TABLE platby (
  id TEXT PRIMARY KEY, ucet_id TEXT NOT NULL REFERENCES ucty(id),
  produkt TEXT NOT NULL, castka_haleru INTEGER NOT NULL, mena TEXT NOT NULL DEFAULT 'CZK',
  provider TEXT NOT NULL, provider_payment_id TEXT, idempotency_key TEXT NOT NULL UNIQUE,
  stav TEXT NOT NULL CHECK (stav IN ('CREATED','PENDING','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')),
  vraceno_haleru INTEGER NOT NULL DEFAULT 0, vyzaduje_rozhodnuti INTEGER NOT NULL DEFAULT 0,
  vytvoreno TEXT NOT NULL, zaplaceno TEXT, aktualizovano TEXT NOT NULL,
  UNIQUE (provider, provider_payment_id)
);
CREATE TABLE platby_udalosti (   -- surové webhooky, append-only, pro forenziku
  id INTEGER PRIMARY KEY AUTOINCREMENT, platba_id TEXT, prijato TEXT NOT NULL, provider TEXT NOT NULL,
  telo_otisk TEXT NOT NULL, stav_u_brany TEXT, zpracovano INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE opravneni (
  id TEXT PRIMARY KEY, ucet_id TEXT NOT NULL REFERENCES ucty(id), produkt TEXT NOT NULL,
  druh TEXT NOT NULL, zdroj_druh TEXT NOT NULL, zdroj_id TEXT, pro_domacnost_id TEXT,
  platne_od TEXT NOT NULL, platne_do TEXT, stav TEXT NOT NULL CHECK (stav IN ('ACTIVE','REVOKED','EXPIRED')),
  vytvoreno TEXT NOT NULL, zruseno TEXT, duvod_zruseni TEXT
);
CREATE INDEX opravneni_ucet ON opravneni (ucet_id, produkt, stav);
CREATE TABLE kredity (
  id TEXT PRIMARY KEY, kod_otisk TEXT NOT NULL UNIQUE, kod_posledni4 TEXT NOT NULL, kod_sifrovany TEXT NOT NULL,
  ucet_id TEXT NOT NULL REFERENCES ucty(id), platba_id TEXT REFERENCES platby(id),
  hodnota_haleru INTEGER NOT NULL, mena TEXT NOT NULL DEFAULT 'CZK',
  stav TEXT NOT NULL CHECK (stav IN ('ACTIVE','REDEEMED','EXPIRED','REVOKED','REPLACED')),
  vytvoreno TEXT NOT NULL, expirace TEXT, uplatneno TEXT, uplatneno_objednavka TEXT,
  vydal TEXT NOT NULL, nahrada_za_id TEXT REFERENCES kredity(id), nahrazen_id TEXT REFERENCES kredity(id),
  duvod TEXT, schvalil_2 TEXT, metadata TEXT
);
CREATE TABLE kredit_uplatneni (
  id TEXT PRIMARY KEY, kredit_id TEXT NOT NULL REFERENCES kredity(id), objednavka_id TEXT NOT NULL,
  castka_haleru INTEGER NOT NULL, kdy TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE
);
CREATE TABLE emaily (
  id TEXT PRIMARY KEY, ucet_id TEXT NOT NULL, druh TEXT NOT NULL, kredit_id TEXT, adresa_otisk TEXT NOT NULL,
  stav TEXT NOT NULL CHECK (stav IN ('QUEUED','SENT','FAILED','DELIVERED')), pokusy INTEGER NOT NULL DEFAULT 0,
  posledni_chyba TEXT, vytvoreno TEXT NOT NULL, odeslano TEXT
);
CREATE TABLE opravneni_spravcu (ucet_id TEXT NOT NULL, pravo TEXT NOT NULL, udelil TEXT NOT NULL, kdy TEXT NOT NULL, PRIMARY KEY (ucet_id, pravo));
ALTER TABLE ucty ADD COLUMN email_sifrovany TEXT;      -- dobrovolné, viz část 8
ALTER TABLE ucty ADD COLUMN email_souhlas_kdy TEXT;
-- Domácnost a výsledky Premium (jen po zaplacení, jinak zůstává profil v zařízení):
CREATE TABLE domacnosti (id TEXT PRIMARY KEY, ucet_id TEXT NOT NULL, nazev TEXT, vytvoreno TEXT NOT NULL, aktualizovano TEXT NOT NULL);
CREATE TABLE hodnoceni (id TEXT PRIMARY KEY, domacnost_id TEXT NOT NULL, verze_katalogu TEXT NOT NULL,
  profil_sifrovany TEXT NOT NULL, vysledek_sifrovany TEXT NOT NULL, vytvoreno TEXT NOT NULL);
```

Entity ze zadání a kde jsou: User = `ucty`; Household = `domacnosti`;
HouseholdMember, Location, Need, Resource, Equipment, Dependency,
Fallback, InventoryGroup, Plan, ScenarioResult, OfflinePack = **uvnitř
`hodnoceni.profil_sifrovany` a `vysledek_sifrovany`** jako JSON podle
typů v `src/lib/odolnost.ts`, ne jako samostatné tabulky. Důvod: D1 nemá
šifrování sloupců a preparedness data jsou citlivá; jeden šifrovaný blok
na hodnocení se nedá dotazovat po členech (ani nechceme) a je jednoduše
smazatelný. Audit správců = stávající `audit` s novými hodnotami `co`
(PAYMENT_RECEIVED, ENTITLEMENT_GRANTED, CREDIT_CREATED, EMAIL_SENT,
EMAIL_FAILED, EMAIL_RESENT, CREDIT_REPLACED, CREDIT_REVOKED,
CREDIT_REDEEMED, REFUND, ADMIN_MANUAL_CREDIT).

Doby uchování: platby a kredity 10 let (účetní doklad, LEGAL REVIEW
REQUIRED), e-maily 12 měsíců, hodnocení do smazání účtu.

---

## 12. Model grafu závislostí

Už existuje v `src/lib/odolnost.ts` a `data/odolnost/funkce.json`: uzly
= závislosti (elektřina, mobilní síť, pevný internet, vodovod, plyn,
palivo, platby, obchody, externí služba) a funkce (11), hrany = cesty
s množinou závislostí. Jediný bod selhání = závislost, na které stojí
všechny zaškrtnuté cesty funkce; kritická = vypne ≥ 2 funkce.
Společné selhání = dvě cesty sdílející závislost. Rozšíření pro
Premium: hrany druhé úrovně (elektřina → čerpadlo → voda → pití/vaření/
hygiena) jsou dnes zploštělé do závislostí cest; pro výpis „co selže
jako první“ přidat pořadí: závislosti seřazené podle váhy (součet
důležitostí vypnutých funkcí), pak funkce podle redundance.

## 13. Model hodnocení

Bez čísla 0–100 na FREE. Pro Premium dashboard zadání žádá „74 / 100“:
návrh je **transparentní součet** s vysvětlením vedle: každá z 11 funkcí
dává 0–3 body redundance × důležitost (1–3), děleno maximem, plus
horizonty (72 h splněno +10, 7 dní +10, 14 dní +5, 30 dní +5) → 0–100.
Kritická závislost −10 za každou (max −20). Vzorec je zveřejněný
v metodice a klik na číslo ukáže rozpad. **REQUIRES DECISION:** zda
číslo vůbec chtít; včera jsem ho vynechal záměrně.

## 14. Model rozpočtu energie

Vstupy: zdroje (název, Wh, dobíjení ano/ne) a spotřebiče (název, W,
hodin/den, priorita CRITICAL/IMPORTANT/COMFORT). Výpočet: kapacita ×
(1 − ztráty) / Σ(W × h) pro tři režimy: NORMAL (vše), ESSENTIAL
(CRITICAL + IMPORTANT), CRITICAL ONLY. Ztráty: výchozí 15 % (střídač +
nabíjení), editovatelné, označené jako předpoklad. S dobíjením: „doba
závisí na slunci/palivu, ne na kapacitě“ + denní bilance (výroba −
spotřeba). Výstup: hodiny lidsky (4 h 21 min), největší spotřebitelé,
předpoklady. Bez laboratorní přesnosti, bez modelu.

## 15. Model rozpočtu vody

Účely: PITÍ, VAŘENÍ, HYGIENA, ZVÍŘATA, OSTATNÍ; každý s předpokladem na
osobu/zvíře a den (dnes 3 l pití, 10 l hygiena — editovatelné,
označené jako orientační). Výstup po účelech: „Pitná voda není váš
problém, první limit je hygiena“ = účel s nejkratší vydrží. Uživatel
může předpoklady přepsat; přepis se ukládá s profilem a je vidět.

## 16. Architektura offline plánu

Statická stránka `/odolnost/plan/` renderovaná z profilu a výsledků
v prohlížeči, s tiskovým CSS (A4, černobíle, bez pozadí, čísla stránek,
verze katalogu a datum). „PDF“ = tisk prohlížeče do PDF (žádný server,
žádná knihovna). Offline: service worker si stránku po vygenerování
uloží (existující mechanismus) a profil je v zařízení; plán se zobrazí
bez sítě. Obsah: rodina (počty, role — jen co uživatel zadá), kontakty
(zadané ručně, nikdy import), místa setkání, kritické závislosti, plán
A/B/C, voda, energie, zvířata, evakuace (jen oficiální postupy odkazem
a shrnutím), zásoby, ověřené základní postupy z katalogu nástrojů.
Stáří plánu se počítá z data generování a zobrazuje v dashboardu.

## 17. Model hrozeb pro soukromí

| Riziko | Zmírnění |
|---|---|
| profil domácnosti na serveru = mapa slabých míst konkrétních lidí | server jen po zaplacení, jen šifrovaný blok (AES-GCM, klíč v tajemství Workeru, nikdy v D1); bez adresy, bez jmen; smazání s účtem |
| zdravotní údaje | jen „dny léků“ a „přístroj závislý na elektřině ano/ne“; žádné diagnózy, názvy léků; nikdy do měření |
| e-mail | šifrovaně, dobrovolný, jen pro kód a „poslat znovu“; nikdy pro marketing bez zvláštního souhlasu |
| měření | jen názvy událostí ze zadání (audit_started … dependency_resolved); nikdy hodnoty profilu |
| zpracovatelé | Cloudflare (DPA), Comgate (zpracovatel platby, vlastní správce), e-mailová služba (DPA, EU) — vše do `/soukromi/` |
| export | JSON a tisk jsou uživatelovy; server ho nikdy nesdílí s nikým |

## 18. Model hrozeb pro platby a kredit

| Hrozba | Zmírnění |
|---|---|
| podvržený webhook | tajemství porovnané bez úniku času + **autoritativní dotaz na stav u brány**; bez shody se nic nezapíše |
| duplicitní webhook | UNIQUE (provider, provider_payment_id); přechod jen z PENDING; dávka `batch()` je vše-nebo-nic |
| odemknutí bez platby | klient nic neodemyká; stránka výsledků čte oprávnění z API; *engine v klientském JS je veřejný — viz red team* |
| hádání kódu | 2^40 prostor, otisk v DB, brzda `limity` 10 pokusů / 10 min / otisk IP, kód se nikdy nepotvrzuje „existuje/neexistuje“ jinak než při uplatnění přihlášeného e-shopu |
| souběžné uplatnění | podmíněný UPDATE (stav='ACTIVE') + UNIQUE idempotency_key |
| eskalace správce | práva v tabulce, `kredity.vydat_rucne` odděleně, každý zásah v auditu, „poslední správce nejde odebrat“ zůstává |
| CSRF / XSS | API jen JSON s tokenem v hlavičce (ne cookie), CORS na původ webu (existuje); CSP doplnit do `_headers` |
| převzetí účtu / změna e-mailu | passkey; změna e-mailu jen po čerstvém ověření; kredit se e-mailem nepřenáší, jen zobrazuje |
| IDOR | všechny dotazy filtrují `ucet_id` z tokenu; kredity správce hledá jen podle otisku/posledních 4 |
| zneužití refundu | refund jen u brány rukou správce; kredit ACTIVE → REVOKED automaticky; REDEEMED → rozhodnutí |
| výpadek brány | platba zůstane PENDING, cron dotáže stav; uživatel vidí „čekáme na potvrzení banky“, ne chybu |
| DB zapíše platbu, e-mail selže | e-mail je samostatná úloha s opakováním; kód v účtu |

## 19. Kontrolní seznam pro právníka (LEGAL / CONSUMER LAW REVIEW REQUIRED)

1. Identita provozovatele, oprávnění k podnikání, DPH režim (150 Kč s DPH nebo bez), evidence tržeb.
2. Obchodní podmínky digitální služby: co přesně je „odemknutí“, kdy začíná plnění, § 1837 písm. l) OZ (ztráta práva odstoupit u digitálního obsahu s výslovným souhlasem), poučení před platbou.
3. Kredit: právní povaha (sleva vs. poukaz vs. dárkový certifikát), zda podléhá DPH v okamžiku vydání nebo uplatnění, účetní zacházení (závazek), expirace (návrh: žádná), minimální hodnota objednávky (návrh: žádná), kombinovatelnost s promo kódy (návrh: ano), nepřenosnost (návrh: vázaný na účet), co při refundu.
4. Věta „Celých 150 Kč vám vrátíme jako kredit“ — přesnost tvrzení, pokud e-shop ještě neexistuje; povinnost uvést, kdy a za jakých podmínek.
5. Reklamace a odstoupení u digitální služby; kontakt; ČOI.
6. GDPR: nový e-mail u účtu, platební údaje (jen u brány), zpracovatelé, DPIA pro profil domácnosti (citlivá kategorie? zdravotní přístroj ano/ne).
7. Doklady: faktura/účtenka za 150 Kč (e-shop Čenich má číselné řady — sdílet, nebo vlastní).
8. Spotřebitelské právo u „commitment“ formulace: nesmí působit jako vratná záloha, pokud jí není.

## 20. Wireframe desktop (výsledek auditu)

```
┌─────────────────────────────────────────────────────────────┐
│ ODOLNOST DOMÁCNOSTI · AUDIT DOKONČEN                        │
│ ✓ 8 oblastí v pořádku  ⚠ 3 slabiny  ⚠ 2 kritické závislosti │
│ 24 h PŘIPRAVENO · 72 h PŘIPRAVENO                           │
├──────────────────────────────┬──────────────────────────────┤
│ BEZPEČNOSTNÍ NÁLEZY (zdarma) │ CO PREMIUM UKÁŽE             │
│ • Spalovací topidlo uvnitř…  │ • vaše kritické závislosti   │
│   → oficiální postup HZS ↗   │ • co selže jako první        │
│ • Zdravotní přístroj na síti │ • 7/14/30 dní · voda · energie│
│   → lékař, obec ↗            │ • plán A/B/C · náhrady       │
│ ZA 0 KČ (zdarma)             │ • offline plán               │
│ • …                          │ [ Odemknout můj plán — 150 Kč ]│
│                              │ Celých 150 Kč … kredit.      │
│                              │ Proč to děláme? …            │
└──────────────────────────────┴──────────────────────────────┘
```

Premium dashboard: jako včerejší pravý sloupec (horizonty, nezávislá
záloha n/11, kritické závislosti, nejslabší článek, vydrže) + řádky
NETESTOVANÉ ZÁLOHY (fáze 2), OFFLINE PLÁN „18 dní starý“, KREDIT „150 Kč
· aktivní“ a CTA „Co má teď největší smysl?“. Navigace uvnitř
domácnosti: ODOLNOST · ZÁVISLOSTI · VODA · ENERGIE · SCÉNÁŘE jako
záložky nad obsahem; hlavní menu beze změny (Přehled … Připravenost),
Premium žije pod účtem.

## 21. Wireframe mobil

Jeden sloupec: souhrn → bezpečnostní nálezy → Za 0 Kč → karta Premium
s tlačítkem → (po odemknutí) záložky jako vodorovný posuv, dashboard
nahoře, formuláře pod ním, „Co má teď největší smysl?“ jako plovoucí
tlačítko dole nad spodní lištou.

## 22. Roadmapa

| Krok | Obsah | Předpoklad |
|---|---|---|
| 0 | identita provozovatele, rozhodnutí: provider, e-mail služba, hranice FREE/PREMIUM, číslo skóre ano/ne, expirace kreditu; právní kontrola textů | provozovatel |
| 1 | audit bez účtu + souhrn + bezpečnostní nálezy + náhled Premium (bez platby) | — |
| 2 | migrace 0005, oprávnění, kredity, e-mail u účtu, e-mailová úloha; správa: Platby / Kredity / E-maily / Audit; náhradní kód; ruční kredit | rozhodnutí 0 |
| 3 | Comgate v testovacím režimu: začít platbu, webhook, ověření, dávka; cron; stránka výsledku | účet u brány |
| 4 | Premium výstupy: závislosti s výpisem, horizonty 7–30, voda po účelech, energie po režimech, plán A/B/C, „Tohle nemohu použít“ na každém doporučení | — |
| 5 | pět scénářů nad modelem; offline plán s tiskem a cache | — |
| 6 | ostrý režim brány, podmínky zveřejněné, měření trychtýře | právník, doklady |
| 7 | uplatnění kreditu z e-shopu (`POST /kredity/uplatnit`) | e-shop naostro |

## 23. Migrace

`0005_platby.sql` (část 11) + v kódu: `api/src/platby.ts`, `kredity.ts`,
`emaily.ts`, `opravneni.ts`, rozšíření `sprava.ts` a `synchronizace.ts`
(úklid, opakování e-mailů, dotaz na PENDING). Web: `/odolnost/` rozdělit
na audit (klient, bez účtu) a výsledky (klient, čte `/ja/opravneni`);
`/odolnost/plan/`; `/ucet/` sekce Moje kredity; `/sprava/platby/`,
`/sprava/kredity/`. Zpětná kompatibilita: dnešní profil v zařízení
zůstává čitelný (stejné klíče).

## 24. Strategie testování

- Jednotkové (vitest, bez sítě): stavový automat plateb (každý přechod
  a zakázané přechody), idempotence webhooku (dvakrát stejný → jeden
  zápis), generátor kódu (formát, entropie, žádné záměnné znaky), maskování,
  podmíněné uplatnění (druhý pokus 0 řádků), náhrada (oba nikdy ACTIVE),
  refund ACTIVE → REVOKED, REDEEMED → příznak, engine (existuje 19 testů)
  + rozpočet energie po režimech + voda po účelech + scénáře.
- API testy s D1 v paměti (`api/testy`, jako dnes): dávky, práva správců,
  IDOR (cizí kredit → 404).
- Ruční před ostrým režimem: testovací platba Comgate, ztracený webhook
  (cron), refund, e-mail selhání a opakování, tisk plánu na A4 černobíle,
  offline otevření plánu v letovém režimu.
- Nikdy: falešný „úspěch“ jen z návratové stránky.

---

## Red team

| Otázka | Odpověď |
|---|---|
| Lze získat Premium bez zaplacení? | **Ano, výpočetně:** engine je veřejný JS v repozitáři; kdo umí číst kód, spočítá si totéž. Brána chrání *službu* (uložení, offline plán, scénáře, kredit, kontinuitu), ne matematiku. Buď to přiznat v podmínkách (doporučuji), nebo přesunout Premium výpočty do Workeru a repozitář `api/` zneveřejnit (**REQUIRES DECISION**). |
| Lze jednou platbou vytvořit více kreditů? | Ne: UNIQUE (provider, provider_payment_id), přechod jen z PENDING, kredit v téže dávce. Test v části 24. |
| Lze stejný kredit utratit dvakrát? | Ne: podmíněný UPDATE na stav ACTIVE + UNIQUE idempotency_key uplatnění. |
| Co udělá duplicitní webhook? | Najde PAID, zapíše jen řádek do `platby_udalosti`, vrátí 200. |
| Refund? | ACTIVE → REVOKED automaticky; REDEEMED → příznak a rozhodnutí; nic se nevymýšlí. |
| E-mail nedorazí? | Kredit je v účtu; úloha opakuje; správce vidí FAILED; „Poslat znovu“ po přihlášení. |
| Náhradní kód? | Starý REPLACED, nový ACTIVE, propojené, důvod povinný, audit. |
| Zůstane starý aktivní? | Ne, jedna dávka. |
| Změna e-mailu? | Kredit zůstává u účtu; změna po čerstvém passkey ověření; e-mail není identita účtu. |
| E-shop neexistuje? | Kredit uložený, viditelný, bez tlačítka Nakoupit; text to říká před platbou i po ní. |
| Brána vypadne? | PENDING + cron; uživatel vidí čekání, ne chybu; žádné odemknutí. |
| DB commitne platbu, e-mail selže? | Záměrně oddělené; kredit existuje. |
| Audit má bezpečnostní nález? | Zobrazí se nad paywallem, zdarma, i bez účtu. |
| Nezamkli jsme důležitou informaci? | Hranice v části 3; test: každá položka katalogu s odkazem na oficiální postup je ve FREE větvi. |
| Nesbíráme citlivá data? | Profil na server jen po zaplacení, šifrovaně; bez diagnóz, adres, jmen; e-mail dobrovolný. |
| Je tvrzení o 150 Kč přesné? | Jen s podmínkami: e-shop zatím neběží, kredit je vázaný na účet, bez expirace (nebo s uvedenou). LEGAL REVIEW. |
| Je jasné, co uživatel dostává? | Seznam na tlačítku + podmínky; plnění začíná odemknutím (poučení o odstoupení). |
| Podmínky kreditu jasné? | Až po právní kontrole; do té doby se platby nespouštějí. |

**Co z red teamu mění návrh:** (1) přiznat veřejný engine v podmínkách
nebo ho přesunout; (2) e-mail u účtu je nová osobní data — zůstává
dobrovolný; (3) žádná expirace kreditu bez právníka; (4) krok 0 roadmapy
je provozovatel, ne kód.
