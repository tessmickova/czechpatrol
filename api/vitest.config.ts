import { defineConfig } from "vitest/config";

// Vlastní konfigurace: bez ní by vitest našel tu z kořene repozitáře
// a hledal balíčky webu, které v api/ nejsou.
export default defineConfig({
  test: {
    include: ["testy/**/*.test.ts"],
    environment: "node",
  },
});
