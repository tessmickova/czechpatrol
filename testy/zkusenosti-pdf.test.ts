// @ts-nocheck — skript je prostý ES modul bez typů.
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { NAZVY_TEMAT, OTISK, PDF, otiskDat, sestavHtml } from "../nastroje/zkusenosti-pdf.mjs";
import { TEMATA, zkusenosti } from "../src/lib/zkusenosti";

/*
  PDF k tisku se generuje ručně (nastroje/zkusenosti-pdf.mjs) a leží
  v repozitáři. Bez téhle pojistky by po úpravě útržků na webu zůstalo
  staré PDF — a papír v šuplíku je přesně to, co už nikdo neopraví.
*/
describe("PDF zkušeností", () => {
  it("odpovídá aktuálním datům (jinak: node nastroje/zkusenosti-pdf.mjs)", () => {
    expect(fs.existsSync(PDF)).toBe(true);
    expect(fs.readFileSync(PDF).subarray(0, 5).toString()).toBe("%PDF-");
    expect(fs.readFileSync(OTISK, "utf-8").trim()).toBe(otiskDat());
  });
  it("názvy témat se nerozešly s webem", () => {
    for (const [k, v] of Object.entries(TEMATA)) expect(NAZVY_TEMAT[k], k).toBe(v.nazev);
  });
  it("PDF obsahuje každý útržek", () => {
    const html = sestavHtml(JSON.parse(fs.readFileSync("data/zkusenosti.json", "utf-8")));
    for (const p of zkusenosti()) expect(html).toContain(p.nadpis.replace(/&/g, "&amp;").replace(/"/g, '"'));
  });
});
