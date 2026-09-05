/**
 * Značky kanálů. Zjednodušené tvary v barvách značek — poznatelné na první
 * pohled, bez načítání cizích obrázků.
 */
export type Znacka = "rss" | "telegram" | "whatsapp" | "signal" | "bluesky" | "email";

const BARVY: Record<Znacka, string> = {
  rss: "#f5a623",
  telegram: "#26a5e4",
  whatsapp: "#25d366",
  signal: "#3a76f0",
  bluesky: "#0085ff",
  email: "#8ff4ff",
};

export function ZnackaKanalu({ znacka, velikost = 28, tlumena = false }: { znacka: Znacka; velikost?: number; tlumena?: boolean }) {
  const b = tlumena ? "#64789a" : BARVY[znacka];
  const spolecne = { width: velikost, height: velikost, viewBox: "0 0 24 24", "aria-hidden": true as const };
  switch (znacka) {
    case "telegram":
      return (
        <svg {...spolecne}>
          <circle cx="12" cy="12" r="11" fill={b} />
          <path d="M6.2 11.6l10.4-4c.5-.2.9.1.8.8l-1.8 8.4c-.1.6-.5.7-1 .4l-2.8-2-1.3 1.3c-.2.2-.3.3-.6.3l.2-2.8 5-4.5c.2-.2 0-.3-.3-.1l-6.2 3.9-2.7-.8c-.6-.2-.6-.6.3-.9z" fill="#fff" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...spolecne}>
          <path d="M12 1.8a10.2 10.2 0 0 0-8.7 15.5L2 22l4.9-1.3A10.2 10.2 0 1 0 12 1.8z" fill={b} />
          <path d="M8.6 7.4c-.3-.6-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.4-1.2 1.2-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5 2.9 1.1 3.5.9 4.1.8.6-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.7-.4l-2.4-1.1c-.3-.1-.6-.2-.8.2-.2.3-.9 1.1-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.5-.6-2.9-1.8-1.1-1-1.8-2.1-2-2.5-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.4-.6.1-.2.1-.4 0-.6l-1-2.6z" fill="#fff" />
        </svg>
      );
    case "signal":
      return (
        <svg {...spolecne}>
          <circle cx="12" cy="12" r="10.5" fill="none" stroke={b} strokeWidth="2" strokeDasharray="4 2.2" />
          <circle cx="12" cy="12" r="6.5" fill={b} />
        </svg>
      );
    case "bluesky":
      return (
        <svg {...spolecne}>
          <path d="M12 10.7c-.9-1.8-3.4-5.2-5.7-6.9C4.1 2.2 3.2 2.5 2.6 2.8 1.9 3.1 1.8 4.2 1.8 4.9c0 .7.4 5.5.6 6.3.8 2.7 3.6 3.6 6.2 3.3-3.8.6-7.1 1.9-2.7 6.7 4.8 4.9 6.6-1.1 7.5-4.1.9 3 2 8.8 7.4 4.1 4.1-4.1 1.1-6.1-2.7-6.7 2.6.3 5.4-.6 6.2-3.3.2-.8.6-5.6.6-6.3 0-.7-.1-1.8-.8-2.1-.6-.3-1.5-.6-3.7 1-2.3 1.7-4.8 5.1-5.7 6.9z" fill={b} />
        </svg>
      );
    case "email":
      return (
        <svg {...spolecne} fill="none" stroke={b} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="M3.5 7l8.5 6 8.5-6" />
        </svg>
      );
    default:
      return (
        <svg {...spolecne} fill="none" stroke={b} strokeWidth="2.2" strokeLinecap="round">
          <path d="M5 19.5h.01 M5 12.5a7 7 0 0 1 7 7 M5 5.5a14 14 0 0 1 14 14" />
        </svg>
      );
  }
}
