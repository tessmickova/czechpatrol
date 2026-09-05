# Pravidla práce na tomhle repozitáři

## Pravidlo č. 0 — ověř, že zadání patří sem

**Tenhle repozitář je jen bezpečnostní přehled CzechPatrol.** Když se zadání týká
jiného webu, jiné domény nebo jiného projektu, zeptej se, jestli to nemá být
řešeno jinde, a teprve po potvrzení pokračuj.

## Pravidlo č. 1 — nevymýšlet

Nikdy nevymýšlej události, čísla, citace ani zdroje. Chybějící údaj je otevřená
otázka, ne prostor pro odhad. `null` je platná hodnota a UI ji umí zobrazit
jako „zatím neověřeno“.

Zástupné texty se nenahrazují smyšlenými údaji. Ukázková data patří výhradně do
`data/ukazka/` a musí být viditelně označená.

## Pravidlo č. 2 — automat smí potvrdit jen zápor

Sběrač nikdy nic nezveřejňuje. Když najde signál, hodnotu **nemění** — založí
položku do `data/fronta/` ke kontrole. Tohle pravidlo se nesmí obejít ani
„jen dočasně“: je to jediná pojistka proti tomu, aby web vyhlásil něco, co se
nestalo.

Když se relevantní zdroj nepodaří stáhnout, zápor se nepotvrzuje a datum
ověření se nezapisuje.

## Pravidlo č. 3 — zdrojový kód patří na GitHub

Každá dokončená změna se commitne a hned nahraje.

```bash
git add -A
git commit -m "co se změnilo a proč"
git push -u origin main   # při selhání sítě opakovat: 2 s, 4 s, 8 s, 16 s
```

## Pravidlo č. 4 — redakční zásady jsou součást produktu

Nepoužívej titulky typu „Válka je za dveřmi“ nebo „Mobilizace přichází“.
Budoucí scénář se nikdy nepíše jako jistota. Ke každému zhoršujícímu údaji
patří i to, co se nestalo — jinak si čtenář vyvodí větší hrozbu, než data
ukazují.

Upozornění „AI-assisted / pracovní verze“ **není omluvenka** pro nepodložené
tvrzení.

## Pravidlo č. 5 — archiv nesmí mystifikovat

Snímek se zapisuje jen při změně. Nikdy nehlas změnu, kterou čtenář nemůže
vidět („Střední → Střední“) — popiš, co se opravdu stalo. Období, které archiv
nepokrývá, se nedopočítává; napíše se, že ho nemáme.

Odběrový kanál, který nikam nevede, se neukazuje jako dostupný.

## Pravidlo č. 6 — rozhraní je pro čtenáře, ne pro nás

Do UI nepatří poznámky o tom, proč jsme něco udělali. Disclaimer je jeden,
v patičce. Popisky pod grafy vysvětlují značku na obrazovce (co znamená
„≥ N“), ne naši filozofii.

Piš jako copywriter: nadpis, jedna věta, konec. Ne odstavce.

## Pravidlo č. 7 — účty vědí co nejméně a role dává jen člověk

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
