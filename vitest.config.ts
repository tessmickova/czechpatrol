import { defineConfig } from "vitest/config";

export default defineConfig({
  /*
    `import.meta.dirname` místo `__dirname`: Vite chystá nativní načítání
    konfigurace, které `__dirname` nezná, a varuje na to při každém běhu.
  */
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: { include: ["testy/**/*.test.ts"], environment: "node" },
});
