-- Měření návštěvnosti bez identifikace (25. 9. 2026).
-- Ukládají se jen součty po dnech: zobrazení stránek, kliknutí na prvky,
-- původ návštěvy, druh zařízení a hrubá poloha kliknutí a pohybu v mřížce
-- 20 × 20 nad stránkou. Žádná IP, žádný identifikátor, žádný čas přesnější
-- než den. Nelze z toho rekonstruovat jednoho člověka.
CREATE TABLE IF NOT EXISTS mereni_denni (
  den TEXT NOT NULL,
  druh TEXT NOT NULL,        -- zobrazeni | klik | odkud | zarizeni
  cesta TEXT NOT NULL,       -- stránka bez dotazu
  klic TEXT NOT NULL,        -- prvek / původ / zařízení; u zobrazení prázdné
  pocet INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (den, druh, cesta, klic)
);
CREATE TABLE IF NOT EXISTS mereni_teplo (
  den TEXT NOT NULL,
  druh TEXT NOT NULL,        -- klik | pohyb
  cesta TEXT NOT NULL,
  zarizeni TEXT NOT NULL,    -- mobil | tablet | pocitac
  bx INTEGER NOT NULL,       -- 0..19 sloupec (šířka okna)
  by INTEGER NOT NULL,       -- 0..19 řádek (výška celé stránky)
  pocet INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (den, druh, cesta, zarizeni, bx, by)
);
CREATE INDEX IF NOT EXISTS mereni_denni_den ON mereni_denni (den);
CREATE INDEX IF NOT EXISTS mereni_teplo_den ON mereni_teplo (den, cesta);
