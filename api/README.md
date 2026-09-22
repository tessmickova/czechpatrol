# API CzechPatrol

Účty, upozornění a zprávy partnerů IZS. Cloudflare Worker + D1, nasazuje
se odděleně od webu (`.github/workflows/nasazeni-api.yml`).

## Jak to do sebe zapadá

```
web (Pages, statický)  ──/stav.json──▶  worker (API)  ──▶  Telegram / WhatsApp
       ▲                                     │
       └────────── HTTPS + token ────────────┘  (účet, nastavení, IZS, správa)
```

- Web je jediný zdroj pravdy. Při buildu vydá `/stav.json`; worker ho každých
  10 minut přečte, porovná s minulým a z rozdílu udělá zprávy.
- Worker nezná git ani sběrač. Nikdy sám netvrdí, že se něco stalo — jen
  přeposílá, co web zveřejnil.
- Web s workerem mluví jen přes HTTPS s tokenem v hlavičce. Token žije
  v prohlížeči, na serveru je jen jeho otisk.

## Role

| Role | Kdo | Co smí |
|---|---|---|
| `obcan` | každý nový účet | nastavení, kanály, smazání účtu |
| `podporovatel` | přiděluje správce | totéž; odemyká části zapnuté v `PLACENE` |
| `izs` | přiděluje správce po ověření složky | navrhnout zprávu čtenářům |
| `admin` | první přes zaváděcí kód, další přidává správce | role, schvalování zpráv, audit, platby, kredity, žebříček |

Nad penězi jsou ještě **práva správců** (`opravneni_spravcu`): běžná práva
(číst platby, náhradní kód, e-mail znovu, audit) plynou z role; **vydat
kredit bez platby** (`kredity.vydat_rucne`) smí jen správce, kterému to
jiný správce udělil. Udělení i odebrání je v auditu.

Nikdo si roli nemění sám. Poslední správce nejde odebrat. Každý zásah je v auditu.

## Co je potřeba nastavit

V GitHubu (Settings → Secrets and variables → Actions):

| Kde | Název | K čemu |
|---|---|---|
| secret | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | už existují pro web; tokenu je nutné **přidat práva** Account · D1 · Edit a Account · Workers Scripts · Edit (Cloudflare → My Profile → API Tokens → Edit) |
| variable | `API_URL` | adresa workeru, např. `https://czechpatrol-api.<účet>.workers.dev` — web ji dostane při buildu, bez ní účty nenabízí |
| secret | `ADMIN_BOOTSTRAP_KOD` | jednorázový kód pro prvního správce (dlouhý náhodný řetězec) |
| secret | `TELEGRAM_BOT_TOKEN` | od @BotFather |
| variable | `TELEGRAM_BOT_JMENO` | uživatelské jméno bota bez @ (pro odkaz `t.me/...`) |
| secret | `TELEGRAM_WEBHOOK_SECRET` | náhodný řetězec; Telegram ho posílá v hlavičce každé zprávy |
| secret | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | WhatsApp Cloud API (Meta Business) — bez nich se WhatsApp nenabízí |
| variable | `SPRAVCE_CHAT` | chat na Telegramu, kam hlídač hlásí, že sběr přestal běžet |
| variable | `TELEGRAM_KANAL` | veřejný kanál; hlídač do něj napíše až po 12 h bez sběru |
| secret | `KLIC_SIFROVANI` | 32 náhodných bajtů base64url (`openssl rand -base64 32 \| tr '+/' '-_' \| tr -d '='`); šifruje kódy kreditů, e-mail u účtu, uložené profily a kontakt v žebříčku. Bez něj se Premium nespustí a kontakt v žebříčku se nenabízí |
| secret + variable | `COMGATE_MERCHANT`, `COMGATE_SECRET` (secrets), `COMGATE_TEST` (variable; výchozí `true`) | platební brána Premium; webhook nastavit v portálu Comgate na `POST <API_URL>/platby/webhook/comgate` |
| variable + secret | `EMAIL_POSKYTOVATEL` (`resend` nebo `postmark`), `EMAIL_ODESILATEL` (variables), `EMAIL_API_KLIC` (secret) | e-maily s kódem kreditu; bez nich fronta čeká a kód je vidět v účtu |
| secret | `ESHOP_TOKEN` | serverový token, kterým e-shop volá `POST /kredity/overit` a `/uplatnit` |
| secret | `KOMUNITA_TELEGRAM_ODKAZ`, `KOMUNITA_WHATSAPP_ODKAZ` | pozvánky do skupiny a chatu pro Premium; nikdy do kódu webu |

Prázdné tajemství = kanál vypnutý. Web i API to poznají a nic nepředstírají.

### Hlídač sběru

Worker po každém kopnutí do sběru přečte na GitHubu, jak běhy dopadly. Když
poslední **úspěšný** sběr proběhl před více než třemi hodinami, napíše na
`SPRAVCE_CHAT`; po dvanácti hodinách i do `TELEGRAM_KANAL`, protože odběratel
má právo vědět, že se na kanál nedá spolehnout. Připomíná se nejvýš jednou za
šest hodin. Bez nastavených chatů jen píše do logu workeru.

Proč to dělá worker: 17. 9. 2026 v 08:03 přestal sběr na GitHubu běžet a web
dva dny ukazoval starý stav, aniž by to kdokoli poznal — všechno, co by to
mohlo ohlásit, běželo na tomtéž GitHubu. Hlídač uvnitř hlídaného systému
nehlídá nic.

### Postup spuštění

1. Nastavit tajemství a proměnné výše. Minimum: `API_URL`, `ADMIN_BOOTSTRAP_KOD`.
2. Spustit workflow „Nasazení API“ (nebo pushnout změnu v `api/`). Založí D1,
   pustí migrace, nasadí worker, nahraje tajemství, nastaví webhook Telegramu.
3. Spustit workflow „Nasazení“ webu, aby se web sestavil s `API_URL`.
4. Na webu založit účet, otevřít `/sprava/`, zadat zaváděcí kód → první správce.
5. Po zavedení správce zaváděcí kód z GitHubu smazat.

### WhatsApp

Meta vyžaduje ověřený Business účet a pro zprávy mimo 24hodinové okno
schválenou šablonu. `src/dorucovani.ts` posílá prostý text; po schválení
šablony se tam přepne na `type: "template"`. Do té doby je kanál označený
jako „připravujeme“.

## Lokální vývoj

```bash
cd api
npm install
npx wrangler d1 migrations apply czechpatrol --local
npx wrangler dev          # http://localhost:8787
npm test                  # čisté funkce: rozdíl stavů, plánování, role
```

Web pak spustit s `NEXT_PUBLIC_API_URL=http://localhost:8787 npm run dev`.
Passkeye vyžadují `RP_ID` = doména webu; pro localhost nastavte v `.dev.vars`:

```
PUVOD_WEBU=http://localhost:3000
RP_ID=localhost
```

## Cesty

| Metoda a cesta | Kdo | Co |
|---|---|---|
| `POST /auth/registrace/zacit` · `/dokoncit` | kdokoli | nový anonymní účet (passkey) |
| `POST /auth/prihlaseni/zacit` · `/dokoncit` | kdokoli | přihlášení passkey |
| `POST /auth/obnova` | kdokoli | přihlášení obnovovacím kódem |
| `POST /auth/odhlaseni` | přihlášený | zneplatní token |
| `GET/DELETE /ja` | přihlášený | účet / smazání |
| `GET/PUT /ja/upozorneni` | přihlášený | nastavení |
| `POST /ja/obnova` | přihlášený | nový obnovovací kód |
| `POST /ja/passkey/zacit` · `/dokoncit` | přihlášený | další zařízení |
| `POST /ja/telegram/kod` · `DELETE /ja/telegram` | přihlášený | propojení Telegramu |
| `PUT/DELETE /ja/whatsapp` | přihlášený | číslo pro WhatsApp |
| `GET/POST /izs/zpravy` | partner IZS | seznam / návrh zprávy |
| `POST /sprava/zpravy/:id/schvalit` · `/zamitnout` | správce | rozhodnutí + rozeslání |
| `GET /sprava/ucty` · `PUT /sprava/ucty/:id/role` | správce | účty a role |
| `GET /sprava/audit` | správce | audit |
| `POST /sprava/bootstrap` | přihlášený | první správce (jen dokud žádný není) |
| `POST /sprava/synchronizovat` | správce | ruční načtení stavu webu |
| `POST /telegram/webhook` | Telegram | `/start <kód>`, `/stop` |
| `GET /zdravi` | kdokoli | živost |
| `POST /zajem` · `/zajem/odhlasit` · `GET /sprava/zajem` | kdokoli / správce | e-mail pro souhrn a komunitu |
| `GET /premium` | kdokoli | cena, kredit, jestli platby běží (web z toho čte, nic neopisuje) |
| `POST /platby/zacit` · `GET /ja/platby/:id` | přihlášený | založení platby u brány / stav pro návratovou stránku |
| `POST /platby/webhook/comgate` | Comgate | push; ověří tajemství a stav si potvrdí dotazem `/status` |
| `GET /ja/opravneni` | přihlášený | co má odemčené; pozvánky do komunity jen s Premium |
| `GET /ja/kredity` · `POST /ja/kredity/:id/email` | přihlášený | vlastní kredity s kódem / poslat kód znovu |
| `PUT/DELETE /ja/email` | přihlášený | dobrovolný e-mail pro kód (šifrovaně) |
| `GET/PUT/DELETE /ja/hodnoceni` | přihlášený s Premium | uložený profil domácnosti (šifrovaně, 5 posledních) |
| `GET /zebricek` | kdokoli | přezdívka, skóre, datum, kraj (nejvýš 50) |
| `GET/PUT/DELETE /ja/zebricek` | přihlášený | můj záznam / zařadit či aktualizovat / odejít |
| `POST /kredity/overit` · `/uplatnit` | e-shop (`ESHOP_TOKEN`) | kontrola kódu / uplatnění podmíněným UPDATE + idempotency key |
| `GET /sprava/platby` · `POST /sprava/platby/:id/refund` | správce | platby / vrácení (kredit ACTIVE → REVOKED, REDEEMED → příznak k rozhodnutí) |
| `GET /sprava/kredity` · `POST …/rucni` · `…/:id/nahradit` · `…/:id/zneplatnit` | správce (+ právo) | masky kódů; ruční kredit jen s `kredity.vydat_rucne` |
| `GET/POST /sprava/opravneni` · `POST …/:id/zrusit` | správce | udělení bez platby (dar) a zrušení, vždy s důvodem |
| `GET /sprava/emaily` · `POST …/:id/znovu` | správce | fronta e-mailů, znovu zařadit |
| `GET/PUT /sprava/prava` | správce | práva správců |
| `GET /sprava/zebricek` · `PUT …/:id` | správce | záznamy s kontaktem (čtení v auditu); stav pozvání, poznámka, smazání |

## Soukromí v kódu

- Do databáze se nezapisuje IP; brzda proti útokům používá denně solený otisk.
- Účet nemá jméno, e-mail ani telefon; WhatsApp je jediný kanál, kde číslo
  nejde obejít, a jde kdykoli smazat.
- Úklid v `src/synchronizace.ts` maže přesně to, co slibuje stránka
  `/soukromi/`: výzvy, kódy, relace, frontu, staré zprávy, neaktivní účty,
  e-maily s kódem po roce, záznamy žebříčku bez pohybu po roce.
- Citlivá pole (kód kreditu, e-mail u účtu, profil domácnosti, kontakt
  v žebříčku) jsou v D1 šifrovaně AES-GCM (`src/sifrovani.ts`), klíč je
  tajemství Workeru. V logu je kód kreditu vždy jen jako `CP-****-XXXX`.
- Účet s platbou nebo kreditem se při smazání nemaže fyzicky (doklad),
  ale vyprázdní: pryč passkeye, relace, kanály, e-mail, profily; zůstane
  identifikátor, platby a kredity; přihlásit se už nejde (`ja.smazUcet`).
- Tabulky: `ucty`, `passkeys`, `vyzvy`, `relace`, `kanaly`, `propojeni`,
  `zpravy_izs`, `zpravy`, `fronta`, `stav`, `audit`, `limity`, `tipy`,
  `zajem` (0001–0004); `platby`, `platby_udalosti`, `opravneni`, `kredity`,
  `kredit_uplatneni`, `emaily`, `opravneni_spravcu`, `domacnosti`,
  `hodnoceni` (0005); `zebricek` (0006, přestavěna v 0007). Migrace
  aplikuje `nasazeni-api.yml` při každém pushi.
