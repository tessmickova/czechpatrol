import { describe, expect, it } from "vitest";
import { normalizujZajmy, platnyEmail, ZAJMY } from "../src/zajem";

/*
  Jediný osobní údaj v celém formuláři je e-mail. Kontrola má pustit
  běžné adresy a zastavit zjevný odpad — ne suplovat doručení, to ověří
  až první odeslaná zpráva.
*/
describe("zájem o e-mail", () => {
  it("pustí běžné adresy", () => {
    expect(platnyEmail("jana@example.cz")).toBe(true);
    expect(platnyEmail("j.novak+patrol@obec.example")).toBe(true);
  });

  it("zastaví prázdné, bez zavináče, s mezerou a přehnaně dlouhé", () => {
    expect(platnyEmail("")).toBe(false);
    expect(platnyEmail("jana.example.cz")).toBe(false);
    expect(platnyEmail("jana @example.cz")).toBe(false);
    expect(platnyEmail(`${"a".repeat(200)}@example.cz`)).toBe(false);
  });

  it("zájmy bere jen ze seznamu, bez duplicit, v pevném pořadí", () => {
    expect(normalizujZajmy(["pomoc", "souhrn", "souhrn", "reklama"])).toEqual(["souhrn", "pomoc"]);
    expect(normalizujZajmy("souhrn")).toEqual([]);
    expect(normalizujZajmy(undefined)).toEqual([]);
    expect(normalizujZajmy([...ZAJMY])).toEqual([...ZAJMY]);
  });
});
