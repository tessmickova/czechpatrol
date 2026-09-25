# Měření návštěvnosti (od 25. 9. 2026)

Co: zobrazení stránek, kliknutí na odkazy a tlačítka, původ návštěvy, druh
zařízení, teplotní mapa kliknutí a pohybu myši. Pro správce na
`/sprava/navstevnost/`. Bez cookies, bez IP, bez identifikátoru; jen součty
po dnech. Do Not Track a Global Privacy Control = neposílá se nic.

| Kde | Co |
|---|---|
| `src/components/mereni.tsx` | prohlížeč: sbírá události, posílá dávkou (`sendBeacon`) na `POST /mereni`; ve správě a náhledu vypnuto |
| `api/src/mereni.ts` | příjem (očištění, limit 120 dávek za 10 min na otisk), součty do D1; souhrn `GET /sprava/mereni?dni=&cesta=` jen pro roli admin |
| `api/migrace/0008_mereni.sql` | tabulky `mereni_denni` (den × druh × cesta × klíč) a `mereni_teplo` (den × druh × cesta × zařízení × buňka 20 × 20) |
| `src/components/navstevnost-klient.tsx` | přehled: po dnech, stránky s prokliky, nejklikanější prvky, původ, zařízení, teplotní mapa přes rám stránky |
| `src/app/soukromi/page.tsx` | popis pro čtenáře |

Prvek se jmenuje podle `data-mereni`, jinak podle textu odkazu nebo tlačítka.
Chcete-li tlačítko sledovat pod stálým názvem, dejte mu `data-mereni="…"`.
Teplotní mapa je přibližná: svisle se měří výška celé stránky, ta se mění
s obsahem; rám pod mřížkou je jen pro orientaci.

## Analytika třetích stran (od 25. 9. 2026)

Microsoft Clarity (ID `ynyq48l9eb`) a PostHog běží **jen po souhlasu** v liště
`src/components/souhlas-analytika.tsx`; volba je v `localStorage` pod
`cp:analytika`, změna odkazem „Nastavení analytiky“ v patičce. Global Privacy
Control = odmítnuto. Ve správě a náhledu se nespouští.

- Clarity: vkládací kód z konzole Clarity, spouští se až po „Povolit“, se
  signálem `consentv2`.
- PostHog: knihovna `posthog-js`, zapne se, až bude v proměnných nasazení
  `NEXT_PUBLIC_POSTHOG_KEY` (a volitelně `NEXT_PUBLIC_POSTHOG_HOST`, výchozí
  EU `https://eu.i.posthog.com`). Průvodce `npx @posthog/wizard` se nepoužil:
  je interaktivní a vyžaduje přihlášení do účtu PostHog.
- Zásady soukromí (`/soukromi/#analytika`) obojí popisují; revize 25. 9. 2026.
