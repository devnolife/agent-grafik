import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Slide, Text } from "@/slides/primitives";
import { deckTitle, palette, totalSlides, type } from "./tokens";

const cssVars = {
  "--eh-bg": palette.bg,
  "--eh-surface": palette.surface,
  "--eh-line": palette.line,
  "--eh-cyan": palette.cyan,
  "--eh-text": palette.text,
  "--eh-muted": palette.muted,
  "--eh-amber": palette.amber,
  "--eh-red": palette.red,
  "--eh-mono": '"Cascadia Mono", Consolas, monospace',
  fontFamily: 'Bahnschrift, "Segoe UI", sans-serif',
  backgroundColor: palette.bg,
  backgroundImage: [
    `linear-gradient(${palette.gridMajor} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${palette.gridMajor} 1px, transparent 1px)`,
    `linear-gradient(${palette.grid} 1px, transparent 1px)`,
    `linear-gradient(90deg, ${palette.grid} 1px, transparent 1px)`,
  ].join(", "),
  backgroundSize: "96px 96px, 96px 96px, 24px 24px, 24px 24px",
} as CSSProperties;

/** Slide root with the deck's background grid, fonts and colour variables. */
export function DeckSlide({ className, style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <Slide className={cn("text-(--eh-text)", className)} style={{ ...cssVars, ...style }} {...rest} />;
}

/** Sheet footer: deck name + slide number. `data-qa="chrome"` keeps it out of the word budget. */
export function SheetFooter({ number }: { number: number }) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    <div data-qa="chrome" className="absolute right-[96px] bottom-[96px] left-[96px] flex items-end justify-between">
      <Text className={cn(type.label, "text-(--eh-muted)")}>{deckTitle}</Text>
      <Text className={cn(type.label, "text-(--eh-muted) tabular-nums")}>
        {pad(number)} / {pad(totalSlides)}
      </Text>
    </div>
  );
}
