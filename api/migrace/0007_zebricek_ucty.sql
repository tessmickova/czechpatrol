-- Žebříček vázaný na anonymní účet, ne na e-mail. Záznam = účet (jeden
-- na účet, nové vyplnění přepíše skóre a datum), přezdívka vygenerovaná
-- jednou a stálá. Kontakt (e-mail, telefon) je nepovinný, šifrovaný, jen
-- pro správce — k pozvání do komunity. Tabulka z 0006 byla nasazena
-- prázdná, proto se staví znovu místo úprav sloupců.
DROP TABLE IF EXISTS zebricek;
CREATE TABLE zebricek (
  id TEXT PRIMARY KEY,
  ucet_id TEXT NOT NULL UNIQUE REFERENCES ucty(id) ON DELETE CASCADE,
  vytvoreno TEXT NOT NULL,
  aktualizovano TEXT NOT NULL,
  prezdivka TEXT NOT NULL,
  skore INTEGER NOT NULL CHECK (skore BETWEEN 0 AND 100),
  kraj TEXT,
  osob INTEGER,
  souhrn TEXT,
  email_sifrovany TEXT,
  telefon_sifrovany TEXT,
  souhlas_kdy TEXT,
  souhlas_verze TEXT,
  stav TEXT NOT NULL DEFAULT 'novy',
  poznamka TEXT
);
CREATE INDEX zebricek_skore ON zebricek (skore DESC, aktualizovano);
