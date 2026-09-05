import { ROLE, type Role } from "./typy";

/** Pořadí rolí: čtenář < podporovatel < partner IZS < správce. */
export function maRoli(role: Role, potreba: Role): boolean {
  return ROLE.indexOf(role) >= ROLE.indexOf(potreba);
}

export function jeRole(x: unknown): x is Role {
  return typeof x === "string" && (ROLE as string[]).includes(x);
}

/**
 * Smí správce provést změnu role?
 * Nikdo si nemění vlastní roli; poslední správce nejde odebrat.
 */
export function smiZmenitRoli(kdo: string, komu: string, nova: Role, stara: Role, pocetSpravcu: number): string | null {
  if (kdo === komu) return "Vlastní roli si správce nemění.";
  if (stara === "admin" && nova !== "admin" && pocetSpravcu <= 1) return "Poslední správce nejde odebrat.";
  return null;
}
