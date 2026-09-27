import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error — .mjs nástroj bez typů
import { pozastaveno } from "../nastroje/rozhlas.mjs";

describe("pozastavení Telegram kanálu (27. 9. 2026)", () => {
  const soubor = (obsah: string) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pauza-")), "p.json"); fs.writeFileSync(f, obsah); return f; };
  it("pozastaveno: true zastaví", () => expect(pozastaveno(soubor('{"pozastaveno":true,"od":"2026-09-27"}'))?.od).toBe("2026-09-27"));
  it("pozastaveno: false nebo chybějící soubor pustí", () => {
    expect(pozastaveno(soubor('{"pozastaveno":false}'))).toBeNull();
    expect(pozastaveno("/neexistuje/p.json")).toBeNull();
  });
});
