import { describe, expect, it } from "vitest";
import { povoleno, smiStahnout } from "../sber/robots";

describe("robots.txt (RFC 9309)", () => {
  const r = `
User-agent: *
Disallow: /search
Allow: /search/about
Disallow: /*.pdf$

User-agent: bezpecnostni-prehled
User-agent: jinybot
Disallow: /interni/
`;
  it("platí skupina pro našeho agenta, ne obecná", () => {
    expect(povoleno(r, "/search?q=x")).toBe(true);
    expect(povoleno(r, "/interni/a")).toBe(false);
  });
  it("obecná skupina, nejdelší pravidlo, Allow vyhrává, * a $", () => {
    const o = "User-agent: *\nDisallow: /search\nAllow: /search/about\nDisallow: /*.pdf$\n";
    expect(povoleno(o, "/search?q=x")).toBe(false);
    expect(povoleno(o, "/search/about")).toBe(true);
    expect(povoleno(o, "/a/b.pdf")).toBe(false);
    expect(povoleno(o, "/a/b.pdf?x")).toBe(true);
    expect(povoleno("", "/cokoli")).toBe(true);
  });
  it("4xx u robots.txt = bez omezení, 5xx a výpadek = nestahovat", async () => {
    expect((await smiStahnout("https://a.example/x", async () => ({ stav: 404, telo: "" }))).smi).toBe(true);
    expect((await smiStahnout("https://b.example/x", async () => ({ stav: 503, telo: "" }))).smi).toBe(false);
    expect((await smiStahnout("https://c.example/x", async () => { throw new Error("síť"); })).smi).toBe(false);
  });
});
