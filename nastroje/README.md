# Pomocné skripty

## Správa z terminálu

```bash
npm run spravce              co čeká na rozhodnutí
npm run spravce fronta       všechno zachycené, naléhavé nahoře
npm run spravce navrhy       hotové záznamy čekající na schválení
npm run spravce schval <id>  schválit návrh a zveřejnit ho
npm run spravce prijmi <id>  kostra záznamu z kandidáta
npm run spravce tip [soubor] tipy k přípravě
npm run spravce vystraha …   vyhlásit nebo sundat mimořádnou výstrahu
npm run spravce nahled       co by teď odešlo do kanálu (neodešle nic)
```

Běží na tvém počítači proti souborům v repozitáři; nepotřebuje účet ani síť
a nikdo ho nemůže odstavit.

### Fronta návrhů

Mezičlánek mezi zachyceným titulkem a zveřejněným záznamem. Kandidát ze sběru
je holý odkaz; zveřejněný záznam musí mít fakta, zdroje a lidské ověření —
zveřejnění bez něj zablokují testy i `kontrola:data`, a to je správně. Návrh
je hotový text, který čeká jen na to, aby se na něj někdo podíval.

Stojí v `data/navrhy.json`. Na web se nedostane a do počtů nevstupuje.
Pole `kam` říká, kam po schválení půjde:

| `kam` | cíl | k čemu |
|---|---|---|
| `zaznam` | `data/incidenty.json` | doložená událost nebo úřední krok |
| `overujeme` | `data/overujeme.json` | tvrzení, které se teprve ověřuje |

U `overujeme` se týdenní lhůta počítá od schválení, ne od přípravy — ten
týden má běžet od chvíle, kdy se zpráva objeví na webu.

## Klikací náhled

```bash
npm run nahled          # out/ + nahled.html
```

Skript `nahled-artefakt.mjs` sestaví přes esbuild samostatnou Reactovou
aplikaci ze stejných komponent jako web a vloží ji i se styly do jediného
HTML. Styly přebírá z posledního `next build`, aby náhled používal přesně
tu CSS, kterou generuje ostrý web.

Náhrady za `next/link` a `next/navigation` jsou v `src/spa/`; směruje se
fragmentem adresy, takže náhled nepotřebuje server.

## Snímky obrazovky

Vyžadují Playwright, který není závislostí projektu:

```bash
npm i --no-save playwright
npx serve out -l 4350

node nastroje/rezy.mjs / rez     # web po obrazovkách
node nastroje/strany.mjs         # vybrané podstránky
node nastroje/graf.mjs           # graf souvislostí
node nastroje/test-nahledu.mjs   # ověří, že v náhledu fungují filtry a směrování
```

Snímky se ukládají do `/tmp/snap/`. Cestu k prohlížeči si skripty berou
z `/opt/pw-browsers`; na jiném stroji ji upravte v hlavičce skriptu.

## Doména

```bash
node nastroje/domena.mjs --sucho   # co by se na Cloudflare nastavilo
node nastroje/domena.mjs           # nastaví a zapíše data/fronta/domena.json
```

Potřebuje `CLOUDFLARE_API_TOKEN` a `CLOUDFLARE_ACCOUNT_ID`; ty jsou jen
v GitHub secrets, proto se skript spouští přes workflow **Doména**
(Actions → Doména → Run workflow). Co dělá a co nikdy nedělá, je v jeho
hlavičce; postup přechodu z `czechpatrol.pages.dev` na `czechpatrol.cz`
je v `docs/PROVOZ.md`, část Doména.
