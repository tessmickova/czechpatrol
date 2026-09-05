-- Hlášení od čtenářů: chybějící událost, oprava, odkaz na úřední zdroj.
-- Kontaktní údaje jsou dobrovolné a slouží jen k doptání; mažou se po 12 měsících.
CREATE TABLE tipy (
  id TEXT PRIMARY KEY,
  vytvoreno TEXT NOT NULL,
  popis TEXT NOT NULL,
  odkaz TEXT,
  jmeno TEXT,
  email TEXT,
  telefon TEXT,
  stav TEXT NOT NULL DEFAULT 'novy',
  poznamka TEXT
);
