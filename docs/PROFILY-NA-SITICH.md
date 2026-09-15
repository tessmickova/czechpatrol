# Sledování profilů na sociálních sítích

## Proč

Ministr, armáda nebo zpravodajská služba dnes často řeknou věc nejdřív na svém
profilu a teprve potom v tiskové zprávě. Kdo profily nesleduje, dozví se to
o hodiny později.

## Co příspěvek na síti JE a co NENÍ

**Je** signál — zakládá kandidáta ke kontrole člověkem.

**Není** doklad. Nikdy sám nevytvoří záznam, nezvýší závažnost ani připsání
odpovědnosti a nikdy nedokládá, že se něco NEstalo. Hlídá to kontrola dat:
záznam, pod kterým nestojí nic než sítě, nesmí mít vysokou jistotu ani úřední
atribuci.

**Snímek obrazovky není zdroj vůbec.** Nedá se z něj ověřit ani to, že
příspěvek existuje, ani že účet patří tomu, kdo je na něm podepsaný. Přesně
takhle vypadají podvrhy, které vedeme v sekci Manipulace.

## Co jde číst a co ne

| Síť | Jak | Dostupné |
|---|---|---|
| Mastodon | veřejné RSS účtu `…/@ucet.rss` | ano, bez přihlášení |
| Bluesky | `public.api.bsky.app` | ano, bez přihlášení |
| Telegram | veřejný náhled kanálu `t.me/s/<kanal>` | ano, bez přihlášení |
| Facebook | — | **ne**, veřejné čtení bez tokenu aplikace neumožňuje |
| X / Twitter | — | **ne**, bez placeného přístupu |

Facebook a X nepředstíráme, že sledujeme. Co je odtud potřeba, musí přinést
člověk — a i pak platí, že příspěvek je signál, ne doklad.

## Jak se profil přidává

1. Najdi na **oficiálním webu instituce** odkaz na její profil. Modrý odznak
   na síti není doklad pravosti — koupí si ho kdokoli.
2. Adresu toho webu zapiš do `pravostDolozena` v `sber/socialni.ts`.
3. Přidej záznam s `overenaAdresa: false`.
4. Spusť `npm run sber:zdroje`. Ověří, že adresa opravdu odpovídá, a teprve
   pak se příznak přepne na `true`.

Profil bez obou příznaků se nečte. Je to schválně: sledovat cizí účet a jeho
příspěvky připisovat instituci je horší než nesledovat nic.

## Kdo by tam měl být

Role, ne jména — konkrétní účty se doplňují podle kroku výš:

- ministerstvo zahraničí, vnitra a obrany,
- Armáda ČR a generální štáb,
- NÚKIB, BIS,
- HZS a Policie ČR,
- NATO a Evropská komise,
- obdobné úřady sousedních států a pobaltských zemí.
