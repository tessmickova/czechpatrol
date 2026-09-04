import { useSyncExternalStore } from "react";
import { cesta, jdi, sleduj } from "./cesta";

/** Náhrada za next/navigation. V náhledu čte cestu z fragmentu adresy. */
export function usePathname(): string {
  return useSyncExternalStore(sleduj, cesta, () => "/");
}

export function useRouter() {
  return {
    push: jdi,
    replace: jdi,
    back: () => history.back(),
    forward: () => history.forward(),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function notFound(): never {
  throw new Error("Stránka nenalezena");
}
