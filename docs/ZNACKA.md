# Značka CzechPatrol

Vizuální systém webu podle brandbooku „CzechPatrol — značka a webové prvky, v2",
**tmavá varianta**. Hluboký inkoust, skleněné plochy, jedna červená jako jediný
akcent. Světlá varianta z brandbooku zůstává jako možnost do budoucna; přepnutí
je otázka hodnot v `@theme` a v `PASMA`, komponenty se nemění.

## Kde co je

| Co | Kde |
|---|---|
| barvy, zaoblení, plochy, sklo | `src/app/globals.css` (blok `@theme` a třídy `.sklo`, `.sklo-rozmaz`, `.noc`) |
| písma | `src/app/layout.tsx` — Archivo a IBM Plex Mono přes `next/font` |
| radarová značka a logo | `src/components/znacka.tsx` |
| barvy stupnice závažnosti | `src/lib/skala.ts`, konstanta `PASMA` |
| ikony aplikace | `public/ikona.svg` a odvozené PNG |

Názvy proměnných zůstaly z dřívějška (`papir`, `plocha`, `inkoust`, `tlum`),
aby se převlek udál na jednom místě a komponenty se nemusely přepisovat.
Význam je stejný, hodnoty jiné.

## Barvy

| Token | Hodnota | Kde |
|---|---|---|
| `akcent` — červená na tmavém | `#e8484f` | jediný akcent, značka, aktivní prvky, nejvyšší pásmo |
| `akcent-tmava` — Patrol Red | `#c1272d` | plná plocha značky na světlém, záře v rohu stránky |
| `akcent-svetla` | `#f2848a` | text v nejvyšším pásmu |
| `inkoust` | `#fffefb` | text |
| `tlum` | `#c9c6bd` | odstavce |
| `tlum2` | `#9d9a92` | popisky, metadata |
| `plocha` | `#1a1a17` | karty a plné plochy |
| `plocha2` | `#232320` | vnořené plochy |
| `papir` | `#0d0d0a` | podklad stránky, pod červenou a chladnou září v rozích |

Pásma závažnosti musí projít na tmavém podkladu, proto jsou svítivá: nízká
`#5cbf8a`, střední `#d9b24c`, zvýšená `#e08a3c`, vysoká `#e8763f`, vážná
`#e8484f`. Barva nikdy nenese informaci sama — vždy ji doprovází slovo.

## Písmo

Archivo nese nadpisy, tlačítka i běžný text. IBM Plex Mono nese popisky, čísla,
časy a navigaci. Obě stahuje `next/font` při sestavení a servírují se z naší
domény, takže návštěvník nechodí na server třetí strany.

## Plochy a zaoblení

- Sklo (`.sklo`): `rgb(255 255 255 / 0.06)`, rozostření 20 px, obrys
  `rgb(255 255 255 / 0.13)`, stín `0 16px 40px rgb(0 0 0 / 0.45)`. Jen jako
  deska, nikdy pod drobným textem; vnořená karta zůstává plná.
- Hlavička je skleněná pilulka nad obsahem, patička vyzdvižená deska.
- Spodní lišta na mobilu je plná, ne skleněná — text pod ní by prosvítal.
- Jediná plná plocha v hlavičce je tlačítko Podpořit: papír s inkoustovým
  textem, po najetí červená.
- Zaoblení: pilulky 999 px, hero 30 px, velké karty 26 px, střední 22 px,
  vnořené 16–18 px, řádky 12 px.

## Značka

Radarové stínítko: plný kruh v Patrol Red, čtyři soustředné kruhy, vodorovná
a svislá osa, paprsek vpravo nahoru a plný bod ve středu. Poměry jsou
z brandbooku (master 88 px) a komponenta kreslí do viewBoxu 88 × 88, takže
drží v každé velikosti. Detail ubývá: pod 64 px tři kruhy, pod 40 px dva,
pod 28 px jeden a bez os; minimum je 20 px. Kresba se nikdy nepřebarvuje.

Na tmavé ploše má značka plochu `#e8484f` a kresbu inkoustovou — komponenta
to řeší přepínačem `tmave`, který web používá v hlavičce i v patičce.

Wordmark: **Czech** inkoustově, **Patrol** červeně, bez mezery, nikdy nelomit
na dva řádky.

## Ikony aplikace

`public/ikona.svg` je zdroj a používá plnou Patrol Red se světlou kresbou —
ikona sedí na světlém i tmavém pozadí systému. PNG (192, 512, maskovaná 512,
apple-touch 180) se z něj vykreslí v prohlížeči; maskovaná má kresbu na 68 %, aby systému
zbylo místo na výřez.
