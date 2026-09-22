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

Hlavní navigace má pět cílů: **Přehled** (`/`), **Události** (`/udalosti/`),
**Manipulace** (`/manipulace/`), **Analýzy** (`/analyzy/`) a **Připravenost**
(`/pripravenost/`). **Země** (`/zeme/`) a **Můj přehled** (`/muj-prehled/`,
předvolby jen v zařízení) jsou v rozcestníku Analýz a v postranním panelu.

**Přehled** (`/`) má nahoře úvod přes dva sloupce a aktuality v třetím, pod
budíky kompaktní **urgentní pás** (zelený rámeček, když za 48 hodin nic;
červený, když platí výstraha nebo sběr zachytil naléhavou zprávu) a pod ním
tři desky ve stejné mřížce: komunita, dotazník odolnosti, upozornění.
Typy událostí a čísla „kolik, kde, kdo“ jsou od 22. 9. 2026 první sekce
Analýz, ne úvodu.

Události mají filtry v adrese (`?tab=&zeme=&tema=&obdobi=&overeni=`) a detail
v postranním panelu (`?u=slug`) nebo na `/incident/<slug>/`. Parametr `tab`
přepíná mezi třemi záložkami: `overene` (výchozí), `cekajici` (automatický sběr
čekající na ověření) a `neproslo` (vyvrácené a nedoložené). Starší odkazy
`?overeni=automaticke` a `?overeni=neprosle` zůstávají funkční.

Analýzy začínají typy evidovaných událostí (pavučina a tabulka zemí) a čísly
za 90 dní, pod tím je rozcestník na **Vývoj** (`/vyvoj/`), **Země**,
**Aktéři a cíle** (`/svet/`), **Manipulace** a metodiku. Vedlejší stránky: zdroje, opravy (`/opravy/`,
z `data/opravy.json`), o projektu, podpořit, odběr.
Staré adresy (`/dnes`, `/trend`, `/osa`, `/cr`, `/nato`, `/tlak`, `/watchlist`,
`/nepotvrzeno`, `/komunita`) přesměrovává `public/_redirects`.

**Manipulace a útoky na občany** (`/manipulace/`, z `data/kampane.json`) jsou
vedené zvlášť od událostí, ale **počítají se jako incidenty** — útok na to,
čemu lidé věří, je útok. Každá operace má proto závažnost na téže stupnici
a vstupuje do budíků, počítadel i pásu zemí.

Název operace je její **cíl**, ne krycí jméno („Rozeštvat Čechy a Poláky
vymyšleným územním nárokem“, ne „Těšínsko“). Ke každé patří seznam
zasažených nebo zneužitých subjektů a **metody z pevného číselníku**
(`src/lib/metody.ts`). Podle metody se filtruje napříč zeměmi — teprve tak
je vidět, že stejný postup v Česku, Polsku i ve Finsku není náhoda.

Karta má šest částí a dva **nezávislé** štítky jistoty — „je zásah doložený?“
a „kdo za tím stojí?“. Připsat operaci státu jako jisté smí web až tehdy, když
to někdo veřejně doložil; do té doby je to podezření. Hlídají to testy
v `testy/kampane.test.ts`.

**Právě ověřujeme** (`data/overujeme.json`) je jediné místo, kde se na webu
objeví něco nepotvrzeného — a to jen proto, že mlčet o zprávě, která se šíří
a mohla by být důležitá, není neutrální.

Web o takové zprávě **netvrdí, že platí**. Tvrdí tři věci, které si sám
ověřil: kdo ji vydal (s odkazy), že ji projekt nemá potvrzenou a co k ní
říkají nebo výslovně neříkají úřady. Na kartě stojí úřední stav **první**
a poslední řádek je vždy pokyn „co dělat teď“ — skoro vždy „nic“.

Podmínky jsou v CLAUDE.md, pravidlo č. 0 bod 4, a jsou vynucené jako **chyby**
v `nastroje/kontrola-dat.mjs`: aspoň dva nezávislé zdroje s odkazem, vyplněný
úřední protipól i pokyn, lhůta na uzavření nejvýš týden, nejvýš tři položky
naráz. Do počtů, budíků ani průměrů nevstupují a **do Telegramu se
neodesílají**. Každá musí skončit jako *potvrzeno*, *vyvráceno*, nebo *nikdo
nepotvrdil*; po lhůtě se stáhne z přehledu, ale zůstane zapsaná.

Zařadit položku smí jen člověk. V produkčních datech je soubor zatím prázdný,
takže se sekce vůbec nezobrazuje; vyzkoušet ji jde v režimu ukázky
(`NEXT_PUBLIC_REZIM=ukazka`).

**Porovnání s průměrem** (`src/lib/porovnani.ts`): kde stojí číslo za 90 dní,
stojí vedle něj i celkový údaj a slovní porovnání (mírně / středně / velmi
významně vyšší nebo nižší). Průměr se počítá z posledních dvou let, ne z celého
archivu od roku 2014 — tam je sběr řídký a každé dnešní čtvrtletí by vyšlo
jako mimořádné.

Nad vším stojí Pravidlo č. 0 v `CLAUDE.md`: právo ČR a EU, žádná poplašná zpráva,
a v bezpečnostních tématech jen to, co je doložené citací se zdrojem a řešené úředně.

Podrobněji: `docs/PRAVNI-KONTROLA.md`, `docs/DATOVY-MODEL.md`, `docs/PROVOZ.md`, `docs/ZNACKA.md`, `docs/DALSI-ETAPA.md`, `docs/SITUACNI-MAPA-NAVRH.md` (návrh situační mapy ČR, fáze 0), `docs/DOPISY-POSKYTOVATELUM.md` (dopisy poskytovatelům dat), `docs/ODOLNOST-NAVRH.md` (tři úrovně a odolnost domácnosti), `docs/PREMIUM-NAVRH.md` (Premium MVP a kredit 150 Kč, návrh a stav implementace), `api/README.md` (cesty, tajemství, tabulky).

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
3. vlastní doména `czechpatrol.cz`: nastavuje ji workflow **Doména**
   (`docs/PROVOZ.md`, část Doména); `WEB.url` na ni ukazuje.

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
- **Odolnost domácnosti** (`/odolnost/`) je audit bez účtu: souhrn s počty,
  stav na 72 hodin, bezpečnostní nálezy a rady za 0 Kč zdarma; podrobný
  plán je **Premium** (viz níže). Tlačítko *Začít znovu* smaže profil.
- **Žebříček připravenosti** pod auditem: pro přihlášené anonymní účty,
  jeden záznam na účet, vygenerovaná přezdívka, skóre 0–100 a datum
  veřejně. Nepřihlášený dostane po vyplnění otázku, jestli se chce
  anonymně přihlásit, nebo v žebříčku nebýt. Kontakt pro pozvání do
  komunity je nepovinný, šifrovaný a jen pro správce.

Bez proměnné `API_URL` v GitHubu se web sestaví bez účtů a všude říká, že se
připravují. Adresa API se přidá jednou, ve `Settings → Variables`.

## Aplikace do mobilu

Web je PWA: manifest, ikony, service worker. Stránky se berou ze sítě a kopie
zůstane jen pro čtení bez signálu; hashované soubory buildu z mezipaměti.
Na mobilu je spodní lišta a postranní panel místo menu.

## Placená vrstva a Premium

`PLACENE.hraniceADoprava` v `src/config/web.ts` zakryje část „Hranice
a doprava“ všem bez role podporovatele. Výchozí je vypnuto a doporučení
projektu je nechat bezpečnostní informace volně — viz
[docs/PRAVNI-KONTROLA.md](docs/PRAVNI-KONTROLA.md), část 5.

**Premium „Odolnější domácnost“** (od 22. 9. 2026, `docs/PREMIUM-NAVRH.md`):
jednorázové odemknutí podrobného plánu odolnosti za 150 Kč, celá částka se
vrací jako kredit 150 Kč na výbavu v e-shopu (až poběží). Premium dává
horizonty 7–60 dní, vydrže, rozpočet energie a solár, „co vypne co“,
nákupní seznam, plán ke stažení, uložení profilu na server (šifrovaně)
a přístup do komunity a chatu. Platba přes Comgate s webhookem, který se
ověřuje u brány; kredit `CP-XXXX-XXXX` je v databázi jen jako otisk,
maska a šifrovaný kód. **Bez tajemství brány a šifrovacího klíče se nic
nespustí** a web říká „odemknutí připravujeme“ — cena i stav se čtou
z API (`GET /premium`), web je neopisuje. Bezpečnostní nálezy jsou vždy
zdarma a nad nabídkou.

## Právo

`docs/PRAVNI-KONTROLA.md` — GDPR, ePrivacy, AI Act, § 357 TZ, krizový zákon,
spotřebitelské právo. Stránky `/soukromi/` a `/podminky/` říkají totéž
čtenáři. Správce údajů (`PROVOZOVATEL`) se musí doplnit před spuštěním účtů.
