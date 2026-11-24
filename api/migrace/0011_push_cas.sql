-- Kdy smí upozornění do telefonu chodit (24. 11. 2026, provozovatelka:
-- „aby si každý mohl nastavit, od kolika do kolika může chodit který typ
-- a závažnost“).
--
-- `cas` je JSON {od, do, nocOd}: den od–do (pražský čas) a od jaké
-- závažnosti (1–10) smí naléhavá zpráva přijít v noci; 11 = v noci nic.
-- NULL = výchozí: den 7:00–21:00, v noci jen 7 a víc — stejně jako kanál.
ALTER TABLE push_odbery ADD COLUMN cas TEXT;

-- Zpráva, která přišla mimo čas odběratele, počká tady do začátku jeho dne.
-- Obsah je stejný, jaký by šel hned (titulek, text, odkaz) — nic navíc.
CREATE TABLE IF NOT EXISTS push_odlozene (
  odber_id TEXT NOT NULL,
  zprava_id TEXT NOT NULL,
  obsah TEXT NOT NULL,
  urgentni INTEGER NOT NULL DEFAULT 0,
  naplanovano TEXT NOT NULL,
  PRIMARY KEY (odber_id, zprava_id)
);
CREATE INDEX IF NOT EXISTS push_odlozene_kdy ON push_odlozene (naplanovano);
