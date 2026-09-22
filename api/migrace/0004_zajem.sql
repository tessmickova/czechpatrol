-- Zájem o e-mail a komunitu: adresa, o co má člověk zájem, kdy a s jakou
-- verzí textu souhlasil. Jediný osobní údaj je e-mail. Odhlášené adresy se
-- mažou po 30 dnech; adresy, kterým do roka nic nepřišlo, také (viz uklid()).
CREATE TABLE zajem (
  id TEXT PRIMARY KEY,
  vytvoreno TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  zajmy TEXT NOT NULL,
  zdroj TEXT,
  souhlas_kdy TEXT NOT NULL,
  souhlas_verze TEXT NOT NULL,
  stav TEXT NOT NULL DEFAULT 'nepotvrzeno',
  token TEXT NOT NULL UNIQUE,
  odhlaseno_kdy TEXT
);
