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
