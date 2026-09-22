-- Žebříček připravenosti: anonymní záznamy s vygenerovanou přezdívkou,
-- skóre a datem. Kontakt (e-mail, telefon) se ukládá šifrovaně a vidí ho
-- jen správce; slouží k pozvání do komunity a k upozornění na kritické
-- události, o kterém rozhoduje člověk. Web to říká u formuláře — sběr
-- kontaktu bez informace by byl v rozporu s čl. 13 GDPR.
CREATE TABLE zebricek (
  id TEXT PRIMARY KEY,
  vytvoreno TEXT NOT NULL,
  prezdivka TEXT NOT NULL,
  skore INTEGER NOT NULL CHECK (skore BETWEEN 0 AND 100),
  kraj TEXT,
  osob INTEGER,
  souhrn TEXT,
  email_otisk TEXT NOT NULL UNIQUE,
  email_sifrovany TEXT NOT NULL,
  telefon_sifrovany TEXT NOT NULL,
  souhlas_kdy TEXT NOT NULL,
  souhlas_verze TEXT NOT NULL,
  stav TEXT NOT NULL DEFAULT 'novy',
  poznamka TEXT,
  token TEXT NOT NULL UNIQUE
);
CREATE INDEX zebricek_skore ON zebricek (skore DESC, vytvoreno);
