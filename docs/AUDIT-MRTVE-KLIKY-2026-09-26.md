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

## Otevřené — rozhodnutí provozovatelky

**Odkazy „Opravy“ vedou do správy.** Stránka Opravy se 24. 9. přesunula
jen do správy a `/opravy/` přesměrovává na `/sprava/opravy/`. Na
veřejném webu na ni ale dál vede pět odkazů: Podmínky, O projektu,
Komunita, Metodika („historie změn“), Svět („historie oprav“).
Podmínky navíc slibují: *„opravy jsou veřejné na stránce Opravy“*.
Varianty: (a) vrátit veřejnou stránku oprav, (b) odkazy odstranit
a přepsat slib v Podmínkách.

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
