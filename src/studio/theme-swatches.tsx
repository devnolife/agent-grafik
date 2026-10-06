import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { THEME_IDS, type ThemeId } from "@/engine/spec";
import { THEMES } from "@/engine/themes";
import { cn } from "@/lib/utils";

/** Theme picker with a miniature of each slide theme. */
export function ThemeSwatches({
  value,
  onChange,
  disabled,
  compact = false,
}: {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <ToggleGroup
      aria-label="Tema slide"
      value={[value]}
      onValueChange={(values: string[]) => {
        if (values[0]) onChange(values[0] as ThemeId);
      }}
      disabled={disabled}
      className={cn("grid w-full gap-2", compact ? "grid-cols-4" : "grid-cols-2")}
    >
      {THEME_IDS.map((id) => {
        const theme = THEMES[id];
        return (
          <ToggleGroupItem
            key={id}
            value={id}
            aria-label={`Tema ${theme.name}`}
            className="h-auto flex-col items-stretch gap-0 overflow-hidden rounded-lg border border-border p-0 hover:bg-transparent data-pressed:border-brand data-pressed:ring-1 data-pressed:ring-brand"
          >
            <span
              className="relative block aspect-video w-full"
              style={{
                background: `radial-gradient(120% 90% at 0% 0%, ${theme.glowA}, transparent 60%), radial-gradient(100% 90% at 100% 100%, ${theme.glowB}, transparent 60%), ${theme.bg}`,
              }}
            >
              <span className="absolute top-2.5 left-2.5 h-1.5 w-10 rounded-full" style={{ background: theme.text }} />
              <span className="absolute top-5 left-2.5 h-1 w-7 rounded-full" style={{ background: theme.muted }} />
              <span className="absolute right-2.5 bottom-2.5 flex gap-1">
                <span className="size-3 rounded-full" style={{ background: theme.accent }} />
                <span className="size-3 rounded-full" style={{ background: theme.accent2 }} />
              </span>
            </span>
            <span className="flex items-center justify-between px-2 py-1.5 text-xs">
              <span className="font-medium text-foreground">{theme.name}</span>
              {!compact && <span className="text-muted-foreground">{theme.mode === "dark" ? "Gelap" : "Terang"}</span>}
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
