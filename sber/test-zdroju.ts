import { stahni } from "./nacti";
import { ZDROJE } from "./zdroje";

/**
 * Ověří, že adresy v registru skutečně odpovídají.
 * Spouštět po každém přidání zdroje: `npm run sber:zdroje`
 */
async function main() {
  let chyb = 0;
  for (const z of ZDROJE) {
    try {
      const { stav, telo } = await stahni(z.url, 1);
      const ok = stav < 400 && telo.length > 200;
      if (!ok) chyb++;
      console.log(
        `${ok ? "OK  " : "CHYB"}  ${String(stav).padEnd(4)}  ${String(telo.length).padStart(7)} B  ${z.klic.padEnd(16)} ${z.url}`,
      );
    } catch (e) {
      chyb++;
      console.log(`CHYB  ---   ${"".padStart(7)}    ${z.klic.padEnd(16)} ${z.url}  (${e instanceof Error ? e.message : e})`);
    }
  }
  console.log(`\nZdrojů ${ZDROJE.length}, nedostupných ${chyb}.`);
  console.log("U funkčních adres přepněte v sber/zdroje.ts příznak overenaAdresa na true.");
  if (chyb === ZDROJE.length) process.exit(1);
}

main();
