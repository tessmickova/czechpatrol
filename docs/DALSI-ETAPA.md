# Další etapa — co dodat a v jakém pořadí

## Hned (týden)

0. Doména `czechpatrol.cz`: tokenu Cloudflare přidat práva pro zónu (DNS Edit, Zone Settings Edit, Dynamic Redirect Edit), spustit workflow Doména, a až doména odpovídá, sloučit větev `claude/domena-czechpatrol-cz` a přepsat adresy v rutinách (`docs/PROVOZ.md`, část Doména).
1. Doplnit práva tokenu Cloudflare (D1 Edit, Workers Scripts Edit) a nasadit API; pak nastavit `API_URL`.
2. Vyplnit `PROVOZOVATEL`, `TIPY_MAIL`. Bez provozovatele nejde spustit účty (GDPR správce).
3. Ověřit `data/nato.json` položku `vychodni-kridlo` proti zdroji.
4. Projít snímky 360/390 ručně na skutečném telefonu (v sandboxu jen Chromium).

## Brzy (měsíc)

- Filtrovaný RSS podle země a tématu (dnes jen jeden kanál).
- Test uživatelského toku v prohlížeči (Playwright) pro filtry v adrese a postranní detail — dnes je to jen ruční kontrola ve `nastroje/snimky.mjs`.
- Kontrast: automatická kontrola WCAG 2.2 AA (axe) v CI; ručně ověřeny hlavní kombinace tokenů, ne všechny.
- Stránka `/zdroje/` doplnit filtr podle typu zdroje.

## Později

- Plus (79 Kč / 790 Kč) jen po ověření zájmu — nejdřív dobrovolná podpora a měření `support_complete`.
- Pilot pro organizace.
- Kanály Telegram/WhatsApp jen po spuštění API a schválení šablon (WhatsApp vyžaduje schválenou šablonu).

## Co se v této etapě záměrně neudělalo

- Reference WPJ, Shoptet Apollo, juicygo.cz a outbid.fi nešlo v prostředí otevřít (proxy je blokuje) — design vychází z brief tokenů a obecných zásad, ne z jejich analýzy.
- Žádné produkční nasazení, žádná platba, žádné rozeslání zpráv.
