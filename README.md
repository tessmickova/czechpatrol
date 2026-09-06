# CzechPatrol — bezpečnostní přehled ČR

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
| Náhled nesmí lhát o funkčnosti | Staví se z týchž komponent jako web, takže ukazuje skutečné chování, ne obrázek |
| Archiv zapisuje jen změny | Řada shodných hodinových záznamů by budila dojem, že se pořád něco děje |
| Odběr, který nikam nevede, se nenabízí | Nenastavený kanál je označený jako připravovaný, ne jako funkční |

## Spuštění

```bash
npm install
npm run dev                          # vývoj na http://localhost:3000
NEXT_PUBLIC_REZIM=ukazka npm run dev # s ukázkovými daty pro posouzení vzhledu
```

Kontrola a sestavení:

```bash
npm run typecheck
npm test
npm run build           # statický export do out/
npm run nahled          # klikací náhled z ostrých dat
npm run nahled:ukazka   # totéž s ukázkovými daty, jen pro posouzení rozvržení
```

`npm run nahled` sestaví z týchž komponent samostatnou Reactovou aplikaci
(esbuild, směrování ve fragmentu adresy) a vloží ji i se styly do jednoho
HTML. Náhled tedy není přemalovaná kopie webu — je to táž aplikace bez
serveru, takže v ní fungují filtry, rozbalování i nápovědy.

## Archiv v čase

Sběrač po každém běhu porovná stav s posledním snímkem v `data/historie.json`
a zapíše nový záznam **jen když se něco změnilo**. Časový posuvník na
`/trend` z toho skládá pohled na to, co web tvrdil v daném okamžiku.

Dvě věci, které archiv nedělá:

- **nerekonstruuje minulost** — období před začátkem archivu prostě nemá
  a nedopočítává ho,
- **nehlásí změnu, kterou čtenář nemůže vidět** — vnitřní stupnice je jemnější
  než ta zobrazená, takže posun uvnitř pásma se popíše jako
  „posun v rámci úrovně Střední“, ne jako „Střední → Střední“.

Události se na posuvníku objevují k datu, kdy vyšly najevo, ne k datu, kdy se
staly. Dřív o nich totiž nikdo nevěděl.

## Odběr

`/feed.xml` se generuje při buildu a funguje na statickém hostingu. Ostatní
kanály se nastavují v `KANALY` v `src/config/web.ts`; dokud je adresa prázdná,
web kanál ukazuje jako připravovaný, ne jako dostupný.

Upozornění nemá chodit u každé události — od toho je web. Seznam situací,
které upozornění spouštějí, je v `KDY_UPOZORNENI`.

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

## Stránky

Hlavní navigace má čtyři cíle: **Přehled** (`/`), **Události** (`/udalosti/`,
filtry v adrese `?zeme=&tema=&obdobi=&overeni=`, detail v postranním panelu
`?u=slug` nebo na `/incident/<slug>/`), **Vývoj** (`/vyvoj/`) a **Můj přehled**
(`/muj-prehled/`, předvolby jen v zařízení). Vedlejší: metodika, zdroje,
opravy (`/opravy/`, z `data/opravy.json`), o projektu, podpořit, odběr.
Staré adresy (`/dnes`, `/trend`, `/osa`, `/cr`, `/nato`, `/tlak`, `/watchlist`,
`/nepotvrzeno`, `/komunita`) přesměrovává `public/_redirects`.

Podrobněji: `docs/DATOVY-MODEL.md`, `docs/PROVOZ.md`, `docs/ZNACKA.md`, `docs/DALSI-ETAPA.md`.

## Struktura

```
data/            jediný zdroj pravdy — JSON v repozitáři
  ukazka/        ukázková data, jen pro NEXT_PUBLIC_REZIM=ukazka
  fronta/        kandidáti ze sběru, NEPUBLIKOVANÉ
sber/            hodinový sběrač a registr zdrojů
src/lib/         datový model, stupnice, formátování, datová vrstva
src/components/  znovupoužitelné komponenty
src/app/         stránky
src/spa/         vstupní bod klikacího náhledu a náhrady za next/*
src/config/      název webu, odkaz na podporu, režim dat
nastroje/        pomocné skripty: náhled, snímky, kontrola dat, náklady
docs/            datový model, provoz, značka, další etapa, právní kontrola
```

Datová vrstva importuje JSON staticky, ne přes `fs` — díky tomu běží stejný
kód při statickém exportu i v prohlížeči.

Historie dat odpovídá historii gitu: hodinový sběr commituje změny do `data/`,
takže je zpětně dohledatelné, co web kdy tvrdil a odkud to měl.

## Nastavení

Vše na jednom místě v `src/config/web.ts`:

- `WEB.nazev`, `WEB.podtitul`, `WEB.url` — identita webu a doména
- `BUY_ME_A_COFFEE_URL` — dokud je prázdné, tlačítko se nikde nezobrazí
- `METODIKA_VERZE`, `METODIKA_REVIDOVANA` — verze a datum revize metodiky
- `NEXT_PUBLIC_MERENI_URL` (env) — bez ní je měření vypnuté; slovník událostí je v `src/lib/mereni.ts`

## Nasazení

Statický export (`out/`) jde nasadit kamkoli. Postup pro Cloudflare Pages:

1. propojit repozitář,
2. build command `npm run build`, výstup `out`,
3. do `WEB.url` doplnit doménu (kvůli sitemapě a OpenGraphu).

Hodinový sběr běží v GitHub Actions a commituje data; nasazení se tím spustí
samo.

## Účty, upozornění a partner IZS

Web zůstává statický. Účty a doručování běží v odděleném Cloudflare Workeru
s D1 (`api/`), viz [api/README.md](api/README.md).

- **Účet bez identity** — passkey, náhodný identifikátor, obnovovací kód.
  Bez jména, e-mailu i telefonu; smazání jedním tlačítkem.
- **Upozornění** na Telegram (a WhatsApp, až bude schválený): frekvence,
  závažnost, tiché hodiny, oblasti, kraj. „Hned, cokoli důležitého“ nemá strop.
- **Partner IZS** — ověřená složka navrhne zprávu, správce ji schválí, teprve
  pak odejde čtenářům v dané oblasti. Vždy označená jako zpráva partnera.
- **Role** čtenář → podporovatel → partner IZS → správce; přiděluje správce,
  každý zásah je v auditu. Nikdo si roli nemění sám.
- **Zdroj pravdy je web:** při buildu vydá `/stav.json`, API ho každých
  10 minut porovná s minulým a z rozdílu udělá zprávy. Nic víc netvrdí.

Bez proměnné `API_URL` v GitHubu se web sestaví bez účtů a všude říká, že se
připravují. Adresa API se přidá jednou, ve `Settings → Variables`.

## Aplikace do mobilu

Web je PWA: manifest, ikony, service worker. Stránky se berou ze sítě a kopie
zůstane jen pro čtení bez signálu; hashované soubory buildu z mezipaměti.
Na mobilu je spodní lišta a postranní panel místo menu.

## Placená vrstva

`PLACENE.hraniceADoprava` v `src/config/web.ts` zakryje část „Hranice
a doprava“ všem bez role podporovatele. Výchozí je vypnuto a doporučení
projektu je nechat bezpečnostní informace volně — viz
[docs/PRAVNI-KONTROLA.md](docs/PRAVNI-KONTROLA.md), část 5.

## Právo

`docs/PRAVNI-KONTROLA.md` — GDPR, ePrivacy, AI Act, § 357 TZ, krizový zákon,
spotřebitelské právo. Stránky `/soukromi/` a `/podminky/` říkají totéž
čtenáři. Správce údajů (`PROVOZOVATEL`) se musí doplnit před spuštěním účtů.
