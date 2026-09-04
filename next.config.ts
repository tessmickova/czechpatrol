import type { NextConfig } from "next";

// Statický export: web se sestaví do out/ a nasazuje se jako statické soubory.
// Data jsou v repozitáři jako JSON, hodinový sběr je commitne a build proběhne znovu.
// Díky tomu je historie dat totožná s historií gitu — každá změna je dohledatelná.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default config;
