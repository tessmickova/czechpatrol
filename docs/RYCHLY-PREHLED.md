# Rychlý přehled — audit, stavový model, texty, upozornění

Zadání provozovatelky z 26. 9. 2026: dát člověku za pár sekund věcný
přehled pro jeho oblast, bez doomscrollingu, a poctivě přiznat, že běhy
sběru občas vynechají nebo selžou. Stav k větvi
`claude/czechpatrol-event-sources-tsvojp`, **nenasazeno**.

## 1. Audit skutečného stavu (před změnou)

### Zdroje

| Co | Kde v kódu | Povaha |
|---|---|---|
| 32 institucí (vláda, PSP, Senát, MV, HZS, ČHMÚ, Policie ČR, ČEPS, NATO…) | `sber/zdroje.ts` | titulní nebo tiskové stránky; **čtou se podle klíčových slov**, žádná se nerozebírá jako výstraha s územím a platností |
| Úřady, redakce, Google News RSS, sociální sítě | `sber/zdroje-udalosti.ts`, `sber/socialni.ts` | zpravodajství → kandidáti (`data/kandidati.json`), nikdy přímo na web |
| Ceny paliv ČSÚ | `sber/palivo.ts` | úřední data, nejvýš po 12 h |
| Stavové stránky služeb | `src/lib/sluzby.ts` | provozní data, i živě v prohlížeči |
| Mimořádná výstraha | `data/vystraha.json`, `nastroje/vystraha.mjs` | **ruční zápis** redakce; neměla vydavatele, území ani začátek platnosti |
| Zprávy partnerů IZS | `api/src/izs.ts` | ručně psané, schvaluje správce; jen pro přihlášené |

**Strukturovaný zdroj oficiálních výstrah (ČHMÚ CAP, výstrahy HZS, obcí)
v projektu není.** `rozhodovani.ts:31-34` to říká sám: žádný zdroj není
„autoritativní“. Z prostředí, kde vznikala tahle změna, nebyl ČHMÚ
dostupný (proxy 403), takže ani adresu jeho výstražného zdroje nešlo
ověřit — proto se nepřidával (viz Otevřené otázky).

### Běhy

- Worker `czechpatrol-api` má cron `*/10`, sběr ale spouští jen jednou za
  kadenci — výchozí 60 min, při nedostatku minut GitHubu až 240 min
  (`api/src/sber.ts:40`, `api/src/minuty.ts:26`).
- Záloha `sber.yml` na plánovači GitHubu; souběh brání `concurrency:
  sber` bez rušení — druhý běh čeká.
- Časový limit na požadavek 20 s, 1–3 pokusy (`sber/nacti.ts`).
- Hlídač (`api/src/hlidac.ts`): správci po 3 h bez úspěšného běhu,
  **veřejnému kanálu po 12 h**; o obnovení nehlásil nic.

### Časy — co se kde ukládalo

- `data/fronta/posledni-beh.json` se **každým během přepíše**; nebylo
  z něj poznat, kdy zdroj naposledy opravdu odpověděl.
- `zkontrolovano` u položek úředního stavu = poslední **pokus**, zapisuje
  se i při selhání. `overeno` = věcné ověření — nezapíše se nikdy, protože
  žádný zdroj není autoritativní.
- Web ukazoval čas sběru zapečený v HTML a srovnával ho s hodinami
  prohlížeče jen pro barvu tečky (5 h). **Text se po výpadku neměnil.**
- Otevřená karta nic znovu nestahovala; `/stav.json` a HTML mají
  `max-age=0, must-revalidate`, service worker je network-first.

### Rizika seřazená

**Falešně uklidňující (nejvyšší riziko)**
1. „V kontrolovaných zdrojích žádné celostátní omezení“ pod nadpisem —
   i po dnech bez sběru (`src/lib/veta.ts`, `veta-situace.tsx`).
2. Zelené „Nic naléhavého za 48 h — žádná mobilizace, krizové vysílání
   ani mimořádný stav“ (`urgentni.tsx`) — sběr výstražné systémy nečte.
3. „vše zkontrolováno“, „Bez incidentu“ zeleně, „vše běžně“.
4. Upozornění „Ukončeno“ z rozdílu stavů i ze zastaralého nebo pozdě
   doručeného `stav.json` (`api/src/upozorneni.ts`, `synchronizace.ts`) —
   falešné „all clear“.
5. `/odber/` sliboval neověřené signály pěti témat hned — kód je posílá
   jen správci.

**Falešný poplach**
6. Změna **našeho** celkového hodnocení šla jako kritické okamžité
   upozornění, přes tiché hodiny.
7. Po obnovení sběru mohla přijít dávka starých událostí jako novinky.
8. Technický výpadek šel do veřejného kanálu s ⚠️.

**Přetížení**
9. Hlavní stav rozprostřený do čtyř boxů a gaugí s různou logikou; nic
   neříkalo, co z toho je oficiální.

## 2. Stavový model

Kód: `src/lib/prehled/` (typy, model, texty, snímek), konfigurace
`data/cerstvost-zdroju.json`. Pět os se drží odděleně:

| Osa | Hodnoty |
|---|---|
| Stav informace | platná · nadcházející · ukončená · odvolaná · opravená · nejasná |
| Stav zdroje | aktuální · zpožděný · nedostupný · neúplný (HTTP 200, nečekaný obsah) · neověřitelný (automat se trvale nedostane) |
| Typ a autorita | oficiální pokyn · oficiální výstraha · vyhlášené opatření · potvrzená událost · naše analýza |
| Vztah k lokalitě | v území · mimo · nelze určit |
| Pokrytí | které zdroje jsou aktuální, které ne, co nečteme vůbec |

Žádný globální semafor. Hlavní sdělení je věta a jeho rámeček má tři
tóny: výstraha (jen oficiální výstraha v území), pozor (omezená
aktuálnost, nejasné území), neutrální. Zelená v přehledu není.

### Meze čerstvosti (`data/cerstvost-zdroju.json`)

Měří se od **posledního úspěchu** zdroje, ne od pokusu.

| Skupina | Zpožděno | Nedostupné | Proč |
|---|---|---|---|
| Běh sběru | 150 min | 300 min → „nelze potvrdit“ | kadence 60 min; dva vynechané běhy + rezerva na plánovač; kadence se smí natáhnout na 240 min |
| Krizové a varovné instituce (HZS, ČHMÚ, Policie, SÚJB, NÚKIB) — zásadní | 150 min | 6 h | tady by bylo varování; výpadek nesmí zůstat skrytý |
| Vláda, parlament, ministerstva — zásadní | 6 h | 24 h | mění se zřídka a veřejně |
| Provoz infrastruktury | 6 h | 24 h | běžný život, ne výstrahy |
| Zahraničí | 12 h | 48 h | kontext |

Hlavní stav dat: všechny zásadní zdroje při posledním pokusu selhaly →
**výpadek všeho**; běh starší než 300 min nebo ≥ polovina zásadních
mimo → **nelze potvrdit**; některý zásadní nedostupný/neúplný →
**výpadek zásadního** (jmenovitě); zpožděný → **zpoždění**; jinak
**aktuální**.

### Bezpečná degradace

- Závěr počítá **prohlížeč se skutečným časem** ze surových časů ve
  snímku. Stránka z cache nebo visící karta proto sama zešedne.
- Otevřená stránka si `/prehled.json` stahuje znovu (načtení, návrat na
  kartu, 5 min). Přijme jen **novější** snímek (`prijmiSnimek`) a jen
  platného tvaru (`jeSnimek`).
- `/prehled.json`: `Cache-Control: no-store`; service worker ho neukládá.
- Platná výstraha zůstává podle **vlastní** platnosti; při omezené
  aktuálnosti je „poslední známá“ s větou, že změnu ani odvolání teď
  neověříme. Vypršená se ukáže jako skončená, i když ji nikdo nesundal.
- Sběr píše `data/fronta/zdroje-stav.json` monotonně: starší běh
  nepřepíše novější výsledek. HTTP 200 s krátkou stránkou nebo prázdným
  RSS je „nečekaný obsah“, ne úspěch.

## 3. Obrazovka

Úvod: nadpis → **Rychlý přehled** → odběr → podrobný monitoring
(aktuality, postranní panel). Přehled je konečný: hlavní sdělení,
oficiální informace pro oblast (vydal, území, platnost, vydáno, odkaz na
originál; text označený „Znění vydavatele“ nebo „Shrnutí CzechPatrol“;
pokyn jen doslova z originálu), čas kontroly s rozpisem zdrojů
(`<details>`), nejvýš tři potvrzené události v Česku za 7 dní, jedna
řádka naší analýzy, počet neověřených a vyvrácených zpráv s odkazem,
věta o odpovědnosti a odkaz na podrobný monitoring.

Oblast: výběr kraje (14 krajů) nebo celá ČR, v `localStorage`
(`cp:lokalita`). Nezvolená oblast se nepředpokládá — přehled řekne, že
ukazuje jen celostátní informace. Poloha se nezjišťuje.

Přístupnost: stav nese slovo i ikonu, ne jen barvu; výběr oblasti je
nativní `<select>`, rozpis nativní `<details>` (Tab/Enter); čtečka
dostane `role=status` jen s nadpisem (ne s minutami, které tikají);
žádné animace ani odpočty.

## 4. Texty (finální)

| Stav | Nadpis |
|---|---|
| Zdroje zkontrolované, výstraha nenalezena | V oficiálních zdrojích, které čteme, jsme pro {oblast} nenašli platnou výstrahu. — *Poslední úspěšná kontrola: {čas}. Pokrytí je omezené — regionální výstrahy ČHMÚ ani pokyny obcí zatím strojově nečteme. Při přímém varování se řiďte pokyny HZS, obce a policie.* |
| Aktivní výstraha v oblasti | Platí oficiální výstraha pro {oblast}: {titulek} — *Vydal: … Platí od … do … Území: … Řiďte se zněním u vydavatele.* |
| Nejasné území | Platí oficiální výstraha, u níž nedokážeme spolehlivě určit, zda se týká zvolené oblasti / vašeho místa. |
| Jeden zpožděný zdroj | Zdroj {X} je zpožděný — nedávnou výstrahu z něj nemůžeme vyloučit. |
| Výpadek zásadního zdroje | {X} teď nefunguje — přehled je neúplný. — *…neznamená to, že nic nevydal.* |
| Výpadek všech | Zdroje teď nedokážeme zkontrolovat. |
| Nelze potvrdit | Aktuálnost přehledu nelze potvrdit. |
| Poslední známá výstraha | Poslední známá výstraha pro {oblast}: {titulek} — *Jestli ji mezitím změnil nebo odvolal, teď neověříme…* |
| Analýza bez pokynu | Naše analýza — není to výstraha ani pokyn. |
| Událost bez pokynu | Potvrzená událost — bez pokynu obyvatelstvu. |
| Lokalita nenastavena | Oblast není zvolená, proto ukazujeme jen celostátní informace… |

Zakázané formulace hlídá test (`ZAKAZANE_FORMULACE` v
`src/lib/prehled/texty.ts`): „jste v bezpečí“, „nic vám nehrozí“,
„situace je pod kontrolou“, „nemusíte nic dělat“, „upozorníme vás“,
„dáme vám vědět“, „aktualizováno před chvílí“.

Opravené texty mimo přehled: „Náš sběr nezachytil naléhavou zprávu ·
48 h“ (bez zelené), „Bez záznamu“ místo „Bez incidentu“ (neutrálně),
„orientační kontrola“ místo „vše zkontrolováno“, „bez hlášených potíží“
místo „vše běžně“, tlačítko „Odběr zpráv“, `/odber/` podle kódu.

## 5. Upozornění

| Druh | Kam | Pravidlo |
|---|---|---|
| Oficiální změna (vyhlášený stav, krok NATO, zpráva partnera IZS) | čtenářům | jediné smí přeskočit tiché hodiny a souhrn |
| Naše ověřená událost | čtenářům | podle nastavení čtenáře, nikoho nevzbudí; jen zjištěná do 24 h |
| Naše analýza (změna hodnocení) | čtenářům | jen do souhrnu (denně/týdně), nízká závažnost, „Není to výstraha ani pokyn“ |
| Technický výpadek | správci po 3 h; kanálu po 12 h jako „Technická zpráva“ s větou, že o bezpečnosti nic neříká | po obnovení jednou „sběr zase běží“ těm, kdo slyšeli o výpadku |

Deduplikace: zpráva z rozdílu stavů má pevné id ze stálého klíče
(`zmena:pravni:mobilizace:plati:2026-09-26`), fronta má jedinečný index.
Zastaralý stav (běh starší 5 h) neposílá „Ukončeno“ ani změny provozu;
starší build, než jaký API zná, se ignoruje. **Vyhlášení** se pošle i ze
starého stavu — zmeškat ho je horší než opozdit.

Veřejný kanál (`nastroje/rozhlas.mjs`): věta o nečerstvých datech je
technická, bez ⚠️.

## 6. Nepravdivé a poplašné informace

Existující cesta: `data/nepotvrzeno.json` (stav „vyvráceno“),
`data/overujeme.json`, `data/opravy.json`. Nově pole `oznacenoUradem`
({vydavatel, url, kdy, oznaceni: nepravdivá | poplašná}) — jen s odkazem
na vyjádření úřadu; hlídá kontrola dat. Přehled ukazuje počet vyvrácených
s odkazem.

## 7. Ověření

- `testy/prehled-model.test.ts` — 35 testů, všech 10 scénářů zadání
  (úspěch; vynechaný běh; HTTP 200 s chybným obsahem; částečný a úplný
  výpadek; nová/změna rozsahu/oprava/odvolání/konec platnosti; sousední
  kraj, nejasná hranice, neznámá lokalita; pozdní odpověď a souběh;
  obnovení; stará stránka z cache) + zakázané formulace.
- `api/testy/upozorneni.test.ts`, `api/testy/hlidac.test.ts` — analýza
  jen do souhrnu, oficiální vs. naše kritická, zastaralý stav bez
  „Ukončeno“, pozdní události, stálé klíče, obnovení hlídače.
- Vizuálně (Playwright, 390 px a 1366 px): běžný stav, stránka posunutá
  o 7 h („nelze potvrdit“), výstraha pro kraj s pokynem, nejasné území,
  výpadek HZS. Tab z výběru oblasti vede na rozpis zdrojů.

**Neověřeno:** skutečný běh sběru s novým zápisem
`zdroje-stav.json` (proběhne až v GitHub Actions), doručení upozornění
přes Telegram, chování hrany Cloudflare s `no-store` (ověří se po
nasazení hlavičkou odpovědi), čtečka obrazovky na skutečném zařízení.

## 8. Omezení a otevřené otázky

1. **Výstrahy ČHMÚ (CAP) čteme od 26. 9. 2026** — `sber/vystrahy-chmi.ts`,
   adresa `https://vystrahy-cr.chmi.cz/data/XOCZ50_OKPR.xml` ověřená
   během „Ověření zdrojů“ ze sítě sběru (run 36222390575). Oblast = kraj;
   celý kraj se pozná podle toho, že výstraha jmenuje všechny jeho ORP
   ze souboru, jinak „část kraje“ (nelze určit). Soubor bez CAP nebo bez
   oblastí se nepoužije a předchozí výstrahy zůstávají. Výstrahy HZS,
   krajů a obcí strojově nečteme dál. Upozornění čtenářům z výstrah ČHMÚ
   zatím nevznikají (API čte jen `stav.json`).
2. Přesné místo uvnitř kraje neurčujeme: ORP z výstrahy ČHMÚ ukážeme
   jako „část kraje“, k obci čtenáře je nepřevádíme (volba je jen po krajích).
3. Spolehlivost běhů: kadence 60 min, při nedostatku minut GitHubu až
   240 min; plánovač GitHubu běhy zdržuje i zahazuje.
4. Náklady: čtení ČHMÚ přidává k běhu sběru jeden požadavek (~1,5 MB),
   žádný běh navíc; sběr commituje a nasazuje už teď při každém běhu.
   `/prehled.json` je statický soubor na Cloudflare Pages.
5. `data/fronta/zdroje-stav.json` je zatím prázdný; než ho sběr naplní,
   přehled odvozuje stav z posledního běhu (konzervativně).
