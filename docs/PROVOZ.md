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

Hodinový sběr (`sber/udalosti.ts`) čte RSS kanály úřadů, redakcí a vyhledávací kanály Google News (`sber/zdroje-udalosti.ts`), vybírá zprávy podle klíčových slov, odhadne zemi a oblast a zapisuje je do `data/kandidati.json`. Web je ukáže hned jako **„automaticky zachyceno · čeká na ověření“** — čárkovaně, bez závažnosti; do počtů, hodnocení ani RSS nevstupují. Duplicitní adresa nebo stejný titulek se nezapíše dvakrát; po třech týdnech kandidát sám odchází. Se secretem `ANTHROPIC_API_KEY` model vyřadí nerelevantní zprávy a doplní český titulek a shrnutí (označeno „přeloženo modelem“); bez klíče běží jen pravidla.

Převzetí kandidáta do záznamů: `node nastroje/prijmi-kandidata.mjs <id>` vypíše kostru; člověk doplní fakta, závažnost a jistotu, nastaví `lidskyOvereno: true` a vloží do `data/incidenty.json`. Sběr pak kandidáta sám odloží (stejná adresa zdroje).

## Rozhlas do kanálů

`nastroje/rozhlas.mjs` posílá krátké zprávy o nových ověřených záznamech do Telegram kanálu @czechpatrol (bot CzechPatrolBot, správce kanálu). Workflow `.github/workflows/rozhlas.yml`: po každém pushi, který mění `data/incidenty.json` nebo `data/historie.json`, odejdou **okamžité** zprávy (případy se závažností Vysoká a výš, opatření, změny právního stavu a NATO z archivu); denně v 17:00 UTC odejde **souhrn** ostatních nových záznamů. Každý záznam jednou; nová položka v historii případu = jedna zpráva „nové zjištění“. Nejvýš 8 zpráv na běh, zbytek příště. Při prvním běhu se starší záznamy jen označí za oznámené, aby kanál nezaplavil archiv. Stav: `data/fronta/rozhlaseno.json`. Automaticky zachycení kandidáti se neposílají nikdy.

### Podoba zprávy

První řádek zprávy je **barevný puntík a závažnost číslem**: `🟠 Závažnost: 7 z 10 · vysoká`. Číslo dává `zDeseti()` v `src/lib/skala.ts` — je to táž úroveň jako na webu, jen jinak zapsaná, ne pravděpodobnost; stupnice má třináct stupňů a deset čísel, takže sousední stupně se stejným názvem sdílí číslo. Tabulka v `nastroje/rozhlas.mjs` je kopie kvůli tomu, že skript je prostý `.mjs`; test hlídá, že se obě nerozejdou. Záznamy bez závažnosti mají místo čísla slovo, čím jsou (`📋 Oficiální opatření`, `💬 Prohlášení nebo reakce`, `🔁 Aktualizace případu`). Totéž číslo je na webu v hlavičce detailu a v tabulce stupnice v metodice.

Souhrn místo toho začíná **pruhem puntíků** — tolik puntíků, kolik je čeho uvnitř. Řadí se od nejzávažnějšího: 🔴 vážné · 🟠 vysoká závažnost · 🟡 střední · 🟢 nízká · 📋 opatření · 🔁 aktualizace · 💬 reakce. Když je jednoho druhu víc než šest, napíše se místo řady počet (`🟡×9`). Pod nadpisem je počet záznamů, nejvyšší závažnost číslem a legenda k barvám.

Hned pod záhlavím stojí **tučně jedna věta** — to nejpodstatnější pro čtenáře v Česku: jestli z toho něco oficiálně plyne, nebo ne. Skládá ji `klicovaVeta()` jen z toho, co v záznamu je (druh, země, vztah k ČR). **Nic se nedomýšlí a nikomu se neradí, jestli někam jet nebo nejet** — na to data nestačí a projekt to nedělá ani na webu. U souhrnu je tučná věta jedna za celou zprávu: platí-li dnes v Česku něco nového, řekne co; jinak řekne, že nic.

Dál má zpráva pevné pořadí: záhlaví s puntíkem, krátký titulek, řádek země · druh · datum, tučná věta, oddíl **Co se stalo** (u aktualizace **Co je nového**), oddíl **Co zatím nevíme**, řádek Závažnost · Jistota · Pachatel a nakonec odkaz na celý záznam se zdroji. U opatření a záznamů týkajících se ČR přibývá odkaz na přehled opatření. V souhrnu jsou položky zkrácené na titulek, hodnocení a odkaz, seřazené podle naléhavosti (opatření nahoru, při shodě české dřív).

Přístupy: secret `TELEGRAM_BOT_TOKEN`, volitelně variable `TELEGRAM_KANAL` (výchozí @czechpatrol). Bez tokenu skript skončí bez chyby a nic neposílá. Test: workflow Rozhlas ručně s volbou „Poslat testovací zprávu“. Náhled bez odeslání: `node nastroje/rozhlas.mjs --okamzite --nacisto`.
