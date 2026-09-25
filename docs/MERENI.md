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
