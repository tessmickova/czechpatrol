/* Krátký výbuch konfet. Znovu se spustí změnou `klic`. */
const BARVY = ["var(--color-akcent)", "var(--color-jantar)", "var(--color-klid)", "#6aa7ff", "#f2848a"];

export function Konfety({ klic, pocet = 22 }: { klic: number | string; pocet?: number }) {
  return (
    <span key={klic} aria-hidden className="konfety">
      {Array.from({ length: pocet }, (_, i) => (
        <span
          key={i}
          className="konfeta"
          style={{
            left: `${(i * 53) % 100}%`,
            background: BARVY[i % BARVY.length],
            animationDelay: `${(i % 6) * 40}ms`,
            ["--dx" as string]: `${((i * 37) % 80) - 40}px`,
            ["--rot" as string]: `${(i * 67) % 360}deg`,
          }}
        />
      ))}
    </span>
  );
}
