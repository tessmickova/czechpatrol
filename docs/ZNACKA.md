# Značka CzechPatrol

Vizuální systém webu podle brandbooku „CzechPatrol — značka a webové prvky, v2".
Světlý papír, skleněné plochy, jedna červená jako jediný akcent.

## Kde co je

| Co | Kde |
|---|---|
| barvy, zaoblení, plochy, sklo | `src/app/globals.css` (blok `@theme` a třídy `.sklo`, `.sklo-rozmaz`, `.noc`) |
| písma | `src/app/layout.tsx` — Archivo a IBM Plex Mono přes `next/font` |
| radarová značka a logo | `src/components/znacka.tsx` |
| barvy stupnice závažnosti | `src/lib/skala.ts`, konstanta `PASMA` |
| ikony aplikace | `public/ikona.svg` a odvozené PNG |

Názvy proměnných zůstaly z dřívější tmavé verze (`papir`, `plocha`, `inkoust`,
`tlum`), aby se převlek udál na jednom místě a komponenty se nemusely přepisovat.
Význam je stejný, hodnoty jiné.

## Barvy

| Token | Hodnota | Kde |
|---|---|---|
| `akcent` — Patrol Red | `#c1272d` | jediný akcent, značka, primární tlačítko, nejvyšší pásmo |
| `akcent-tmava` | `#8e1b20` | najetí myší na primární tlačítko |
| `akcent-svetla` | `#e8484f` | akcent na tmavé ploše |
| `inkoust` | `#14140f` | text a tmavé desky |
| `tlum` | `#3d3b35` | odstavce |
| `tlum2` | `#6f6c64` | popisky, metadata |
| `plocha` | `#fffefb` | karty |
| `plocha2` | `#f4f3f1` | vnořené plochy |
| `papir` | `#eeecea` | podklad stránky, pod dvěma měkkými zářemi v rozích |

Pásma závažnosti musí projít na světlém papíru, proto jsou tmavší než dřív:
nízká `#2e7d53`, střední `#b8860b`, zvýšená `#c96a1e`, vysoká `#d1521f`,
vážná `#c1272d`. Barva nikdy nenese informaci sama — vždy ji doprovází slovo.

## Písmo

Archivo nese nadpisy, tlačítka i běžný text. IBM Plex Mono nese popisky, čísla,
časy a navigaci. Obě stahuje `next/font` při sestavení a servírují se z naší
domény, takže návštěvník nechodí na server třetí strany.

## Plochy a zaoblení

- Sklo (`.sklo`): `rgb(255 254 251 / 0.72)`, rozostření 20 px, bílý obrys,
  stín `0 16px 40px rgb(20 20 15 / 0.08)`. Jen jako deska, nikdy pod drobným
  textem; vnořená karta zůstává plná.
- Hlavička je skleněná pilulka nad obsahem, patička tmavá deska.
- Spodní lišta na mobilu je plná, ne skleněná — text pod ní by prosvítal.
- Zaoblení: pilulky 999 px, hero 30 px, velké karty 26 px, střední 22 px,
  vnořené 16–18 px, řádky 12 px.

## Značka

Radarové stínítko: plný kruh v Patrol Red, čtyři soustředné kruhy, vodorovná
a svislá osa, paprsek vpravo nahoru a plný bod ve středu. Poměry jsou
z brandbooku (master 88 px) a komponenta kreslí do viewBoxu 88 × 88, takže
drží v každé velikosti. Detail ubývá: pod 64 px tři kruhy, pod 40 px dva,
pod 28 px jeden a bez os; minimum je 20 px. Kresba se nikdy nepřebarvuje.

Na tmavé ploše má značka plochu `#e8484f` a kresbu inkoustovou — komponenta
to řeší přepínačem `tmave`.

Wordmark: **Czech** inkoustově, **Patrol** červeně, bez mezery, nikdy nelomit
na dva řádky.

## Ikony aplikace

`public/ikona.svg` je zdroj. PNG (192, 512, maskovaná 512, apple-touch 180)
se z něj vykreslí v prohlížeči; maskovaná má kresbu na 68 %, aby systému
zbylo místo na výřez.
