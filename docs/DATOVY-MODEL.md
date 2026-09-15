# Datový model

Jediný zdroj pravdy jsou soubory v `data/`. Web je statický export; každá změna dat je commit, takže historie dat = historie gitu.

## Entity a jejich časy

| Entita | Soubor | Co to je | Časy |
|---|---|---|---|
| **Záznam** (`Incident`) | `data/incidenty.json` | jedna položka na časové ose | `datumUdalosti` (kdy se to stalo), `datumZjisteni` (kdy vyšlo najevo), `aktualizovano` (kdy jsme záznam naposledy změnili) |
| **Zdroj** (`Zdroj`) | uvnitř záznamu | odkaz, typ (`primary`, `wire`, `media`, `local`, `analysis`, `social`) | `publikovano` |
| **Tvrzení** | `fakta[]`, `neznameho[]` | doložené skutečnosti vs. co zůstává nejasné | — (kryté zdroji záznamu) |
| **Hodnocení projektu** | `data/stav.json`, `data/tydny.json`, `data/mesice.json` | analytická interpretace podle metodiky, stanovuje člověk | `aktualizovano` (kdy stanoveno) |
| **Oficiální opatření** | `data/pravni-stav.json`, `data/nato.json`, `data/provoz.json` | úřední stav (platí / neplatí / neověřeno) | `overeno` (kdy sběrač naposledy ověřil proti zdroji) |
| **Neprošlé** (`Nepotvrzene`) | `data/nepotvrzeno.json` | co ověřením neprošlo (`vyvraceno` / `nepotvrzeno`) | `datum` |
| **Oprava** (`Oprava`) | `data/opravy.json` | veřejný zápis opravy | `datum` (zveřejnění opravy) |
| **Snímek** (`Snimek`) | `data/historie.json` | stav webu v čase, zapisuje se jen při změně | `kdy` |
| **Kampaň** (`Kampan`) | `data/kampane.json` | manipulační kampaň — koordinované šíření nepravdy | `odhaleno` |
| **Ceny paliv** (`RadaCen`) | `data/palivo.json` | týdenní řada průměrných cen ČSÚ — měření, ne předpověď | `aktualizovano` (kdy se řadu podařilo stáhnout), `konec` u každého týdne |

### Druh záznamu (`druh`)

- `pripad` — reálná událost (útok, průnik, operace). Má `puvodce`. **Jen případy se počítají.**
- `aktualizace` — nové zjištění k existujícímu případu; `navazujeNa` = slug případu. Nepočítá se.
- `opatreni` — oficiální krok státu nebo aliance. Bez původce.
- `reakce` — prohlášení, varování, analýza. Bez původce.

Chybí-li `druh`, platí: má původce → případ, jinak reakce (zpětná kompatibilita; nové záznamy mají `druh` vždy).

### Kampaň není událost, ale je to incident

Kampaň (`Kampan`) se vede mimo `incidenty.json`, protože nemá jedno místo ani
jeden okamžik a obvykle míří na víc zemí naráz. Proto má `kodyZemi` (pole, ne
jeden kód) a v přehledu zemí se počítá u každé cílové země zvlášť — součet přes
země je tedy vyšší než počet kampaní a web to u tabulky výslovně píše.

**Do počtů incidentů ale vstupuje.** Útok na to, čemu lidé věří, je útok; kdyby
se nepočítal, hlásil by budík „bez záznamu“ ve chvíli, kdy proti občanům běží
doložená operace. Kampaň proto má `zavaznost` na téže stupnici jako incident
a jediné místo, odkud se berou počty, je `zapocitatelne()` v `src/lib/data.ts`.

`nazev` je **cíl** operace, ne krycí jméno; to je v `oznaceni`. `metody` jsou
klíče z číselníku v `src/lib/metody.ts` — volný text by znemožnil porovnání
napříč zeměmi, což je u téhle sekce hlavní otázka. `zasazeni` říká u každého
subjektu i to, JAK byl zasažen; bez toho je jméno jen nálepka.

Karta má šest pevných částí (`tvrzeni`, `kanaly`, `skutecnost`, `reakce`,
`ucel`, `coByPotvrdilo`), z nichž `ucel` je jediná výslovně označená jako
hodnocení projektu, ne doložený fakt.

#### Dvě nezávislé jistoty u kampaně

| Pole | Otázka |
|---|---|
| `jistotaManipulace` + `duvodManipulace` | Je to vůbec manipulace? |
| `puvodce.jistota` + `puvodce.duvod` | Kdo za tím stojí? |

Slévat je do jednoho čísla se **nesmí**. Podvrh se dá doložit z obsahu
a technických stop; kdo ho vyrobil, se doloží skoro vždy až úředním závěrem.
Připsat kampaň státu jako jisté (`vysoka` / `potvrzeno`) smí web jen tehdy,
když má primární zdroj — hlídá to `testy/kampane.test.ts`.

Zdroj kampaně (`KampanZdroj`) smí mít `publikovano` jen na měsíc (`2026-08`),
když den není doložený; `datumZdroje()` ho vypíše jako „srpen 2026“ místo
vymyšleného prvního dne.

### Dvě nezávislé osy

- **Závažnost** (`zavaznost`, G1–R3) — jak vážný je dopad, pokud se věc potvrdí.
- **Jistota** (`jistota`) — jak dobře je věc doložená. Bez odkazu na zdroj se zobrazuje nejvýš `stredni` (`jistotaZobrazena`).

Pachatel je „potvrzený“ jen při `atribuce: oficialni` nebo `domaci`.

### Čas

- Vše ISO 8601. Datum bez známého času je zapsané jako `T00:00:00Z` a **zobrazuje se jen jako den** (`maCas` v `src/lib/cas.ts`), nikdy s vymyšleným 00:00.
- Zobrazení v Europe/Prague včetně letního času (`datumPraha`, `datumCasPraha`).
- Čerstvost ověření: ≤ 24 h čerstvé, ≤ 72 h starší, jinak zastaralé; `null` = neověřeno (nikdy nevypadá jako čerstvé).

## Agregace

Všechny počty jdou z `src/lib/agregace.ts`; komponenty nepočítají samy. Každá funkce říká, z jaké množiny počítá (`pocty(vse, "rok 2026")`). Kontrola konzistence (součet po zemích = celkem) běží v `nastroje/kontrola-dat.mjs` a v testech `testy/agregace.test.ts`.

## Verzování metodiky

`METODIKA_VERZE` a `METODIKA_REVIDOVANA` v `src/config/web.ts`. Změna verze se zapisuje do `data/opravy.json` s `druh: "metodika"`. Verze 2 (2026‑09‑06) mění jen názvy úrovní; prahy a stará hodnocení zůstávají, starší texty se převádějí `src/lib/archiv-text.ts`.

## Redakční tok

1. Sběrač (`sber/`) běží každou hodinu, ověřuje oficiální opatření a ukládá kandidáty. **Nic nezveřejňuje.**
2. Člověk doplní záznam do `data/incidenty.json` se zdroji a nastaví `lidskyOvereno: true`. Bez toho se záznam nezobrazí.
3. `npm run kontrola:data` musí projít bez chyby (běží i v CI a před nasazením).
4. Oprava zveřejněného údaje = položka v `data/opravy.json` + položka v `historie[]` záznamu.
