# Audit mrtvých kliků — 26. 9. 2026

Mrtvý klik = místo, které vypadá klikatelně (nebo na které lidé klepou),
ale nic se nestane. Na mobilu (95 % návštěv) je to častější, protože
tam nefunguje najetí myší (`title`, hover).

**Jak:** `nastroje/audit-mrtvych-kliku.mjs` na 35 typech stránek
(úvod, události, záznam, nepotvrzeno, země, analýzy, připravenost,
odolnost, metodika, zdroje, účet, partneři…), mobil 390 px i počítač
1300 px. Každé tlačítko, záložka a přepínač proklikané; nálezy
ověřené ručně.

## Skutečné mrtvé kliky — opraveno

| Kde | Co se dělo | Oprava |
|---|---|---|
| Horní pruh „Hlídka běží“ — každá stránka | Podrobnosti jen v `title` (najetí myší); klepnutí nic | Odkaz na **Stav zdrojů** (`/zdroje/`) |
| Analýzy — tabulka zemí | Celý řádek se při najetí zvýraznil, klikatelný byl jen počet vpravo; klik na zemi nic | Odkaz i na **názvu země**; řádek už nepředstírá, že je celý klikatelný |
| Odolnost — „Přidat“ spotřebič | Bez vyplněného názvu tlačítko tiše nic neudělalo | Skočí do pole s názvem |
| Patička — logo s pilulkami BETA a AI | Pilulky vypadají jako tlačítka, `title` jen pro myš | Logo je odkaz na přehled (jako v hlavičce) |
| Vlajky zemí | `title` s kódem („RU“) — nic neříká, láká k najetí | `title` pryč, zůstává `aria-label` |

## Nepravdivý text nalezený při auditu — opraveno

„Sběr běží **každých 30 minut**“ stálo na šesti místech (pruh, věta
situace, O projektu, Metodika, Jak to chodí). Worker spouští sběr
nejdřív po **60 minutách** (`api/src/minuty.ts`, `KADENCE`), při
nedostatku minut až po 240. Teď jedno místo pravdy
`SBER_JAK_CASTO` v `src/config/web.ts` („zhruba jednou za hodinu“)
a test `testy/texty-kadence.test.ts`.

## Opravy — rozhodnuto 26. 9. 2026

Stránka Opravy zůstává jen pro správce. Pět veřejných odkazů na ni
(Podmínky, O projektu, Komunita, Metodika, Svět) je pryč, slib
„opravy jsou veřejné“ z Podmínek taky; `/opravy` není v sitemapě.

## Druhé kolo (spolehlivost kliků)

- **Test `testy/odkazy.test.ts`** (běží s každou změnou): každý interní
  odkaz v kódu vede na existující stránku, ne přes přesměrování a
  z veřejné části ne do správy.
- **`nastroje/kontrola-odkazu.mjs`** nad sestaveným webem: 225 stránek,
  všechny odkazy i kotvy `#…`, přesměrování se sledují. 0 chyb.
- **Manipulace:** klik na jinou kampaň na téže stránce měnil jen `#…`
  a rozbor se neotevřel → stránka teď reaguje na změnu kotvy.
- **Menu:** na telefonech s průhledným stavovým řádkem byl křížek pod
  hodinami → bezpečná zóna nahoře a druhé tlačítko „Zavřít menu“ dole.
  Hlavička stránky už nezajíždí pod stavový řádek.

## Není mrtvý klik (ověřeno)

- **Klik na už vybraný filtr / záložku** („Vše“, „Česko“, „Doložené
  záznamy“, „Kalkulačka“, aktuální krok průvodce) — nic se nezmění,
  protože už je vybraný. Běžné chování; Clarity to ale počítá jako
  mrtvý klik, takže v jejích číslech bude.
- **Popisky polí** v kalkulačce odolnosti — klik přesune kurzor do pole.
- **„Nelze kliknout“** u některých prvků na mobilu — automat je trefil
  ve chvíli, kdy ležely pod spodní lištou nebo se stránka posouvala
  animací; člověk po doscrollování klikne normálně.
- **Dlaždice úředního stavu** na počítači mají `title` s plným zněním,
  protože text se zkracuje; nevypadají jako tlačítka.

## Co dál

- Až poběží Clarity (se souhlasem), porovnat jeho „dead clicks“ s tímto
  seznamem — ukáže místa, kam lidé klepou a automat je nepovažoval
  za klikatelná.
- Audit spustit po větší změně rozhraní (návod v hlavičce skriptu).
