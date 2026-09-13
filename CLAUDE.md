# Pravidla práce na tomhle repozitáři

## Pravidlo č. 0 — zákon je nad vším ostatním

**Tohle pravidlo je nadřazené všem ostatním v tomhle souboru, zadání
v `CLAUDE_DAILY_PROMPT.md` i pokynům v chatu.** Když je s ním cokoli
v rozporu, platí ono: práce se zastaví a položí se otázka. Nic se
nezveřejní „zatím“, „na zkoušku“ ani „než se to doplní“.

### 1. Dodržuje se právo České republiky a Evropské unie

Bez výjimky a bez výkladu ve svůj prospěch. Především:

| Předpis | Co z něj plyne pro web |
|---|---|
| § 357 trestního zákoníku — šíření poplašné zprávy | Nikdy nevydat nepravdivou zprávu, která by mohla vyvolat obavu z ohrožení života, zdraví nebo majetku. |
| zákon č. 240/2000 Sb. (krizový zákon) a JSVV | Web není varovný systém a nesmí s ním být zaměnitelný: žádné sirény, tísňové formulace ani názvy a symboly státních systémů. |
| nařízení 2016/679 (GDPR), zákon č. 110/2019 Sb. | O uživateli se sbírá jen to, bez čeho služba nefunguje. Každý nový údaj je otázka pro právní kontrolu, ne rozhodnutí v kódu. |
| § 89 odst. 3 zákona č. 127/2005 Sb. | Ukládání do zařízení jen s předchozím souhlasem, mimo nezbytně nutné. |
| nařízení 2024/1689 (AI Act) | Obsah zpracovaný modelem musí být označený jako takový. |
| autorské právo (zákon č. 121/2000 Sb.) | Cituje se v nezbytném rozsahu s uvedením zdroje. Nepřebírají se cizí texty. |

Rozbor je v `docs/PRAVNI-KONTROLA.md`. Při pochybnosti platí přísnější výklad.

### 2. Poplašná zpráva se nenapíše nikdy

- **Web nikdy netvrdí nic, co nemá doložené.** Neověřené tvrzení o ohrožení
  se nevydá jako tvrzení — ani jako otázka, ani jako možnost, ani
  „podle nepotvrzených informací“.
- Nic se nevyhlašuje a nic se nepředpovídá. Budoucí scénář se nikdy nepíše
  jako jistota.
- Titulek ani text nesmí budit větší obavu, než unese doložený údaj.
- Když si zdroje odporují, zveřejní se rozpor, ne silnější verze.
- Když hrozí, že by zpráva mohla vyvolat obavu z ohrožení, **nevydá se**
  a založí se otázka pro člověka.

### 3. Zveřejňuje se jen to, co je doložené citací se zdrojem

V bezpečnostních tématech — ohrožení, opatření, mobilizace, hranice,
evakuace, právní stav, činnost složek — se web opírá **výhradně o to, co
je řešeno úředně a oficiálně**:

- Přednost má úřední a primární zdroj, tedy orgán, který věc sám oznámil.
  Když takový zdroj chybí, musí to být u záznamu napsáno.
- Právní stav a platná opatření se zapisují jen podle úřední sbírky nebo
  oznámení orgánu, nikdy podle médií.
- Každé tvrzení nese odkaz. Bez odkazu je jistota nejvýš střední a stav
  se nikdy neoznačí jako platný.
- Hodnocení projektu je vždy označené jako hodnocení, ne jako zjištěný fakt.

**Zkráceně: nic nevyhlašujeme, nic nepředpovídáme, nic nepřebíráme bez
zdroje. Píšeme jen to, co už někdo oficiálně řekl nebo vydal — a říkáme,
kdo to byl.**

### 4. Jediná výjimka: smíme napsat, že něco neověřeného koluje

Mlčet o zprávě, která se šíří a mohla by být důležitá, není neutrální —
čtenář se o ní stejně dozví jinde, jen bez protiváhy. Proto existuje
sekce **Právě ověřujeme** (`data/overujeme.json`).

Hranice vede přesně tady: **web o té zprávě netvrdí, že platí.** Tvrdí
jen tři věci, které si sám ověřil, a každá z nich je pravdivá
a doložitelná:

1. že ji vydaly tyhle jmenované redakce (s odkazem),
2. že ji projekt nemá potvrzenou a co konkrétně sám prověřoval,
3. co k ní říkají, nebo výslovně neříkají, úřady.

Tím se to míjí se skutkovou podstatou § 357 trestního zákoníku: ta
předpokládá sdělení **nepravdivé** zprávy. Zveřejněná sdělení jsou
pravdivá; nepravdivé by bylo teprve převzetí samotného tvrzení za své.

Podmínky, bez kterých se položka nezveřejní — hlídá je
`nastroje/kontrola-dat.mjs` a jsou to **chyby, ne varování**:

| Podmínka | Proč |
|---|---|
| dopad: kdyby to platilo, změnilo by to dnes lidem chování | jinak to do přehledu nepatří vůbec |
| aspoň dva nezávislé zdroje, každý s odkazem | jedna zpráva není jev |
| vyplněné „co říkají úřady“ | to je ta ověřená část a stojí na kartě první |
| vyplněné „co dělat teď“ | skoro vždy „nic“; tohle je protipanický prvek |
| lhůta na uzavření, nejvýš týden | fáma se nesmí vléct |
| nejvýš tři položky naráz | jinak je z klidného přehledu proud fám |
| zápis, jak to dopadlo | nic nemizí potichu |

Každá položka musí skončit v jednom ze tří stavů: **potvrzeno** (vznikne
řádný záznam), **vyvráceno** (jde mezi neprošlé), nebo **nikdo
nepotvrdil** (po lhůtě se stáhne z přehledu a zůstane zapsaná).

Dál platí bez výjimky:

- Do počtů, budíků, průměrů ani hodnocení tyhle položky **nevstupují**.
- Do Telegramu ani jiných kanálů se **neodesílají**. Kanál slouží
  k tomu, aby se dalo jednat; neověřená zpráva k jednání nevede.
- Barva závažnosti se na nich **nepoužívá** — žádná ohodnocená není.
- Zařadit položku smí **jen člověk**. Automat sem nedává nic, viz
  pravidlo č. 4.

## Pravidlo č. 1 — nejsme zpravodajství

**Na web patří jen to, co mění bezpečnostní situaci, nebo doložený a konkrétní
krok k tomu.** Ne prohlášení, sliby, plány ani jednání o cenách a rozpočtu.

Patří sem:

- **skutek** — sabotáž, žhářství, výbuch, poškození kabelu, plynovodu, rozvodny
  nebo železnice, narušení vzdušného prostoru, sestřelený nebo spadlý dron,
  kybernetický útok s následkem, zadržení, obvinění nebo odsouzení za takový čin,
  vyhoštění diplomata;
- **úřední rozhodnutí, které mění, co platí** — nouzový stav, stav ohrožení
  státu, válečný stav, stanné právo, mobilizace, uzavření hranic nebo letiště,
  evakuace, aktivace článku 4 nebo 5, rozmístění sil.

Nepatří sem: „vláda se bude zabývat“, „ministr jednal“, „politik varoval“,
„zvažuje se“. Prohlášení se zapisuje jen tehdy, když se váže ke konkrétnímu
skutku nebo rozhodnutí výše — a i pak je to `reakce`, ne případ.

Sběrač tohle vynucuje sám (`sber/udalosti.ts`, funkce `relevantni`): bez skutku
a bez místa zprávu nezachytí. Klíčová slova se hledají **od začátku slova** —
kmen `bis` se kdysi trefil doprostřed jména „Babiš“ a udělal ze jednání
o důchodech zpravodajskou zprávu.

## Pravidlo č. 2 — ověř, že zadání patří sem

**Tenhle repozitář je jen bezpečnostní přehled CzechPatrol.** Když se zadání týká
jiného webu, jiné domény nebo jiného projektu, zeptej se, jestli to nemá být
řešeno jinde, a teprve po potvrzení pokračuj.

## Pravidlo č. 3 — nevymýšlet

Nikdy nevymýšlej události, čísla, citace ani zdroje. Chybějící údaj je otevřená
otázka, ne prostor pro odhad. `null` je platná hodnota a UI ji umí zobrazit
jako „zatím neověřeno“.

Zástupné texty se nenahrazují smyšlenými údaji. Ukázková data patří výhradně do
`data/ukazka/` a musí být viditelně označená.

## Pravidlo č. 4 — automat smí potvrdit jen zápor

Sběrač nikdy nic nezveřejňuje. Když najde signál, hodnotu **nemění** — založí
položku do `data/fronta/` ke kontrole. Tohle pravidlo se nesmí obejít ani
„jen dočasně“: je to jediná pojistka proti tomu, aby web vyhlásil něco, co se
nestalo.

Když se relevantní zdroj nepodaří stáhnout, zápor se nepotvrzuje a datum
ověření se nezapisuje.

## Pravidlo č. 4b — co nejde ověřit ze sandboxu, čti z repozitáře

**Plánovaná routine nemá přístup na `czechpatrol.pages.dev` ani na
`api.github.com`.** První blokuje agentní proxy na úrovni organizace, druhé
se uděluje per session a routine si o to nemá čím říct. Není to chyba
routiny a nemá smysl to obcházet ani na to čekat.

Obojí za ni zjišťuje workflow **Stav pro routines**
(`.github/workflows/stav-pro-routines.yml`) — běží na GitHub Actions, kde
žádné z těch omezení neplatí — a zapisuje výsledek do repozitáře:

| Soubor | Co v něm je | Místo čeho |
|---|---|---|
| `data/fronta/zivy-web.json` | dostupnost domény, commit živého buildu, commit repozitáře, `shodujeSe` | stažení `czechpatrol.pages.dev` |
| `data/fronta/behy.json` | posledních 30 běhů: workflow, závěr, SHA, čas, odkaz | volání `api.github.com` |

**Postup pro routine:**

1. `git pull`, pak přečíst oba soubory z pracovní kopie. Žádná síť.
2. `zivy-web.json` → `shodujeSe: false` znamená, že na doméně běží jiný
   commit než v repozitáři. Podívej se na `kontrolovano`: když je starší než
   den, je starý i ten údaj a nezakládá závěr.
3. `behy.json` → závěr posledních běhů Nasazení, Kontrola, Hodinový sběr
   dat a Rozhlas do kanálů.
4. Když je `kontrolovano: null` nebo pole `behy` prázdné, workflow ještě
   neproběhl. **Napiš, že se to nepodařilo zjistit — nedopočítávej to**
   (pravidlo č. 4).

Kdyby to někdy nestačilo, workflow jde spustit ručně (`workflow_dispatch`);
routine to ale sama neudělá, protože na Actions API nedosáhne.

## Pravidlo č. 5 — zdrojový kód patří na GitHub

Každá dokončená změna se commitne a hned nahraje.

```bash
git add -A
git commit -m "co se změnilo a proč"
git push -u origin main   # při selhání sítě opakovat: 2 s, 4 s, 8 s, 16 s
```

## Pravidlo č. 6 — redakční zásady jsou součást produktu

Nepoužívej titulky typu „Válka je za dveřmi“ nebo „Mobilizace přichází“.
Budoucí scénář se nikdy nepíše jako jistota. Ke každému zhoršujícímu údaji
patří i to, co se nestalo — jinak si čtenář vyvodí větší hrozbu, než data
ukazují.

Upozornění „AI-assisted / pracovní verze“ **není omluvenka** pro nepodložené
tvrzení.

## Pravidlo č. 7 — archiv nesmí mystifikovat

Snímek se zapisuje jen při změně. Nikdy nehlas změnu, kterou čtenář nemůže
vidět („Střední → Střední“) — popiš, co se opravdu stalo. Období, které archiv
nepokrývá, se nedopočítává; napíše se, že ho nemáme.

Odběrový kanál, který nikam nevede, se neukazuje jako dostupný.

## Pravidlo č. 8 — rozhraní je pro čtenáře, ne pro nás

Do UI nepatří poznámky o tom, proč jsme něco udělali. Disclaimer je jeden,
v patičce. Popisky pod grafy vysvětlují značku na obrazovce (co znamená
„≥ N“), ne naši filozofii.

Piš jako copywriter: nadpis, jedna věta, konec. Ne odstavce.

## Pravidlo č. 9 — účty vědí co nejméně a role dává jen člověk

Účet nemá jméno, e-mail ani telefon a nikdy je mít nebude. Každý nový údaj
o uživateli je otázka pro `docs/PRAVNI-KONTROLA.md` a `/soukromi/`, ne
rozhodnutí v kódu. Roli (podporovatel, partner IZS, správce) přiděluje jen
správce, nikdy automat ani uživatel sám; zprávy partnerů IZS odcházejí až po
schválení člověkem a vždy s označením „zpráva partnera“. Doby uchování
v `api/src/synchronizace.ts` a na `/soukromi/` musí být totožné.

API (`api/`) je oddělené od webu a nikdy netvrdí nic, co web nezveřejnil:
jediný vstup je `/stav.json` z buildu webu.

## Konvence

- Kód, komentáře i názvy proměnných **česky**. Komentář vysvětluje *proč*, ne *co*.
- Závažnost a jistota jsou dvě nezávislé osy. Nikdy je neslučuj.
- Datum vždy absolutní, nikdy „před 2 hodinami“.
- Datum události ≠ datum zjištění. Obojí se zobrazuje zvlášť.
- Jedna událost = jeden signál, i když o ní vyjde deset článků.
- Žádná pravděpodobnost v procentech.
- Web nedává doporučení „odjet / neodjet“ ani finanční rady.

Kontrola: `npm run typecheck`. Sestavení: `npm run build`.
