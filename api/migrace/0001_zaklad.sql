-- Účty jsou anonymní: identifikátor, role, nastavení. Žádné jméno, e-mail, telefon.
CREATE TABLE ucty (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'obcan',
  vytvoreno TEXT NOT NULL,
  posledni_prihlaseni TEXT,
  poznamka TEXT,
  -- Jen u partnerů IZS: název složky, který se objeví ve zprávách.
  nazev TEXT,
  obnova_hash TEXT,
  nastaveni TEXT NOT NULL DEFAULT '{}'
);

-- Veřejná část passkey. Soukromý klíč nikdy neopustí zařízení uživatele.
CREATE TABLE passkeys (
  id TEXT PRIMARY KEY,
  ucet_id TEXT NOT NULL REFERENCES ucty(id) ON DELETE CASCADE,
  verejny_klic TEXT NOT NULL,
  pocitadlo INTEGER NOT NULL DEFAULT 0,
  transporty TEXT,
  vytvoreno TEXT NOT NULL
);
CREATE INDEX passkeys_ucet ON passkeys(ucet_id);

-- Výzvy WebAuthn — krátkodobé, jednorázové.
CREATE TABLE vyzvy (
  id TEXT PRIMARY KEY,
  druh TEXT NOT NULL,
  vyzva TEXT NOT NULL,
  ucet_id TEXT,
  expirace TEXT NOT NULL
);

-- Přihlašovací tokeny se ukládají jen jako otisk.
CREATE TABLE relace (
  hash TEXT PRIMARY KEY,
  ucet_id TEXT NOT NULL REFERENCES ucty(id) ON DELETE CASCADE,
  vytvoreno TEXT NOT NULL,
  expirace TEXT NOT NULL,
  posledni TEXT
);
CREATE INDEX relace_ucet ON relace(ucet_id);

-- Doručovací kanály: telegram (číslo chatu), whatsapp (telefon).
CREATE TABLE kanaly (
  ucet_id TEXT NOT NULL REFERENCES ucty(id) ON DELETE CASCADE,
  druh TEXT NOT NULL,
  cil TEXT NOT NULL,
  vytvoreno TEXT NOT NULL,
  PRIMARY KEY (ucet_id, druh)
);

-- Propojovací kódy (Telegram /start <kod>), platnost 15 minut.
CREATE TABLE propojeni (
  kod TEXT PRIMARY KEY,
  ucet_id TEXT NOT NULL REFERENCES ucty(id) ON DELETE CASCADE,
  druh TEXT NOT NULL,
  expirace TEXT NOT NULL
);

-- Zprávy partnerů IZS a jejich cesta: návrh → schváleno/zamítnuto → odesláno.
CREATE TABLE zpravy_izs (
  id TEXT PRIMARY KEY,
  autor TEXT NOT NULL REFERENCES ucty(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  oblast TEXT NOT NULL,
  platnost_do TEXT,
  stav TEXT NOT NULL DEFAULT 'navrh',
  vytvoreno TEXT NOT NULL,
  rozhodl TEXT,
  rozhodnuto TEXT,
  poznamka TEXT,
  doruceno INTEGER NOT NULL DEFAULT 0
);

-- Zprávy k doručení (z rozdílu stavu webu nebo od partnera IZS).
CREATE TABLE zpravy (
  id TEXT PRIMARY KEY,
  druh TEXT NOT NULL,
  zavaznost TEXT NOT NULL,
  oblast TEXT,
  kategorie TEXT,
  titulek TEXT NOT NULL,
  text TEXT NOT NULL,
  odkaz TEXT,
  vytvoreno TEXT NOT NULL
);

-- Fronta doručení: co, komu, kdy nejdřív, s jakým výsledkem.
CREATE TABLE fronta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zprava_id TEXT NOT NULL REFERENCES zpravy(id) ON DELETE CASCADE,
  ucet_id TEXT NOT NULL REFERENCES ucty(id) ON DELETE CASCADE,
  druh TEXT NOT NULL,
  naplanovano TEXT NOT NULL,
  odeslano TEXT,
  vysledek TEXT,
  pokusy INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX fronta_splatne ON fronta(odeslano, naplanovano);

-- Poslední přečtený stav webu a další drobnosti.
CREATE TABLE stav (
  klic TEXT PRIMARY KEY,
  hodnota TEXT NOT NULL,
  aktualizovano TEXT NOT NULL
);

-- Audit zásahů správců: kdo, co, komu.
CREATE TABLE audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kdy TEXT NOT NULL,
  kdo TEXT NOT NULL,
  co TEXT NOT NULL,
  cil TEXT
);

-- Brzda proti automatizovaným pokusům; klíč je solený otisk, ne IP.
CREATE TABLE limity (
  klic TEXT PRIMARY KEY,
  pocet INTEGER NOT NULL,
  okno_do TEXT NOT NULL
);
