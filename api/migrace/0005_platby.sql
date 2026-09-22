-- Premium „Odolnější domácnost“: platby, oprávnění, kredity, e-maily,
-- práva správců a uložená hodnocení. Návrh: docs/PREMIUM-NAVRH.md.
--
-- Zásady, které schéma vynucuje samo:
--  * jedna platba u brány = jeden řádek (UNIQUE provider + provider_payment_id),
--  * jeden zdroj = jedno oprávnění (UNIQUE zdroj_druh + zdroj_id) — dva
--    souběžné webhooky nemohou odemknout dvakrát, dávka druhého selže celá,
--  * kód kreditu se ukládá jen jako otisk (UNIQUE) + poslední 4 znaky +
--    šifrovaně; v žádném logu není celý,
--  * uplatnění kreditu je podmíněná změna stavu + UNIQUE idempotency_key,
--  * surové webhooky se jen přidávají (forenzika), nikdy neupravují.

CREATE TABLE platby (
  id TEXT PRIMARY KEY,
  ucet_id TEXT NOT NULL REFERENCES ucty(id),
  produkt TEXT NOT NULL,
  castka_haleru INTEGER NOT NULL,
  mena TEXT NOT NULL DEFAULT 'CZK',
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  stav TEXT NOT NULL CHECK (stav IN ('CREATED','PENDING','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')),
  vraceno_haleru INTEGER NOT NULL DEFAULT 0,
  vyzaduje_rozhodnuti INTEGER NOT NULL DEFAULT 0,
  presmerovani TEXT,
  posledni_chyba TEXT,
  vytvoreno TEXT NOT NULL,
  zaplaceno TEXT,
  aktualizovano TEXT NOT NULL,
  UNIQUE (provider, provider_payment_id)
);
CREATE INDEX platby_ucet ON platby (ucet_id, vytvoreno);
CREATE INDEX platby_stav ON platby (stav, vytvoreno);

CREATE TABLE platby_udalosti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platba_id TEXT,
  prijato TEXT NOT NULL,
  provider TEXT NOT NULL,
  telo_otisk TEXT NOT NULL,
  stav_u_brany TEXT,
  zpracovano INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE opravneni (
  id TEXT PRIMARY KEY,
  ucet_id TEXT NOT NULL REFERENCES ucty(id),
  produkt TEXT NOT NULL,
  druh TEXT NOT NULL,
  zdroj_druh TEXT NOT NULL,
  zdroj_id TEXT NOT NULL,
  pro_domacnost_id TEXT,
  platne_od TEXT NOT NULL,
  platne_do TEXT,
  stav TEXT NOT NULL CHECK (stav IN ('ACTIVE','REVOKED','EXPIRED')),
  vytvoreno TEXT NOT NULL,
  zruseno TEXT,
  duvod_zruseni TEXT,
  UNIQUE (zdroj_druh, zdroj_id)
);
CREATE INDEX opravneni_ucet ON opravneni (ucet_id, produkt, stav);

CREATE TABLE kredity (
  id TEXT PRIMARY KEY,
  kod_otisk TEXT NOT NULL UNIQUE,
  kod_posledni4 TEXT NOT NULL,
  kod_sifrovany TEXT NOT NULL,
  ucet_id TEXT NOT NULL REFERENCES ucty(id),
  platba_id TEXT REFERENCES platby(id),
  hodnota_haleru INTEGER NOT NULL,
  mena TEXT NOT NULL DEFAULT 'CZK',
  stav TEXT NOT NULL CHECK (stav IN ('ACTIVE','REDEEMED','EXPIRED','REVOKED','REPLACED')),
  vytvoreno TEXT NOT NULL,
  expirace TEXT,
  uplatneno TEXT,
  uplatneno_objednavka TEXT,
  vydal TEXT NOT NULL,
  nahrada_za_id TEXT REFERENCES kredity(id),
  nahrazen_id TEXT REFERENCES kredity(id),
  duvod TEXT,
  schvalil_2 TEXT,
  metadata TEXT
);
CREATE INDEX kredity_ucet ON kredity (ucet_id, vytvoreno);

CREATE TABLE kredit_uplatneni (
  id TEXT PRIMARY KEY,
  kredit_id TEXT NOT NULL REFERENCES kredity(id),
  objednavka_id TEXT NOT NULL,
  castka_haleru INTEGER NOT NULL,
  kdy TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE
);

CREATE TABLE emaily (
  id TEXT PRIMARY KEY,
  ucet_id TEXT NOT NULL,
  druh TEXT NOT NULL,
  kredit_id TEXT,
  adresa_otisk TEXT NOT NULL,
  stav TEXT NOT NULL CHECK (stav IN ('QUEUED','SENT','FAILED','DELIVERED')),
  pokusy INTEGER NOT NULL DEFAULT 0,
  posledni_pokus TEXT,
  posledni_chyba TEXT,
  vytvoreno TEXT NOT NULL,
  odeslano TEXT
);
CREATE INDEX emaily_stav ON emaily (stav, vytvoreno);

CREATE TABLE opravneni_spravcu (
  ucet_id TEXT NOT NULL REFERENCES ucty(id) ON DELETE CASCADE,
  pravo TEXT NOT NULL,
  udelil TEXT NOT NULL,
  kdy TEXT NOT NULL,
  PRIMARY KEY (ucet_id, pravo)
);

-- E-mail u účtu je dobrovolný: kam poslat kód. Ukládá se šifrovaně a s časem
-- souhlasu. Účet bez e-mailu funguje stejně; kód je vidět v účtu.
ALTER TABLE ucty ADD COLUMN email_sifrovany TEXT;
ALTER TABLE ucty ADD COLUMN email_souhlas_kdy TEXT;
-- Účet s platbou nejde smazat fyzicky (účetní doklad); místo toho se
-- vyprázdní a označí. Viz ja.smazUcet().
ALTER TABLE ucty ADD COLUMN smazano TEXT;

-- Domácnost a uložené hodnocení (jen Premium; jinak zůstává profil v zařízení).
CREATE TABLE domacnosti (
  id TEXT PRIMARY KEY,
  ucet_id TEXT NOT NULL REFERENCES ucty(id) ON DELETE CASCADE,
  nazev TEXT,
  vytvoreno TEXT NOT NULL,
  aktualizovano TEXT NOT NULL
);
CREATE INDEX domacnosti_ucet ON domacnosti (ucet_id);
CREATE TABLE hodnoceni (
  id TEXT PRIMARY KEY,
  domacnost_id TEXT NOT NULL REFERENCES domacnosti(id) ON DELETE CASCADE,
  verze_katalogu TEXT NOT NULL,
  profil_sifrovany TEXT NOT NULL,
  vysledek_sifrovany TEXT NOT NULL,
  vytvoreno TEXT NOT NULL
);
CREATE INDEX hodnoceni_domacnost ON hodnoceni (domacnost_id, vytvoreno);
