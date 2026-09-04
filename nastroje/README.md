# Pomocné skripty

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
