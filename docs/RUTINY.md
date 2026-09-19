# Denní rutiny

Rutiny běží v prostředí **bez přístupu k repozitáři**. `git clone` v nich
skončí na `could not read Username for 'https://github.com'` a nástroj na
připojení repozitáře k dispozici není.

Obcházet to nejde a nemá se. Přihlašovací údaje do textu úkolu nepatří —
rutinu si přečte kdokoli, kdo má přístup k účtu, a uložený token by tam
zůstal napořád.

Rutiny proto **nesmějí zkoušet klonovat ani zapisovat**. Pracují jen
s veřejnými adresami a jejich výsledkem je **zpráva pro člověka**, ne změna
v datech. Kdo data měnit má, je audit a externí ověřovatel — ti přístup mají.

## Co je pro ně připravené

| adresa | co v ní je |
|---|---|
| `https://czechpatrol.pages.dev/fronta.json` | zachycené zprávy čekající na ověření: titulek, země, datum, zdroj |
| `https://czechpatrol.pages.dev/stav.json` | co web tvrdí o situaci, kdy naposledy běžel sběr, z jakého commitu je |
| `https://czechpatrol.pages.dev/` | samotný web |

Návrhy záznamů mezi nimi nejsou. Čekají na lidské schválení a do té doby
nejsou tvrzením projektu — vystavit je veřejně by z rozdělané práce udělalo
zprávu.

---

## Rutina 1 — ranní kontrola provozu

Spouštět denně ráno.

```
Jsi kontrolor bezpečnostního přehledu CzechPatrol. Nemáš a nepotřebuješ
přístup k repozitáři; nic neklonuj a nic neměň.

Načti https://czechpatrol.pages.dev/stav.json a
https://czechpatrol.pages.dev/fronta.json.

Odpověz nejvýš deseti řádky a jen na tohle:

1. Kdy naposledy běžel sběr? Když je to víc než 12 hodin, napiš to jako
   první věc.
2. Kolik zpráv čeká ve frontě a jak stará je nejnovější z nich.
3. Tvrdí web něco, co si odporuje? Porovnej hodnocení situace s tím, co
   je ve frontě.

Nic nedomýšlej. Když je všechno v pořádku, napiš jednu větu, že je.
```

## Rutina 2 — druhý zdroj k zachyceným zprávám

Spouštět denně, nejlépe odpoledne.

```
Jsi rešeršista bezpečnostního přehledu CzechPatrol. Nemáš a nepotřebuješ
přístup k repozitáři; nic neklonuj a nic neměň.

Načti https://czechpatrol.pages.dev/fronta.json a vyber z pole „zachyceno"
pět nejnovějších položek, které se týkají Česka nebo sousedních zemí.

Ke každé zkus najít DRUHÝ NEZÁVISLÝ zdroj — jiné médium nebo úřední stránku,
ne přetisk téhož článku a ne agregátor.

U každé položky odpověz třemi řádky:
  id: <id z fronty>
  druhý zdroj: <odkaz>, nebo „nenalezen"
  datum události: <RRRR-MM-DD>, nebo „z textu neplyne"

Pravidla, která platí i tady:
- Datum události není datum článku. Když se z textu určit nedá, napiš to.
- Původce nepřipisuj nikomu, dokud to nepotvrdil úřední závěr.
- Nic si nevymýšlej. „Nenalezen" je správná odpověď; vymyšlený odkaz ne.
```

---

## Proč to nedělají rutiny celé

Rutina nemůže zapisovat, takže z její práce nikdy nevznikne záznam sama od
sebe. To není omezení, které by se mělo obejít — je to dělba práce:

- **rutina** čte veřejné adresy a hlásí, co vidí,
- **audit** (v GitHub Actions) posuzuje frontu a připravuje návrhy,
- **externí ověřovatel** dohledává druhé zdroje a opravuje návrhy,
- **člověk** ve Správě schvaluje.

Když rutina najde druhý zdroj, patří to do zadání pro ověřovatele
(Správa → Zadání pro externího ověřovatele), kde na to někdo navazuje.
