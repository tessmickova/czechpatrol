# Pravidla práce na tomhle repozitáři

## Pravidlo č. 0 — ověř, že zadání patří sem

**Tenhle repozitář je jen bezpečnostní přehled „Kontext“.** Když se zadání týká
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

## Konvence

- Kód, komentáře i názvy proměnných **česky**. Komentář vysvětluje *proč*, ne *co*.
- Závažnost a jistota jsou dvě nezávislé osy. Nikdy je neslučuj.
- Datum vždy absolutní, nikdy „před 2 hodinami“.
- Datum události ≠ datum zjištění. Obojí se zobrazuje zvlášť.
- Jedna událost = jeden signál, i když o ní vyjde deset článků.
- Žádná pravděpodobnost v procentech.
- Web nedává doporučení „odjet / neodjet“ ani finanční rady.

Kontrola: `npm run typecheck`. Sestavení: `npm run build`.
