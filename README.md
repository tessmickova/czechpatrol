# Kontext — bezpečnostní přehled ČR

Nezávislý experimentální analytický web, který sleduje bezpečnostní situaci
relevantní pro Českou republiku a Evropu, řadí ověřené události chronologicky
a vysvětluje, co daný vývoj znamená — a hlavně co zatím **ne**znamená.

Není to zpravodajský web ani prepper stránka. Je to datový dashboard.

## Co web dělá jinak

| Zásada | Jak je vynucená v kódu |
|---|---|
| Nikdy nevymýšlet události | Produkční build zobrazuje jen záznamy s `lidskyOvereno: true` a neprázdným seznamem zdrojů |
| Ukázková data nesmí vypadat jako zprávy | Jsou v `data/ukazka/`, načtou se jen při `NEXT_PUBLIC_REZIM=ukazka`, nesou odznak **UKÁZKA** a pruh přes celou šířku |
| Závažnost ≠ jistota | Dvě nezávislé osy v datovém modelu, dva různé odznaky v UI |
| Fakt ≠ odhad ≠ scénář | Čtyři typy obsahu s vlastním odznakem, používané konzistentně |
| Nedopočítávat, co nevíme | `null` je platná hodnota; web napíše „zatím neověřeno“ místo odhadu |
| Automat nesmí strašit | Sběrač smí sám potvrdit **pouze zápor** — jakýkoli nález jde do fronty ke kontrole |
| Žádná falešná přesnost | Stupnice je diskrétní; riziko v procentech se nikde neuvádí |
| Web neradí, jestli odjet | Ukazuje ověřený stav a institucionální spouštěče; rozhodnutí nechává na čtenáři |

## Spuštění

```bash
npm install
npm run dev                          # vývoj na http://localhost:3000
NEXT_PUBLIC_REZIM=ukazka npm run dev # s ukázkovými daty pro posouzení vzhledu
```

Kontrola a sestavení:

```bash
npm run typecheck
npm run build     # statický export do out/
```

## Sběr dat

```bash
npm run sber          # hodinový sběr — plní data/ a frontu ke kontrole
npm run sber:provoz   # jen provozní dostupnost
npm run sber:zdroje   # ověří, které adresy v registru odpovídají
```

**Sběrač nikdy nic nezveřejňuje.** Pravidlo, na kterém stojí celá bezpečnost
projektu, je v `sber/index.ts`:

> Sběrač smí sám potvrdit **pouze zápor**. Když v úředních zdrojích není žádné
> vyhlášení, zapíše „NE, ověřeno v &lt;čas&gt;“. Jakmile něco najde, hodnotu
> **nemění** — založí položku do `data/fronta/` ke kontrole člověkem.

Automat tedy nemůže vyhlásit mobilizaci ani stav ohrožení státu. Nejhorší
následek chyby je zbytečná položka ve frontě.

Když se relevantní zdroj nepodaří stáhnout, zápor se **nepotvrzuje** a datum
ověření se nezapisuje — web pak poctivě zobrazí „zatím neověřeno“ místo
uklidnění, které nemá podklad.

### Registr zdrojů

Všechny zdroje jsou v `sber/zdroje.ts`. Přidání zdroje je jeden záznam v poli.
Nové zdroje se přidávají s `overenaAdresa: false`; `npm run sber:zdroje` vypíše,
které adresy skutečně odpovídají, a teprve pak se příznak přepne.

> Adresy v registru zatím nebyly ověřeny živým stažením — vývojové prostředí
> nemělo přístup k českým úředním webům. První běh v GitHub Actions vypíše,
> které je potřeba opravit.

## Struktura

```
data/            jediný zdroj pravdy — JSON v repozitáři
  ukazka/        ukázková data, jen pro NEXT_PUBLIC_REZIM=ukazka
  fronta/        kandidáti ze sběru, NEPUBLIKOVANÉ
sber/            hodinový sběrač a registr zdrojů
src/lib/         datový model, stupnice, formátování, datová vrstva
src/components/  znovupoužitelné komponenty
src/app/         stránky
src/config/      název webu, odkaz na podporu, režim dat
nastroje/        pomocné skripty pro náhledy
```

Historie dat odpovídá historii gitu: hodinový sběr commituje změny do `data/`,
takže je zpětně dohledatelné, co web kdy tvrdil a odkud to měl.

## Nastavení

Vše na jednom místě v `src/config/web.ts`:

- `WEB.nazev`, `WEB.podtitul`, `WEB.url` — identita webu a doména
- `BUY_ME_A_COFFEE_URL` — dokud je prázdné, tlačítko se nikde nezobrazí
- `METODIKA_REVIDOVANA` — datum poslední revize metodiky

## Nasazení

Statický export (`out/`) jde nasadit kamkoli. Postup pro Cloudflare Pages:

1. propojit repozitář,
2. build command `npm run build`, výstup `out`,
3. do `WEB.url` doplnit doménu (kvůli sitemapě a OpenGraphu).

Hodinový sběr běží v GitHub Actions a commituje data; nasazení se tím spustí
samo.
