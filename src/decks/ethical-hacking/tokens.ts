/**
 * "Blueprint" visual system tokens for the ethical-hacking deck.
 * Only locally installed fonts (Bahnschrift, Cascadia Mono) so PowerPoint renders them natively.
 */
export const palette = {
  bg: "#0A1A2B",
  surface: "#0F2439",
  line: "#3D6E96",
  grid: "rgba(124, 196, 255, 0.055)",
  gridMajor: "rgba(124, 196, 255, 0.10)",
  cyan: "#7CC4FF",
  text: "#EAF2FA",
  muted: "#A3B8CC",
  amber: "#FFB547",
  red: "#FF6B5E",
} as const;

export const deckTitle = "The Anatomy of an Ethical Hack";
export const totalSlides = 3;

/** Type roles (px on the 1920×1080 canvas; PowerPoint pt = px ÷ 2). */
export const type = {
  eyebrow: "font-(family-name:--eh-mono) text-[24px] leading-[1.25] tracking-[0.14em] uppercase text-(--eh-cyan)",
  label: "font-(family-name:--eh-mono) text-[24px] leading-[1.25] tracking-[0.08em] uppercase",
  title: "text-[64px] leading-[1.08] font-semibold tracking-[-0.01em] text-balance text-(--eh-text)",
  term: "text-[40px] leading-[1.1] font-semibold text-(--eh-text)",
  name: "text-[32px] leading-[1.15] font-semibold text-(--eh-text)",
  body: "text-[28px] leading-[1.35] text-(--eh-muted)",
} as const;
