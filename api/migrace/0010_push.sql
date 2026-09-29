-- Upozornění do telefonu přes webovou aplikaci (Web Push, 29. 9. 2026).
-- Odběr je anonymní: adresa pro doručení, kterou vydá prohlížeč, dva
-- veřejné klíče pro šifrování a vybrané druhy zpráv. Žádný účet, jméno,
-- číslo ani IP. Odhlášením nebo když služba prohlížeče řekne „adresa už
-- neplatí“ se řádek smaže.
CREATE TABLE IF NOT EXISTS push_odbery (
  id TEXT PRIMARY KEY,          -- SHA-256 adresy, ať se dá hledat bez indexu nad dlouhým textem
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  druhy TEXT NOT NULL,          -- JSON pole: hned | prehled | kratce | tipy
  vytvoreno TEXT NOT NULL,
  zmeneno TEXT NOT NULL,
  posledni_doruceni TEXT,
  chyb INTEGER NOT NULL DEFAULT 0
);
-- Rozeslané zprávy: jen kvůli tomu, aby opakované volání neposlalo totéž dvakrát.
CREATE TABLE IF NOT EXISTS push_zpravy (
  id TEXT PRIMARY KEY,
  druh TEXT NOT NULL,
  titulek TEXT NOT NULL,
  vytvoreno TEXT NOT NULL
);
-- Klíč serveru pro podpis doručení (VAPID). Vzniká sám při prvním použití.
CREATE TABLE IF NOT EXISTS push_nastaveni (
  klic TEXT PRIMARY KEY,
  hodnota TEXT NOT NULL
);
