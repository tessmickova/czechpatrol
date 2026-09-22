# Bezpečnost obsahu — co CzechPatrol nezveřejňuje

CzechPatrol je pro civilní připravenost. Má maximalizovat informační hodnotu
pro člověka v Česku a zároveň minimalizovat operační hodnotu pro útočníka.
Kdykoli jsou tyhle cíle v rozporu, má přednost bezpečnost.

## Zásada: veřejné ≠ bezpečné k seskupení

Jednotlivě veřejné informace mohou složit citlivý obraz, když se spojí.
Před každou novou datovou vrstvou nebo polem se odpovídá na šest otázek:

1. Pomůže tahle informace civilistovi?
2. Potřebuje civilista tuhle přesnost?
3. Zvýšilo by spojení s jinými daty zneužitelnost?
4. Stačí agregovanější údaj?
5. Stačí kraj místo GPS?
6. Stačí „provoz omezen“ místo technického detailu?

Když praktická hodnota pro občana nepřevažuje riziko, údaj se nezobrazuje.

## Co se nesbírá ani nezobrazuje

- neveřejné polohy policistů a vojáků, aktuální pohyb jednotek, aktuální
  rozmístění bezpečnostních složek, trasy konvojů,
- počty zasahujících osob, pokud je sama instituce nezveřejnila a není
  důvod je ukazovat,
- interní krizové kontakty, interní komunikační kanály, přístupové údaje,
- neveřejná evakuační místa, neveřejné sklady, přesné zásoby,
- neveřejné kapacity a slabá místa kritické infrastruktury, technické
  detaily využitelné k útoku,
- citlivé osobní údaje; podezřelí a obvinění jen podle pravidel
  presumpce neviny (viz Podmínky),
- uživatelská hlášení, která by umožnila sledovat pohyb složek
  (CzechPatrol žádná hlášení s polohou nepřijímá),
- přesná poloha uživatele: osobní nastavení pracuje s krajem, ORP nebo
  obcí, nikdy s GPS.

## Granularita místa

U události stačí země a kraj (případně okres nebo obec, když ji uvádí
úřad sám). Souřadnice se do dat nezapisují. Kontrola dat (`npm run
kontrola:data`) je považuje za chybu, která zastaví nasazení.

## Strojová část

`nastroje/bezpecnost-obsahu.mjs` prohledá titulek, fakta, nejasnosti,
historii, praktický dopad a dopad na ČR u každého záznamu a návrhu:

| Nález | Výsledek |
|---|---|
| souřadnice GPS | chyba — nasazení se zastaví |
| přístupové údaje, interní kanály | chyba |
| pohyb, rozmístění nebo počty zasahujících | varování — posoudí člověk |
| kapacity a slabá místa infrastruktury | varování |

Síto neumí kontext. Úřední oznámení „armáda posiluje přechody“ projde:
neříká kolik, kde přesně, ani kdy. Věta „kolona vojenské techniky přes
Jihlavu v 6:00“ neprojde ani od úřadu — civilista ji nepotřebuje.

## Co platí pro externího ověřovatele

Zadání pro Patrola tahle pravidla obsahuje. Návrh, který je poruší,
zastaví kontrola dat před zveřejněním; důvod je v jejím výstupu.

## Professional účty (výhled)

Rozšířený analytický pohled pro složky a obce nikdy neznamená přístup
k citlivým operačním informacím. CzechPatrol taková data nemá vlastnit
vůbec — pak je nemůže ani vyzradit. Ověřování rolí: pracovní e-mail na
doméně státní správy, veřejně ověřitelná funkce, potvrzení organizace;
doklady totožnosti se do CzechPatrol nenahrávají (případně jen přes
externího poskytovatele ověření identity, který vrátí výsledek).
