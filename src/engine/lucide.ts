import { icons, type LucideIcon } from "lucide-react";
import { iconKey } from "./spec";

const library = icons as Record<string, LucideIcon>;

/** Resolve a kebab-case Lucide name (`shield-check`) to its component. */
export function lucideIcon(name: string | undefined): LucideIcon | undefined {
  return name ? library[iconKey(name)] : undefined;
}
