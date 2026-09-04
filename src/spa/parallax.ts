/**
 * Parallax pro náhled.
 *
 * Ostrý web používá stejnou logiku jako obyčejný skript v layoutu — bez
 * Reactu a bez hydratace. Tady ji volá aplikace po každé změně cesty,
 * protože se mění i sada vrstev na stránce.
 */

let odpojit: (() => void) | null = null;

export function spustParallax() {
  odpojit?.();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const prvky = Array.from(document.querySelectorAll<HTMLElement>("[data-vrstva]"));
  if (!prvky.length) return;

  let ceka = 0;
  const uprav = () => {
    ceka = 0;
    const stred = innerHeight / 2;
    for (const el of prvky) {
      const r = el.getBoundingClientRect();
      const rychlost = Number(el.dataset.vrstva) || 0;
      const odchylka = r.top + r.height / 2 - stred;
      el.style.setProperty("--posun", `${(-odchylka * rychlost).toFixed(1)}px`);
    }
  };
  const naplanuj = () => {
    if (!ceka) ceka = requestAnimationFrame(uprav);
  };

  uprav();
  addEventListener("scroll", naplanuj, { passive: true });
  addEventListener("resize", naplanuj);
  odpojit = () => {
    removeEventListener("scroll", naplanuj);
    removeEventListener("resize", naplanuj);
    cancelAnimationFrame(ceka);
  };
}
