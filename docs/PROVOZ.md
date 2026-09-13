# Provoz

## Co běží a kde

| Část | Kde | Jak se nasazuje |
|---|---|---|
| Web (statický) | Cloudflare Pages, projekt `czechpatrol` | `.github/workflows/nasazeni.yml` po pushi na `main` a po úspěšném sběru |
| Sběr dat | GitHub Actions, každou hodinu | `.github/workflows/sber.yml` → commit do `data/` |
| API (účty, odběr, tipy) | Cloudflare Worker + D1 | `.github/workflows/nasazeni-api.yml` — **zatím selhává**, token nemá práva D1 Edit a Workers Scripts Edit |

## Kontroly

- `npm run kontrola:data` — duplicity, vazby aktualizací, druh vs. původce, jistota bez zdroje, data, konzistence součtů, stáří ověření. Chyba zastaví CI i nasazení.
- `npm test` — agregace, čas a čerstvost, převod archivních textů, opravy.
- `npm --prefix api test` — plánování upozornění, role, opakované doručení (fronta bez duplicit).
- `npm run typecheck`, `npm run build`, `npm run nahled`.
- Snímky: `PORT=<port> VYSTUP=<adresář> node nastroje/snimky.mjs` nad `python3 -m http.server <port> --directory out` — 360/390/768/1280/1440, kontrola chyb v konzoli a vodorovného přetékání.

## Čerstvost a výpadky

- Přehled ukazuje **poslední úspěšné ověření** (`posledniOvereni()`), ne čas sestavení. Starší než 24 h → pruh nad obsahem; starší než 72 h → „zastaralé“ u každé položky.
- Když sběr selže, data zůstanou v posledním stavu a web to napíše. Nikdy se nedopočítává.
- Service worker: stránky ze sítě, kopie jen pro výpadek. Nová verze pošle zprávu a stránka nabídne „Obnovit“; bez připojení se ukáže lišta „Bez připojení“. Verze mezipaměti: `VERZE` v `public/sw.js` (měnit při každé změně skořápky).

## Odběr

- RSS (`/feed.xml`) se generuje při buildu — vždy funkční.
- Účty, týdenní souhrn (výchozí) a okamžitá upozornění jen s běžícím API (`NEXT_PUBLIC_API_URL`). Fronta má jedinečný index `(zprava_id, ucet_id, druh)` — migrace `api/migrace/0003_fronta_bez_duplicit.sql`. Odhlášení v účtu.
- Kanály bez adresy v `KANALY` se **nezobrazují** vůbec.

## Chybějící nastavení (co musí doplnit provozovatel)

| Kde | Co | Bez toho |
|---|---|---|
| GitHub secrets | `CLOUDFLARE_API_TOKEN` s právy Pages, D1 Edit, Workers Scripts Edit | API se nenasadí |
| GitHub variables | `API_URL` | účty, souhrn a tipy do správy vypnuté |
| `src/config/web.ts` | `PROVOZOVATEL.nazev`, `PROVOZOVATEL.kontakt` | stránky o projektu, soukromí a podmínkách říkají, že provozovatel není uveden |
| `src/config/web.ts` | `TIPY_MAIL` | formulář „Chybí tu událost“ odkazuje jen na GitHub |
| `src/config/web.ts` | `BUY_ME_A_COFFEE_URL` | stránka Podpořit nemá tlačítko |
| `src/config/web.ts` | `IZS_KONTAKT` | role partnera IZS se nepřijímá |
| env | `NEXT_PUBLIC_MERENI_URL` | měření vypnuté (nic se neposílá) |
| data | `data/nato.json` položka `vychodni-kridlo` nikdy neověřena | zobrazuje se „neověřeno“ |

## Náklady

`docs/naklady.json` jsou jediné vstupy; `npm run naklady` vypíše scénáře. Stránka `/podporit/` čte tentýž soubor.

## Automatický sběr událostí

Hodinový sběr (`sber/udalosti.ts`) čte RSS kanály úřadů, redakcí a vyhledávací kanály Google News (`sber/zdroje-udalosti.ts`) a zachytí zprávu jen tehdy, když obsahuje **skutek nebo úřední rozhodnutí** (seznam `AKTY`: sabotáž, výbuch, poškozená infrastruktura, narušení vzdušného prostoru, sestřelený dron, kybernetický útok s následkem, zadržení a obvinění, vyhoštění diplomata, nouzový stav, mobilizace, uzavření hranic, článek 4 nebo 5) **a zároveň je jasné, kde se to stalo**. Prohlášení, sliby, plány a domácí politika s ekonomikou jsou vyloučené (`VYLOUCIT`) — web není zpravodajství. Klíčová slova se hledají od začátku slova (`obsahujeSlovo`), protože kmen `bis` se jinak trefí doprostřed jména „Babiš“. Ke zprávě se odhadne země a oblast a zapíše se do `data/kandidati.json`. Web je ukáže hned jako **„automaticky zachyceno · čeká na ověření“** — čárkovaně, bez závažnosti; do počtů, hodnocení ani RSS nevstupují. Duplicitní adresa nebo stejný titulek se nezapíše dvakrát; po třech týdnech kandidát sám odchází. Se secretem `ANTHROPIC_API_KEY` model vyřadí nerelevantní zprávy a doplní český titulek a shrnutí (označeno „přeloženo modelem“); bez klíče běží jen pravidla.

Převzetí kandidáta do záznamů: `node nastroje/prijmi-kandidata.mjs <id>` vypíše kostru; člověk doplní fakta, závažnost a jistotu, nastaví `lidskyOvereno: true` a vloží do `data/incidenty.json`. Sběr pak kandidáta sám odloží (stejná adresa zdroje).

## Jak rychle se událost dostane na web

| Krok | Kdy běží | Co udělá |
|---|---|---|
| Sběr (`sber.yml`) | každou hodinu v 7. minutě | najde kandidáty a zapíše je do `data/kandidati.json`; web je hned ukáže jako „automaticky zachyceno, čeká na ověření“, ale do počtů nevstupují |
| Hodinové ověření (Routine) | každou hodinu | otevře zdroje nejvýš pěti nejnovějších kandidátů, ověřené převezme do `data/incidenty.json` a pushne |
| Nasazení (`nasazeni.yml`) | po každém pushi | přepočítá a nasadí web |
| Rozhlas (`rozhlas.yml`) | po pushi měnícím záznamy | pošle zprávu do Telegramu |
| Denní audit (Routine, 4:15) | jednou denně | projde starší kandidáty, opravy a soulad webu s realitou |

Od zachycení k záznamu na webu a do Telegramu tedy uplyne nejvýš zhruba dvě
hodiny. **Rychleji to vědomě nejde**: publikuje se až to, co je doložené
úředním oznámením nebo agenturou. Tvrzení z monitorovacích kanálů a sociálních
sítí, typu „právě letí střela nad městem“, se nezveřejní ani jako možnost —
to je přesně poplašná zpráva podle Pravidla č. 0.

Štítek **„nové“** u záznamu se počítá v prohlížeči a drží dvanáct hodin od
zjištění. Kdyby se počítal při sestavení, visel by i na dva dny starém záznamu.

## Rozhlas do kanálů

`nastroje/rozhlas.mjs` posílá krátké zprávy o nových ověřených záznamech do Telegram kanálu @czechpatrol (bot CzechPatrolBot, správce kanálu). Workflow `.github/workflows/rozhlas.yml`: po každém pushi, který mění `data/incidenty.json` nebo `data/historie.json`, odejdou **okamžité** zprávy (případy se závažností Vysoká a výš, opatření, změny právního stavu a NATO z archivu); denně v 17:00 UTC odejde **souhrn** ostatních nových záznamů. Každý záznam jednou; nová položka v historii případu = jedna zpráva „nové zjištění“. Nejvýš 8 zpráv na běh, zbytek příště. Při prvním běhu se starší záznamy jen označí za oznámené, aby kanál nezaplavil archiv. Stav: `data/fronta/rozhlaseno.json`. Automaticky zachycení kandidáti se neposílají nikdy.

### Podoba zprávy

První řádek zprávy je **barevný puntík a závažnost číslem**: `🟠 Závažnost: 7 z 10 · vysoká`. Číslo dává `zDeseti()` v `src/lib/skala.ts` — je to táž úroveň jako na webu, jen jinak zapsaná, ne pravděpodobnost; stupnice má třináct stupňů a deset čísel, takže sousední stupně se stejným názvem sdílí číslo. Tabulka v `nastroje/rozhlas.mjs` je kopie kvůli tomu, že skript je prostý `.mjs`; test hlídá, že se obě nerozejdou. Záznamy bez závažnosti mají místo čísla slovo, čím jsou (`📋 Oficiální opatření`, `💬 Prohlášení nebo reakce`, `🔁 Aktualizace případu`). Totéž číslo je na webu v hlavičce detailu a v tabulce stupnice v metodice.

Souhrn místo toho začíná **pruhem puntíků** — tolik puntíků, kolik je čeho uvnitř. Řadí se od nejzávažnějšího: 🔴 vážné · 🟠 vysoká závažnost · 🟡 střední · 🟢 nízká · 📋 opatření · 🔁 aktualizace · 💬 reakce. Když je jednoho druhu víc než šest, napíše se místo řady počet (`🟡×9`). Pod nadpisem je počet záznamů, nejvyšší závažnost číslem a legenda k barvám.

Hned pod záhlavím stojí **tučně jedna věta** — to nejpodstatnější pro čtenáře v Česku: jestli z toho něco oficiálně plyne, nebo ne. Skládá ji `klicovaVeta()` jen z toho, co v záznamu je (druh, země, vztah k ČR). **Nic se nedomýšlí a nikomu se neradí, jestli někam jet nebo nejet** — na to data nestačí a projekt to nedělá ani na webu. U souhrnu je tučná věta jedna za celou zprávu: platí-li dnes v Česku něco nového, řekne co; jinak řekne, že nic.

Dál má zpráva **pevné pořadí a jde na jednu obrazovku**: záhlaví s puntíkem,
krátký titulek, řádek země · druh · datum, tučná věta, jedna věta **co se stalo**
(u aktualizace to nové), jedna věta **Nepotvrzeno**, řádek Jistota · Pachatel ·
Stav vyšetřování, řádek **poměru zdrojů** a odkaz na celý záznam. U opatření
a záznamů týkajících se ČR přibývá odkaz na přehled opatření.

Kanál je **upozornění, ne archiv**. Do září 2026 se posílal celý rozbor včetně
všech faktů, všeho nepotvrzeného, hodnocení projektu a výpisu všech odkazů;
nejdelší zpráva měla 3 500 znaků a musela se dělit. Dnes má nejdelší 983 znaků
a žádná se nedělí. Zkrátilo se ale jen to, co je o klik dál — prvky, kvůli kterým
formát vznikl, zůstaly:

| Prvek | Proč zůstal |
|---|---|
| puntík a závažnost číslem | míra se má přečíst, ne odhadnout z titulku |
| tučná věta o dopadu na ČR | jádro protialarmismu; skoro vždy „neplyne nic“ |
| jedna věta *Nepotvrzeno* | pravidlo č. 6: k horšímu údaji patří i to, co se nestalo |
| poměr zdrojů `Zdroje: 5 (úřady 0 · agentury 1 · média 4)` | kvůli tomuhle se odkazy vypisovaly — poměr nese i jeden řádek |
| věta, že mezi odkazy není úřední | „stojí to jen na novinách“ je podstatná informace |
| patička se slugem a datem | dělá ze zprávy citovatelný dokument |

Vypadl **výpis odkazů** (poměr nese řádek pokrytí, odkazy jsou na webu)
a **hodnocení projektu**. Hodnocení se schválně nezkracuje: zkrácené hodnocení
bez podkladu je horší než žádné, takže se do kanálu neposílá vůbec a zůstává
na webu, kde je pod ním doložení. Ostatní fakta a zbytek nepotvrzeného jsou
o jedno kliknutí dál — odkaz vede na `/incident/<slug>/`.

Úplný výpis zdrojů po skupinách (`sestavZdroje`) v kódu zůstává pro případ
použití mimo kanál; zpráva ho nevolá.

V souhrnu jsou položky zkrácené na titulek, hodnocení, počet zdrojů a odkaz, seřazené podle naléhavosti (opatření nahoru, při shodě české dřív) — souhrn je přehled, ne čtení.

Přístupy: secret `TELEGRAM_BOT_TOKEN`, volitelně variable `TELEGRAM_KANAL` (výchozí @czechpatrol). Bez tokenu skript skončí bez chyby a nic neposílá. Test: workflow Rozhlas ručně s volbou „Poslat testovací zprávu“. Náhled bez odeslání: `node nastroje/rozhlas.mjs --okamzite --nacisto` — ukáže ale jen to, co ještě neodešlo.
Podobu zprávy u libovolného záznamu (i už odeslaného) vykreslí
`node nastroje/nahled-zpravy.mjs <slug> [--souhrn] [--holy]`, případně
`node nastroje/nahled-zpravy.mjs --nejdelsi 3` pro nejdelší zprávy v datech.

Číselníky (`Z_DESETI`, `PUVODCI`) jsou v `rozhlas.mjs` kopie kvůli tomu, že skript
je prostý `.mjs`. Testy hlídají, že se nerozejdou s `src/lib/` a s daty — jednou už
se to stalo a do souhrnu prošlo „Pachatel: undefined“.

## Stav pro routines

`.github/workflows/stav-pro-routines.yml` běží po každém Nasazení, dvakrát denně
a na vyžádání. Zapisuje do repozitáře dva soubory, které plánované routine čtou
místo toho, aby sáhly na síť:

- `data/fronta/zivy-web.json` — dostupnost `czechpatrol.pages.dev`, commit, ze
  kterého je živý build (bere se z `/stav.json`, pole `commit`, plněné
  z `GITHUB_SHA` při buildu), commit repozitáře a příznak `shodujeSe`.
- `data/fronta/behy.json` — posledních 30 běhů workflow: název, závěr, SHA, čas
  a odkaz.

**Proč to takhle je.** Routine běží v sandboxu za agentní proxy, která doménu
`czechpatrol.pages.dev` blokuje na úrovni organizace (`connect_rejected —
organization policy`), a přístup na `api.github.com` se uděluje per session
nástrojem `add_repo`, který routine k dispozici nemá. GitHub Actions ani jedno
z těch omezení nemá, takže zjištění proběhne tam a routine ho jen přečte z gitu.

Commit se dělá výchozím tokenem, který další workflow nespouští — jinak by se to
zacyklilo s Nasazením.

Když se poměry změní a routine na doménu dosáhne, soubory tím nepřestanou
platit; jsou to jen zapsaná zjištění, ne náhrada ověření.
