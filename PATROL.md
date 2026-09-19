# Zadání pro externího ověřovatele (Patrol)

Tenhle soubor je pracovní příkaz. Žije jen na větvi `patrol/overovani`,
na `main` nepatří.

## Co se po tobě chce

Projít **všech 300 kandidátů** v `data/kandidati.json` a z těch, které jsou
opravdu nová bezpečnostní událost, připravit návrhy do `data/navrhy.json`.

Nezveřejňuješ. Návrh čeká na člověka — to je jediná věc v tomhle projektu,
která se automatizovat nemá.

## Proč to děláš ty a ne denní audit

Denní audit (Claude Haiku, `nastroje/audit.ts`) je po dobu pročištění
**pozastavený**, abyste si nešli po týchž zprávách. Má dvě omezení, která ty
nemáš:

1. **Kouká jen čtyři dny zpět.** 164 kandidátů z 300 je starších a nikdy je
   nikdo neposoudil. Zestárnou ve frontě.
2. **Neumí hledat mimo frontu.** V posledním běhu zastavilo 16 zpráv
   „hlásí to jen jeden zdroj" — druhý zdroj existuje, jen není mezi
   zachycenými. Ty ho dohledat umíš.

## Pořadí práce

1. **16 jednozdrojových z posledního auditu** — u každé dohledej druhý
   nezávislý zdroj. Seznam id je v `data/fronta/audit.json` pod
   `rozhodnuti[]`, kde `zahozeno` začíná na „hlásí to jen jeden zdroj".
2. **164 kandidátů mimo okno auditu** (starší než 4 dny).
3. Zbytek fronty.

## Pravidla, která se nesmí porušit

Nejsou to doporučení. Nasazení je pouští přes `npm run kontrola:data`
a `npm test` a při porušení spadne.

1. **Dva nezávislé zdroje, vždy.** Platí u záznamů i u právě ověřovaných.
   Přetisk téhož článku není druhý zdroj. Když druhý neexistuje, návrh
   nedělej a napiš proč.
2. **`lidskyOvereno: false`** u všeho, co dáváš do `data/navrhy.json`.
   Na `data/incidenty.json` a `data/overujeme.json` nesahej — tam se
   záznam dostane jedině přes `npm run spravce schval`.
3. **Datum události není datum článku.** Když se z textu určit nedá, patří
   to do `neznameho` jako otevřená otázka, ne jako hotový údaj.
4. **Zdroj nesmí být starší než událost**, kterou dokládá (tolerance 7 dní).
   Tahle chyba tu už jednou byla: zdroj z roku 2025 „potvrzoval" událost 2026.
5. **Původce se nepřipisuje bez úředního závěru.** Podezření patří do
   `neznameho`, ne mezi fakta.
6. **Závažnost, jistota a bezprostřednost jsou tři různé věci.** Zpravodajská
   spekulace není vysoká jistota.
7. **Nový článek o známé věci není nová událost.** Zveřejněné záznamy jsou
   v `data/incidenty.json`.
8. **`[DOPLNIT]` se nikdy nenahrazuje odhadem.** Chybějící údaj je otevřená
   otázka, ne prostor pro dohad.
9. **Česky** — kód, komentáře, data i commity. Komentář vysvětluje *proč*,
   ne *co*.

## Tvar návrhu

Vzorem je funkce, která je staví: `nastroje/audit.ts`, blok `nove.push({…})`.
Drž se jí, ať návrh projde kontrolou. Povinné je mimo jiné `kam: "zaznam"`,
`pripravil`, `pripraveno`, `fakta`, `neznameho`, `zdroje` (nejméně dva,
každý s `url`), `datumUdalosti`, `datumZjisteni`, `zavaznost`, `jistota`.

## Než pushneš

```bash
npx tsc --noEmit
npm test
npm run kontrola:data
```

Všechno tři musí projít. Teprve pak:

```bash
git push origin patrol/overovani
```

Na `main` nepushuj — je chráněná a tvůj klíč na ni nemá dosáhnout.
Otevři pull request do `main` a **rozděl práci po zhruba třiceti návrzích**,
ať se dá diff přečíst.

## Co udělat, když si nejsi jistý

Nepiš odhad. Napiš do `neznameho`, co chybí, a pokračuj dál. Nedoložený
návrh je použitelný. Vymyšlený údaj zahodí důvěru v celý projekt.
