import { describe, expect, it } from "vitest";
import { uzavriPropadle } from "../sber/overujeme";

describe("uzavření ověřovaných po lhůtě", () => {
  const o = (uzavritDo: string, stav: "overujeme" | "potvrzeno" = "overujeme") =>
    ({ stav, uzavritDo, jakDopadlo: undefined as string | undefined });

  it("po lhůtě uzavře jako „nikdo nepotvrdil“ a zapíše, jak to dopadlo", () => {
    const { polozky, uzavreno } = uzavriPropadle([o("2026-09-30T16:00:00Z")], Date.parse("2026-10-01T00:00:00Z"));
    expect(uzavreno).toBe(1);
    expect(polozky[0].stav).toBe("nikdo-nepotvrdil");
    expect(polozky[0].jakDopadlo).toBeTruthy();
  });

  it("před lhůtou nic nemění", () => {
    expect(uzavriPropadle([o("2026-09-30T16:00:00Z")], Date.parse("2026-09-25T00:00:00Z")).uzavreno).toBe(0);
  });

  it("potvrzení ani vyvrácení automat nikdy nezapíše", () => {
    const { polozky } = uzavriPropadle([o("2026-09-01T00:00:00Z", "potvrzeno")], Date.parse("2026-10-01T00:00:00Z"));
    expect(polozky[0].stav).toBe("potvrzeno");
  });
});
