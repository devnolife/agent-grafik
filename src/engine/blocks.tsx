import { Sparkles } from "lucide-react";
import { useId, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, Shape, Slide, Text, Visual } from "@/slides/primitives";
import { useSlideContext } from "./context";
import { lucideIcon } from "./lucide";
import { assetSvg, assetUrl } from "./registry";
import type { ImageSpec } from "./spec";

/** Type roles in px on the 1920×1080 canvas (PowerPoint pt = px ÷ 2). Line heights stay ≥ 1.12 (Arial's content area). */
export const role = {
  eyebrow: "text-[24px] leading-[1.25] font-bold tracking-[0.16em] uppercase text-(--accent)",
  title: "text-[68px] leading-[1.12] font-bold tracking-[-0.02em] text-balance",
  h3: "text-[36px] leading-[1.15] font-bold tracking-[-0.01em]",
  lead: "text-[34px] leading-[1.3] text-(--muted)",
  body: "text-[28px] leading-[1.4] text-(--muted)",
} as const;

const pad = (value: number) => String(value).padStart(2, "0");

/** Slide root: theme colours as CSS variables, plus a soft glow that is baked into the background picture. */
export function ThemedSlide({ children }: { children: ReactNode }) {
  const { theme } = useSlideContext();
  const style = {
    "--bg": theme.bg,
    "--card": theme.card,
    "--line": theme.cardLine,
    "--text": theme.text,
    "--muted": theme.muted,
    "--accent": theme.accent,
    "--accent2": theme.accent2,
    "--on-accent": theme.onAccent,
    "--tint": theme.tint,
    "--tint-line": theme.tintLine,
    "--tint2": theme.tint2,
    "--tint-line2": theme.tintLine2,
    fontFamily: theme.fontFamily,
    backgroundColor: theme.bg,
    backgroundImage: [
      `radial-gradient(920px 780px at 3% -8%, ${theme.glowA}, transparent 70%)`,
      `radial-gradient(840px 700px at 105% 110%, ${theme.glowB}, transparent 70%)`,
    ].join(", "),
  } as CSSProperties;
  return (
    <Slide className="text-(--text)" style={style}>
      {children}
    </Slide>
  );
}

/** Deck name + page number. `data-qa="chrome"` keeps it out of the word budget. */
export function Footer() {
  const { deck, index, total } = useSlideContext();
  const label = "text-[24px] leading-[1.25] text-(--muted)";
  return (
    <div data-qa="chrome" className="absolute right-[96px] bottom-[96px] left-[96px] flex items-end justify-between">
      <Text className={label}>{deck.title}</Text>
      <Text className={cn(label, "tabular-nums")}>
        {pad(index + 1)} / {pad(total)}
      </Text>
    </div>
  );
}

/** Eyebrow + title; flows inside whatever column the layout gives it. */
export function Heading({ eyebrow, title, size = 68 }: { eyebrow?: string; title: string; size?: number }) {
  return (
    <>
      {eyebrow && (
        <Text className={role.eyebrow} step={0}>
          {eyebrow}
        </Text>
      )}
      <Text
        as="h2"
        className={cn(role.title, eyebrow && "mt-[24px]")}
        style={size === 68 ? undefined : { fontSize: size }}
        step={1}
      >
        {title}
      </Text>
    </>
  );
}

/** Standard content slide: heading on top, the body vertically centred in the space that is left above the footer. */
export function Frame({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <div className="absolute top-[96px] right-[96px] bottom-[162px] left-[96px] flex flex-col">
      <div className="flex w-[1500px] flex-col items-start">
        <Heading eyebrow={eyebrow} title={title} />
      </div>
      <div className="flex min-h-0 flex-1 items-center pt-[36px]">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<typeof Shape>) {
  return <Shape className={cn("rounded-[28px] border-2 border-(--line) bg-(--card)", className)} {...props} />;
}

/** A Lucide icon by name, or a generated SVG icon inlined so it takes the surrounding text colour. */
export function Glyph({
  name,
  src,
  size = 48,
  className,
  step,
}: {
  name?: string;
  src?: string;
  size?: number;
  className?: string;
  step?: number;
}) {
  const { deck } = useSlideContext();
  const svg = assetSvg(deck.slug, src);
  if (svg) {
    return (
      <Visual
        className={cn("inline-flex shrink-0 [&>svg]:size-full", className)}
        style={{ width: size, height: size }}
        step={step}
        bleed={2}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }
  return <Icon icon={lucideIcon(name) ?? Sparkles} size={size} className={className} step={step} />;
}

export function IconTile({
  name,
  src,
  size = 96,
  tone = "accent",
  step,
  className,
}: {
  name?: string;
  src?: string;
  size?: number;
  tone?: "accent" | "accent2";
  step?: number;
  className?: string;
}) {
  const second = tone === "accent2";
  return (
    <Shape
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[28px] border-2",
        second ? "border-(--tint-line2) bg-(--tint2)" : "border-(--tint-line) bg-(--tint)",
        className,
      )}
      style={{ width: size, height: size }}
      step={step}
    >
      <Glyph name={name} src={src} size={Math.round(size * 0.5)} className={second ? "text-(--accent2)" : "text-(--accent)"} />
    </Shape>
  );
}

/** Stand-in shown until the image model has produced the picture. */
function PlaceholderArt() {
  const { theme } = useSlideContext();
  const gradient = useId();
  return (
    <svg className="block size-full" viewBox="0 0 800 888" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.accent} stopOpacity="0.34" />
          <stop offset="1" stopColor={theme.accent2} stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect width="800" height="888" fill={`url(#${gradient})`} />
      {[110, 210, 310, 410].map((radius) => (
        <circle key={radius} cx="400" cy="444" r={radius} fill="none" stroke={theme.accent} strokeOpacity={0.62 - radius / 900} strokeWidth="2" />
      ))}
      <circle cx="400" cy="444" r="58" fill={theme.accent} />
    </svg>
  );
}

/** Rounded picture panel; exported as one transparent PNG. */
export function ImagePanel({
  image,
  className,
  style,
  step,
  radius = 40,
}: {
  image?: ImageSpec;
  className?: string;
  style?: CSSProperties;
  step?: number;
  radius?: number;
}) {
  const { deck } = useSlideContext();
  const url = assetUrl(deck.slug, image?.src);
  return (
    <Visual className={cn("overflow-hidden", className)} style={{ borderRadius: radius, ...style }} step={step}>
      {url ? (
        <img src={url} alt={image?.alt ?? ""} draggable={false} className="block size-full object-cover" />
      ) : (
        <PlaceholderArt />
      )}
      <div className="pointer-events-none absolute inset-0 border-2 border-(--line)" style={{ borderRadius: radius }} />
    </Visual>
  );
}

/** Concentric rings used as quiet decoration on text-only slides. */
export function Rings({
  className,
  style,
  step,
  dot = true,
}: {
  className?: string;
  style?: CSSProperties;
  step?: number;
  dot?: boolean;
}) {
  const { theme } = useSlideContext();
  return (
    <Visual className={cn("absolute", className)} style={style} step={step}>
      <svg className="block size-full" viewBox="0 0 800 800" fill="none" aria-hidden="true">
        {[380, 300, 220, 140].map((radius, index) => (
          <circle
            key={radius}
            cx="400"
            cy="400"
            r={radius}
            stroke={index % 2 ? theme.accent2 : theme.accent}
            strokeOpacity={0.5 - index * 0.08}
            strokeWidth="2"
            strokeDasharray={index === 1 ? "6 14" : undefined}
          />
        ))}
        {dot && <circle cx="400" cy="400" r="40" fill={theme.accent} fillOpacity="0.9" />}
      </svg>
    </Visual>
  );
}

export const padNumber = pad;
