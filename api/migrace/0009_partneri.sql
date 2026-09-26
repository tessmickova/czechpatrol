-- Poptávky partnerů (banner na webu). Firemní kontakt, žádné údaje o
-- návštěvnících. Platby zatím nejsou: sloupce cena_kc a platba_id čekají na
-- napojení brány (Comgate, viz platby.ts). Zamítnuté a vyřízené poptávky se
-- mažou po roce (viz uklid()).
CREATE TABLE poptavky_partneru (
  id TEXT PRIMARY KEY,
  vytvoreno TEXT NOT NULL,
  firma TEXT NOT NULL,
  web TEXT NOT NULL,
  email TEXT NOT NULL,
  kategorie TEXT NOT NULL,
  umisteni TEXT NOT NULL,
  obdobi TEXT NOT NULL,
  zprava TEXT,
  souhlas_kdy TEXT NOT NULL,
  souhlas_verze TEXT NOT NULL,
  stav TEXT NOT NULL DEFAULT 'nova',
  cena_kc INTEGER,
  platba_id TEXT,
  poznamka TEXT,
  zmeneno TEXT
);
CREATE INDEX poptavky_partneru_stav ON poptavky_partneru (stav, vytvoreno);
