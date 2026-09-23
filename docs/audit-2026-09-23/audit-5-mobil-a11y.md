# Audit 5 před spuštěním: CzechPatrol, mobil, přístupnost, výkon, SEO, offline, selhání

Datum: 23. 9. 2026, přibližně 17:20–18:00 pražského času
Zdroj: kopie `/home/user/czechpatrol` (HEAD `6aad0a8`, 2026-09-23 15:16 UTC) v `scratchpad/cp-kopie`, `npm run build` (statický export `out/`)
Server: `python3 -m http.server` (**bez gzipu**, takže přenášené velikosti jsou horší než na Cloudflare)
Prohlížeč: Chromium z `/opt/pw-browsers/chromium` přes Playwright, axe-core 4.x (`@axe-core/playwright`, `--no-save` jen v kopii)
Původní repozitář jsem neměnil a nic jsem necommitoval.

Poznámka k pravidlu č. 0 v `/home/user/eshop/CLAUDE.md`: tahle session je určená pro e-shop Čenich a CzechPatrol je jiný projekt. Audit jsem udělal jen pro čtení, v kopii ve scratchpadu. Nic se nenasazovalo ani nezapisovalo do repozitáře. Opravy by ale měly vzniknout v session projektu CzechPatrol.

Snímky jsou v `scratchpad/snimky/`. Prefix `mŠÍŘKA-` znamená šířku viewportu.

---

## Shrnutí

| # | Nález | Priorita |
|---|---|---|
| 1 | Na mobilu (390 px) není odpověď „děje se v ČR něco, mám jednat?“ vidět v prvním viewportu. Box „Teď nic urgentního“ je na y = 3315 px (320 px: 4006 px) a H1 na 2850 px. Nahoře je místo toho celý rozbalený blok o neověřené ruské mobilizaci. | **P0** |
| 2 | Když sběr stojí (banner „Sběr neběží“), dashboard dál píše zeleně „Teď nic urgentního … za 48 h“, „Evropa · DNES“ a „Běžný život · TEĎ Bez omezení“. Na podstránkách varování chybí úplně. | **P0** |
| 3 | V repozitáři sběr opravdu stojí: poslední čtení zdrojů bylo 02:00 UTC a web už teď zobrazuje „Sběr neběží … před 13 h“. | **P0 (provoz)** |
| 4 | Celý `incidenty.json` (asi 380 KB) je v klientském JS na **každé** stránce, i na `/offline/` a na 404. Každá stránka stahuje přes 1 MB JS (308–355 KB gz). | P1 |
| 5 | „Služby naživo“ při selhání živého čtení ukazují snímek jen s časem, bez data („snímek 04:02“), a text „za 24 h“ i u 3 dny starých dat | P1 |
| 6 | Chybná data zemí: záznam z USA je označený „Rusko“ s vlajkou 🇺🇸 a na `/zeme/` vzniká druhé „Rusko“. NATO má vlajku EU. | P1 |
| 7 | Fokus se při Shift+Tab schová úplně pod lepivou hlavičku (WCAG 2.2 2.4.11) | P1 |
| 8 | OG u incidentu: chybí `og:image` a `og:url`, titulek je poplašný a bez data a popis je uříznutý uprostřed slova. Canonical ani hreflang nejsou nikde. | P1 |
| 9 | Jazykové verze `/en/`, `/de/` … mají `lang="cs"`, český title i meta a obsah HTML je česky. Vzniká duplicitní obsah. | P2 |
| 10 | Při výpadku API se na `/ucet/` zobrazí syrové „Failed to fetch“. Přihlášený uživatel se tiše jeví jako odhlášený. | P2 |
| 11 | Při 320 px se štítek BETA v hlavičce překrývá s ikonou mapy a přepínačem jazyka | P2 |
| 12 | Duplikát běžícího pásu zemí má `aria-hidden`, ale jde na něj klávesnicí: 21 odkazů navíc (axe: aria-hidden-focus, serious) | P2 |
| 13 | Běžící pás zemí se nedá zastavit ovládacím prvkem (WCAG 2.2.2). Česko jako první položka z obrazu po pár sekundách odjede. | P2 |
| 14 | Service worker: bez limitu cache, ukládá i chybové odpovědi, start_url `/?zdroj=pwa` se offline nenajde a text stránky `/offline/` („platí poslední ověřený stav“) zavádí | P2 |
| 15 | Dotykové cíle: WCAG 2.5.8 (24 px) splněno skoro všude. Doporučených 44 px nesplňuje asi 65 % ovládacích prvků (menu 36 px, počítadla 32 px). | P2/P3 |
| 16 | Vlajky jako emoji: na Windows se místo vlajky zobrazí písmena („CZ“). `aria-label` na obyčejném `span` přečte kód „CZ“. | P3 |
| 17 | Menší a11y věci: pořadí nadpisů (H3 před H1 na home, incident, země), obsah mimo landmarky a posuvná tabulka na `/metodika/` bez přístupu z klávesnice | P3 |
| 18 | `/sprava/odmitnute/` je veřejná statická stránka o velikosti 1,58 MB. `/muj-prehled/` je indexovaná a v sitemapě. | P3 |

Co je v pořádku: žádné vodorovné přetečení na 12 stránkách × 6 šířkách (320–1280). `html lang="cs"` na české verzi. Skip link funguje. Viditelný fokus (2px outline `--color-akcent`, kontrast 5,07:1 proti pozadí). `prefers-reduced-motion` je ošetřené v CSS i v JS pásu. Pohyb (parallax, „nálet“) je ve výchozím stavu vypnutý. Kontrasty hlavních tokenů textu splňují AA. Viewport nezakazuje zoom. robots.txt a sitemap nezveřejňují `/sprava`. Offline toast „Bez připojení. Zobrazený stav je poslední načtený, ne aktuální.“ se zobrazí. axe nenašel žádný kontrastní ani labelový problém.

---

## 1. Mobil

### Měření (skript `cp-kopie/mobil.mjs`, výsledek `scratchpad/mobil.json`)

- **Vodorovné přetečení:** `document.documentElement.scrollWidth > innerWidth` nenastalo nikde (12 stránek × 320/375/390/430/768/1280). Prvky přesahující vpravo jsou jen dekorace `.paralax-znacka` (fixed, `aria-hidden`), stránka se kvůli nim neposouvá.
- **Oříznutý text:** jen záměrně skryté prvky („Přeskočit na obsah“ v sr-only a „Menu“).
- **Lepivé prvky na mobilu:** `header.sticky` (74 px) a spodní `nav.fixed` (53 px + safe-area). Na 390×800 zabírají 16 % výšky, na 320×568 (iPhone SE) 22 %. Hlavička je průsvitná a text pod ní prosvítá (`m390-home-sekce1.png`).
- **Výška úvodní strany:** 14 295 px při 320, 12 698 px při 390 a 6 966 px při 1280.

### N1: V prvním viewportu na mobilu chybí odpověď na „mám něco dělat?“ (P0)

- **URL:** `/` (390 px i 320 px)
- **Komponenta:** `src/components/dashboard.tsx` (pořadí: `PasZemi` ř. 475, pak `PruhOverujeme` ř. 479, až potom `HeroDashboard` s `UrgentniPas` ř. 510), `src/components/overujeme.tsx`
- **Současný stav:** První viewport na 390 px (`m390-home-viewport.png`) obsahuje: lištu původu, hlavičku, oranžový banner „Sběr neběží…“, počítadla, pás zemí (vlajka Česka uříznutá na levém okraji) a potom **PRÁVĚ OVĚŘUJEME · Neověřeno · 🇷🇺 Rusko** s rozbaleným textem o mobilizaci. Změřené pozice na 390 px: H1 „Bezpečnostní situace v Česku a okolí“ **y = 2850 px**, box „Teď nic urgentního“ **y = 3315 px** (320 px: 3514 / 4006, 1280 px: 1821 / 2199). Prvek LCP na home je text „Ruské úřady mobilizaci nevyhlásily…“ (měřeno PerformanceObserverem).
- **Problém:** Člověk, který právě dostal varování a má 30 sekund a jednu ruku, uvidí nejdřív téma mobilizace v Rusku. Uklidňující věta i „Co dělat teď: Nic měnit nemusíte“ jsou až 3–4 obrazovky níž (`m390-home-sekce3.png`, `m390-home-sekce4.png`). Tvrzení samo je napsané korektně (nejdřív „co říkají úřady“). Svou pozicí a velikostí ale z neověřené zprávy dělá to hlavní na webu.
- **Riziko:** Stránka vzbudí obavu, i když text je opatrný (rozpor s pravidlem „Titulek ani text nesmí budit větší obavu, než unese doložený údaj“). Uživatel odejde dřív, než najde odpověď.
- **Oprava:** Nahoru, hned pod hlavičku, dát jeden souhrnný pruh: stav ČR, `UrgentniPas` a čas poslední kontroly. „Právě ověřujeme“ přesunout pod hero a ve výchozím stavu sbalit na jeden řádek („1 zpráva se ověřuje: mobilizace v Rusku. Úřady ji nevyhlásily. Více ▸“).
- **Akceptační test:** Playwright 390×800 a 320×568: `[aria-label="Urgentní upozornění"]` má `getBoundingClientRect().bottom <= innerHeight - 53` bez rolování. Blok Právě ověřujeme není vyšší než 120 px, dokud se nerozbalí.

### N11: Při 320 px se hlavička překrývá (P2)

- **URL:** všechny stránky, šířka 320 px
- **Komponenta:** `src/components/navigace.tsx` a `src/components/znacka.tsx` (Logo se štítkem BETA)
- **Současný stav:** Štítek BETA leží pod ikonou mapy a „CS“ (`m320-hlavicka-prekryv.png`, `m320-home-viewport.png`). Při 390 px je vše v pořádku.
- **Riziko:** Štítek „BETA“ má podle komentáře v kódu povinně informovat, a tady není čitelný. Vypadá to jako chyba.
- **Oprava:** Pod asi 360 px skrýt nápis u přepínače jazyka (nechat jen ikonu) nebo zmenšit logotyp či štítek. Případně dát BETA pod logo.
- **Akceptační test:** Při 320 px se obdélníky „BETA“, tlačítka jazyka a Menu nepřekrývají (kontrola průniků `getBoundingClientRect`).

### N15: Dotykové cíle (P2/P3)

- **Komponenta:** navigace (odkazy v panelu a menu 36 px vysoké), počítadla `0 dnes / 9 za 7 dní…` (32 px), pás zemí (34 px), odznaky zdrojů „MÉDIUM“ (39 px), `← Události` (36 px)
- **Současný stav (390 px, bez inline odkazů v textu):** home 156 z 230 prvků pod 44 px, `/manipulace/` 93/141, `/pripravenost/` 75/82. Pod 24 px (hranice WCAG 2.2 AA 2.5.8): `/analyzy/` 10× odkaz „5 →“ 22×32 px, `/pripravenost/` 10× „Web provozovatele ↗“ 128×22 px, home 1×. Zaškrtávátka na `/odolnost/` mají 16 px, ale jsou uvnitř `<label>` o velikosti 358×58 px, takže vyhovují.
- **Riziko:** Chybné klepnutí jednou rukou. Formálně jde hlavně o 2.5.5 (AAA) a doporučení Apple a Google, AA splňuje skoro vše (22 px odkazy na hraně).
- **Oprava:** Pro `Tlacitko velikost="s"`, položky pásu a počítadla nastavit `min-h-[44px]` na mobilu. Odkazům „→“ a „Web provozovatele ↗“ dát `py-3` nebo `min-h-[44px] inline-flex items-center`.
- **Akceptační test:** Skript `cp-kopie/cile.mjs`: na 390 px je `pod24 = 0` na všech stránkách a v `header`/`nav` platí `pod44 = 0`.

---

## 2. Přístupnost (WCAG 2.2 AA)

axe (`wcag2a, wcag2aa, wcag21a/aa, wcag22aa, best-practice`, 390 a 1280 px, 13 stránek, výsledek `scratchpad/axe.json`):

| Pravidlo | Kde | Počet |
|---|---|---|
| aria-hidden-focus (serious) | `/` | 1 kontejner (21 odkazů) |
| scrollable-region-focusable (serious) | `/metodika/` (390 px) | 1 |
| heading-order (moderate) | `/zeme/cz/`, `/incident/…` | 1 |
| region (moderate) | všechny stránky: `<div class="border-b border-linka2 bg-plocha2/60">` mimo landmark | 1 |

Kontrast barev ani labely formulářů axe nenahlásil.

### N12: Duplikát pásu zemí je dosažitelný klávesnicí, ale skrytý čtečce (P2)

- **URL:** `/`
- **Komponenta:** `src/components/pas-zemi.tsx` ř. 116 `<span aria-hidden className="contents">{polozky("-2")}</span>`
- **Současný stav:** Tab na home projde 21 zemí, pak dalších 21 stejných odkazů s `aria-hidden=true` (tab 30–50 v testu `cp-kopie/tab.mjs`). Obsah se k hlavnímu bloku dostane až po 51 stiscích Tab.
- **Riziko:** Uživatel klávesnice nebo čtečky se dostane na „neviditelné“ odkazy, které čtečka neohlásí. Je to porušení 4.1.2 a 2.4.3.
- **Oprava:** Kopii dát `inert` (nebo `tabIndex={-1}` na každém odkazu v kopii). Zvážit i odkaz „přeskočit pás zemí“.
- **Akceptační test:** axe na `/` bez `aria-hidden-focus`. Při procházení Tabem žádný `document.activeElement.closest('[aria-hidden=true]')`.

### N13: Běžící pás se nedá zastavit (P2)

- **Komponenta:** `src/components/pas-beh-klient.tsx`
- **Současný stav:** Pás jede sám (22 px/s) i tehdy, když je „Pohyb na stránce“ vypnutý. Zastaví se jen při najetí myší nebo fokusu a po dotyku na 2,5 s. Respektuje `prefers-reduced-motion`. Česko (první položka, „u nás“) z obrazu odjede během pár sekund (`m1280-home-viewport.png` má vlajku ČR uříznutou už po načtení).
- **Riziko:** WCAG 2.2.2 (Pause, Stop, Hide): automatický pohyb trvající přes 5 s vyžaduje ovládací prvek pro zastavení. Pro čtenáře, který hledá ČR, je to rušivé.
- **Oprava:** Navázat pás na přepínač pohybu (výchozí stav: stojí) nebo přidat viditelné tlačítko „Zastavit pás“. Česko připnout mimo pás jako pevnou první položku.
- **Akceptační test:** Při výchozím nastavení (bez `cp-pohyb`) je po 10 s `scrollLeft` pásu 0. Tlačítko pauzy existuje a jde na něj Tabem.

### N7: Fokus schovaný pod lepivou hlavičkou (P1)

- **URL:** `/udalosti/` (a obecně všechny stránky s `header.sticky`)
- **Komponenta:** `src/app/globals.css` (chybí `scroll-padding-top`), `src/components/navigace.tsx`
- **Současný stav:** Při Shift+Tab zpět nahoru jsou tlačítka filtru „Letos / 90 dní / 30 dní / 7 dní“ a „Neprošlo ověřením“ **celá** pod hlavičkou: `elementFromPoint` ve středu prvku vrací `header` (`fokus-390-pod-hlavickou.png`). Při Tab dopředu se prvky zčásti schovávají pod spodní lištou (tab 64 na home, top 744 px, lišta od 747 px).
- **Riziko:** Porušení WCAG 2.2 **2.4.11 Focus Not Obscured (Minimum)**, AA. Uživatel klávesnice nevidí, kde je.
- **Oprava:** V `globals.css` nastavit `html { scroll-padding-top: 96px; scroll-padding-bottom: calc(64px + env(safe-area-inset-bottom)); }` na mobilu a od md `scroll-padding-top: 110px`. Totéž vyřeší kotvy (`/#udalosti` ve zkratce manifestu).
- **Akceptační test:** `cp-kopie/tab2.mjs`: při Shift+Tab i Tab není žádný fokusovaný prvek, jehož střed překrývá `header` nebo spodní `nav`.

### Nadpisy, landmarky, jazyk, obrázky (N17, P3)

- **Home:** první nadpisy v dokumentu jsou H3 („Co je jisté…“, y = 513 px), H1 až na y = 2850 px. axe to na home nezachytil, `heading-order` ano na `/zeme/cz/` (`h3.titul-mensi` po H1) a na incidentu (`h3 „Co se stalo“` bez H2).
  Oprava: blok Právě ověřujeme dát pod H1 nebo mu dát H2 a srovnat úrovně.
  Test: axe `heading-order` čisté a první nadpis v `main` je H1.
- **region:** pruh `bg-plocha2/60` (lišta původu) je mimo landmark. Oprava: obalit do `<header>` nebo `<aside aria-label="Původ a stav kontroly">`.
- **`/metodika/` (390 px):** `div.overflow-x-auto` s tabulkou nejde rolovat klávesnicí. Oprava: `tabIndex={0} role="region" aria-label="…"`.
- **lang:** česká verze `lang="cs"` je v pořádku. Anglické titulky zdrojů („Euronews — Russia plans to mobilise…“) nemají `lang="en"` (WCAG 3.1.2), P3. Jazykové verze viz N9.
- **Obrázky:** na home není žádný `<img>`, je tam 153 inline SVG. Dekorace mají `aria-hidden`. `role="img"` s `aria-label` má: měřicí budík (`mericky.tsx`), trendy (`trend.tsx`, `graf-mesicu-pripadu.tsx`), paleta tónů (`dashboard.tsx` ř. 310, `aria-label` je spojený seznam „název: slovo“, v pořádku) a logo (`znacka.tsx`).
- **Vlajky (`zeme.tsx` `Vlajka`):** `<span aria-label="CZ" title="CZ">🇨🇿</span>`. `aria-label` na generickém `span` bez role čtečky často ignorují, anebo přečtou „CZ“ hned před „Česko“. Oprava: `aria-hidden` na vlajce (název země stojí vedle).
- **Barva jako jediný nositel významu:** tečky stavů mají vždy slovo vedle (např. „vysoká“, „OMEZENÍ“, „bez hlášení“), v pořádku.

### Kontrasty tokenů (`src/app/globals.css`, výpočet podle WCAG)

Tmavý motiv (výchozí), text proti `papir #0d0d0a` / `plocha #1a1a17` / `plocha2 #232320`:

| Token | papir | plocha | plocha2 |
|---|---|---|---|
| inkoust #fffefb | 19,3 | 17,3 | 15,6 |
| tlum #c9c6bd | 11,4 | 10,2 | 9,2 |
| tlum2 #9d9a92 | 6,9 | 6,2 | 5,6 |
| akcent #e8484f | 5,07 | 4,54 | **4,11** |
| akcent-tmava #c1272d | **3,33** | **2,99** | **2,70** |
| akcent-svetla #f2848a | 7,8 | 7,0 | 6,3 |
| klid / klid-text | 8,6 / 11,5 | 7,7 / 10,3 | 7,0 / 9,3 |
| pozor, stari-text | 9,7 / 9,6 | 8,7 / 8,6 | 7,8 / 7,8 |

- `akcent` na `plocha2` (4,11:1) nesplňuje 4,5:1 pro malý text. `grep` našel 16 řádků komponent, kde je `text-akcent` spolu s `bg-plocha2`. P3: pro text používat `akcent-svetla`.
- `akcent-tmava` se nesmí použít na text (max 3,3:1).
- Bílý text na `bg-akcent` (`vystraha.tsx` ř. 97, tlačítko výstrahy): **3,84:1**, pro 16px semibold je to pod 4,5:1. P2, protože jde právě o tlačítko v mimořádné výstraze. Oprava: `bg-akcent-tmava` s bílou (5,9:1) nebo tmavý text.
- Hranice karet `linka` (13 % bílé) mají proti pozadí 1,39:1. Nenesou ale informaci, takže to neporušuje 1.4.11.
- Světlý motiv: všechny tokeny textu ≥ 4,6:1.
- Fokus: `outline 2px var(--color-akcent)` + offset 2 px, 5,07:1 proti papíru, v pořádku. Formulářová pole (`formulare.tsx` ř. 14) mají `focus:outline-none` a jen změnu barvy okraje na akcent. Je to přijatelné, ale slabší (P3).

### Omezení pohybu

- `globals.css` ř. 560–625: parallax, „nálet“ i posun hlavičky běží jen při `prefers-reduced-motion: no-preference` **a** `html[data-pohyb="zapnuty"]` (výchozí stav: vypnuto). Při `reduce` se všechny animace a přechody zkrátí na 0,01 ms. V pořádku.
- „Radar“ pozadí je statický gradient `.paralax-vrstva` a animuje se jen s volbou pohybu. V pořádku.
- Výjimka je pás zemí (N13).

---

## 3. Výkon

Přenos měřený ze souborů v `out/` (skript `scratchpad/vaha.py`):

| Stránka | JS souborů | JS raw | JS gzip | HTML raw (gzip) |
|---|---|---|---|---|
| `/` | 13 | 1199 KB | 355 KB | 713 KB (155) |
| `/udalosti/` | 13 | 1077 KB | 323 KB | 478 KB (115) |
| `/analyzy/` | 12 | 1050 KB | 316 KB | 521 KB (125) |
| `/incident/…` | 12 | 1043 KB | 313 KB | 92 KB (17) |
| `/ucet/`, `/odber/`, `/o-projektu/`, **`/offline/`** | 11–12 | 1029–1066 KB | 308–320 KB | 66–84 KB |

- Písma: 10× `<link rel=preload as=font>` (Archivo a IBM Plex Mono, 4 řezy, latin + latin-ext), celkem 140 KB.
- Obrázky: na stránkách žádné `<img>`. Ikony PWA 17–70 KB.
- Home HTML obsahuje 456 KB inline RSC payloadu (`self.__next_f.push`), tedy dvě třetiny HTML.
- Měření LCP (Slow 4G 1,6 Mb/s, RTT 150 ms, CPU 4×, **bez gzipu**, `cp-kopie/lcp.mjs`): home LCP 2,26 s, TBT 449 ms, DOMContentLoaded **10,3 s**. Incident: LCP 2,06 s, TBT 318 ms. `/udalosti/`: LCP 2,31 s, DCL 8,1 s. S gzipem na Cloudflare bude DCL asi třetinový, ale hydratace home na slabém telefonu zůstane v řádu sekund.

### N4: Celá databáze incidentů v klientském JS na každé stránce (P1)

- **URL:** všechny (ověřeno i `/offline/`, `/404/`, `/o-projektu/`)
- **Komponenta:** `src/lib/data.ts` (statický `import ostreIncidenty from "../../data/incidenty.json"`), klientské komponenty, které ho tahají: `src/components/urgentni.tsx` (`import { vystraha } from "@/lib/data"`), `zeme.tsx` (`Vlajka`, `sklon` z modulu, který importuje `@/lib/data`), `@/lib/agregace` (z `cisla-kde-kdo`, `udalosti-klient`, `pas-zemi`, `aktuality`, `co-se-zmenilo`, `dashboard`)
- **Současný stav:** chunk `_next/static/chunks/1x22ovnmwg9pd.js` (383 KB) začíná `JSON.parse('[{"id":"i-2026-09-13-ukrajina-dron-vlak-varsava",…`. Náhodné vzorky: 29/30 řetězců z `incidenty.json` a 17/17 z `nepotvrzeno.json` jsou v tomto chunku. **`kandidati.json` (498 KB) a `fronta/odmitnute.json` (444 KB) v klientském JS nejsou**: 0/300 a 0/500 ID, 0 URL. Chunk se načítá na 40+ stránkách včetně `/offline/`.
- **Riziko:** Asi 110 KB gzip navíc na každé stránce a JSON.parse 380 KB na slabém telefonu (TBT). Roste s každým incidentem. Offline stránka je zbytečně těžká.
- **Oprava:** `vystraha()` a pomocné funkce (`sklon`, `Vlajka`, typy) vyčlenit do modulů bez importu dat. Klientským komponentám předávat jen potřebná pole jako props ze serverových komponent. Do `data.ts` přidat `import "server-only"`.
- **Akceptační test:** `grep -l 'i-2026-09-13-ukrajina-dron' out/_next/static/chunks/*.js` nic nenajde. JS na `/offline/` je pod 250 KB raw.

---

## 4. SEO a sdílení

Home (`out/index.html`): title „CzechPatrol — Bezpečnostní přehled ČR“, description ok, `og:title/description/site_name/locale/type`, `twitter:card=summary_large_image`, favicon PNG + SVG, apple-touch-icon, manifest, `robots index,follow`, JSON-LD `WebSite`.
robots.txt: `Allow: /` + sitemap. sitemap.xml: 168 URL (139 incidentů). `/sprava`, `/ucet`, `/offline`, `/odolnost/platba` v něm **nejsou** a mají `noindex`.

### N8: OG a sdílení incidentu: bez obrázku, bez URL, bez data, titulek bez kontextu (P1)

- **URL:** `/incident/ukrajina-dron-vlak-kyjev-varsava-2026/` (a všech 139 incidentů)
- **Komponenta:** `src/app/incident/[slug]/page.tsx` ř. 17–27 (`generateMetadata`), `src/app/layout.tsx` (metadata)
- **Současný stav:**
  - `og:title` = celý titulek „Ukrajina: ruský dron zasáhl u polských hranic lokomotivu vlaku z Kyjeva do Varšavy; v soupravě jedoucí krátce před ním cestoval bývalý český ministr zahraničí Jan Lipavský“ (185 znaků, bez data).
  - `og:description` = `i.vyznam.slice(0,180)` = „Hodnocení projektu, ne fakt. Pro Česko je podstatné, že v bezprostřední blízkosti ruského úderu byl český politik … Pr“, tedy **uříznuto uprostřed slova** a místo faktu začíná hodnocením.
  - Chybí `og:image`, `og:url`, `og:site_name` a `og:locale` (objekt openGraph v incidentu přepíše ten z layoutu), dále `article:published_time`, `<link rel=canonical>` a hreflang, a to **na všech stránkách**.
  - `twitter:card=summary_large_image` bez obrázku. `twitter:title` a `twitter:description` jsou generické z layoutu, takže X/Twitter ukáže jiný text než Facebook nebo WhatsApp.
  - Na `/udalosti/` a `/zeme/cz/` je `og:title` generický („CzechPatrol — Bezpečnostní přehled ČR“).
- **Riziko:** Náhled sdílený ve WhatsAppu nebo na Facebooku ukáže bez data a bez značky „ověřeno/zdroj“ jen „Ukrajina: ruský dron zasáhl…“, i když je zpráva měsíce stará. Tvrzení vytržené z kontextu se může šířit jako čerstvé a poplašné (rozpor s pravidly 2 a 3 v CLAUDE.md projektu). Bez canonical se může indexovat i duplicita (`?zdroj=pwa`, jazykové cesty).
- **Oprava:** V `generateMetadata` použít `kratkyTitulek` + datum („15. 9. 2026 · Ukrajina: dron zasáhl vlak do Varšavy | CzechPatrol“). Jako description dát první fakt a zdroj, zkrátit na hranici slova a přidat „…“. Doplnit `alternates.canonical`, `openGraph.url`, `siteName`, `locale`, `publishedTime` a statický `og:image` (značka + „Ověřený záznam se zdrojem“). Twitter metadata odvodit ze stejných hodnot.
- **Akceptační test:** Pro každý `out/incident/*/index.html` platí: je tam `<link rel="canonical">`, `og:url`, `og:image`, `og:title` obsahuje datum, `og:description` nekončí uprostřed slova a `twitter:title` se rovná `og:title`.

### N9: Jazykové verze jsou česky (P2)

- **URL:** `/en/`, `/de/`, `/pl/`, `/uk/` … (16 jazyků)
- **Komponenta:** `src/app/[jazyk]/layout.tsx` (jen `JazykProvider`), root `layout.tsx` (`<html lang="cs">`)
- **Současný stav:** `out/en/index.html` má `lang="cs"`, český title, českou description, `og:locale=cs_CZ`. Serverově vykreslený obsah je česky (i banner „Sběr neběží…“). Hreflang ani canonical nejsou.
- **Riziko:** Vyhledávače to vidí jako 16× duplicitní český obsah. Čtečka obrazovky čte anglické rozhraní (pokud se přeloží na klientu) s českou výslovností.
- **Oprava:** `generateMetadata` v `[jazyk]` s přeloženým title, `alternates.languages` a canonical. `lang` nastavit na `<html>` podle segmentu, nebo aspoň na obalu `main`. Dokud nejsou verze přeložené, dát jim `noindex`.
- **Akceptační test:** `out/en/index.html` obsahuje `lang="en"` a `hreflang="cs"` / `"en"`. Jazykové cesty jsou buď přeložené, nebo mají `noindex`.

### N18: Interní a osobní stránky (P3)

- `/sprava/odmitnute/` má statické HTML o velikosti **1,58 MB** s 500 odmítnutými titulky a úryvky cizích článků, `noindex` a bez ochrany. Komentář v `page.tsx` říká, že jde o záměr. robots.txt ale `/sprava/` nezakazuje, takže když na ni vede odkaz, crawler ji stáhne. Oprava: `Disallow: /sprava/` v `src/app/robots.ts`, případně stránku z veřejného buildu vyřadit. Test: robots.txt obsahuje `Disallow: /sprava/`.
- `/muj-prehled/` (450 KB, osobní pohled) má `index, follow` a je v sitemapě. Oprava: `noindex` a vyřadit ze sitemapy.

---

## 5. Offline a PWA

`public/sw.js` (verze `cp-v3`):
- Při instalaci ukládá `/`, `/offline/`, manifest a ikonu.
- `/_next/static/*` bere z cache (cache-first).
- Navigace bere ze sítě (`no-cache`), kopii ukládá do cache. Při chybě vrátí uloženou stránku, jinak `/offline/`.
- Ostatní GET požadavky jdou na síť, a když uspějí, uloží se do cache (včetně `stav.json` a RSC `.txt`).
- Registrace (`src/components/pwa.tsx`) probíhá jen na `https:`, takže service worker **na lokálním http serveru nešel ověřit v běhu**. Níže je rozbor kódu a test offline toastu.

Co uživatel offline uvidí: uloženou stránku a toast `role=status` „Bez připojení. Zobrazený stav je poslední načtený, ne aktuální.“ (`offline-toast-home-390.png`, ověřeno přes `context.setOffline(true)`). Banner „Sběr neběží“ se počítá z hodin prohlížeče, takže uložená stránka stará přes 12 h to přizná sama.

### N14: Nedostatky service workeru (P2)

- **Komponenta:** `public/sw.js`, `src/app/offline/page.tsx`, `public/manifest.webmanifest`
- **Současný stav a problémy:**
  1. Navigace ukládá **každou** odpověď, i 404 a 5xx (větev navigace nekontroluje `odpoved.ok`). Chybová stránka z výpadku hostingu přepíše dobrou uloženou kopii.
  2. `start_url` je `/?zdroj=pwa`, ale při instalaci se uloží `/`. `caches.match(request)` bez `ignoreSearch`, takže první spuštění nainstalované aplikace bez sítě skončí na `/offline/`, i když je `/` v cache.
  3. Cache nemá limit ani úklid. Každá navštívená stránka (home 713 KB) a každý přednačtený RSC `.txt` zůstává, dokud se ručně nezmění `VERZE`. Staré chunky `_next/static` se hromadí přes všechna nasazení.
  4. Text `/offline/`: „Přehled, který jste už otevřeli, funguje — **platí poslední ověřený stav**.“ Slovo „platí“ tvrdí aktuálnost, kterou web offline nezná (`offline-stranka-390.png`).
  5. Offline toast nemá čas načtení stránky („poslední načtený“, ale kdy?).
- **Riziko:** Offline uživatel v krizi dostane chybovou nebo prázdnou stránku, případně text, který uklidňuje víc, než smí.
- **Oprava:** (1) `if (odpoved.ok) caches.put(...)`. (2) `caches.match(request, { ignoreSearch: true })` pro navigace, nebo do SKORAPKY přidat `/?zdroj=pwa`. (3) Oddělit cache na shell, stránky (LRU asi 30 položek) a statické soubory a při `activate` mazat nepoužité chunky. (4) Text změnit na „…funguje. Ukazuje stav z doby, kdy jste ji naposledy načetli, ne dnešní.“ (5) Do toastu doplnit „načteno 23. 9. 17:24“ (z `Date` hlavičky uložené odpovědi, nebo z času hydratace).
- **Akceptační test:** Na https náhledu: DevTools → Offline → spustit PWA z plochy, zobrazí se uložený přehled, ne `/offline/`. Simulovaná odpověď 503 nepřepíše uloženou kopii. Toast obsahuje datum a čas.

---

## 6. Stavy selhání

### N2: Stará data a dashboard „TEĎ / DNES / nic urgentního“ (P0)

- **URL:** `/` a všechny podstránky
- **Komponenta:** `src/components/urgentni.tsx` (`UrgentniPas`, ř. 142–165), `src/components/hero-dashboard.tsx`, `src/components/banner-stari-klient.tsx` (`StavKontrolyVedle` vrací `null`, když je poplach), `src/app/page.tsx` (`PruhKontroly` jen na home)
- **Současný stav:** Hodiny prohlížeče posunuté na 26. 9. 2026 17:00 (3 dny po posledním čtení), `cp-kopie/stare.mjs`:
  - Nahoře oranžový banner „Sběr neběží. Zdroje naposledy čteny 23. 9. 2026 · 04:00, před 4 dny. Web ukazuje stav k tomu okamžiku, ne dnešní.“ (`stav-stare-3dny-home-390.png`). To je správně.
  - Níže (`stav-stare-3dny-urgentni-390.png`): „EVROPA · **DNES** Zvýšená“, „BĚŽNÝ ŽIVOT · **TEĎ** BEZ OMEZENÍ“ a zelený rámeček „**Teď nic urgentního.** Žádná mobilizace, krizové vysílání ani mimořádný stav za 48 h“. Časový údaj „zdroje čteny …“ se nezobrazí, protože dashboard předává `zkontrolovano={overeno}` a to je `null`.
  - Na podstránkách (`/zeme/cz/`, `/udalosti/`, incident) se při poplachu nezobrazí **nic**: `StavKontrolyVedle` vrátí `null` a `PruhKontroly` je jen na home (`m390-zeme_cz-viewport.png`, stav 13 h, bez varování, „0 dnes / 0 za 7 dní / 0 za 30 dní“).
- **Problém:** Web tvrdí aktuální klid („teď“, „za 48 h“), i když za posledních 48 h nic nečetl. Přesně tomu se má podle komentáře v `banner-stari-klient.tsx` („web, který mlčení vydává za klid, je horší než žádný web“) vyhnout. Banner je nahoře a po odrolování zmizí, zelený rámeček zůstane.
- **Riziko:** Nepravdivé uklidnění v situaci, kdy se něco děje a sběr stojí. Ztráta důvěry a právní riziko opačné k poplašné zprávě.
- **Oprava:** Stav čerstvosti (`cerstvost(posledniKontrola)`) předat do `UrgentniPas` i `HeroDashboard`. Při ≥ 12 h: šedý rámeček „Nevíme — sběr neběží od 23. 9. 04:00. Neplatí ‚nic urgentního‘. Aktuální informace: hzscr.cz, 112, ČRo.“, „DNES/TEĎ“ nahradit datem posledního čtení a zelenou tečku šedou. `PruhKontroly` přesunout do layoutu (všechny stránky), nebo `StavKontrolyVedle` při poplachu nechat zobrazit oranžový text.
- **Akceptační test:** S `page.clock` nastaveným na posledniKontrola + 13 h: na `/`, `/zeme/cz/`, `/udalosti/` a incidentu je viditelný text „Sběr neběží“. Na `/` neexistuje text „Teď nic urgentního“ ani slova „TEĎ“/„DNES“ bez data.

### N3: Sběr v repozitáři teď stojí (P0, provoz)

- **Současný stav:** `data/pravni-stav.json`, `nato.json` a `provoz.json` mají max. `zkontrolovano` = `2026-09-23T02:00:56Z`. Poslední commit „Sběr dat“ je z 02:02 UTC. Pozdější commit 14:51 UTC upravil jen `stav.json`. Web sestavený z HEAD proto v 17:24 pražského času ukazuje „Sběr neběží … před 13 h“ (`m390-home-viewport.png`, `m1280-home-viewport.png`). `out/fronta.json` má `"sberNaposledy":"2026-09-22T20:02:26Z"`.
- **Riziko:** Spuštění s neběžícím sběrem. První dojem je oranžový banner „Sběr neběží“.
- **Oprava:** Před spuštěním ověřit workflow `.github/workflows/sber.yml` (běhy od 02:02 UTC). Nezapomenout, že banner měří jen tři soubory (`posledniKontrola()` v `src/lib/data.ts` ř. 453).
- **Akceptační test:** Poslední commit „Sběr dat“ je starší nejvýš 1 h a banner „Sběr neběží“ se na produkci nezobrazuje.

### N5: „Služby naživo“ při selhání živého čtení (P1)

- **Komponenta:** `src/lib/sluzby-klient.ts` (`useStavSluzeb`), `src/components/stav-sluzeb.tsx`, souhrn v `dashboard.tsx` ř. 577
- **Současný stav:** Externí stavové stránky byly zablokované (`route.abort`), hodiny posunuté o 3 dny: „SLUŽBY NAŽIVO · 2 z 3 sledovaných služeb mělo **za 24 h** potíže · 2 omezení · Stavové stránky provozovatelů, **snímek 04:02**.“ Cloudflare a Zoom jsou označené „OMEZENÍ“ podle 3 dny starého snímku (`stav-stare-3dny-sluzby-390.png`). Když čtení selže, `kdy` zůstane na času snímku a `casPraha` ukáže jen hodinu bez data. Chyba čtení (`chyba`) se ukáže jen v náhledu po najetí myší, na dotykovém zařízení vůbec.
- **Riziko:** Starý výpadek se zobrazí jako dnešní, nebo naopak dnešní výpadek jako „v provozu“. Pod nadpisem „naživo“.
- **Oprava:** Pokud žádné živé čtení neuspělo: nadpis „Služby, poslední snímek 23. 9. 04:02“ (s datem, jakmile snímek není z dneška), „za 24 h“ počítat od `ted`, a když je snímek starší 24 h, stav služby označit „nezjištěno“. Ukázat viditelný text „Živé čtení se nepovedlo“.
- **Akceptační test:** S blokovanými externími URL a hodinami +3 dny panel neobsahuje „za 24 h“ ani „naživo“ bez data a u každé služby je „nezjištěno“ nebo datum snímku.

### N10: Výpadek API (účet, odběr) (P2)

- **Build s `NEXT_PUBLIC_API_URL=http://127.0.0.1:9`** (nedostupná adresa), `scratchpad/out-api`, port 8766.
- **`/ucet/`, odeslání obnovovacího kódu:** v kartě Passkey (ne u formuláře kódu) se ukáže syrová anglická chyba prohlížeče **„Failed to fetch“** (`selhani-api-ucet-2-odeslano.png`). Zdroj: `src/lib/ucet.ts` `api()`, kde `fetch` při síťové chybě vyhodí `TypeError` a ten se v `ucet-klient.tsx` ř. 118 vypíše `e.message`.
- **Přihlášený uživatel (token v `localStorage`) a API mimo provoz:** stránka tiše zobrazí přihlašovací formulář, jako by byl odhlášený, bez hlášky (`selhani-api-ucet-prihlaseny-390.png`). Zdroj: `useUcet` → `catch { setUcet(null) }`. Token zůstane uložený.
- **`/odber/`:** statická informační stránka bez formuláře, API nepotřebuje a funguje (`selhani-api-odber-390.png`).
- **Bez `NEXT_PUBLIC_API_URL`** (výchozí build): účty se ukážou jako „připravujeme“ (`UCTY_ZAPNUTE=false`). V pořádku.
- **Oprava:** V `api()` zachytit síťovou chybu a vyhodit `ChybaApi(0, "Server účtů je teď nedostupný. Zkuste to za chvíli; přehled na webu funguje dál.")`. V `useUcet` rozlišit 401 od sítě a při síťové chybě ukázat „Účet se nepodařilo načíst (server nedostupný)“. Chybu zobrazit u formuláře, který ji vyvolal.
- **Akceptační test:** S nedostupným API se na `/ucet/` nikde nezobrazí text „Failed to fetch“. Přihlášený uživatel vidí hlášku o nedostupnosti, ne přihlašovací formulář.

---

## 7. Vlajky a země

### N6: Chybné přiřazení země nebo vlajky (P1)

- **URL:** `/`, pás zemí („🇺🇸 Rusko 1“, „🇪🇺 EU 1“), `/zeme/` (karta „🇺🇸 Rusko · 1 případ“ vedle skutečného Ruska), `/incident/us-590b687216/` (`vlajky-incident-usa-rusko-390.png`: „PŘÍPAD · 🇺🇸 Rusko · USA: obvinila pět osob z ruské sabotážní a atentátnické sítě“), `/incident/whitaker-hybridni-nato-2026/` (`vlajky-incident-nato-eu-390.png`: „🇪🇺 NATO“)
- **Komponenta:** data `data/incidenty.json` (záznam `us-590b687216`: `kodZeme:"US"`, `zeme:"Rusko"`; `whitaker-hybridni-nato-2026`: `kodZeme:"EU"`, `zeme:"NATO"`), `src/components/zeme.tsx` `Vlajka`
- **Současný stav:** Kód a název si odporují. Pás a `/zeme/` seskupují podle kódu a zobrazují název z prvního záznamu, takže vznikne druhé „Rusko“ s americkou vlajkou. Pod kódem EU jsou „Evropa“, „NATO“ a „EU“ (8 záznamů). Na pásu je „🇪🇺 EU“.
- **Riziko:** Faktická chyba na první obrazovce: „Rusko“ s vlajkou USA. Poškozuje důvěryhodnost a může mást (událost v USA se jeví jako událost v Rusku).
- **Oprava:** Opravit data (`zeme:"USA"`). NATO dát vlastní kód (např. `XN` se znakem místo vlajky EU). Do `nastroje/kontrola-dat.mjs` přidat kontrolu, že každý `kodZeme` odpovídá jednomu kanonickému `zeme` z tabulky zemí.
- **Akceptační test:** `npm run kontrola:data` selže na dvojici kód/název, která nesedí. V `out/index.html` není „🇺🇸“ vedle „Rusko“.

### N16: Emoji vlajky (P3)

- **Komponenta:** `src/components/zeme.tsx` `Vlajka` (regionální indikátory Unicode)
- **Současný stav:** V Chromiu na Linuxu (Noto Color Emoji) se vlajky vykreslí. Windows barevné vlajky jako emoji nemají a ukáže dvě písmena („CZ“, „DE“). Na desktopu s Windows se tak na pásu, v Aktualitách a v událostech zobrazí „CZ Česko“. XZ je 🌊, EU 🇪🇺 a neznámé kódy 🏳️.
- **Oprava:** Pokud na tom záleží: malé SVG vlajky (lokálně, bez CDN) nebo vlajku skrýt a nechat název. Vždy `aria-hidden`.
- **Akceptační test:** Snímek z Windows (Edge) neobsahuje dvojice písmen místo vlajek.

---

## Použité skripty (v `scratchpad/cp-kopie/`)

`mobil.mjs` (přetečení, lepivé prvky, cíle, snímky), `home.mjs` (sekce úvodní strany, osnova nadpisů), `axe.mjs`, `tab.mjs` a `tab2.mjs` (fokus, zakrytí hlavičkou), `cile.mjs` (cíle pod 24 a 44 px), `lcp.mjs` (LCP a TBT se škrcením), `selhani.mjs`, `selhani2.mjs`, `token.mjs` a `stare.mjs` (API, služby, stará data, offline), `vlajky2.mjs`, `h1.mjs`, `h320.mjs`. Surová data jsou v `scratchpad/mobil.json` a `scratchpad/axe.json`.

## Seznam snímků (`scratchpad/snimky/`)

Klíčové:
- `m390-home-viewport.png`: první obrazovka 390 px (banner Sběr neběží, Právě ověřujeme Rusko)
- `m320-home-viewport.png`, `m320x568-home-viewport.png`, `m320-hlavicka-prekryv.png`: 320 px, překryv BETA a CS
- `m1280-home-viewport.png`: desktop, pás zemí s uříznutým Českem
- `m390-home-sekce1.png` … `m390-home-sekce5.png`: průchod úvodní stranou (hero až v sekci 4)
- `fokus-390-pod-hlavickou.png`: fokus „Letos“ pod hlavičkou
- `stav-stare-3dny-home-390.png`, `stav-stare-3dny-urgentni-390.png`, `stav-stare-3dny-sluzby-390.png`: stará data
- `m390-zeme_cz-viewport.png`: podstránka bez varování o stáří
- `selhani-api-ucet-2-odeslano.png`, `selhani-api-ucet-prihlaseny-390.png`, `selhani-api-odber-390.png`: výpadek API
- `offline-toast-home-390.png`, `offline-stranka-390.png`: offline
- `vlajky-incident-usa-rusko-390.png`, `vlajky-incident-nato-eu-390.png`: chybné vlajky

Ostatní: `m{320,390,1280}-{stránka}-viewport.png` pro všech 12 stránek, `m390-{home,udalosti,zeme_cz,ucet,odber}-cela.png` (celá stránka), `m390-incident-scroll.png`, `fokus-390-tab{3,8,15,25,40}.png`, `stav-cerstve-*.png` (kontrola s hodinami 1 h po čtení: „Zkontrolováno 04:00 · bez nálezu“, bez banneru).
