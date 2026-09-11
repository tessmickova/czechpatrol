# Právní kontrola CzechPatrol (ČR a EU)

Stav k 5. 9. 2026. Interní revize provedená při návrhu účtů, upozornění a
role partnera IZS. **Není to právní stanovisko** — před ostrým spuštěním účtů
a zejména před zapnutím placené vrstvy nebo WhatsAppu ji má přečíst právník.
Každý bod uvádí, *co* předpis chce, *jak* to systém řeší a *co zbývá*.

## 1. GDPR (nařízení 2016/679) a zákon č. 110/2019 Sb.

| Požadavek | Řešení v systému | Zbývá |
|---|---|---|
| Minimalizace (čl. 5 odst. 1 písm. c) | Účet bez jména, e-mailu, telefonu. Passkey: jen veřejný klíč. IP se do databáze nezapisuje; brzda používá denně solený otisk platný 24 h. | — |
| Právní základ (čl. 6) | Účet a doručování: plnění smlouvy (písm. b). Brzda proti útokům a audit: oprávněný zájem (písm. f). Žádný souhlas není potřeba, protože se nic nezpracovává nad rámec služby. | Zapsat posouzení oprávněného zájmu (LIA) pro audit a brzdu — krátký dokument. |
| Informační povinnost (čl. 13) | Stránka `/soukromi/`: správce, účely, základy, doby, příjemci, práva, ÚOOÚ. | **Doplnit identitu správce** (`PROVOZOVATEL` v `src/config/web.ts`). Bez ní nelze účty spustit. |
| Práva subjektu (čl. 15–22) | Přístup a přenositelnost: účet zobrazí vše, co o něm je; výmaz jedním tlačítkem, okamžitý (ON DELETE CASCADE). Námitka/omezení: odpojení kanálů, vypnutí zpráv. | Přidat export nastavení do JSON (drobnost). Postup pro žádosti mimo účet: účet nejde identifikovat, proto se vyřizují jen z přihlášeného účtu — je to napsáno v zásadách. |
| Doby uchování (čl. 5 odst. 1 písm. e) | `api/src/synchronizace.ts` → `uklid()`: výzvy a kódy po expiraci, tokeny 30 dní, otisky IP 24 h, fronta 30 dní po odeslání, zprávy 90 dní, zprávy IZS a audit 12 měsíců, neaktivní účty 24 měsíců. | Doby v kódu a v `/soukromi/` musí zůstat stejné — hlídat při změnách. |
| Zpracovatelé (čl. 28) | Cloudflare (hosting, Workers, D1) — DPA je součástí podmínek Cloudflare; přenos mimo EU na SCC a DPF. | Ověřit, že účet Cloudflare má přijatý DPA; zvážit omezení D1 na EU (jurisdikce `eu`, pokud je dostupná). |
| Samostatní správci | Telegram Messenger Inc. a Meta Platforms Ireland doručují zprávy podle vlastních podmínek; uživatel si je propojuje sám. | V zásadách je uvedeno. |
| Bezpečnost (čl. 32) | Passkey (FIDO2), tokeny jen jako SHA-256 otisk, obnovovací kód jen jako solený otisk, porovnání bez úniku času, brzda pokusů, CORS jen na původ webu, RBAC s auditem. | Zapnout 2 správce (aby nešlo o jedinou osobu s plným přístupem). Pravidelně obnovovat `ADMIN_BOOTSTRAP_KOD`… po zavedení správce smazat. |
| DPIA (čl. 35) | Nejde o rozsáhlé zpracování zvláštních kategorií ani systematické sledování; profilování neprobíhá. DPIA se nejeví jako povinná. | Krátké odůvodnění, proč DPIA není třeba, uložit k dokumentaci. |
| Pověřenec (čl. 37) | Není povinný (soukromý provozovatel, malý rozsah). | — |
| Děti | Účet od 15 let (§ 7 zákona č. 110/2019 Sb.); věk se neověřuje ani nesbírá. | — |
| Porušení zabezpečení (čl. 33–34) | — | Sepsat postup: kdo hlásí ÚOOÚ do 72 h, jak se informují uživatelé (jediný kanál je jejich Telegram/WhatsApp a stránka webu). |

**WhatsApp:** telefonní číslo je jediný osobní údaj v systému. Uložit jen po
výslovném zadání uživatelem, smazat na jedno kliknutí (hotovo). Meta Cloud API
navíc vyžaduje ověření Business účtu a šablony — smluvní vztah s Metou.

## 2. ePrivacy — § 89 odst. 3 zákona č. 127/2005 Sb.

Web nepoužívá cookies. `localStorage` nese jen přihlašovací token a
předvolby, service worker jen kopie stránek. To je „nezbytné pro poskytnutí
služby výslovně vyžádané uživatelem“ — souhlas ani lišta se nevyžadují.
**Pozor při přidání analytiky:** i anonymní měřicí nástroj třetí strany by
lištu vyžadoval. Doporučení: analytiku nepřidávat, nebo jen serverovou bez
identifikátorů.

## 3. AI Act (nařízení 2024/1689)

| Otázka | Odpověď |
|---|---|
| Je systém „vysoce rizikový“ (příloha III)? | Ne. Neposuzuje osoby, nerozhoduje o přístupu ke službám, není součástí kritické infrastruktury ani orgánů veřejné moci. |
| Transparentnost (čl. 50) | Texty vzniklé s pomocí AI jsou označené (štítek „AI-assisted“, metodika, podmínky). Uživatel nekomunikuje s AI systémem — upozornění posílá deterministický kód. |
| Lidský dohled | Celkovou úroveň, zařazení a zveřejnění událostí stanovuje člověk; automat smí potvrdit jen zápor (pravidlo č. 2 v CLAUDE.md). Zprávy IZS schvaluje člověk. |
| Zbývá | Vést jednoduchý záznam, kde všude AI pomáhá (souhrny, návrhy textů) — pro případ dotazu. |

## 4. České trestní a krizové právo

| Předpis | Riziko | Řešení |
|---|---|---|
| § 357 TZ šíření poplašné zprávy | Zpráva, která by nepravdivě vyvolala obavu z ohrožení. | Web nikdy nepotvrzuje nic pozitivního automaticky; každá událost má zdroj; zprávy partnerů IZS schvaluje správce; formát každé zprávy nese větu „ne úřední varování“. Rady typu „odjet/neodjet“ se nedávají. |
| Zákon č. 240/2000 Sb. (krizový zákon), JSVV | Zaměnitelnost s úředním varováním. | Zprávy partnerů jsou označené „zpráva partnera IZS“ se jménem složky; web výslovně říká, že úřední varování běží přes sirény, státní SMS a média. Neužívat symboly ani názvy státních systémů. |
| Zákon č. 239/2000 Sb. (IZS) | Kdo je „složka IZS“ a jak ji ověřit. | Roli přiděluje správce po ověření z úřední adresy; zapisuje se název složky a poznámka o ověření. Doporučení: ověřovat jen adresy na doménách státní správy (hzscr.cz, policie.cz, kraje, nemocnice) a zápis uchovat. |
| § 180 TZ neoprávněné nakládání s osobními údaji | — | Minimalizace výše. |
| Zákon č. 480/2004 Sb. (obchodní sdělení) | Upozornění jako nevyžádané sdělení. | Upozornění chodí jen na kanál, který si uživatel sám propojil, jen s obsahem, který si nastavil, bez reklamy; odpojení jedním kliknutím (`/stop`). Nejde o obchodní sdělení. Případná výzva k podpoře projektu do zpráv nepatří. |

## 5. Spotřebitelské právo — placená vrstva

Dnes je web zdarma a `PLACENE.hraniceADoprava = false`. Pokud se placená
vrstva zapne, platí:

- § 1820 a násl. OZ: před objednávkou uvést cenu, trvání, způsob platby,
  právo odstoupit do 14 dnů (u digitálního obsahu poučení o ztrátě práva
  při okamžitém zahájení), identifikaci podnikatele.
- Zákon č. 634/1992 Sb. o ochraně spotřebitele: informace o mimosoudním
  řešení sporů (ČOI) — na `/podminky/` už je.
- Zákon č. 235/2004 Sb. (DPH) a živnostenský zákon: příjem z předplatného
  je podnikání; dar přes Buy me a coffee není.
- **Etická výhrada projektu:** vázat informace o hranicích a dopravě na
  platbu znamená zadržet bezpečnostní informaci před tím, kdo nemůže platit.
  Doporučení: placenou vrstvu stavět na pohodlí (upozornění, archiv, export),
  ne na obsahu, který se dotýká bezpečí. Přepínač existuje; rozhodnutí je
  provozovatele.

Technická poznámka: web je statický, omezení běží v prohlížeči. Kdo chce
tvrdé omezení, musí přesunout data hranic/dopravy do API a vydávat je jen
přihlášeným s rolí.

## 6. Přístupnost a další

- Zákon č. 99/2019 Sb. o přístupnosti se na soukromý web nevztahuje; web
  přesto drží kontrast, klávesnici a ARIA u ovládacích prvků.
- Autorské právo: citace zdrojů s odkazem, převzaté texty se neuvádějí
  celé. Přehled sám je databáze s vlastní ochranou (§ 88 AZ).
- DSA (nařízení 2022/2065): web není platforma s obsahem uživatelů —
  zprávy partnerů IZS jsou moderované a před zveřejněním schválené, nejde
  o hostování obsahu třetích stran pro veřejnost.

## 7. Co udělat před spuštěním účtů (kontrolní seznam)

1. Doplnit `PROVOZOVATEL` (jméno/název a kontakt) — bez toho ne.
2. Přijmout DPA Cloudflare; zvážit umístění D1 v EU.
3. Zapsat LIA pro audit a brzdu; krátké odůvodnění bez DPIA.
4. Sepsat postup při porušení zabezpečení.
5. Založit 2 správce, smazat `ADMIN_BOOTSTRAP_KOD`.
6. Před WhatsAppem: Meta Business ověření, šablona, DPA Meta.
7. Před placenou vrstvou: obchodní podmínky podle § 1820 OZ, podnikatelská identifikace, daně.

## Právě ověřované zprávy a § 357 trestního zákoníku

Sekce **Právě ověřujeme** je jediné místo, kde se na webu objeví zpráva,
kterou projekt nemá potvrzenou. Rozbor, proč to není šíření poplašné zprávy:

**Skutková podstata** (§ 357 odst. 1 tr. zákoníku) předpokládá, že pachatel
**úmyslně způsobí nebezpečí vážného znepokojení** aspoň části obyvatelstva
tím, že rozšiřuje **poplašnou a nepravdivou zprávu**. Klíčový znak je
nepravdivost sdělované zprávy.

**Co web sděluje.** Nikoli samotné tvrzení, ale tři výroky o něm:

1. „Tuhle zprávu vydaly tyto jmenované redakce“ — pravdivé, doložené odkazem.
2. „Nemáme ji potvrzenou; ověřovali jsme tohle a tohle“ — pravdivé.
3. „Úřady k tomu uvedly tohle / neuvedly nic“ — pravdivé, ověřené
   u úředního zdroje.

Žádný z těch výroků není nepravdivý. Nepravdivé by bylo teprve převzetí
cizího tvrzení za své, k němuž nedochází.

**Co navíc snižuje způsobilost vyvolat znepokojení:**

- úřední stav stojí na kartě jako první údaj, ne jako dovětek;
- poslední řádek je pokyn, který čtenáře výslovně odrazuje od jednání
  („nic, neměňte plány“);
- nepoužívá se barevná škála závažnosti ani žádný prvek zaměnitelný
  s varovným systémem státu (viz krizový zákon a JSVV výše);
- položka se do kanálů neodesílá, takže nikoho neosloví bez vyžádání;
- po lhůtě nejvýš týden se z přehledu stáhne.

**Doložitelnost.** Každá podmínka je strojově vynucená v
`nastroje/kontrola-dat.mjs` jako chyba, která zastaví nasazení, a pokrytá
testy v `testy/overujeme.test.ts`. Historie je v gitu, takže jde zpětně
doložit, co web kdy tvrdil.

**Při pochybnosti se položka nezveřejní.** Pravidlo č. 0 platí i tady:
přísnější výklad vyhrává.
