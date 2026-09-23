# Audit 4 — právo, účty, Free/Premium, připravenost, IZS, odběry

Předmět: `/home/user/czechpatrol` (commit `6aad0a8`, 23. 9. 2026 15:16 UTC), pracovní kopie čistá.
Režim: jen čtení, v repozitáři se nic neměnilo.
Podklady: `CLAUDE.md`, `docs/PRAVNI-KONTROLA.md`, `docs/PREMIUM-NAVRH.md`, stránky v `src/app/*`, komponenty v `src/components/*`, `src/config/web.ts`, API v `api/src/*`, migrace `api/migrace/0001–0007`.

> **Poznámka k rozsahu:** audit běžel ze session e-shopu Čenich (`/home/user/eshop`). Podle pravidla č. 0 z jeho `CLAUDE.md` patří práce na CzechPatrolu do vlastní session. Protože šlo jen o čtení a zápis do scratchpadu, audit proběhl, ale **další práci (opravy) je potřeba dělat v session CzechPatrolu.**

> **Co se nedalo ověřit:** živý web `czechpatrol.cz` (proxy vrací 403, viz pravidlo 4b v CLAUDE.md CzechPatrolu). Z repozitáře **nejde zjistit, jestli je při buildu webu nastavená proměnná `API_URL` (`NEXT_PUBLIC_API_URL`)**, tedy jestli web účty ukazuje. API worker běží od 13. 9. 2026 (`docs/PROVOZ.md` ř. 9, běh „Nasazení API" #28 22. 9. success). Commit `c6c76c5` („lidé na staré adrese by se nepřihlásili") naznačuje, že účty se používají. Proto se níže hodnotí **oba stavy**: (A) `API_URL` nastavené = účty, tipy, e-mail a žebříček běží, (B) nenastavené.
> Stejně tak nejde ověřit, jestli jsou nastavená tajemství `COMGATE_*`, `KLIC_SIFROVANI`, `ESHOP_TOKEN`, `TELEGRAM_BOT_*` a `WHATSAPP_*`.

---

## 0. Shrnutí P0 / P1

| # | Priorita | Problém |
|---|---|---|
| F-01 | **P0** | Provozovatel ani správce osobních údajů nejsou uvedeni (`PROVOZOVATEL = {nazev:"", kontakt:""}`), přesto API sbírá osobní údaje (tipy se jménem, e-mailem a telefonem, kontakty v žebříčku, e-mail u účtu, WhatsApp číslo). Podle vlastní právní kontroly „bez toho ne". |
| F-02 | **P0** | `/soukromi/` nepopisuje současný systém: chybí tipy (jméno, e-mail, telefon), Premium (platby 10 let, kredity, šifrovaný profil domácnosti), e-mail u účtu, souhrn domácnosti v žebříčku, příjemci Comgate a e-mailová služba (Resend/Postmark). Tvrzení „Bez jména, e-mailu a telefonu" a „Do té doby web žádné údaje k uživatelům neukládá" jsou nepravdivá. `PRAVNI-KONTROLA.md` přitom tvrdí, že odstavec o Premium na `/soukromi/` je, a to neplatí. |
| F-03 | **P0** | Hodinový rozhlas posílá do veřejného Telegramu **automaticky neověřené zprávy** („NEOVĚŘENO — vyhlášení mobilizace…", „vážný případ ze dvou zdrojů, bez úředního"), bez lidské kontroly a bez označení AI. Je to v rozporu s pravidly č. 0/2 a 4 v CLAUDE.md i s tvrzením v PRAVNI-KONTROLA § 4 (§ 357 TZ). **LEGAL REVIEW REQUIRED.** |
| F-04 | **P0** (latentní) | Platby se zapnou samotným vložením tajemství Comgate. Chybí tvrdá pojistka na `PROVOZOVATEL`, obchodní podmínky, poučení o odstoupení (§ 1820, § 1837 písm. l OZ) i souhlas se ztrátou práva odstoupit. Text „Celých 150 Kč vám **vrátíme**… v CzechPatrol e-shopu" je zavádějící: e-shop neexistuje a jmenuje se Čenich. Podmínky tvrdí „Web i účet jsou zdarma". |
| F-05 | P1 | Smazání účtu selže u účtu, kterému správce Premium daroval: FK `opravneni → ucty` je bez `ON DELETE`. Klient chybu spolkne (`try/finally` bez `catch`). Úklid po 24 měsících se v takovém případě zastaví celý, protože jde o jednu D1 dávku. |
| F-06 | P1 | Správce smí sám napsat „zprávu partnera IZS" a sám ji schválit. Odejde pak s hlavičkou „🚨 Zpráva partnera IZS · Partner IZS … Zprávu poslala ověřená složka IZS". Je to nepravdivé přisouzení složce IZS. |
| F-07 | P1 | UI slibuje IZS zprávy jako hotový „bonus" (`/ucet/`), přestože žádný partner není, kontakt pro složky je prázdný a `/zapojit-se/` říká „Nic z toho ještě neběží". |
| F-08 | P1 | „Hodnocení dělá člověk" (`/soukromi/`, `/o-projektu/`, `/podminky/`) už neplatí. Celkové hodnocení počítá od 23. 9. 2026 automat (`sber/hodnoceni.ts`). |
| F-09 | P1 | Účet ukazuje „Známe o vás: nic osobního" a stránka `/ucet/` tvrdí „Bez jména, e-mailu i telefonu", i když účet může mít e-mail, WhatsApp číslo a kontakt v žebříčku. |
| F-10 | P1 | Žebříček: soutěžní rámování („Jak jste na tom proti ostatním", pořadí, průměr ostatních, „Buďte první"). Skóre posílá klient, takže jde podvrhnout. Na server odchází nezveřejněný „souhrn" slabin domácnosti. Úklid po roce se netýká stavů `pozvan` a `clen`. |
| F-11 | P1 | Motto „Čím lépe budeme připraveni, tím méně atraktivním cílem budeme." je bezpečnostně poplašné rámování a odporuje pravidlu č. 6. |
| F-12 | P1 | Za Premium je doporučená zásoba pitné vody na 7 dní a výdrž léků. Obojí se dotýká zdraví a patří do FREE. |
| F-13 | P1 | Testovací režim brány („nic se neúčtuje") vytvoří **skutečné** oprávnění i skutečný kredit 150 Kč. Platba nemá příznak `test`. |
| F-14 | P1 | Komunita a chat se prodávají jako Premium, ale `/zapojit-se/` a žebříček slibují pozvánku do komunity zdarma. |
| F-15 | P1 | Formulář tipů je vidět a dá se vyplnit i tehdy, když nemá kam poslat (bez API a bez `TIPY_MAIL`). Chyba přijde až po vyplnění. |

Podrobnosti, P2 a P3 a tabulka stavů funkcí jsou níže.

---

## 1. Právní konzistence

### F-01 — Chybí identifikace provozovatele a správce osobních údajů · **P0**
- **URL:** `/soukromi/`, `/podminky/`, `/o-projektu/`, `/zapojit-se/`, `/izs/`, `/odolnost/`
- **KOMPONENTA:** `src/config/web.ts:244-247` (`PROVOZOVATEL = { nazev: "", kontakt: "" }`); `soukromi/page.tsx:59-63`; `podminky/page.tsx:46`; `o-projektu/page.tsx:65-67`
- **CURRENT:** Soukromí: „Správce osobních údajů… zveřejníme nejpozději se spuštěním účtů. Do té doby web žádné údaje k uživatelům neukládá." Podmínky: „soukromá osoba (identifikace bude doplněna se spuštěním účtů)". Patička žádnou identitu nemá.
- **PROBLEM:** Worker běží od 13. 9. a přijímá osobní údaje bez ohledu na `PROVOZOVATEL`: `POST /tipy` (jméno, e-mail, telefon, `api/src/tipy.ts:22`), `POST /zajem` (e-mail), `PUT /ja/zebricek` (e-mail, telefon), `PUT /ja/email`, `PUT /ja/whatsapp`. Pojistka `EMAIL_ODBER_BEZI` (`web.ts:257`) hlídá jen jeden formulář a jen v klientovi. Čl. 13 odst. 1 písm. a GDPR vyžaduje totožnost a kontakt správce. Při placené službě to navíc vyžaduje § 5 zákona č. 480/2004 Sb. a § 1811, § 1820 OZ.
- **RISK:** Zpracování bez splněné informační povinnosti, stížnost u ÚOOÚ. Žádosti subjektů nemají kam jít, protože „žádosti vyřizujeme jen z přihlášeného účtu" a jiný kontakt neexistuje. Při zapnutí plateb jde o neidentifikovaného podnikatele.
- **FIX:** Vyplnit `PROVOZOVATEL` (jméno nebo název, IČO, pokud existuje, adresa, e-mail). Dokud chybí, API má odmítat všechny zápisy osobních údajů (`/tipy` s kontaktem, `/zajem`, `/ja/email`, `/ja/whatsapp`, kontakt v žebříčku, `/platby/zacit`), ideálně přes proměnnou `PROVOZOVATEL_UVEDEN` ve workeru. Identitu přidat do patičky. **LEGAL REVIEW REQUIRED** (podoba identifikace u soukromé osoby).
- **ACCEPTANCE TEST:** (1) Build s prázdným `PROVOZOVATEL` → `/soukromi/` neobsahuje větu „web žádné údaje neukládá", pokud je `UCTY_ZAPNUTE`. (2) `curl -X POST $API/tipy -d '{"popis":"…20+ znaků…","email":"a@b.cz"}'` bez nastaveného provozovatele → 503, v D1 nic nepřibude. (3) Patička na každé stránce ukazuje identitu provozovatele.

### F-02 — `/soukromi/` neodpovídá tomu, co systém ukládá · **P0**
- **URL:** `/soukromi/`
- **KOMPONENTA:** `src/app/soukromi/page.tsx` (revize `2026-09-22`)
- **CURRENT / PROBLEM (tvrzení vs. realita):**

| Tvrzení na `/soukromi/` | Realita v kódu |
|---|---|
| ř. 49 „Účet: … Bez jména, e-mailu a telefonu." | `ucty.email_sifrovany` (migrace 0005 ř. 120), WhatsApp `kanaly.cil` = telefon, `zebricek.email_sifrovany/telefon_sifrovany` |
| ř. 62 „Do té doby web žádné údaje k uživatelům neukládá." | API ukládá, viz F-01 |
| Tipy (formulář „Chybí tu nějaká událost?" na úvodu, `/udalosti/`, `/zapojit-se/`) | **Vůbec nezmíněné.** Tabulka `tipy` (jméno, e-mail, telefon, 12 měsíců, `synchronizace.ts:44`) |
| Premium | **Žádný odstavec.** Chybí `platby` (částka, id u brány, uchování „10 let"), `kredity` (šifrovaný kód), `hodnoceni` a `domacnosti` (šifrovaný profil domácnosti, 5 posledních), `emaily` (1 rok, `synchronizace.ts:49`). `PRAVNI-KONTROLA.md` ř. 38 tvrdí „Stránka `/soukromi/` má odpovídající odstavce (oddíl 05 a Premium)". To neplatí. |
| ř. 99 žebříček: „skóre, datum, kraj a počet osob" | Ukládá se i `souhrn` = počty slabin a kritických závislostí domácnosti (`zebricek-klient.tsx:79`, `zebricek.ts:70`) |
| ř. 99 „sami mažeme záznamy bez pohybu po roce" | `uklid()` maže jen stavy `novy` a `nezajem` (`synchronizace.ts:51`). Stavy `pozvan` a `clen` zůstávají napořád. |
| ř. 108-117 „Jak dlouho" | Chybí platby a kredity (10 let), e-maily s kódem (1 rok), tipy (1 rok), vyprázdněný účet s platbou (napořád, `ja.ts:91`) |
| ř. 120-124 „Komu údaje předáváme": Cloudflare, Telegram, Meta | Chybí **Comgate** (platby, e-mail účtu se posílá bráně: `platby.ts:87`) a **e-mailová služba** Resend/Postmark (`api/src/emaily.ts`, přenos mimo EU?) |
| ř. 129 „Účet smažete jedním tlačítkem, hned a bez zálohy." | U účtu s platbou nebo kreditem zůstává řádek `ucty` se `smazano`. D1 navíc drží 30denní Time Travel, takže „bez zálohy" technicky neplatí. |
| ř. 135 „V prohlížeči ukládá jen přihlášení a vaše předvolby." | Ukládá i profil domácnosti (`czechpatrol:odolnost:v1`, může obsahovat závislost zdravotního přístroje), odpovědi připravenosti, odmítnutí žebříčku, odložení nabídky a kopie stránek v service workeru. Viz F-16. |
| ř. 139 „Hodnocení dělá člověk." | Neplatí, viz F-08 |

- **RISK:** Porušení čl. 13 GDPR. Nepravdivé informace o zpracování jsou klamavé.
- **FIX:** Přepsat `/soukromi/` podle tabulky výše. Zavést jeden zdroj pravdy pro doby uchování: konstanty v `api/src/synchronizace.ts`, které čte i stránka. Test má porovnat doby na stránce a v kódu (CLAUDE.md pravidlo 9 to vyžaduje). Doplnit Comgate a e-mailovou službu jako zpracovatele. **LEGAL REVIEW REQUIRED** (10 let u plateb, právní titul u kreditu, DPIA profilu domácnosti se zdravotním přístrojem).
- **ACCEPTANCE TEST:** Test v `testy/`, který z `uklid()` vytáhne všechny tabulky a doby a ověří, že každá má řádek na `/soukromi/`. Ruční kontrola: každá tabulka s osobním údajem v migracích 0001–0007 (`tipy`, `zajem`, `ucty.email_*`, `kanaly`, `zebricek`, `platby`, `kredity`, `emaily`, `hodnoceni`) má odstavec s účelem, titulem, dobou a příjemcem.

### F-03 — Automatické neověřené zprávy do veřejného Telegramu · **P0 · LEGAL REVIEW REQUIRED**
- **URL:** kanál `t.me/czechpatrol`; texty na `/odber/`, `/zapojit-se/`
- **KOMPONENTA:** `nastroje/rozhlas.mjs:610-730` (`vyberSignaly`, `sestavSignal`, `sestavVaznyNavrh`); `src/config/web.ts:60,110-116` (`NEOVERENE_SIGNALY`); `src/components/odber.tsx:65`
- **CURRENT:** Bez lidské kontroly odcházejí zprávy „⚠️ NEOVĚŘENO — signál ke kontrole" (mobilizace v Rusku, krizové vysílání ČRo, čl. 4/5, mimořádný stav ČR, uzavření hranic) a „⚠️ NEOVĚŘENO — vážný případ ze dvou nezávislých zdrojů, bez úředního". Text „fakta" pochází z `navrhy.json`, pravděpodobně z modelu.
- **PROBLEM:** CLAUDE.md pravidlo 0/2 říká: „Neověřené tvrzení o ohrožení se nevydá jako tvrzení — ani jako otázka, ani jako možnost". Pravidlo 0/4: „Do Telegramu ani jiných kanálů se neodesílají". Pravidlo 4: „Sběrač nikdy nic nezveřejňuje". `PRAVNI-KONTROLA.md` § 4: „Web nikdy nepotvrzuje nic pozitivního automaticky". Zprávy navíc nenesou označení AI (čl. 50 odst. 4 AI Act: text pro veřejnost o věcech veřejného zájmu bez lidské redakční kontroly).
- **RISK:** § 357 TZ (šíření poplašné zprávy): titulek „mobilizace" doručený push notifikací i s přívlastkem „neověřeno". Dále zaměnitelnost s varovným systémem (krizový zákon, JSVV) a porušení AI Act.
- **FIX:** Do doby, než věc posoudí právník, vypnout `vyberSignaly` a vážné návrhy v rozhlasu (feature flag). Pokud právník výjimku schválí, zapsat ji do CLAUDE.md a PRAVNI-KONTROLA jako výslovnou výjimku s podmínkami a přidat do zprávy „Text vytvořen automaticky s pomocí AI". **LEGAL REVIEW REQUIRED.**
- **ACCEPTANCE TEST:** Unit test `rozhlas`: s kandidátem `naliehave.stupen=1` a vypnutým flagem odejde 0 zpráv. S flagem zapnutým začíná text zprávy „NEOVĚŘENO" a obsahuje označení AI.

### F-04 — Placená vrstva: právní text a pojistky chybí · **P0 (latentní, spustí ji jedno tajemství)**
- **URL:** `/odolnost/` (karta Premium), `/ucet/#kredity`, `/odolnost/platba/`, `/podminky/`
- **KOMPONENTA:** `src/components/premium-klient.tsx:48-119`; `api/src/platby.ts:35-37` (`bezi()` = jen `COMGATE_MERCHANT && COMGATE_SECRET && KLIC_SIFROVANI`); `podminky/page.tsx:62,77-82`
- **CURRENT:** Tlačítko „Odemknout můj plán — 150 Kč" vede rovnou na bránu. Pod ním stojí „Celých 150 Kč vám vrátíme jako kredit 150 Kč na nákup v CzechPatrol e-shopu." Podmínky (revize 5. 9.) říkají „Účet je anonymní a zdarma" a „Web i účet jsou zdarma" (`PLACENE.hraniceADoprava=false`).
- **PROBLEM:** (1) `PRAVNI-KONTROLA.md` ř. 95 tvrdí, že bez `PROVOZOVATEL` se platby nespustí. Kód nic takového nekontroluje. (2) Před platbou chybí: identifikace podnikatele, obchodní podmínky, poučení o právu odstoupit do 14 dnů, výslovný souhlas se započetím plnění a potvrzení ztráty práva odstoupit (§ 1837 písm. l OZ), údaj o DPH a reklamace. (3) „vrátíme" budí dojem vratné zálohy (PREMIUM-NAVRH § 19 bod 8). (4) „CzechPatrol e-shop" neexistuje: `ESHOP = ""`, e-shop je samostatný projekt Čenich. (5) `eshopBezi = Boolean(env.ESHOP_TOKEN)` (`platby.ts:43`) znamená, že samotný token skryje větu „E-shop připravujeme", i když e-shop neběží.
- **RISK:** Nekalá obchodní praktika, prodloužení lhůty pro odstoupení až o 12 měsíců (§ 1829 OZ), vrácení plateb, sankce ČOI.
- **FIX:** V `bezi()` vyžadovat i `env.PROVOZOVATEL_UVEDEN === "true"` a `env.PODMINKY_PREMIUM_VERZE`. Před tlačítkem přidat zaškrtávací pole se souhlasem se započetím plnění a ztrátou práva odstoupit a verzi souhlasu ukládat k platbě. Na `/podminky/` doplnit oddíl Premium (cena, obsah = `OBSAH_PREMIUM`, kredit, expirace, co při refundu, veřejný engine). „vrátíme" nahradit slovem „dostanete". „CzechPatrol e-shop" nahradit skutečným názvem, až bude. `eshopBezi` řídit samostatnou proměnnou. **LEGAL / CONSUMER LAW REVIEW REQUIRED.**
- **ACCEPTANCE TEST:** (1) Worker s tajemstvími Comgate, ale bez `PROVOZOVATEL_UVEDEN` → `GET /premium` vrací `bezi:false` a `POST /platby/zacit` vrací 503. (2) Bez zaškrtnutého souhlasu je tlačítko neaktivní a `POST /platby/zacit` bez `souhlasVerze` vrací 400. (3) `/podminky/` obsahuje oddíl s cenou, s podmínkami kreditu a s § 1837 l.

### F-08 — „Hodnocení dělá člověk" už neplatí · **P1**
- **URL:** `/soukromi/` ř. 139, `/o-projektu/` ř. 43 („Hodnocení dělá člověk"), `/podminky/` ř. 56 („Celkovou úroveň… schvaluje člověk"), `src/lib/data.ts:437` (komentář)
- **CURRENT/PROBLEM:** CLAUDE.md pravidlo 4 (výjimka z 23. 9. 2026): `data/stav.json` počítá automat (`sber/hodnoceni.ts`), ruční přepis se přepíše. Tvrzení o lidském hodnocení je tedy nepravdivé. `PRAVNI-KONTROLA.md` § 3 („Celkovou úroveň… stanovuje člověk") taky.
- **RISK:** Klamavé tvrzení o lidském dohledu (transparentnost podle AI Act a spotřebitelská důvěra).
- **FIX:** Nahradit větou „Celkovou úroveň počítá pravidlo z ověřených případů za 14 dní (metodika); zveřejnění jednotlivých událostí schvaluje člověk." Opravit PRAVNI-KONTROLA § 3. Zapsat změnu do `/opravy/`.
- **ACCEPTANCE TEST:** `grep -rn "Hodnocení dělá člověk\|Celkovou úroveň.*schvaluje člověk" src docs` vrátí 0 výsledků.

### F-16 — Úložiště v prohlížeči a § 89 odst. 3 ZEK · **P2**
- **KOMPONENTA:** `src/lib/ucet.ts:68` (token), `src/components/pohyb.tsx:17-18` (motiv, pohyb), `src/lib/odolnost.ts:137` (profil domácnosti), `src/lib/pripravenost.ts:14`, `src/components/muj-prehled-klient.tsx:47`, `zebricek-klient.tsx:30`, `zapojit-klient.tsx:129`, `public/sw.js` (Cache API)
- **CURRENT:** Cookies, `sessionStorage` ani IndexedDB se nepoužívají. Analytika je vypnutá: `src/lib/mereni.ts` bez `NEXT_PUBLIC_MERENI_URL` nic neposílá a proměnná není v žádném workflow. Skripty třetích stran nejsou.
- **PROBLEM:** Všechny záznamy jsou funkční a uživatelem vyžádané, takže výjimka „nezbytně nutné" nejspíš platí a lišta se souhlasem není potřeba. `/soukromi/` ř. 135 ale seznam zkresluje. Profil domácnosti může obsahovat zdravotní údaj (závislost přístroje na elektřině), a o tom se čtenář dozví jen z `/odolnost/`. Pozor: `zaznamejUdalost` je volaná na 18 místech. Zapnutí `NEXT_PUBLIC_MERENI_URL` by bez úpravy `/soukromi/` („Nepoužíváme… měření návštěvnosti", ř. 68) vytvořilo rozpor a podle PRAVNI-KONTROLA § 2 i povinnost lišty.
- **FIX:** Odstavec 10 doplnit o seznam klíčů a účel každého z nich. Build má selhat, pokud je `NEXT_PUBLIC_MERENI_URL` nastavená a `/soukromi/` měření nepopisuje.
- **ACCEPTANCE TEST:** Test porovná všechny klíče `localStorage` v `src/` (grep) se seznamem na `/soukromi/`.

### F-17 — AI Act: označení obsahu · **P2**
- **CURRENT:** Pruh „Beta · AI-assisted" je na každé stránce (`src/components/pruhy.tsx:6-21`), „AI shrnutí" u detailu (`detail-obsah.tsx:69,134`). V pořádku.
- **PROBLEM:** Označení chybí ve zprávách do Telegramu (F-03). V textech je chybné tvrzení o lidském hodnocení (F-08). Rozcestník pro dotaz „kde všude AI pomáhá" (PRAVNI-KONTROLA § 3 „Zbývá") neexistuje.
- **FIX:** Stejná patička v Telegramu. V metodice seznam míst, kde pracuje model (souhrny, druhé čtení odmítnutých, návrhy).
- **ACCEPTANCE TEST:** Každý výstup `sestav*` v `rozhlas.mjs` obsahuje „AI" nebo „automaticky".

### F-18 — `/o-projektu/`: rozpory a prázdné oddělovače · **P2**
- **KOMPONENTA:** `src/app/o-projektu/page.tsx`
- **CURRENT/PROBLEM:** ř. 31 „nezávislý a **nekomerční**" versus Premium za 150 Kč a kredit do e-shopu. ř. 46 „Základ je a zůstane zdarma", což je v pořádku. ř. 50 „Účty… {UCTY_ZAPNUTE ? "běží" : …}" nezohledňuje, že web přes API sbírá i jiná data. ř. 60 „Role partnera… připravená v kódu" je pravda, ale `/ucet/` totéž prodává jako hotové (F-07). ř. 69-71 vykreslí „ ·  · Soukromí · Podmínky": zbytky po odstraněných odkazech. ř. 67 „Kód i data jsou veřejné" bez odkazu (záměrně kvůli anonymitě), takže tvrzení nejde ověřit.
- **FIX:** „nekomerční" nahradit popisem, jak se projekt financuje (dobrovolná podpora a volitelné Premium). Odstranit prázdné `{" · "}`.
- **ACCEPTANCE TEST:** Vykreslené HTML `/o-projektu/` neobsahuje sekvenci `· ·` a slovo „nekomerční", pokud `PLATBY_BEZI`.

---

## 2. Účty: celý tok

Tok v kódu (klient `src/lib/ucet.ts`, `src/lib/passkey.ts`, `src/components/ucet-klient.tsx`; server `api/src/auth.ts`, `api/src/ja.ts`):

| Krok | Klient | Endpoint | Chybové stavy | Hodnocení |
|---|---|---|---|---|
| Anonym bez API | `UcetKlient` ř. 45-58: „Účty připravujeme" + RSS | nic | – | OK: bez `API_URL` se nic nepředstírá (`api()` hodí `ChybaApi(0)`). IZS, žebříček a Můj přehled také ukazují „připravujeme". |
| Registrace | `registrovat()` → `navigator.credentials.create` | `POST /auth/registrace/zacit` (brzda 15/10 min), `POST /auth/registrace/dokoncit` | výzva prošlá po 5 min („Výzva vypršela"), zrušení v prohlížeči („Prohlížeč passkey nevytvořil"), chyba ověření vrací surovou anglickou hlášku knihovny (`auth.ts:133`), 429 | Obnovovací kód drží rodič (`UlozKod`), pokračovat jde až po potvrzení, což je v pořádku. Duplicitní účet ve stejném zařízení bez `excludeCredentials` vznikne bez varování. |
| Přihlášení | `prihlasit()` | `POST /auth/prihlaseni/zacit` (20/10 min), `…/dokoncit` | „Tenhle passkey neznáme. Zkuste obnovovací kód." (např. passkey z `pages.dev` na `.cz`), zrušení, surová hláška knihovny | OK |
| Stránka účtu | `useUcet()` → `GET /ja` | `GET /ja` | **Výpadek sítě nebo 5xx → `setUcet(null)` a zobrazí se přihlášení bez vysvětlení** (`ucet.ts:148`). Token zůstane, uživatel si myslí, že je odhlášený. | P2 (F-21) |
| Odhlášení | `odhlasit()` | `POST /auth/odhlaseni` (smaže jen tuto relaci) | chyba sítě → token se lokálně zahodí i tak | OK. Chybí „odhlásit všude" (relace 30 dní, klouzavě). |
| Obnova kódem | `obnovit(kod)` | `POST /auth/obnova` (5/30 min) | „Kód má 16 znaků.", „Kód nesedí.", 429 | Po obnově UI nevyzve k přidání passkey, i když text na ř. 150 („pak si k němu přidáte další passkey") to slibuje. **Kód po použití dál platí** (nerotuje se). Obnova projde otisky všech účtů (O(n) SHA-256 na požadavek, `auth.ts:214`), takže škáluje špatně a otevírá cestu k DoS. P2/P3 |
| Nový kód | `POST /ja/obnova` | – | chyba se zobrazí | OK |
| Telegram | `POST /ja/telegram/kod` → `t.me/<bot>?start=kod` (15 min) → webhook | `api/src/telegram.ts` | kód prošlý: bot napíše „Kód nesedí nebo vypršel". Bez bota: „připravujeme". | OK. `/stop` odpojí. |
| WhatsApp | `PUT /ja/whatsapp` | 503 bez tokenů | formát čísla | Bez `WHATSAPP_*` „připravujeme", to je OK. Chybí informace o Meta a DPA přímo u pole. |
| Smazání | `smaz()` → `DELETE /ja` | `ja.ts:74-95` | **Chyba se nezobrazí:** `try { … } finally { setMazu(false) }` bez `catch` (`ucet-klient.tsx:241-246`) | **F-05 P1** |

### F-05 — Smazání účtu s darovaným Premium spadne a chyba se neukáže · **P1**
- **URL:** `/ucet/` → „Smazat účet"
- **KOMPONENTA:** `api/src/ja.ts:75-79`; `api/migrace/0005_platby.sql:47` (`opravneni.ucet_id REFERENCES ucty(id)` bez `ON DELETE`); `api/src/opravneni.ts:81-97` (dar správce vytvoří jen `opravneni`); `ucet-klient.tsx:241-246`
- **CURRENT:** Když účet nemá platby ani kredity, zavolá se `DELETE FROM ucty`. Účet s darovaným oprávněním ale má řádek v `opravneni` a D1 cizí klíče standardně vynucuje, takže DELETE selže, API vrátí 500 a klient nic neřekne. Stejný `DELETE FROM ucty` je v `uklid()` (`synchronizace.ts:53`) uvnitř jedné `DB.batch`. Jediný neaktivní účet s darem po 24 měsících tak shodí **celý** úklid (tipy, zájemci, relace…).
- **RISK:** Porušení práva na výmaz (čl. 17), nefunkční doby uchování a uživatel, který věří, že účet smazal.
- **FIX:** V `smazUcet` započítat do dokladových řádků i `opravneni` nebo `opravneni` před smazáním odstranit či anonymizovat. V migraci přidat `ON DELETE CASCADE` pro `opravneni` s `zdroj_druh='admin'`. V `uklid()` vyloučit účty s `opravneni` nebo mazat po jednom. V klientu přidat `catch` s chybovou hláškou.
- **ACCEPTANCE TEST:** Test v `api/testy/`: účet → `udel` dar → `DELETE /ja` → 200 a účet neexistuje nebo je vyprázdněný. Klient: mock 500 → zobrazí se `Hlaska typ="chyba"`.

### F-09 — „Známe o vás: nic osobního" · **P1**
- **URL:** `/ucet/`
- **KOMPONENTA:** `ucet-klient.tsx:275-276`; `src/app/ucet/page.tsx:18` („Bez jména, e-mailu i telefonu"); `ucet-klient.tsx:131-132` („Nesbíráme jméno, e-mail ani telefon. Ani my nevíme, kdo jste."); `zapojit-se/page.tsx:80`
- **PROBLEM:** Účet může mít e-mail (`PUT /ja/email`), WhatsApp číslo a kontakt v žebříčku (e-mail i telefon). Věta platí jen pro čerstvý účet. Potvrzení smazání (ř. 235) nezmiňuje výjimku pro platbu, zmiňuje ji jen karta (ř. 385).
- **FIX:** Dynamicky: „Známe: {e-mail pro kredit, WhatsApp číslo, kontakt v žebříčku} / nic osobního". U nadpisu: „Bez jména. E-mail a telefon jen pokud je sami zadáte." Nabídnout export JSON (čl. 20, v PRAVNI-KONTROLA označený jako „drobnost", neudělaný).
- **ACCEPTANCE TEST:** Účet s uloženým e-mailem → karta ukazuje „e-mail pro kód kreditu". Tlačítko „Stáhnout moje data" vrátí JSON se vším z `verejnyUcet` + žebříček + kanály.

### F-21 — Výpadek API vypadá jako odhlášení · **P2**
- **KOMPONENTA:** `src/lib/ucet.ts:144-152`
- **FIX:** Rozlišit 401 (odhlášen) a síť nebo 5xx („Služba účtů teď neodpovídá, zkuste to za chvíli"). Token při výpadku nezahazovat, což už platí.
- **ACCEPTANCE TEST:** Mock `fetch` reject → `/ucet/` ukazuje hlášku o výpadku, ne přihlašovací kartu.

### F-22 — Obnovovací kód · **P3**
- Kód po použití nerotuje. Po obnově chybí výzva k přidání passkey. Chybové hlášky WebAuthn jsou anglicky. Identifikátor pro IZS („pošlete číslo účtu") se v UI zobrazuje zkrácený (`#{id.slice(0,8)}`, `ucet-klient.tsx:264`), ale správce pro `PUT /sprava/ucty/:id/role` potřebuje celé id.
- **FIX:** Po `obnova` zobrazit kartu „Přidejte passkey pro toto zařízení" a nabídnout nový kód. Hlášky přeložit. Ukázat celé id s kopírováním.

---

## 3. Free vs. Premium

- **Stav:** Kód je hotový a nasazený (PREMIUM-NAVRH, oddíl „Stav implementace"), brána je podle dokumentace vypnutá. Web ukazuje „Odemknutí připravujeme", dokud `GET /premium` vrací `bezi:false` (`premium-klient.tsx:115-118`). Stav tajemství nejde z repozitáře ověřit, proto **DEVELOPMENT / PRIVATE_BETA**. Oprávnění může rozdávat správce (`POST /sprava/opravneni`), Premium je tedy už teď dostupné vybraným účtům.
- **Co je FREE** (`odolnost-klient.tsx:22-37, 294-325`): souhrn s počty, 72 h, bezpečnostní nálezy (vždy nad nabídkou) a „Za 0 Kč". To je v pořádku.
- **Co je za Premium:** horizonty 7–60 dní, **„Doporučená zásoba pitné vody na 7 dní"** (ř. 346-351), **„Jak dlouho vydrží voda, jídlo, léky a energie"** (ř. 343-359, `OBSAH_PREMIUM` ř. 29), energie, „co vypne co", nákup, export a tisk, uložení na server, **komunita a chat**.

### F-12 — Zdravotně relevantní údaje za platbou · **P1**
- **PROBLEM:** Doporučené množství pitné vody (úřední doporučení HZS) a výdrž léků se přímo dotýkají zdraví. PRAVNI-KONTROLA § 5 („nikdy nezamykat bezpečnostní nález") i vlastní etická výhrada projektu říkají: placenou vrstvu stavět na pohodlí, ne na bezpečí.
- **FIX:** Přesunout do FREE: doporučenou zásobu vody (s odkazem na HZS) a výdrž „voda" a „léky" (aspoň stav „na kolik dní"). Za Premium ponechat rozpočty, graf závislostí, plán, export a uložení.
- **ACCEPTANCE TEST:** `testy/odolnost.test.ts`: s `premium=false` je ve vykresleném souhrnu řádek „Doporučená zásoba pitné vody" a výdrž „léky".

### F-13 — Testovací platba vytvoří skutečný kredit · **P1**
- **KOMPONENTA:** `api/src/platby.ts:38,81` (`test: "true"`, výchozí stav, pokud `COMGATE_TEST !== "false"`); `pouzijStav` ř. 150-172 vytvoří oprávnění + kredit 150 Kč; tabulka `platby` nemá sloupec `test`. `premium-klient.tsx:113`: „Brána běží v testovacím režimu: platba je zkušební, nic se neúčtuje."
- **RISK:** Při zapnutí v testovacím režimu získá kdokoli zdarma Premium a uplatnitelný kredit 150 Kč. Až začne kredity uplatňovat e-shop (`ESHOP_TOKEN`), jde o přímou finanční ztrátu.
- **FIX:** Do `platby` přidat `test INTEGER`. U testovací platby vytvořit kredit se stavem `TEST` (nebo žádný) a oprávnění s krátkou platností. `kredity/overit` a `kredity/uplatnit` mají testovací kredity odmítat.
- **ACCEPTANCE TEST:** Test: `COMGATE_TEST` nenastaveno → PAID → `SELECT stav FROM kredity` ≠ `ACTIVE`, `POST /kredity/uplatnit` vrací 4xx.

### F-14 — Komunita: zdarma, nebo placená? · **P1**
- **CURRENT:** `/zapojit-se/` ř. 68: „Až otevřeme chat a skupinu na WhatsAppu, pošleme pozvánku první těm, kdo o ni stojí" (e-mailem, zdarma). Žebříček (`zebricek-klient.tsx:152,161`) nabízí kontakt „k pozvání do komunity". Premium (`OBSAH_PREMIUM` ř. 33, `api/src/opravneni.ts:62`) prodává „přístup do komunity a chatu".
- **RISK:** Klamavé: jedna věc se slibuje zdarma a zároveň prodává.
- **FIX:** Rozhodnout (BUSINESS DECISION) a sjednotit texty. Pokud se komunita prodává, odstranit ji ze `/zapojit-se/` a ze žebříčku a naopak.
- **ACCEPTANCE TEST:** Grep „komunit" v `src/` ukazuje jen jednu variantu.

### F-19 — `/podporit/`: „Plus" vs. Premium · **P2**
- **CURRENT:** `podporit/page.tsx:58-64`: „Co uvažujeme do budoucna… Plus… Nic z toho se teď nedá koupit. Bezpečnostní informace tam nikdy nebudou zamčené." Premium za 150 Kč se nezmiňuje. Podmínky ř. 81: „Dobrovolná podpora (například Buy me a coffee)", přičemž `BUY_ME_A_COFFEE_URL = ""`.
- **FIX:** Popsat Premium (připravované, 150 Kč jednorázově). „Plus" buď odstranit, nebo vysvětlit rozdíl. Větu „nikdy zamčené" dodržet (F-12).
- **ACCEPTANCE TEST:** `/podporit/` zmiňuje Premium stejnou cenou, jakou vrací `GET /premium`.

---

## 4. Připravenost a Odolnost

### F-11 — Motto „méně atraktivním cílem" · **P1**
- **URL:** `/odolnost/`
- **KOMPONENTA:** `src/app/odolnost/page.tsx:21`
- **CURRENT:** „Čím lépe budeme připraveni, tím méně atraktivním cílem budeme."
- **PROBLEM:** Motto rámuje čtenáře jako potenciální cíl útoku, tedy obavu z ohrožení bez doloženého údaje. Je v rozporu s pravidlem č. 6 („ke každému zhoršujícímu údaji patří i to, co se nestalo"), pravidlem č. 0/2 („text nesmí budit větší obavu, než unese doložený údaj") a pravidlem č. 8 (do UI nepatří filozofie). Titulek „Zjistěte za pět minut…" a zbytek stránky jsou věcné.
- **FIX:** Nahradit neutrálním motem, např. „Voda, teplo a spojení na pár dní — bez ohledu na to, co je vypne." (výpadek proudu, povodeň, porucha).
- **ACCEPTANCE TEST:** `grep -rn "atraktivn" src` = 0.

### F-10 — Žebříček: soutěž, integrita a data · **P1**
- **URL:** `/odolnost/` (sekce pod auditem), `/sprava/` (žebříček)
- **KOMPONENTA:** `src/components/zebricek-klient.tsx`; `api/src/zebricek.ts`; `src/lib/odolnost.ts:558-566`
- **CURRENT:** Nadpis „Jak jste na tom proti ostatním" (ř. 114), „vaše skóre z 100 · průměr ostatních N" (ř. 120), „Jste v žebříčku jako …, N. místo" (ř. 145), „Zatím prázdný. Buďte první." (ř. 185), veřejné pořadí 1–50. Vysvětlivka: „orientační hra pro srovnání".
- **PROBLEM:** (1) Soutěžní rámování bezpečnostního tématu: pořadí, průměr ostatních, výzva „Buďte první". Nepočítá se sice „lepší než X %", ale funkčně jde o totéž. (2) Skóre počítá klient a API přijme libovolné celé číslo 0–100 (`zebricek.ts:66-67`), takže žebříček jde triviálně zmanipulovat a nic nedokládá. (3) Na server se posílá `souhrn` (počty slabin a kritických závislostí domácnosti) spolu s krajem a počtem osob (`zebricek-klient.tsx:79`) v **nešifrované** podobě. Je to souhrn zranitelností domácnosti, který `/soukromi/` nezmiňuje. (4) Stránka tvrdí „Profil zůstává ve vašem zařízení" (`odolnost/page.tsx:22`, metadata ř. 8), žebříček ho částečně posílá pryč. (5) Uchování: `pozvan` a `clen` se nemažou (F-02).
- **RISK:** Gamifikace, která tlačí k nákupu a strachu. Nepravdivé informace o zpracování. Únik souhrnu zranitelností.
- **FIX:** Pořadí, průměr a „Buďte první" odstranit a nahradit anonymním rozdělením („kolik domácností má 72 h připraveno") nebo žebříček vypnout (BUSINESS DECISION). `souhrn` neukládat. Skóre počítat na serveru, nebo ho aspoň neukazovat veřejně jako pořadí. Úklid rozšířit na všechny stavy. U „Zařadit se" uvést, co odchází na server.
- **ACCEPTANCE TEST:** `PUT /ja/zebricek` se `souhrn` → sloupec zůstane `NULL`. Veřejný `GET /zebricek` nevrací pořadí ani průměr (nebo stránka žebříček neukazuje). Test úklidu: záznam `pozvan` starší než 365 dní se smaže.

### F-20 — Přihlášení k funkci, která běží jen lokálně · **P3**
- **URL:** `/muj-prehled/`
- **CURRENT:** „Jen pro přihlášené. Výběr se ukládá ve vašem zařízení." (`muj-prehled/page.tsx:17`). Bez API je funkce úplně nedostupná.
- **PROBLEM:** Vyžadovat účet pro lokální předvolbu jde proti minimalizaci (čl. 5 odst. 1 písm. c). Uživatel se kvůli ní registruje zbytečně.
- **FIX:** Zpřístupnit bez účtu, nebo předvolbu opravdu ukládat k účtu.

`/pripravenost/` (`pripravenost-klient.tsx`, `src/lib/pripravenost.ts`): skóre „Digitální připravenost X / N" je jen z odpovědí a lokální, bez srovnání a bez militaristického jazyka. **Bez nálezu.**

---

## 5. Partner IZS a role

- **Stav v kódu:** hotový tok. `POST /izs/zpravy` jen pro roli `izs` nebo `admin` (`izs.ts:21`). Schvaluje jen `admin` (`izs.ts:55`, **vynuceno na serveru**). Roli mění jen `admin` (`sprava.ts:108`), nikdo si nemění vlastní roli a poslední správce nejde odebrat (`role.ts`). Audit se zapisuje.
- **Stav provozu:** `IZS_KONTAKT = ""` (web.ts ř. 279, „Prázdné = zatím nepřijímáme"), `PARTNERI = []`, `/zapojit-se/` ř. 117-119 „Zprávy pro… záchranné složky… Nic z toho ještě neběží". **Žádný partner není**, stav je DEVELOPMENT.

### F-06 — Správce může rozeslat „zprávu partnera IZS" sám za sebe · **P1**
- **KOMPONENTA:** `api/src/izs.ts:21` (`maRoli(role,"izs")` pustí i `admin`), `izs.ts:55-75` (admin schválí i vlastní návrh), `izs.ts:74` (`titulek: z.slozka ?? "Partner IZS"`: admin nemá `nazev`); `api/src/upozorneni.ts:200-203`: „🚨 **Zpráva partnera IZS** … Zprávu poslala ověřená složka IZS přes CzechPatrol."
- **PROBLEM:** Chybí princip čtyř očí a zprávu jde nepravdivě přisoudit neexistující složce IZS. Stejně tak po odebrání role partnerovi zůstávají jeho návrhy ve stavu `navrh` a po schválení odejdou jako „Partner IZS" (`sprava.ts:118` vynuluje `nazev`).
- **RISK:** Krizový zákon, zákon o IZS (zaměnitelnost), § 357 TZ. Dále porušení vlastních pravidel (CLAUDE.md pravidlo 9, PRAVNI-KONTROLA § 4).
- **FIX:** `navrhni` povolit jen roli `izs` s neprázdným `nazev`. `rozhodni` má odmítnout, když `rozhodl == autor`. Při odebrání role zamítnout otevřené návrhy. Bez `slozka` zprávu neodeslat.
- **ACCEPTANCE TEST:** Test: admin → `POST /izs/zpravy` → 403. Partner odebrán → jeho návrh je `zamitnuto`. Zpráva bez názvu složky se nerozešle.

### F-07 — IZS nabízené jako funkční · **P1**
- **URL:** `/ucet/`, `/izs/`
- **KOMPONENTA:** `ucet-klient.tsx:165-172` („Nováčci mají jeden bonus navíc: ověřené záchranné složky mohou přes CzechPatrol poslat zprávu přímo vám — třeba o uzavírce nebo evakuaci ve vašem kraji."); `izs/page.tsx:26-28` (přítomný čas „Ověřená složka… může poslat"); ř. 71 „Kontakt pro ověření zveřejníme se spuštěním účtů" (při stavu A účty běží, takže si to protiřečí); `ucet-klient.tsx:432-446` přepínač „Zprávy partnerů IZS" je ve výchozím stavu **zapnutý** (`VYCHOZI_UPOZORNENI.zpravyIzs = true`).
- **PROBLEM:** Funkce, která neexistuje, je prezentovaná jako hotová, a to s příkladem „evakuace". Zároveň je to v rozporu s `/zapojit-se/`.
- **FIX:** Dokud `IZS_KONTAKT` a `PARTNERI` nejsou vyplněné: odstranit „bonus" z `/ucet/`, na `/izs/` dát štítek „Připravujeme — zatím žádná složka nepřipojena" a přepínač ukázat jako „připravujeme". Příklad „evakuace" nahradit neutrálním.
- **ACCEPTANCE TEST:** Build s `IZS_KONTAKT=""` → `/ucet/` neobsahuje „bonus" a `/izs/` obsahuje „připravujeme".

### F-23 — Symbol sirény · **P2**
- `ikona="sirena"` v hlavičce `/izs/` (`izs/page.tsx:26`) a v seznamu na `/odber/` (`odber.tsx:73`), 🚨 ve zprávě IZS (`upozorneni.ts:201`). CLAUDE.md pravidlo 0/1: „žádné sirény… ani symboly státních systémů". Nahradit neutrální ikonou.
- **ACCEPTANCE TEST:** `grep -rn "sirena\|🚨" src api/src` = 0.

Ověření složky: pravidlo „ověřovat jen adresy na doménách státní správy" (PRAVNI-KONTROLA § 4) existuje jen v dokumentu, kód ho nevynucuje (poznámka je volný text). **P3:** doplnit povinné pole „ověřeno z domény" a zapisovat ho do auditu.

---

## 6. Odběry: co stránky tvrdí vs. realita

| Kanál | Konfigurace | Co tvrdí UI | Realita | Nález |
|---|---|---|---|---|
| Telegram kanál | `KANALY.telegram = "https://t.me/czechpatrol"`, `DORUCOVANI.telegram.bezi = true` | `/zapojit-se/` ř. 50-61, `/odber/`, `/o-projektu/` ř. 57: „Mimořádná výstraha… U pěti nejzávažnějších témat posíláme i neověřený signál… denní souhrn v 19:00" | `nastroje/rozhlas.mjs` + `.github/workflows/rozhlas.yml` („Rozhlas do kanálů" #40 success). Popis sedí. | Obsah viz **F-03 (P0)**. Počet odběratelů `DISKUZE.odberatelu = 0` (= „nevíme"), to je v pořádku. |
| Telegram bot (osobní) | tajemství `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_JMENO` | `/ucet/`: „propojit", nebo „Bot ještě neběží" | řídí se `dostupne.telegram` z API | OK |
| RSS | build `feed.xml` | „Všechny ověřené záznamy ve čtečce." | generuje se vždy | OK |
| E-mail (souhrn) | `KANALY.email = ""` (**nepoužívá se nikde**), skutečný formulář jde na `POST /zajem` | `/zapojit-se/` ř. 64-74: formulář jen s `EMAIL_ODBER_BEZI` (API + provozovatel), jinak „E-mailový odběr připravujeme" | API ukládá i bez provozovatele (F-01). Chybí double opt-in, takže jde přihlásit cizí adresu (P2). Odeslat e-mail zatím není čím, jediný způsob odvolání souhlasu je „odkaz v e-mailu, který nepřišel" nebo kontakt na správce, který neexistuje. | P2 (F-24) |
| WhatsApp kanál/skupina | `KANALY.whatsapp = ""` | `/zapojit-se/` „Co chystáme: Skupinu na WhatsAppu" s „Nic z toho ještě neběží". `/odber/` ho nevykreslí. | – | OK |
| WhatsApp osobní | `WHATSAPP_*` | `/ucet/`: „Vyžaduje schválení Meta Business" | kód hotový, bez tokenu 503 | OK. Před spuštěním DPA s Metou (PRAVNI-KONTROLA § 7/6). |
| Signal, Bluesky | `""` | `/o-projektu/` ř. 58: „spuštěné nejsou, proto se nenabízejí" | – | OK |
| Účet s vlastním výběrem | `DORUCOVANI.ucty.bezi = false` (**mrtvý příznak**, UI se řídí `UCTY_ZAPNUTE`) | `/odber/`: „Výběr témat a oblastí, týdenní souhrn" | týdenní souhrn implementovaný (`upozorneni.ts dalsiSouhrn`) | P3: `DORUCOVANI.ucty.bezi` a `kadence: "zatím neběží"` odporují stavu A. Odvodit z `UCTY_ZAPNUTE`. |

### F-15 — Formulář tipů bez cíle · **P1**
- **URL:** `/` (dashboard ř. 679), `/udalosti/` (ř. 466), `/zapojit-se/` (ř. 98)
- **KOMPONENTA:** `src/components/nahlaseni.tsx:284-288, 352`
- **CURRENT:** Ve stavu B a s `TIPY_MAIL = ""` je formulář vidět celý (text, odkaz, jméno, e-mail, telefon) s tlačítkem „Odeslat". Teprve po odeslání přijde „Příjem hlášení se připravuje". Ve stavu A se jméno, e-mail a telefon ukládají bez informace podle čl. 13 (F-02).
- **FIX:** Bez cíle místo formuláře ukázat „Hlášení připravujeme". U polí s kontaktem uvést správce, účel a lhůtu (text „po roce ho smažeme" už tam je) s odkazem na `/soukromi/#tipy`.
- **ACCEPTANCE TEST:** Build bez `API_URL` a bez `TIPY_MAIL` → `Nahlaseni` nevykreslí `<form>`.

### F-24 — E-mailový zájem bez potvrzení · **P2**
- `api/src/zajem.ts`: bez double opt-in, stav vždy `nepotvrzeno`, žádný kanál pro odvolání. **FIX:** potvrzovací e-mail (až bude služba), nebo do té doby zobrazit odhlašovací token či odkaz hned po přihlášení.
- **ACCEPTANCE TEST:** Po `POST /zajem` UI ukáže odkaz na odhlášení, `POST /zajem/odhlasit` s ním funguje.

---

## 7. Registr stavů funkcí

Legenda stavů: LIVE = běží veřejně; PRIVATE_BETA = běží, ale jen pro vybrané nebo skryté; DEVELOPMENT = kód hotový, vypnutý konfigurací; PLANNED = jen záměr; REMOVED = odstraněno. „A/B" = závisí na neověřitelném `API_URL`.

| Funkce | Stav v kódu | Co tvrdí UI (soubor:řádek) | Rozpor | Doporučení |
|---|---|---|---|---|
| Přehled, události, RSS | LIVE | – | – | – |
| Telegram kanál (vč. neověřených signálů) | LIVE | `web.ts:60`, `odber.tsx:65`, `zapojit-se/page.tsx:50` | s CLAUDE.md pravidly 0 a 4 (F-03) | **vypnout neověřené do právního posouzení** |
| API worker | LIVE (od 13. 9.) | – | sbírá data bez provozovatele (F-01) | tvrdá pojistka v API |
| Účty (passkey, obnova, smazání) | A: LIVE / B: DEVELOPMENT | `ucet-klient.tsx:45-63`, `o-projektu/page.tsx:50` | smazání s darem (F-05), „nic osobního" (F-09) | opravit F-05, pak spustit |
| Upozornění na míru (Telegram bot) | A: LIVE, pokud je bot | `ucet-klient.tsx:319-347` | – | OK |
| WhatsApp osobní | DEVELOPMENT (bez tokenů) | `ucet-klient.tsx:373` „Vyžaduje schválení Meta Business" | – | skrýt celou kartu, dokud není |
| Týdenní/denní souhrn účtu | A: LIVE | `odber.tsx:51`, `ucet-klient.tsx:19-20` | `DORUCOVANI.ucty` mrtvý příznak | sjednotit |
| Tipy („Chybí tu událost?") | A: LIVE / B: rozbité | `nahlaseni.tsx:315` | formulář bez cíle (F-15), chybí na `/soukromi/` | skrýt bez cíle |
| E-mail zájem/souhrn | DEVELOPMENT (vyžaduje `PROVOZOVATEL`) | `zapojit-klient.tsx:48-56` | API přijímá i bez provozovatele | pojistka v API |
| Můj přehled | A: LIVE (lokální) | `muj-prehled/page.tsx:17` | vyžaduje účet zbytečně | zpřístupnit bez účtu |
| Odolnost – audit FREE | LIVE (bez účtu) | `odolnost/page.tsx:17-22` | motto (F-11), „Profil zůstává v zařízení" vs. žebříček | upravit texty |
| Odolnost – Premium obsah | PRIVATE_BETA (dar správcem) / DEVELOPMENT (platba) | `odolnost/page.tsx:22` „Podrobný plán… je Premium" | voda a léky za platbou (F-12) | přesunout do FREE |
| Platby Comgate + kredit 150 Kč | DEVELOPMENT (tajemství?) | `premium-klient.tsx:99-118` | chybí právní rámec (F-04), test = skutečný kredit (F-13) | **nezapínat** do právní kontroly |
| Uplatnění kreditu v e-shopu (`ESHOP_TOKEN`) | DEVELOPMENT; e-shop Čenich neběží | `premium-klient.tsx:108,112`, `:246` | „CzechPatrol e-shop" neexistuje; `eshopBezi` = jen token | řídit samostatnou proměnnou |
| Komunita a chat | PLANNED (odkazy prázdné) | `premium-klient.tsx:192`, `zapojit-se/page.tsx:68,115` | zdarma i placené zároveň (F-14) | rozhodnout |
| Žebříček připravenosti | A: LIVE | `zebricek-klient.tsx:114-197` | soutěž, podvrhnutelné skóre, `souhrn` (F-10) | přepracovat nebo skrýt |
| Kontakt v žebříčku | A: LIVE s `KLIC_SIFROVANI` | `zebricek-klient.tsx:161` „vidí ho jen provozovatel" | provozovatel neuveden | skrýt do F-01 |
| Partner IZS | DEVELOPMENT (žádný partner) | `ucet-klient.tsx:166-171` „bonus", `izs/page.tsx:26-28` | prezentováno jako live (F-07), admin = falešný partner (F-06) | **skrýt, dokud není partner** |
| Buy me a coffee | PLANNED (URL prázdná) | `podporit/page.tsx:52-54` „Platba zatím není nastavená" | – | OK |
| „Plus" předplatné | PLANNED | `podporit/page.tsx:62` | vedle Premium matoucí (F-19) | sjednotit |
| Pilot pro organizace | PLANNED | `podporit/page.tsx:63` | – | OK |
| Signal, Bluesky, WhatsApp kanál | PLANNED | `o-projektu/page.tsx:58` | – | OK |
| Analytika (`mereni.ts`) | DEVELOPMENT (vypnuto) | `soukromi/page.tsx:45,68` „žádná analytika" | – | pojistka na build (F-16) |
| Diskuze, GitHub, skupina | REMOVED/PLANNED (`KOMUNITA.* = ""`) | `o-projektu/page.tsx:69-71` prázdné „·" | vizuální zbytek (F-18) | odstranit |
| `/komunita/` | REMOVED (přesměrování na `/o-projektu/`) | `komunita/page.tsx` | – | OK |

---

## 8. Kde musí stát „LEGAL REVIEW REQUIRED"

1. `/soukromi/` celé (nové osobní údaje: tipy, e-mail, platby, kredity, profil domácnosti, žebříček), uchování plateb 10 let a DPIA profilu se zdravotním přístrojem (F-02).
2. Automatické neověřené zprávy do Telegramu (§ 357 TZ, AI Act čl. 50) (F-03).
3. Placená vrstva: podmínky, § 1820/§ 1837 l OZ, povaha kreditu, věta „vrátíme", DPH a doklady (F-04, F-13).
4. Identifikace soukromé osoby jako provozovatele (F-01).
5. Zprávy partnerů IZS: ověřování a formát (F-06, F-07, F-23).
6. Žebříček s kontaktem (souhlas pro „pozvání do komunity", když komunita je placená) (F-10, F-14).

---

## 9. Soubory, na které se audit odkazuje (absolutní cesty)

- /home/user/czechpatrol/src/config/web.ts
- /home/user/czechpatrol/src/app/soukromi/page.tsx
- /home/user/czechpatrol/src/app/podminky/page.tsx
- /home/user/czechpatrol/src/app/o-projektu/page.tsx
- /home/user/czechpatrol/src/app/odolnost/page.tsx
- /home/user/czechpatrol/src/app/izs/page.tsx
- /home/user/czechpatrol/src/app/zapojit-se/page.tsx
- /home/user/czechpatrol/src/app/podporit/page.tsx
- /home/user/czechpatrol/src/components/ucet-klient.tsx
- /home/user/czechpatrol/src/components/premium-klient.tsx
- /home/user/czechpatrol/src/components/odolnost-klient.tsx
- /home/user/czechpatrol/src/components/zebricek-klient.tsx
- /home/user/czechpatrol/src/components/nahlaseni.tsx
- /home/user/czechpatrol/src/components/odber.tsx
- /home/user/czechpatrol/src/lib/ucet.ts
- /home/user/czechpatrol/api/src/auth.ts
- /home/user/czechpatrol/api/src/ja.ts
- /home/user/czechpatrol/api/src/izs.ts
- /home/user/czechpatrol/api/src/platby.ts
- /home/user/czechpatrol/api/src/zebricek.ts
- /home/user/czechpatrol/api/src/tipy.ts
- /home/user/czechpatrol/api/src/zajem.ts
- /home/user/czechpatrol/api/src/synchronizace.ts
- /home/user/czechpatrol/api/src/upozorneni.ts
- /home/user/czechpatrol/api/migrace/0005_platby.sql
- /home/user/czechpatrol/nastroje/rozhlas.mjs
