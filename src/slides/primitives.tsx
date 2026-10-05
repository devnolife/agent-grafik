import type { LucideIcon } from "lucide-react";
import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Slide primitives — the export contract between the browser design and PowerPoint.
 *
 * Every slide is a fixed 1920×1080 px canvas (1 px = 0.5 pt in PowerPoint).
 * - <Text>   → native, editable PowerPoint text box (`data-pptx="text"`)
 * - <Shape>  → native PowerPoint shape: solid fill, solid border, radius, simple shadow (`data-pptx="shape"`)
 * - <Visual> → captured as a transparent PNG picture (`data-pptx="image"`); everything inside is flattened
 * - <Icon> / <Illustration> → convenience wrappers around <Visual> for Lucide icons and illustration files
 * - anything else is flattened into the slide background image.
 *
 * `step` (optional) staggers the entrance animation in present mode only. Exports are always static.
 */

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;

type StepProps = { step?: number };

function withStep(step: number | undefined, style: CSSProperties | undefined) {
  if (step === undefined) return style;
  return { ...style, "--step": step } as CSSProperties;
}

export function Slide({ className, style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slide=""
      className={cn("relative overflow-hidden", className)}
      style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, ...style }}
      {...rest}
    />
  );
}

type TextTag =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "span"
  | "div"
  | "li"
  | "dt"
  | "dd"
  | "figcaption"
  | "blockquote"
  | "small";

export function Text({
  as: Tag = "p",
  step,
  style,
  ...rest
}: HTMLAttributes<HTMLElement> & StepProps & { as?: TextTag }) {
  return (
    <Tag
      data-pptx="text"
      data-step={step === undefined ? undefined : ""}
      style={withStep(step, style)}
      {...rest}
    />
  );
}

type BoxTag = "div" | "section" | "article" | "aside" | "figure" | "ul" | "ol" | "li" | "header" | "footer";

export function Shape({
  as: Tag = "div",
  step,
  style,
  ...rest
}: HTMLAttributes<HTMLElement> & StepProps & { as?: BoxTag }) {
  return (
    <Tag
      data-pptx="shape"
      data-step={step === undefined ? undefined : ""}
      style={withStep(step, style)}
      {...rest}
    />
  );
}

/**
 * A raster region (illustration, complex diagram, effect-heavy element).
 * `bleed` extends the capture box (px) for glows/shadows that paint outside the element.
 */
export function Visual({
  as: Tag = "div",
  step,
  bleed,
  style,
  ...rest
}: HTMLAttributes<HTMLElement> & StepProps & { as?: BoxTag; bleed?: number }) {
  return (
    <Tag
      data-pptx="image"
      data-pptx-bleed={bleed}
      data-step={step === undefined ? undefined : ""}
      style={withStep(step, style)}
      {...rest}
    />
  );
}

/** Plain layout group that only participates in the present-mode entrance stagger. */
export function Step({ step = 0, style, ...rest }: HTMLAttributes<HTMLDivElement> & StepProps) {
  return <div data-step="" style={withStep(step, style)} {...rest} />;
}

/**
 * A Lucide icon exported as its own transparent picture (so it stays above native shapes).
 * Colour comes from `currentColor` — set it with a text colour class. Stroke width stays constant
 * across sizes (`absoluteStrokeWidth`) so every icon in a deck shares one line weight.
 */
export function Icon({
  icon: Glyph,
  size = 48,
  strokeWidth = 2.5,
  label,
  className,
  style,
  step,
}: {
  icon: LucideIcon;
  size?: number;
  strokeWidth?: number;
  /** Accessible name; omit for decorative icons that sit next to a text label. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  step?: number;
}) {
  return (
    <Visual
      className={cn("inline-flex shrink-0", className)}
      style={{ width: size, height: size, ...style }}
      step={step}
      bleed={2}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Glyph size={size} strokeWidth={strokeWidth} absoluteStrokeWidth aria-hidden="true" />
    </Visual>
  );
}

/** An illustration file (SVG/PNG) exported as one transparent picture. Use recoloured, licensed art only. */
export function Illustration({
  src,
  alt = "",
  className,
  style,
  step,
  bleed,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  step?: number;
  bleed?: number;
}) {
  return (
    <Visual className={cn("block", className)} style={style} step={step} bleed={bleed}>
      <img src={src} alt={alt} draggable={false} className="block size-full object-contain" />
    </Visual>
  );
}
