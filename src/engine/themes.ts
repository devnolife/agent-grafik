/**
 * Slide themes: colours, type and the art direction handed to the image model.
 * Shared by the renderer and the agent, so it stays free of React/DOM imports.
 *
 * Fonts are limited to families whose metrics match on Linux, Windows and PowerPoint
 * (Arial = Liberation Sans), so the exported PPTX keeps the browser's line breaks.
 */
import type { ThemeId } from "./spec.ts";

export interface Theme {
  id: ThemeId;
  name: string;
  mode: "dark" | "light";
  bg: string;
  /** Card fill; translucent on dark themes so it stays a native PowerPoint shape. */
  card: string;
  cardLine: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  /** Text colour on top of a solid accent fill. */
  onAccent: string;
  /** Accent washes for icon tiles and highlights. */
  tint: string;
  tintLine: string;
  tint2: string;
  tintLine2: string;
  glowA: string;
  glowB: string;
  fontFamily: string;
  /** Style sentence appended to every image prompt of the deck. */
  art: string;
}

const FONT = 'Arial, "Liberation Sans", Helvetica, sans-serif';

export const THEMES: Record<ThemeId, Theme> = {
  aurora: {
    id: "aurora",
    name: "Aurora",
    mode: "dark",
    bg: "#0B1020",
    card: "rgba(255, 255, 255, 0.06)",
    cardLine: "rgba(255, 255, 255, 0.14)",
    text: "#F4F6FF",
    muted: "#AAB4D4",
    accent: "#8EA8FF",
    accent2: "#3EE6C8",
    onAccent: "#0B1020",
    tint: "rgba(142, 168, 255, 0.16)",
    tintLine: "rgba(142, 168, 255, 0.42)",
    tint2: "rgba(62, 230, 200, 0.16)",
    tintLine2: "rgba(62, 230, 200, 0.42)",
    glowA: "rgba(99, 102, 241, 0.34)",
    glowB: "rgba(34, 211, 238, 0.20)",
    fontFamily: FONT,
    art: "cinematic dark-mode 3D illustration, deep midnight blue background, glowing periwinkle and mint-cyan accents, soft volumetric light, glassy translucent materials",
  },
  paper: {
    id: "paper",
    name: "Paper",
    mode: "light",
    bg: "#F7F4EE",
    card: "#FFFFFF",
    cardLine: "rgba(21, 23, 31, 0.12)",
    text: "#15171F",
    muted: "#5A5F70",
    accent: "#C2410C",
    accent2: "#1D4ED8",
    onAccent: "#FFFFFF",
    tint: "rgba(194, 65, 12, 0.10)",
    tintLine: "rgba(194, 65, 12, 0.34)",
    tint2: "rgba(29, 78, 216, 0.10)",
    tintLine2: "rgba(29, 78, 216, 0.34)",
    glowA: "rgba(251, 146, 60, 0.20)",
    glowB: "rgba(96, 165, 250, 0.18)",
    fontFamily: FONT,
    art: "refined editorial flat illustration filling the entire canvas, warm cream and sand tones, bold vermilion and cobalt blue accents, clean geometric shapes",
  },
  forest: {
    id: "forest",
    name: "Forest",
    mode: "dark",
    bg: "#06130E",
    card: "rgba(255, 255, 255, 0.06)",
    cardLine: "rgba(255, 255, 255, 0.14)",
    text: "#EDF9F1",
    muted: "#9DBCAB",
    accent: "#4ADE9A",
    accent2: "#F2D14B",
    onAccent: "#06130E",
    tint: "rgba(74, 222, 154, 0.15)",
    tintLine: "rgba(74, 222, 154, 0.40)",
    tint2: "rgba(242, 209, 75, 0.15)",
    tintLine2: "rgba(242, 209, 75, 0.42)",
    glowA: "rgba(16, 185, 129, 0.30)",
    glowB: "rgba(250, 204, 21, 0.14)",
    fontFamily: FONT,
    art: "dark emerald 3D render, deep forest green background, glowing mint green and soft golden highlights, smooth organic minimal forms, soft studio light",
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    mode: "dark",
    bg: "#150A16",
    card: "rgba(255, 255, 255, 0.06)",
    cardLine: "rgba(255, 255, 255, 0.14)",
    text: "#FFF1EA",
    muted: "#CDAAB3",
    accent: "#FF9166",
    accent2: "#FF5C9A",
    onAccent: "#150A16",
    tint: "rgba(255, 145, 102, 0.16)",
    tintLine: "rgba(255, 145, 102, 0.42)",
    tint2: "rgba(255, 92, 154, 0.16)",
    tintLine2: "rgba(255, 92, 154, 0.42)",
    glowA: "rgba(244, 114, 82, 0.28)",
    glowB: "rgba(217, 70, 160, 0.22)",
    fontFamily: FONT,
    art: "cinematic dark plum background, warm coral orange and magenta glow, soft gradient lighting, smooth glossy 3D forms",
  },
};

export const getTheme = (id: string | undefined): Theme => THEMES[(id ?? "aurora") as ThemeId] ?? THEMES.aurora;

/** Closing clause for every image prompt: keeps the model from inventing text or UI. */
export const IMAGE_GUARD =
  "full-bleed edge-to-edge composition without border, frame or margins, generous negative space, single clear focal subject, " +
  "no text, no letters, no numbers, no logos, no watermark, no screens, no user interface, no signage";

export function imagePrompt(subject: string, theme: Theme): string {
  return `${subject.trim().replace(/[.\s]+$/, "")}. ${theme.art}, ${IMAGE_GUARD}`;
}

export type IconStyle = "solid" | "outline";

/** Prompt for a single flat pictogram that is later traced into a one-colour SVG. */
export function iconPrompt(concept: string, style: IconStyle = "solid"): string {
  const look =
    style === "outline"
      ? "Black line icon drawn with bold uniform outline strokes and rounded line caps, no filled areas"
      : "Solid black filled glyph made of bold simple shapes";
  return (
    `A single minimalist pictogram icon of ${concept.trim().replace(/[.\s]+$/, "")}. ${look}, ` +
    "on a plain pure white background, flat vector style, centered with generous margin, " +
    "no text, no letters, no shadow, no gradient, no frame or border"
  );
}
