# Provoz

## Co běží a kde

| Část | Kde | Jak se nasazuje |
|---|---|---|
| Web (statický) | Cloudflare Pages, projekt `czechpatrol` | `.github/workflows/nasazeni.yml` po pushi na `main` a po úspěšném sběru |
| Sběr dat | GitHub Actions, každou půlhodinu | `.github/workflows/sber.yml` → commit do `data/`. Kope do něj Cloudflare Worker; plánovač GitHubu je jen záloha jednou za tři hodiny |
| API (účty, odběr, tipy, hlídač, Premium, žebříček) | Cloudflare Worker `czechpatrol-api` + D1 (migrace 0001–0007) | `.github/workflows/nasazeni-api.yml`. Nasazení prošlo 13. 9. 2026, worker běží — je to on, kdo spouští sběr a kdo hlídá jeho výpadky. Cron každých 10 min navíc kontroluje čekající platby (ztracený webhook) a odesílá frontu e-mailů |
| Doména `czechpatrol.cz` | zóna na Cloudflare (aktivní od 22. 9. 2026 19:19), registrace u Forpsi | `.github/workflows/domena.yml` → `nastroje/domena.mjs`, stav v `data/fronta/domena.json`. Web běží na `czechpatrol.cz`, `czechpatrol.pages.dev` zůstává záložní vstup; viz část Doména |

> Účty na webu jsou něco jiného než běžící worker. Aby je web nabízel, musí
> být při jeho sestavení nastavená proměnná `API_URL` a tajemství
> `ADMIN_BOOTSTRAP_KOD`; bez nich web říká, že se účty připravují. Jestli
> jsou nastavené, poznáš na živém webu na stránce `/ucet/`. Postup zavedení
> prvního správce je v `api/README.md`.

## Když se web zastaví: jak ho rozběhnout

Návod pro člověka, který není programátor. Nepotřebuješ nic instalovat,
všechno se dá naklikat v prohlížeči.

### 1. Poznat, že jde o tohle

Příznak: **na webu svítí „Sběr neběží"** a datum poslední kontroly se
nehýbe. Do Telegramu nic nechodí.

Otevři <https://github.com/tessmickova/czechpatrol/actions>. Když u posledních
běhů svítí červený křížek a každý trval jen pár vteřin, sběr se ani nespustil.

Pak otevři <https://github.com/settings/billing>. Hledej stránku s využitím
GitHub Actions (GitHub ji čas od času přejmenovává — bývá to „Usage",
„Plans and usage" nebo „Budgets and alerts"). Když je měsíční příděl minut
vyčerpaný nebo je dosažený limit útraty, je to ono.

> Repozitář je soukromý, a **u soukromých repozitářů se každý běh účtuje**
> z měsíčního přídělu 2 000 minut, navíc zaokrouhlený nahoru na celou minutu.
> Příděl se obnoví na začátku dalšího zúčtovacího období, takže se to samo
> rozjede — a za pár týdnů zase zastaví. Není to oprava, jen odklad.

### 2. Vejít se do bezplatného přídělu

Repozitář zůstává soukromý. Příděl je **2 000 minut měsíčně** a ten musí stačit.

**Kde se minuty ztrácely.** Z jednoho sběru se spouštěly tři úlohy: sběr,
pak Nasazení a pak Stav pro routines. Druhá i třetí naběhly i ve chvíli, kdy
se za tu hodinu nic nestalo — a spuštěná úloha se účtuje, i když nic neudělá.
Při sběru po půlhodinách to dělalo kolem 5 700 minut měsíčně, skoro
trojnásobek přídělu.

**Co je nastavené teď** (v repozitáři, nemusíš nic klikat):

| Změna | Co to dělá |
|---|---|
| nasazení složené do sběru | jedna úloha místo tří; nasazuje se jen při skutečné změně dat |
| Stav pro routines už neběží po každém nasazení | zůstal dvakrát denně |
| balíčky z mezipaměti | běh kratší než minuta místo skoro dvou |
| sběr jednou za hodinu | dřív dvakrát |
| záložní plánovač GitHubu jednou za 6 h | dřív každé 3 h |

Odhadem to vychází na **1 100–1 300 minut měsíčně**. Je to odhad — skutečné
číslo uvidíš za pár dní na stránce s využitím a podle něj se dá ještě ubrat.

**Kdyby to pořád nestačilo**, jediná další páka bez placení je sbírat méně
často: v `api/src/sber.ts` změnit `KAZDYCH_MINUT` z 60 na 120. Spotřebu to
zhruba půlí za cenu toho, že se zpráva na web dostane nejpozději za dvě
hodiny.

### 2b. Nasazování webu pryč z GitHub Actions (doporučeno, jen klikání)

Cloudflare Pages umí web sestavit samo po každém pushi, ze svých vlastních
bezplatných build minut (500 sestavení měsíčně). Nasazení tím přestane
záviset na GitHub Actions natrvalo — a to je u projektu, který má být
pojistkou, důležitější než ušetřené minuty: dnes je GitHub jediné místo,
jehož výpadek položí celý web, a přesně to se 17. 9. 2026 stalo.

1. <https://dash.cloudflare.com> → **Workers & Pages** → projekt `czechpatrol`
2. karta **Settings** → **Builds & deployments** → **Connect to Git**
3. povol Cloudflare přístup k repozitáři `tessmickova/czechpatrol`
4. nastav:

| Pole | Hodnota |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `out` |
| Environment variable | `NEXT_PUBLIC_API_URL` = adresa workeru (jen pokud máš zapnuté účty) |

Verzi Node si Cloudflare vezme ze souboru `.nvmrc` v repozitáři (je tam 22).

Od té chvíle stačí cokoli pushnout do `main` a web se sestaví a nasadí bez
GitHub Actions. Krok „Nasazení" v `sber.yml` pak můžeme vypnout úplně.

### 3. Tenhle měsíc to možná ještě nenaskočí

Úsporná opatření platí od dalšího běhu, ale **minuty, které už jsou
vyčerpané, nevrátí**. Příděl se obnoví na začátku dalšího zúčtovacího období.

Datum obnovy najdeš na <https://github.com/settings/billing> na stránce
s využitím Actions. Do té doby web zůstane stát — pokud ho nerozběhneš
z vlastního počítače:

```bash
git pull
npm ci
npm run sber                 # přečte zdroje a zapíše do data/
npm run kontrola:data        # musí hlásit 0 chyb
git add data/ && git commit -m "Sběr dat ručně" && git push
```

Nasazení webu pak buď z GitHubu (Actions → Nasazení → Run workflow, až budou
minuty), nebo rovnou:

```bash
npm run build
npx wrangler@3 pages deploy out --project-name=czechpatrol --branch=main
```

Druhý příkaz se zeptá na přihlášení k Cloudflare.

### 4. Rozběhnout to

Po obnovení přídělu se sběr rozjede sám do hodiny (kope do něj Cloudflare Worker).
Když nechceš čekat:

1. <https://github.com/tessmickova/czechpatrol/actions>
2. vlevo **Hodinový sběr dat**
3. vpravo **Run workflow** → **Run workflow**

Hotovo poznáš tak, že na webu zmizí pruh „Sběr neběží" a datum poslední
kontroly bude dnešní. Trvá to pár minut; nasazení webu je od 19. 9. 2026
součástí téhož běhu, takže se nečeká na druhou úlohu.

### 5. Ať se to příště pozná dřív

Hlídač v `api/src/hlidac.ts` běží na Cloudflare, ne na GitHubu, takže výpadek
GitHubu přežije. Ohlásí ho, jakmile mu řekneš kam:
nastav proměnnou `SPRAVCE_CHAT` (Settings → Secrets and variables → Actions →
Variables) na svůj chat na Telegramu. Podrobně v `api/README.md`.

## Doména czechpatrol.cz

Od 22. 9. 2026. Zóna je na Cloudflare (nameservery `mary.ns.cloudflare.com`
a `zeus.ns.cloudflare.com`, aktivní od 19:19), doména je registrovaná
u Forpsi. Web běží na `czechpatrol.cz`; přechod z `czechpatrol.pages.dev`
měl dva kroky, které se nesměly prohodit.

### 1. Cloudflare — workflow Doména

`.github/workflows/domena.yml` spouští `nastroje/domena.mjs`: záznamy DNS na
projekt Pages, vlastní domény projektu, HTTPS a přesměrování www. Výsledek
zapisuje do `data/fronta/domena.json`; rutiny i session ho čtou z gitu, na
Cloudflare API ze sandboxu nedosáhnou. Spouští se ručně (Actions → Doména →
Run workflow) a je bezpečné ho pouštět opakovaně: co je hotové, přeskočí, a
nemaže nic, co nezná.

První běh (22. 9. 2026 19:38) přidal obě adresy jako vlastní domény projektu
Pages, zbytek neudělal: token `CLOUDFLARE_API_TOKEN` má jen práva k Pages,
D1 a Workers. Aby doběhl celý, je potřeba mu přidat práva pro zónu
`czechpatrol.cz` (Cloudflare → My Profile → API Tokens → Edit):

| Právo | K čemu |
|---|---|
| Zone · DNS · Edit | CNAME `czechpatrol.cz` a `www` na `czechpatrol.pages.dev`; odstranění parkovacích záznamů Forpsi, které si Cloudflare při založení zóny naimportoval (A `81.2.196.19` a hvězdičkový CNAME) — kvůli nim dnes `czechpatrol.cz` ukazuje přes Cloudflare parkovací stránku Forpsi |
| Zone · Zone Settings · Edit | SSL Full (strict), Always Use HTTPS, TLS 1.2 a novější |
| Zone · Dynamic Redirect (Single Redirects) · Edit | www → holá doména |

Pak workflow spustit znovu. Hotovo je, když `data/fronta/domena.json`
ukazuje obě domény v Pages jako `active` a `chybejiciPrava` prázdné.
Bez úpravy tokenu to jde i ručně v dashboardu: DNS → CNAME `czechpatrol.cz`
→ `czechpatrol.pages.dev` s proxy, totéž pro `www`, a parkovací záznam A
`81.2.196.19` z importu smazat; workflow pak jen zapíše stav.

### 2. Kód — až doména odpovídá

Teprve když `https://czechpatrol.cz/stav.json` vrací stav webu, přepnou se
adresy v kódu. Udělalo to sloučení větve `claude/domena-czechpatrol-cz`:

| Kde | Co |
|---|---|
| `src/config/web.ts` | `WEB.url` — canonical, OpenGraph, sitemap, RSS, `stav.json`, `rutina.json` |
| `api/wrangler.toml` | `PUVOD_WEBU`, `RP_ID`, `STAV_URL`; `PUVOD_WEBU_DALSI = "https://czechpatrol.pages.dev"` po dobu přechodu |
| `.github/workflows/nasazeni.yml`, `stav-pro-routines.yml` | `ADRESA` živého webu |
| `nastroje/rozhlas.mjs` | odkazy v kanálu |
| `docs/RUTINY.md` a rutiny v Claude | adresy `rutina.json`, `fronta.json`, `stav.json` |

Proč ne dřív: odkazy v kanálu a v RSS by vedly na parkovací stránku, API by
z nové adresy nesmělo být volané a hlídač stavu by nic nenačetl.

**Passkeye.** Passkey platí jen pro doménu, na které vznikl. Kdo má účet
z `czechpatrol.pages.dev`, přihlásí se na `czechpatrol.cz` obnovovacím
kódem a založí si passkey znovu; na staré adrese mu původní funguje dál,
dokud je v `PUVOD_WEBU_DALSI`. Stará adresa se nepřesměrovává — zůstává
jako záložní vstup, canonical odkazy míří na novou.

**Sandbox.** Síťová politika prostředí Claude blokuje `czechpatrol.pages.dev`
i `czechpatrol.cz` (CONNECT 403). Ranní kontrola proto padá bez ohledu na
doménu; buď obě adresy povolit v nastavení prostředí, nebo kontrolu přepsat
na čtení `data/fronta/*.json` z gitu (pravidlo č. 4b).

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
| GitHub secrets | `CLOUDFLARE_API_TOKEN` s právy Pages, D1 Edit, Workers Scripts Edit | API se nenasadí *(doplněno 13. 9. 2026)* |
| GitHub secrets | tentýž token, práva pro zónu `czechpatrol.cz`: DNS Edit, Zone Settings Edit, Dynamic Redirect Edit | workflow Doména nezaloží záznamy DNS ani HTTPS; web na `czechpatrol.cz` nenaběhne *(doplněno 22. 9. 2026, viz část Doména)* |
| GitHub variables | `API_URL` | účty, souhrn a tipy do správy vypnuté |
| GitHub secrets | `OPENAI_API_KEY` **nebo** `ANTHROPIC_API_KEY` (stačí jeden) | tři věci neběží: překlady rozhraní zůstávají česky, sběr netřídí kandidáty modelem a odmítnuté zprávy se neposuzují |
| GitHub variables | `OPENAI_MODEL` *(nepovinné)* | model se vybere sám z toho, co účet nabízí — viz „Který model se použije“ |
| GitHub secrets | `GH_TOKEN_SBER` — fine-grained token jen na `tessmickova/czechpatrol`, práva **Actions: Read and write** a **Metadata: Read** | sběr běží jen na plánovači GitHubu *(doplněno 13. 9. 2026)* |
| GitHub secrets | `TELEGRAM_WEBHOOK_SECRET` + proměnná `TELEGRAM_BOT_JMENO` | webhook Telegramu se nenastaví — bot nepřijímá `/start` a `/stop`, odesílat umí |
| `src/config/web.ts` | `PROVOZOVATEL.nazev`, `PROVOZOVATEL.kontakt` | stránky o projektu, soukromí a podmínkách říkají, že provozovatel není uveden; **platby a sběr e-mailů se bez uvedeného provozovatele nesmějí spustit** |
| GitHub secrets | `KLIC_SIFROVANI` — 32 náhodných bajtů base64url (`openssl rand -base64 32 \| tr '+/' '-_' \| tr -d '='`) | Premium se nespustí: kódy kreditů a e-maily u účtů se ukládají šifrovaně a bez klíče se nic nezapíše *(doplněno 22. 9. 2026)* |
| GitHub secrets + variables | `COMGATE_MERCHANT`, `COMGATE_SECRET` (secrets), `COMGATE_TEST` (variable, výchozí `true`) | web říká „odemknutí připravujeme“; `POST /platby/zacit` vrací 503. Webhook brány: `POST <API_URL>/platby/webhook/comgate` — nastavit v portálu Comgate *(doplněno 22. 9. 2026)* |
| GitHub secrets + variables | `EMAIL_POSKYTOVATEL` (`resend` nebo `postmark`, variable), `EMAIL_API_KLIC` (secret), `EMAIL_ODESILATEL` (variable, např. `kredit@czechpatrol.cz`, s DKIM/SPF na doméně) | e-maily s kódem kreditu zůstávají ve frontě QUEUED; kód je vidět v účtu *(doplněno 22. 9. 2026)* |
| GitHub secrets | `ESHOP_TOKEN` — serverový token, kterým e-shop volá `POST /kredity/overit` a `POST /kredity/uplatnit` | kredity se neuplatňují; web to říká („po spuštění e-shopu“) *(doplněno 22. 9. 2026)* |
| GitHub secrets | `KOMUNITA_TELEGRAM_ODKAZ`, `KOMUNITA_WHATSAPP_ODKAZ` — pozvánky do skupiny a chatu pro Premium | v účtu je „pozvánky připravujeme“; odkazy nikdy nejdou do veřejného kódu webu *(doplněno 22. 9. 2026)* |
| `src/config/web.ts` + secrets | žebříček připravenosti (`/odolnost/`) běží jen s uvedeným `PROVOZOVATEL` a s `KLIC_SIFROVANI` (kontakt se ukládá šifrovaně) | na webu je jen seznam a věta „zařazení připravujeme“; formulář s e-mailem a telefonem se neukáže *(doplněno 22. 9. 2026)* |
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

### Co síto nepustí — a proč se to nezahazuje

Síto na klíčová slova umí jen to, co je v seznamu. Zprávu, která je vážná, ale
napsaná mizerně — titulek „Začínáme“ nad textem o vypuknutí války — nepozná
a nikdy nepozná. Dokud se odmítnuté zprávy zahazovaly, nebylo jak to zachytit
ani zpětně zjistit, že něco uteklo.

Od 13. 9. 2026 se proto nezahazuje nic:

1. Co síto nepustí, jde do `data/fronta/odmitnute.json` i s důvodem
   (`vylouceno-tematem`, `bez-skutku`, `bez-mista`). Paměť je týden, strop 500
   položek — je to pracovní přehled, ne archiv.
2. Levný model (Haiku) jim dá druhé čtení a označí `podezreni`
   (`vysoke` / `stredni` / `zadne`) s krátkým odůvodněním. Posuzuje obsah, ne
   styl: špatně napsaný titulek nad vážnou zprávou je přesně to, co hledá.
   Nejvýš 120 položek za běh, ať náklady nemají kam utéct. Bez klíče se pass
   přeskočí a `posouzeni` zůstane `null` — **neposouzeno není totéž co „nic
   vážného“** a přehled to tak i píše.
3. `/sprava/odmitnute/` to ukáže po skupinách, nejvýš podezřelé nahoře.
4. Ruční vytažení: `node nastroje/prijmi-odmitnuty.mjs <id>` (nebo `--vazne`
   pro všechny označené jako vážné) položku přesune mezi kandidáty se stavem
   `ceka` a `klasifikace: "clovek"`. Pak ji čeká normální ověření jako každou
   jinou — otevřít zdroj, ověřit fakta, teprve pak `prijmi-kandidata.mjs`.

**Model nikdy nic nezveřejňuje ani nepřeklápí.** Jen říká, co si zaslouží lidský
pohled. Nic z `odmitnute.json` nevstupuje do počtů, hodnocení ani na veřejné
stránky. Soubor je součástí veřejného repozitáře i statického buildu — nejsou
v něm žádné neveřejné údaje, jen titulky a odkazy; drží se stranou proto, aby
zpravodajský šum nedělal obsah webu.

### Výřez ze zdroje: proč rutina osm dní nic nepublikovala

Od 6. do 14. 9. 2026 nepřibyl na web jediný záznam od automatu — všechny
publikoval člověk v interaktivním sezení. Příčina nebyla v kódu: hodinová
rutina měla v zadání otevřít zdroj a bez toho kandidáta nepřebírat, jenže
zpravodajské domény jsou z jejího prostředí blokované (`curl` na ně vrací
`000`). Dělala tedy správně nic a hlásila úspěch.

Od 14. 9. 2026 stahuje sběr na Actions začátek zdrojového článku a ukládá ho
ke kandidátovi do pole `vyrez`. Nejvýš **12 článků za běh** a jen tam, kde
výřez chybí — nedotažené doplní příští běh. Uloží se **nejvýš 1200 znaků**:
je to citace pro ověření vedle odkazu na originál, ne kopie článku.

Rutina pak ověřuje z `vyrez.text`. Záznam takhle vzniklý má
`lidskyOvereno: false` a jistotu nižší než „potvrzeno“ — ověřoval automat
z citace, ne člověk ze zdroje.

### Kdo sběr spouští

Plánovač GitHub Actions je podle vlastní dokumentace „best effort“: událost
`schedule` se při zátěži zpožďuje a **část naplánovaných běhů se zahodí úplně**
(nejhůř kolem celé hodiny, proto je náš cron v 7. minutě). V praxi to u nás
znamenalo, že z „hodinového“ sběru zbyl jeden běh zhruba za čtyři a půl hodiny.

Sběr proto spouští **Cloudflare Worker `czechpatrol-api`**, který má vlastní,
nezávislý plánovač. Tiká každých deset minut kvůli rozesílání upozornění;
v tiku v :00 a :30 navíc zavolá GitHub API `workflow_dispatch` na `sber.yml`
(`api/src/sber.ts`). Nový cron trigger kvůli tomu nepřibyl — těch je na free
plánu jen pár na worker — jen se využívá ten stávající.

Okno je desetiminutové, ne přesná minuta: kvůli pár sekundám zpoždění tiku
nechceme sběr vynechat na celou půlhodinu.

Token (`GH_TOKEN_SBER`) je v GitHub secrets a workflow `Nasazení API` ho
přenese do Workeru přes `wrangler secret put`, stejně jako telegramí token.
**Bez tokenu se nic nerozbije** — worker to zaloguje a sběr jede dál jen na
záložním plánovači GitHubu, tedy jako dřív.

> **Historie:** prvních šest běhů `Nasazení API` (5.–13. 9. 2026) selhalo na
> tom, že `CLOUDFLARE_API_TOKEN` neměl práva `Account · D1 · Edit` a
> `Account · Workers Scripts · Edit`. Worker po celou tu dobu neexistoval —
> neběžel tik, ani rozesílání upozornění. **13. 9. 2026 v 10:39 UTC se práva
> doplnila a worker se nasadil poprvé** (běh č. 7): databáze D1 založena,
> tajemství `GH_TOKEN_SBER` i `TELEGRAM_BOT_TOKEN` přenesena.
>
> `sber.yml` má od téhož dne dva záložní pokusy za hodinu (minuty 7 a 37)
> místo jednoho. Zůstávají i po nasazení workeru: dokud se spolehlivost
> workerova tiku neověří delším provozem, jsou to levné pojistky.

Protože sběr teď běží desetkrát častěji, ale data mění jen občas, **nasazení se
přeskakuje, když se nic nezměnilo**: krok „Je vůbec co nasazovat?“ porovná
`commit` z živého `/stav.json` s `HEAD`. Když se doména neozve, nasazuje se —
raději nasazení navíc než žádné.

## Model: jeden vstup, dva poskytovatelé

Model dělá tři pomocné věci: třídí kandidáty ze sběru, dává druhé čtení
odmítnutým zprávám a překládá popisky rozhraní. **Ani jedna z nich nic
nezveřejňuje** — zveřejňuje vždycky člověk. Proto `sber/model.ts` nikdy
nevyhodí výjimku ven: když model chybí nebo selže, vrátí `null` a sběr běží
dál jen podle klíčových slov.

| | |
|---|---|
| Výchozí poskytovatel | **Anthropic** (`ANTHROPIC_API_KEY`) |
| Výchozí model | **`claude-haiku-4-5`** |
| Druhá cesta | OpenAI (`OPENAI_API_KEY`), použije se, když chybí klíč Anthropic |
| Vynutit | `POSKYTOVATEL_MODELU=openai` nebo `anthropic` |
| Jiný model | proměnná `ANTHROPIC_MODEL`, případně `OPENAI_MODEL` |

Haiku je zvolené záměrně: na třídění šumu a překlad popisků je nejmenší model
z rodiny dost a běží často.

### Pozor na `effort`

Haiku 4.5 a Sonnet 4.5 parametr `output_config.effort` **odmítají chybou 400**.
Dokud tu stál `claude-opus-5`, nebylo to vidět. `sber/model.ts` ho proto posílá
jen modelům, které ho znají — jinak by po přepnutí na Haiku každé volání spadlo
a protože se chyby tady záměrně polykají, projevilo by se to jen tím, že by
model tiše přestal fungovat. Hlídají to testy v `testy/model.test.ts`.

## Cizojazyčné přehledy

`/[jazyk]/` staví přehled v patnácti jazycích (`src/lib/jazyky.ts`): angličtina,
němčina, polština, slovenština, ukrajinština, litevština, lotyština, estonština,
finština, švédština, norština, dánština, rumunština, bulharština, maďarština.
Výběr jde po zemích, o kterých máme nejvíc záznamů, a po sousedech.

Stránka se **skládá z číselníků**, ne z přeložených vět o událostech: země,
kategorie, úroveň závažnosti, stav vyšetřování a původce mají překlad
v `data/preklady/<kód>.json`, takže nová událost je v cizím jazyce čitelná hned,
jak se zveřejní, a nemůže zastarat. Titulek zůstává česky s `lang="cs"`
a odkazem na český detail — proč, viz pravidlo č. 3b v CLAUDE.md.

Názvy zemí se neudržují ručně: `Intl.DisplayNames` je odvodí z kódu ISO
(`KODY_ZEMI`). Co není stát, zůstane česky.

Úplnost hlídá `npm run kontrola:data` (oddíl 5) a `testy/preklady.test.ts`.
Chybějící klíč je **chyba**, ne varování. Test navíc hlídá, že se názvy úrovní
v překladech nerozejdou se `src/lib/skala.ts` a že každá země v datech má buď
kód ISO, nebo je zjevně nestát.

Odkaz na jazyky je v patičce a na každé cizojazyčné stránce; do hlavní
navigace nepatří — český web zůstává tím hlavním, tohle je rozcestník.

## Jak rychle se událost dostane na web

| Krok | Kdy běží | Co udělá |
|---|---|---|
| Sběr (`sber.yml`) | dvakrát za hodinu (minuty 7 a 37); po nasazení Workeru navíc spolehlivě v :00 a :30 | najde kandidáty a zapíše je do `data/kandidati.json`; web je hned ukáže jako „automaticky zachyceno, čeká na ověření“, ale do počtů nevstupují |
| Hodinové ověření (Routine) | každou hodinu | otevře zdroje nejvýš pěti nejnovějších kandidátů, ověřené převezme do `data/incidenty.json` a pushne |
| Nasazení (`nasazeni.yml`) | po každém pushi a po sběru | přepočítá a nasadí web; když se od posledního nasazení nic nezměnilo, přeskočí se |
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

- `data/fronta/zivy-web.json` — dostupnost `czechpatrol.cz`, commit, ze
  kterého je živý build (bere se z `/stav.json`, pole `commit`, plněné
  z `GITHUB_SHA` při buildu), commit repozitáře a příznak `shodujeSe`, vedle
  toho `commituNavic` a `rozdilVObsahu`.
- `data/fronta/behy.json` — posledních 30 běhů workflow: název, závěr, SHA, čas
  a odkaz.

**Proč to takhle je.** Routine běží v sandboxu za agentní proxy, která doménu
`czechpatrol.cz` (i starou `czechpatrol.pages.dev`) blokuje na úrovni organizace (`connect_rejected —
organization policy`), a přístup na `api.github.com` se uděluje per session
nástrojem `add_repo`, který routine k dispozici nemá. GitHub Actions ani jedno
z těch omezení nemá, takže zjištění proběhne tam a routine ho jen přečte z gitu.

Commit se dělá výchozím tokenem, který další workflow nespouští — jinak by se to
zacyklilo s Nasazením.

**Proč nestačí holá shoda commitů.** Právě proto, že commity od botů (sběr,
rozhlas, zápis stavu) nasazení nespouštějí, je repozitář běžně o pár commitů
napřed, aniž by na webu cokoli chybělo. `shodujeSe: false` by tak hlásilo rozpor
skoro pořád. Workflow proto navíc spočítá, o kolik commitů je repozitář napřed
(`commituNavic`) a jestli se mezi nimi změnilo něco jiného než `data/fronta/`
(`rozdilVObsahu`). Za rozpor se bere jen `rozdilVObsahu: true`.

**Zápis se opakuje.** Push z tohohle workflow může selhat ze dvou přechodných
důvodů: mezitím na `main` přibyl commit z jiného workflow (rozhlas zapisuje stav
odeslaných zpráv hned po odeslání), nebo GitHub odpoví chybou 500. Krok proto
zkouší push pětkrát, mezi pokusy přebasuje na aktuální `main` a čeká 5 až 25
sekund. Obojí se stalo hned při prvních dvou bězích 13. 9. 2026.

Když se poměry změní a routine na doménu dosáhne, soubory tím nepřestanou
platit; jsou to jen zapsaná zjištění, ne náhrada ověření.


## Žebříček připravenosti (doplněno 22. 9. 2026)

Pro **přihlášené anonymní účty**. Kdo vyplní audit na `/odolnost/`
(aspoň tři oblasti), může se zařadit: k účtu se uloží skóre 0–100
(`skore()` v `src/lib/odolnost.ts`, 70 bodů zálohy, 30 horizonty),
datum, kraj, počet osob a **vygenerovaná** přezdívka („Bdělý ježek 47“,
nikdy zadaná). Jeden záznam na účet; nové vyplnění přepíše skóre a
datum, přezdívka zůstává. Veřejně (`GET /zebricek`) je vidět jen
přezdivka, skóre, datum a kraj. Nepřihlášený po vyplnění dostane otázku:
přihlásit se anonymně, nebo v žebříčku nebýt (volba se pamatuje
v zařízení).

Kontakt (e-mail, telefon) je **nepovinný**, ukládá se šifrovaně
(`KLIC_SIFROVANI`; bez klíče se pole nenabídnou), čte ho jen správce
(`GET /sprava/zebricek`, čtení kontaktů je v auditu) a slouží k pozvání
do komunity. Web to říká u polí a na stránce Soukromí (čl. 13 GDPR).
„Odejít ze žebříčku“ smaže záznam i kontakt hned; smazání účtu také.
Záznam bez pohybu ze strany provozovatele (stav `novy`/`nezajem`) se po
roce maže. Migrace `0007` tabulku z `0006` staví znovu (byla nasazena
prázdná).
