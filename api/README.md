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
| `admin` | první přes zaváděcí kód, další přidává správce | role, schvalování zpráv, audit |

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

Prázdné tajemství = kanál vypnutý. Web i API to poznají a nic nepředstírají.

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

## Soukromí v kódu

- Do databáze se nezapisuje IP; brzda proti útokům používá denně solený otisk.
- Účet nemá jméno, e-mail ani telefon; WhatsApp je jediný kanál, kde číslo
  nejde obejít, a jde kdykoli smazat.
- Úklid v `src/synchronizace.ts` maže přesně to, co slibuje stránka
  `/soukromi/`: výzvy, kódy, relace, frontu, staré zprávy, neaktivní účty.
