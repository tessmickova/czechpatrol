# Pomocné skripty

Slouží k pořízení náhledů webu. Nejsou součástí buildu ani závislostí projektu.

```bash
npm i -D playwright                 # jednorázově, jen pro tyhle skripty
npm run build && npx serve out -l 4322

node nastroje/nahled.mjs / rez      # homepage po obrazovkách
node nastroje/strany.mjs            # vybrané podstránky
node nastroje/graf.mjs              # graf souvislostí
```

Snímky se ukládají do `/tmp/snap/`. Cestu k prohlížeči si skripty berou
z `/opt/pw-browsers`; na jiném stroji ji upravte v hlavičce skriptu.
