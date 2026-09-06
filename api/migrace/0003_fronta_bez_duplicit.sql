-- Stejná zpráva se stejnému čtenáři stejným kanálem nikdy nezařadí dvakrát.
-- Opakovaný běh rozeslání (výpadek, opakování cronu) tak nevyrobí duplicitu.
CREATE UNIQUE INDEX IF NOT EXISTS fronta_jednou ON fronta(zprava_id, ucet_id, druh);
